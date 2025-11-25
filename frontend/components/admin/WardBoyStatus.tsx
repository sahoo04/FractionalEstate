"use client";

import { useState, useEffect } from "react";
import {
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  useAccount,
  usePublicClient,
} from "wagmi";
import {
  CONTRACTS,
  REVENUE_SPLITTER_ABI,
  PROPERTY_SHARE_1155_ABI,
} from "@/lib/contracts";
import { UserCheck, UserX, Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface WardBoyStatusProps {
  tokenId: number;
}

export function WardBoyStatus({ tokenId }: WardBoyStatusProps) {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const [isAssigning, setIsAssigning] = useState(false);
  const [wardBoyAddress, setWardBoyAddress] = useState("");
  const [error, setError] = useState("");
  const [pendingAddress, setPendingAddress] = useState<string | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const [isVerifyingProperty, setIsVerifyingProperty] = useState(false);

  // Read current ward boy from contract
  const { data: currentWardBoy, refetch } = useReadContract({
    address: CONTRACTS.RevenueSplitter,
    abi: REVENUE_SPLITTER_ABI,
    functionName: "propertyManagers",
    args: [BigInt(tokenId)],
  });

  // Check if property exists on-chain (required for assignment)
  // Contract checks: propertyToken.totalSupply(tokenId) > 0
  // So we check totalSupply directly - this is the exact same check the contract uses
  const {
    data: propertySupply,
    error: supplyError,
    isLoading: isLoadingSupply,
  } = useReadContract({
    address: CONTRACTS.PropertyShare1155,
    abi: PROPERTY_SHARE_1155_ABI,
    functionName: "totalSupply",
    args: [BigInt(tokenId)],
    query: {
      retry: false, // Don't retry if property doesn't exist
    },
  });

  // Property exists if totalSupply > 0 (matches contract's exact check)
  // This is the same check as: require(propertyToken.totalSupply(tokenId) > 0, "Property does not exist")
  const propertyExists =
    !isLoadingSupply && propertySupply !== undefined && propertySupply > 0n;

  // Check if connected address is contract owner
  const {
    data: contractOwner,
    isLoading: isLoadingOwner,
    refetch: refetchOwner,
  } = useReadContract({
    address: CONTRACTS.RevenueSplitter,
    abi: REVENUE_SPLITTER_ABI,
    functionName: "owner",
    query: {
      refetchInterval: 3000, // Refetch every 3 seconds to get latest owner
      staleTime: 0, // Always consider data stale
    },
  });

  // Debug: Log contract address and owner
  useEffect(() => {
    console.log("🔍 WardBoyStatus Debug:", {
      contractAddress: CONTRACTS.RevenueSplitter,
      connectedAddress: address,
      contractOwner: contractOwner,
      isLoadingOwner,
    });
  }, [address, contractOwner, isLoadingOwner]);

  const {
    writeContract,
    data: txHash,
    isPending,
    error: writeError,
  } = useWriteContract();

  const {
    isSuccess: isTxSuccess,
    isError: isTxError,
    error: txError,
  } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  // Handle write errors
  useEffect(() => {
    if (writeError) {
      console.error("Write error:", writeError);
      let errorMessage = "Transaction failed. ";

      // Provide more specific error messages
      if (
        writeError.message?.includes("user rejected") ||
        writeError.message?.includes("User rejected")
      ) {
        errorMessage = "Transaction was rejected. Please try again.";
      } else if (writeError.message?.includes("insufficient funds")) {
        errorMessage =
          "Insufficient funds for gas. Please add ETH to your wallet.";
      } else if (
        writeError.message?.includes("onlyOwner") ||
        writeError.message?.includes("Ownable")
      ) {
        errorMessage =
          "Only the contract owner can assign ward boys. Your wallet is not the contract owner.";
      } else if (writeError.message?.includes("execution reverted")) {
        errorMessage =
          "Transaction reverted. Check console for details. Possible reasons: not contract owner, invalid property, or insufficient gas.";
      } else {
        errorMessage +=
          writeError.message || "Please check your wallet and try again.";
      }

      setError(errorMessage);
      setIsAssigning(false);
      setIsRemoving(false);
    }
  }, [writeError]);

  // Handle transaction errors
  useEffect(() => {
    if (isTxError && txError) {
      console.error("Transaction error:", txError);
      setError(txError.message || "Transaction failed on blockchain");
      setIsAssigning(false);
    }
  }, [isTxError, txError]);

  // Refetch after transaction success and update database
  useEffect(() => {
    if (isTxSuccess && txHash) {
      // Update database after successful transaction
      if (pendingAddress) {
        // This was an assignment
        updateDatabase(true, pendingAddress);
        setPendingAddress(null);
      } else if (isRemoving) {
        // This was a removal
        updateDatabase(false);
        setIsRemoving(false);
      }
      refetch();
      setIsAssigning(false);
      setWardBoyAddress("");
      setError("");
    }
  }, [isTxSuccess, txHash, refetch, pendingAddress, isRemoving]);

  const updateDatabase = async (isAssign: boolean, address?: string) => {
    if (!supabase || !txHash) return;

    try {
      if (isAssign && address) {
        // Update or insert ward boy mapping after successful assignment
        const { error } = await (
          supabase.from("ward_boy_mappings") as any
        ).upsert(
          {
            property_id: tokenId,
            ward_boy_address: address.toLowerCase(),
            is_active: true,
            assigned_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "property_id",
          }
        );
        if (error) {
          console.error("Database upsert error:", error);
        }
      } else {
        // If removing, deactivate
        const { error } = await (supabase.from("ward_boy_mappings") as any)
          .update({
            is_active: false,
            removed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("property_id", tokenId);
        if (error) {
          console.error("Database update error:", error);
        }
      }
    } catch (err) {
      console.error("Database update error:", err);
    }
  };

  const handleAssign = async () => {
    // Validate address format
    const trimmedAddress = wardBoyAddress.trim();
    if (
      !trimmedAddress ||
      trimmedAddress.length !== 42 ||
      !trimmedAddress.startsWith("0x")
    ) {
      setError(
        "Invalid address format. Must be a valid Ethereum address (0x followed by 40 hex characters)"
      );
      return;
    }

    // Validate it's a valid hex address
    if (!/^0x[a-fA-F0-9]{40}$/.test(trimmedAddress)) {
      setError(
        "Invalid address format. Address must contain only hexadecimal characters"
      );
      return;
    }

    // CRITICAL: Verify property exists on-chain RIGHT BEFORE submitting transaction
    // This prevents race conditions and ensures we have the latest on-chain data
    try {
      setError("");
      setIsVerifyingProperty(true);

      // Step 1: Direct on-chain check using publicClient (synchronous, no caching)
      if (!publicClient) {
        setError("Unable to connect to blockchain. Please try again.");
        setIsVerifyingProperty(false);
        return;
      }

      console.log("🔍 Verifying property on-chain before transaction...", {
        tokenId,
      });

      // CRITICAL: Get the PropertyShare1155 address from RevenueSplitter contract
      // The RevenueSplitter uses its own propertyToken reference, which might differ
      // from CONTRACTS.PropertyShare1155 if contracts were deployed separately
      const revenueSplitterPropertyToken = await publicClient.readContract({
        address: CONTRACTS.RevenueSplitter,
        abi: REVENUE_SPLITTER_ABI,
        functionName: "propertyToken",
        args: [],
      });

      console.log(
        "🔗 RevenueSplitter propertyToken address:",
        revenueSplitterPropertyToken
      );
      console.log(
        "🔗 Frontend CONTRACTS.PropertyShare1155:",
        CONTRACTS.PropertyShare1155
      );

      // Check if addresses match
      const addressesMatch =
        revenueSplitterPropertyToken.toLowerCase() ===
        CONTRACTS.PropertyShare1155.toLowerCase();

      if (!addressesMatch) {
        const errorMsg = `⚠️ CONTRACT ADDRESS MISMATCH DETECTED!\n\nRevenueSplitter is using PropertyShare1155 at: ${revenueSplitterPropertyToken}\nFrontend is configured with: ${CONTRACTS.PropertyShare1155}\n\nPlease update your .env.local file:\nNEXT_PUBLIC_PROPERTY_TOKEN_ADDRESS=${revenueSplitterPropertyToken}\n\nOr create the property in the correct contract (${revenueSplitterPropertyToken})`;
        setError(errorMsg);
        setIsVerifyingProperty(false);
        console.error("❌ Address mismatch:", {
          revenueSplitterPropertyToken,
          frontendPropertyToken: CONTRACTS.PropertyShare1155,
        });
        return;
      }

      // Use the SAME PropertyShare1155 address that RevenueSplitter uses
      // This ensures we're checking the exact same contract the RevenueSplitter checks
      const currentTotalSupply = await publicClient.readContract({
        address: revenueSplitterPropertyToken,
        abi: PROPERTY_SHARE_1155_ABI,
        functionName: "totalSupply",
        args: [BigInt(tokenId)],
      });

      console.log("📊 Property totalSupply check:", {
        tokenId,
        totalSupply: currentTotalSupply.toString(),
        isValid: currentTotalSupply > 0n,
        contractAddress: revenueSplitterPropertyToken,
      });

      // Step 2: Validate totalSupply > 0 (contract requirement)
      if (currentTotalSupply === undefined || currentTotalSupply === 0n) {
        const errorMsg = `Property #${tokenId} does not exist in the PropertyShare1155 contract (${revenueSplitterPropertyToken}) or has 0 total supply.\n\nThe contract requires totalSupply > 0. Please:\n1. Create the property in the correct contract: ${revenueSplitterPropertyToken}\n2. Mint at least one share\n3. Then try assigning the ward boy again.`;
        setError(errorMsg);
        setIsVerifyingProperty(false);
        console.error("❌ Property validation failed:", {
          tokenId,
          totalSupply: currentTotalSupply?.toString() || "undefined",
          contractAddress: revenueSplitterPropertyToken,
        });
        return;
      }

      // Step 3: All checks passed, proceed with transaction
      setIsVerifyingProperty(false);
      setIsAssigning(true);

      // Normalize address to lowercase for consistency
      const normalizedAddress = trimmedAddress.toLowerCase() as `0x${string}`;

      // Store address for database update after transaction succeeds
      setPendingAddress(normalizedAddress);

      console.log("✅ Property verified, submitting transaction...", {
        tokenId,
        wardBoyAddress: normalizedAddress,
        totalSupply: currentTotalSupply.toString(),
      });

      // Call contract with explicit gas limit to prevent high estimates
      writeContract({
        address: CONTRACTS.RevenueSplitter,
        abi: REVENUE_SPLITTER_ABI,
        functionName: "assignPropertyManager",
        args: [BigInt(tokenId), normalizedAddress],
        gas: 150000n, // Explicit gas limit (should be enough for assignment)
      });
    } catch (err: any) {
      console.error("❌ Assign error:", err);
      setIsVerifyingProperty(false);
      setIsAssigning(false);

      // Provide specific error messages
      if (err.message?.includes("Property does not exist")) {
        setError(
          `Property #${tokenId} does not exist on-chain. Please create the property and mint at least one share first.`
        );
      } else if (
        err.message?.includes("totalSupply") ||
        err.message?.includes("revert")
      ) {
        setError(
          `Property #${tokenId} validation failed. Please ensure the property exists on-chain and has at least one share minted.`
        );
      } else {
        setError(
          err.message ||
            "Failed to assign ward boy. Please check the console for details."
        );
      }
    }
  };

  const handleRemove = async () => {
    if (!confirm("Remove ward boy from this property?")) return;

    try {
      setError("");
      setIsRemoving(true);

      // Call contract with explicit gas limit
      writeContract({
        address: CONTRACTS.RevenueSplitter,
        abi: REVENUE_SPLITTER_ABI,
        functionName: "removePropertyManager",
        args: [BigInt(tokenId)],
        gas: 100000n, // Explicit gas limit for removal
      });
    } catch (err: any) {
      console.error("Remove error:", err);
      setError(
        err.message ||
          "Failed to remove ward boy. Please check the console for details."
      );
      setIsRemoving(false);
    }
  };

  const hasWardBoy =
    currentWardBoy &&
    currentWardBoy !== "0x0000000000000000000000000000000000000000";

  if (
    isVerifyingProperty ||
    isPending ||
    (txHash && !isTxSuccess && !isTxError)
  ) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm p-3 bg-blue-50 rounded-xl border border-blue-200">
          <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
          <span className="text-blue-700 font-semibold">
            {isVerifyingProperty
              ? "Verifying property on-chain..."
              : txHash
              ? "Waiting for confirmation..."
              : "Processing transaction..."}
          </span>
        </div>
        {txHash && (
          <a
            href={`https://sepolia.arbiscan.io/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:text-blue-800 underline"
          >
            View on Arbiscan
          </a>
        )}
      </div>
    );
  }

  if (hasWardBoy && !isAssigning) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border-2 border-green-200">
          <div className="p-1.5 bg-green-200 rounded-lg">
            <UserCheck className="h-4 w-4 text-green-700" />
          </div>
          <span className="text-green-800 font-bold">Ward Boy Assigned</span>
        </div>
        <div className="text-xs text-gray-700 font-mono bg-white p-3 rounded-xl border-2 border-gray-200">
          {currentWardBoy?.slice(0, 6)}...{currentWardBoy?.slice(-4)}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setIsAssigning(true)}
            className="flex-1 px-3 py-2 text-sm bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:shadow-lg transition-all font-semibold"
          >
            Change
          </button>
          <button
            onClick={handleRemove}
            className="flex-1 px-3 py-2 text-sm bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:shadow-lg transition-all font-semibold"
          >
            Remove
          </button>
        </div>
      </div>
    );
  }

  // Check if user is contract owner (with loading state)
  const isContractOwner =
    address &&
    contractOwner &&
    !isLoadingOwner &&
    address.toLowerCase() === contractOwner.toLowerCase();

  if (isAssigning || !hasWardBoy) {
    return (
      <div className="space-y-3">
        {isLoadingOwner && (
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-3 flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
            <p className="text-xs text-blue-800 font-semibold">
              Checking contract owner...
            </p>
          </div>
        )}
        {isLoadingSupply && (
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-3 flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
            <p className="text-xs text-blue-800 font-semibold">
              Checking if property #{tokenId} exists on-chain...
            </p>
          </div>
        )}
        {!isLoadingSupply && !propertyExists && (
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs text-red-800 font-semibold">
                ⚠️ Property #{tokenId} does not exist or has 0 total supply
              </p>
              <p className="text-xs text-red-700 mt-1">
                The contract requires totalSupply &gt; 0. The property must be
                created on the blockchain and have at least one share minted
                before assigning a ward boy.
                {supplyError && (
                  <span className="block mt-1 font-mono text-xs">
                    Error: {supplyError.message}
                  </span>
                )}
                {propertySupply !== undefined && (
                  <span className="block mt-1 font-semibold">
                    Current totalSupply: {propertySupply.toString()}
                  </span>
                )}
              </p>
            </div>
          </div>
        )}
        {!isLoadingOwner && !isContractOwner && address && contractOwner && (
          <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs text-yellow-800 font-semibold">
                Warning: Only the contract owner can assign ward boys.
              </p>
              <div className="mt-2 space-y-1 text-xs">
                <p className="text-yellow-700">
                  <span className="font-semibold">Contract:</span>{" "}
                  {CONTRACTS.RevenueSplitter.slice(0, 10)}...
                  {CONTRACTS.RevenueSplitter.slice(-8)}
                </p>
                <p className="text-yellow-700">
                  <span className="font-semibold">Your address:</span>{" "}
                  {address.slice(0, 6)}...{address.slice(-4)} (
                  {address.toLowerCase()})
                </p>
                <p className="text-yellow-700">
                  <span className="font-semibold">Owner address:</span>{" "}
                  {contractOwner.slice(0, 6)}...{contractOwner.slice(-4)} (
                  {contractOwner.toLowerCase()})
                </p>
              </div>
              <button
                onClick={async () => {
                  console.log("🔄 Refreshing owner check...");
                  await refetchOwner();
                  // Small delay then reload to ensure fresh data
                  setTimeout(() => {
                    window.location.reload();
                  }, 500);
                }}
                className="mt-2 px-3 py-1 text-xs bg-yellow-200 text-yellow-900 rounded hover:bg-yellow-300 font-semibold"
              >
                🔄 Refresh Owner Check
              </button>
            </div>
          </div>
        )}
        <input
          type="text"
          value={wardBoyAddress}
          onChange={(e) => {
            setWardBoyAddress(e.target.value);
            setError(""); // Clear error when user types
          }}
          placeholder="Ward Boy Address (0x...)"
          className="w-full px-4 py-2 text-sm border-2 border-gray-300 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all font-mono"
          disabled={!isContractOwner}
        />
        {error && (
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs text-red-800 font-semibold">{error}</p>
                {writeError && (
                  <details className="mt-2">
                    <summary className="text-xs text-red-600 cursor-pointer hover:text-red-800">
                      Technical Details
                    </summary>
                    <pre className="text-xs text-red-700 mt-1 overflow-auto bg-red-100 p-2 rounded">
                      {(() => {
                        try {
                          const errorInfo = {
                            message: writeError.message,
                            name: writeError.name,
                            cause: writeError.cause,
                            stack: writeError.stack
                              ?.split("\n")
                              .slice(0, 3)
                              .join("\n"),
                          };
                          return JSON.stringify(errorInfo, null, 2);
                        } catch {
                          return writeError.message || String(writeError);
                        }
                      })()}
                    </pre>
                  </details>
                )}
              </div>
            </div>
          </div>
        )}
        <div className="flex gap-2">
          <button
            onClick={handleAssign}
            disabled={
              !wardBoyAddress ||
              isPending ||
              isVerifyingProperty ||
              !isContractOwner ||
              isLoadingSupply
            }
            className="flex-1 px-4 py-2 text-sm bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl hover:shadow-lg disabled:from-gray-400 disabled:to-gray-500 transition-all font-semibold"
          >
            {isVerifyingProperty
              ? "Verifying..."
              : hasWardBoy
              ? "Update"
              : "Assign"}
          </button>
          {hasWardBoy && (
            <button
              onClick={() => {
                setIsAssigning(false);
                setWardBoyAddress("");
                setError("");
              }}
              className="px-4 py-2 text-sm border-2 border-gray-300 rounded-xl hover:bg-gray-50 font-semibold"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    );
  }

  return null;
}
