import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getPublicClient } from '@/lib/relayer'
import { CONTRACTS, ZK_REGISTRY_ABI, IDENTITY_SBT_ABI } from '@/lib/contracts'
import { logger } from '@/lib/logger'
import { getAddress } from 'viem'

/**
 * GET /api/explorer/[wallet]
 * Fetch proof data from database and on-chain contracts
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { wallet: string } }
) {
  try {
    const wallet = params.wallet?.toLowerCase()

    if (!wallet) {
      return NextResponse.json(
        { error: 'Wallet address required' },
        { status: 400 }
      )
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      )
    }

    // Get user data from database
    const { data: user, error: userError } = await (supabaseAdmin as any)
      .from('users')
      .select('*')
      .eq('wallet_address', wallet)
      .single()

    if (userError || !user) {
      logger.warn('User not found in database', { error: userError, wallet })
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Check if user has proof and SBT
    if (!user.proof_hash || !user.sbt_token_id) {
      return NextResponse.json({
        verified: false,
        message: 'User has not been verified with ZK proof and SBT',
        wallet
      })
    }

    // Fetch on-chain data from contracts
    const publicClient = getPublicClient()
    const walletAddress = getAddress(wallet)

    let onChainProof = null
    let onChainSBT = null

    try {
      // Fetch proof from ZKRegistry
      const proofData = await publicClient.readContract({
        address: CONTRACTS.ZKRegistry,
        abi: ZK_REGISTRY_ABI,
        functionName: 'getProof',
        args: [walletAddress]
      })

      if (proofData && proofData[0] !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
        onChainProof = {
          proofHash: proofData[0],
          timestamp: Number(proofData[1]),
          provider: proofData[2],
          submittedBy: proofData[3]
        }
      }
    } catch (error) {
      logger.warn('Failed to fetch proof from on-chain', { error, wallet })
    }

    try {
      // Fetch SBT data from IdentitySBT
      const sbtTokenId = BigInt(user.sbt_token_id)
      const sbtOwner = await publicClient.readContract({
        address: CONTRACTS.IdentitySBT,
        abi: IDENTITY_SBT_ABI,
        functionName: 'ownerOf',
        args: [sbtTokenId]
      })

      const sbtTokenURI = await publicClient.readContract({
        address: CONTRACTS.IdentitySBT,
        abi: IDENTITY_SBT_ABI,
        functionName: 'tokenURI',
        args: [sbtTokenId]
      })

      if (sbtOwner && sbtOwner.toLowerCase() === wallet.toLowerCase()) {
        onChainSBT = {
          tokenId: Number(sbtTokenId),
          owner: sbtOwner,
          metadataURI: sbtTokenURI
        }
      }
    } catch (error) {
      logger.warn('Failed to fetch SBT from on-chain', { error, wallet })
    }

    // Combine database and on-chain data
    const response = {
      verified: true,
      wallet: wallet,
      proof: {
        hash: user.proof_hash,
        txHash: user.proof_tx_hash,
        provider: user.proof_provider || 'FractionalStay KYC',
        verifiedAt: user.verified_at,
        onChain: onChainProof ? {
          proofHash: onChainProof.proofHash,
          timestamp: onChainProof.timestamp,
          provider: onChainProof.provider,
          submittedBy: onChainProof.submittedBy
        } : null
      },
      sbt: {
        tokenId: user.sbt_token_id,
        metadataCID: user.sbt_metadata_cid,
        onChain: onChainSBT ? {
          tokenId: onChainSBT.tokenId,
          owner: onChainSBT.owner,
          metadataURI: onChainSBT.metadataURI
        } : null
      },
      user: {
        name: user.name,
        email: user.email,
        role: user.role
      }
    }

    logger.info('Explorer data fetched', {
      wallet,
      hasProof: !!user.proof_hash,
      hasSBT: !!user.sbt_token_id,
      onChainProof: !!onChainProof,
      onChainSBT: !!onChainSBT
    })

    return NextResponse.json(response)
  } catch (error) {
    logger.error('Explorer API error', error)
    return NextResponse.json(
      { error: 'Failed to fetch explorer data', details: (error as Error).message },
      { status: 500 }
    )
  }
}




