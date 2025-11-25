import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getRelayerWalletClient, getPublicClient } from "@/lib/relayer";
import { generateProofHash, hashToBytes32 } from "@/lib/zk-proof";
import {
  CONTRACTS,
  ZK_REGISTRY_ABI,
  IDENTITY_SBT_ABI,
  USER_REGISTRY_ABI,
} from "@/lib/contracts";
import { logger } from "@/lib/logger";
import { getAddress } from "viem";
import axios from "axios";

// Disable Next.js caching for this route - always execute fresh
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

// Server-side function to upload SBT metadata to IPFS via Pinata
async function uploadSBTMetadataToIPFS(data: {
  walletAddress: string;
  name: string;
  email: string;
  verifiedAt: string;
  provider: string;
  proofHash: string;
}): Promise<{
  success: boolean;
  ipfsHash?: string;
  ipfsUrl?: string;
  gatewayUrl?: string;
  error?: string;
}> {
  try {
    const PINATA_JWT = process.env.PINATA_JWT;
    const GATEWAY = process.env.NEXT_PUBLIC_PINATA_GATEWAY || "gateway.pinata.cloud";

    if (!PINATA_JWT) {
      throw new Error("PINATA_JWT environment variable is not set");
    }

    // Create SBT metadata JSON following ERC721 metadata standard
    const metadata = {
      name: "FractionalStay Identity Badge",
      description: "Verified KYC Identity - Soulbound Token (Non-Transferable). This badge represents successful identity verification on the FractionalStay platform.",
      image: "ipfs://QmbbBCcJWZsSG9aYBoKjgzqExHMeVriuywFwaKnWrojcpK", // IPFS URL for standard compatibility
      image_url: "https://gateway.pinata.cloud/ipfs/QmbbBCcJWZsSG9aYBoKjgzqExHMeVriuywFwaKnWrojcpK", // HTTP URL for Arbiscan/OpenSea
      external_url: `https://fractionalstay.com/explorer/${data.walletAddress}`,
      attributes: [
        {
          trait_type: "Verification Status",
          value: "KYC Approved",
        },
        {
          trait_type: "Badge Type",
          value: "Identity SBT",
        },
        {
          trait_type: "Platform",
          value: "FractionalStay",
        },
        {
          trait_type: "Blockchain",
          value: "Arbitrum Sepolia",
        },
        {
          trait_type: "Transferable",
          value: "No",
        },
        {
          trait_type: "Verification Provider",
          value: data.provider,
        },
        {
          trait_type: "Verified At",
          value: data.verifiedAt,
        },
        {
          trait_type: "Proof Hash",
          value: data.proofHash,
        },
      ],
      properties: {
        category: "Identity",
        type: "Soulbound Token",
        verified: true,
        issued_by: "FractionalStay Platform",
        walletAddress: data.walletAddress,
        name: data.name,
        email: data.email,
        verifiedAt: data.verifiedAt,
        provider: data.provider,
        proofHash: data.proofHash,
      },
    };

    // Upload to Pinata IPFS
    const res = await axios.post(
      "https://api.pinata.cloud/pinning/pinJSONToIPFS",
      metadata,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${PINATA_JWT}`,
        },
      }
    );

    return {
      success: true,
      ipfsHash: res.data.IpfsHash,
      ipfsUrl: `ipfs://${res.data.IpfsHash}`,
      gatewayUrl: `https://${GATEWAY}/ipfs/${res.data.IpfsHash}`,
    };
  } catch (error) {
    logger.error("SBT metadata upload error", error);
    return {
      success: false,
      error: (error as Error).message,
    };
  }
}

// Helper function to get no-cache headers
const getNoCacheHeaders = () => ({
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
  "Pragma": "no-cache",
  "Expires": "0",
  "Surrogate-Control": "no-store",
  "X-Accel-Expires": "0",
  "X-Cache-Control": "no-store",
});

// Approve KYC with on-chain proof submission and SBT minting
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { address, adminAddress } = body;

    if (!address || !adminAddress) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      );
    }

    const normalizedAddress = address.toLowerCase();

    // Get user data from database
    const { data: user, error: userFetchError } = await (supabaseAdmin as any)
      .from("users")
      .select("*")
      .eq("wallet_address", normalizedAddress)
      .single();

    if (userFetchError || !user) {
      logger.error("User not found", userFetchError, {
        address: normalizedAddress,
      });
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    logger.info("Starting KYC approval with ZK proof and SBT", {
      address: normalizedAddress,
      adminAddress,
      userId: user.id,
    });

    // Check if user already has proof and SBT
    if (user.proof_hash && user.sbt_token_id) {
      logger.warn("User already has proof and SBT", {
        address: normalizedAddress,
      });
      return NextResponse.json({
        success: true,
        message: "KYC already approved with proof and SBT",
        address,
        status: "APPROVED",
        proofHash: user.proof_hash,
        sbtTokenId: user.sbt_token_id,
      });
    }

    // 1. Generate proof hash
    const provider = "FractionalStay KYC"; // Default provider
    const proofHash = generateProofHash({
      userId: user.id,
      walletAddress: normalizedAddress,
      createdAt: user.created_at || new Date().toISOString(),
      provider,
    });

    const proofHashBytes32 = hashToBytes32(proofHash);
    const timestamp = Math.floor(Date.now() / 1000);

    logger.info("Generated proof hash", {
      address: normalizedAddress,
      proofHashPrefix: proofHash.substring(0, 10) + "...",
    });

    // 2. Get relayer wallet client for on-chain calls
    const { walletClient, address: relayerAddress } = getRelayerWalletClient();
    const publicClient = getPublicClient();

    // 3. Submit proof to ZKRegistry
    let proofTxHash: string | null = null;
    try {
      logger.info("Submitting proof to ZKRegistry", {
        address: normalizedAddress,
        zkRegistry: CONTRACTS.ZKRegistry,
      });

      const proofHashTx = await walletClient.writeContract({
        address: CONTRACTS.ZKRegistry,
        abi: ZK_REGISTRY_ABI,
        functionName: "submitProof",
        args: [
          getAddress(normalizedAddress),
          proofHashBytes32,
          provider,
          BigInt(timestamp),
        ],
      });

      const proofReceipt = await publicClient.waitForTransactionReceipt({
        hash: proofHashTx,
      });

      proofTxHash = proofReceipt.transactionHash;
      logger.info("Proof submitted successfully", {
        address: normalizedAddress,
        txHash: proofTxHash,
      });
    } catch (error) {
      logger.error("Failed to submit proof on-chain", error, {
        address: normalizedAddress,
      });
      // Continue with SBT minting even if proof submission fails (optional enhancement)
    }

      // 4. Create and upload SBT metadata to IPFS
      let metadataCID: string | null = null;
      try {
        const verifiedAt = new Date().toISOString();
        const metadataResult = await uploadSBTMetadataToIPFS({
          walletAddress: normalizedAddress,
          name: user.name,
          email: user.email,
          verifiedAt,
          provider,
          proofHash,
        });

      if (!metadataResult.success || !metadataResult.ipfsHash) {
        throw new Error(
          metadataResult.error || "Failed to upload SBT metadata"
        );
      }

      metadataCID = metadataResult.ipfsHash;
      const metadataURI = `ipfs://${metadataCID}`;
      logger.info("SBT metadata uploaded to IPFS", {
        address: normalizedAddress,
        metadataCID,
      });

      // 5. Mint SBT to user
      let sbtTxHash: string | null = null;
      let sbtTokenId: bigint | null = null;
      try {
        logger.info("Minting SBT", {
          address: normalizedAddress,
          identitySBT: CONTRACTS.IdentitySBT,
          relayerAddress,
          metadataURI,
        });

        const mintTx = await walletClient.writeContract({
          address: CONTRACTS.IdentitySBT,
          abi: IDENTITY_SBT_ABI,
          functionName: "mintSBT",
          args: [getAddress(normalizedAddress), metadataURI],
        });

        const mintReceipt = await publicClient.waitForTransactionReceipt({
          hash: mintTx,
        });

        sbtTxHash = mintReceipt.transactionHash;

        // Get the token ID from the event or by querying the contract
        const tokenId = await publicClient.readContract({
          address: CONTRACTS.IdentitySBT,
          abi: IDENTITY_SBT_ABI,
          functionName: "sbtOf",
          args: [getAddress(normalizedAddress)],
        });

        sbtTokenId = tokenId;
        logger.info("SBT minted successfully", {
          address: normalizedAddress,
          tokenId: sbtTokenId.toString(),
          txHash: sbtTxHash,
        });
      } catch (error) {
        logger.error("Failed to mint SBT", error, {
          address: normalizedAddress,
          relayerAddress,
          contractAddress: CONTRACTS.IdentitySBT,
          metadataURI,
          errorMessage: error instanceof Error ? error.message : String(error),
        });
        throw error; // SBT minting is critical, so we fail here
      }

      // 6. Optionally update UserRegistry on-chain
      try {
        await walletClient.writeContract({
          address: CONTRACTS.UserRegistry,
          abi: USER_REGISTRY_ABI,
          functionName: "approveKYC",
          args: [getAddress(normalizedAddress)],
        });
        logger.info("UserRegistry KYC status updated on-chain", {
          address: normalizedAddress,
        });
      } catch (error) {
        // Non-critical, log and continue
        logger.warn("Failed to update UserRegistry on-chain", {
          address: normalizedAddress,
          error: error instanceof Error ? error.message : String(error),
        });
      }

      // 7. Update database with all transaction hashes and metadata
      const verifiedAtTimestamp = new Date().toISOString();

      // Update KYC document status with ZK proof and SBT data
      const { data: kycUpdated, error: kycError } = await (supabaseAdmin as any)
        .from("kyc_documents")
        .update({
          status: "APPROVED",
          reviewed_at: verifiedAtTimestamp,
          reviewed_by: adminAddress,
          zk_proof_hash: proofHash,
          zk_proof_tx_hash: proofTxHash,
          sbt_token_id: sbtTokenId ? Number(sbtTokenId) : null,
          sbt_mint_tx_hash: sbtTxHash,
          sbt_metadata_cid: metadataCID,
        })
        .or(`user_wallet.eq.${normalizedAddress},wallet_address.eq.${normalizedAddress}`)
        .select();

      if (kycError) {
        logger.error("Error updating KYC document", kycError, { address: normalizedAddress });
      } else if (!kycUpdated || kycUpdated.length === 0) {
        logger.warn("KYC document not found for update", { address: normalizedAddress });
      } else {
        logger.info("KYC document updated successfully with SBT data", { 
          address: normalizedAddress, 
          count: kycUpdated.length,
          sbtTokenId: sbtTokenId?.toString()
        });
      }

      // Update user with proof and SBT data
      const { data: updatedUser, error: userUpdateError} = await (supabaseAdmin as any)
        .from("users")
        .update({
          kyc_status: "APPROVED",
          proof_hash: proofHash,
          proof_tx_hash: proofTxHash,
          proof_provider: provider,
          sbt_token_id: sbtTokenId ? Number(sbtTokenId) : null,
          sbt_metadata_cid: metadataCID,
          verified_at: verifiedAtTimestamp,
        })
        .eq("wallet_address", normalizedAddress)
        .select();

      if (userUpdateError) {
        logger.error(
          "Error updating user with proof and SBT data",
          userUpdateError
        );
        return NextResponse.json(
          {
            error: "Failed to update user data in database",
            details: userUpdateError.message,
          },
          { status: 500 }
        );
      }

      // Verify the update was successful
      if (!updatedUser || updatedUser.length === 0) {
        logger.error("User update returned no data", { address: normalizedAddress });
        return NextResponse.json(
          {
            error: "Failed to verify user data update",
            details: "Database update did not return expected data",
          },
          { status: 500 }
        );
      }

      logger.info("KYC approved with ZK proof and SBT", {
        address: normalizedAddress,
        adminAddress,
        proofHash,
        proofTxHash,
        sbtTokenId: sbtTokenId?.toString(),
        sbtTxHash,
        verifiedAt: verifiedAtTimestamp,
      });

      return NextResponse.json({
        success: true,
        message: "KYC approved successfully with ZK proof and SBT",
        address,
        status: "APPROVED",
        proofHash,
        proofTxHash,
        sbtTokenId: sbtTokenId ? Number(sbtTokenId) : null,
        sbtTxHash,
        metadataCID,
        verifiedAt: verifiedAtTimestamp,
      }, {
        headers: getNoCacheHeaders(),
      });
    } catch (error) {
      logger.error("Error in SBT minting or database update", error, {
        address: normalizedAddress,
      });
      // If SBT minting fails, still update KYC status in DB (without SBT data)
      try {
        await (supabaseAdmin as any)
          .from("users")
          .update({ kyc_status: "APPROVED" })
          .eq("wallet_address", normalizedAddress)
      } catch (fallbackError) {
        logger.error("Failed to update user status in fallback", fallbackError)
      }

      return NextResponse.json(
        {
          error: "Failed to complete KYC approval",
          details: (error as Error).message,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    logger.error("KYC approval error", error);
    return NextResponse.json(
      { error: "Failed to approve KYC", details: (error as Error).message },
      { status: 500 }
    );
  }
}
