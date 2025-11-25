/**
 * Multicall2 Integration for Batch RPC Calls
 * Reduces network overhead by batching multiple contract reads into a single call
 */

import { PublicClient, encodeFunctionData, decodeFunctionResult, Address, Abi } from 'viem'
import { logger } from './logger'

// Multicall3 is deployed on Arbitrum Sepolia at this address
// This is the official deployment from https://github.com/mds1/multicall
const MULTICALL3_ADDRESS = '0xca11bde05977b3631167028862be2a173976ca11' as Address

const MULTICALL3_ABI = [
  {
    name: 'aggregate3',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      {
        name: 'calls',
        type: 'tuple[]',
        components: [
          { name: 'target', type: 'address' },
          { name: 'allowFailure', type: 'bool' },
          { name: 'callData', type: 'bytes' }
        ]
      }
    ],
    outputs: [
      {
        name: 'returnData',
        type: 'tuple[]',
        components: [
          { name: 'success', type: 'bool' },
          { name: 'returnData', type: 'bytes' }
        ]
      }
    ]
  }
] as const

export interface MulticallCall {
  address: Address
  abi: Abi
  functionName: string
  args?: readonly unknown[]
}

export interface MulticallResult<T = unknown> {
  success: boolean
  data?: T
  error?: Error
}

/**
 * Batch multiple contract reads into a single multicall
 * @param client - Viem public client
 * @param calls - Array of contract calls to batch
 * @param requireSuccess - If true, revert entire batch if any call fails
 * @returns Array of results matching the input calls order
 */
export async function multicallRead<T extends readonly MulticallCall[]>(
  client: PublicClient,
  calls: T,
  requireSuccess = false
): Promise<MulticallResult[]> {
  if (calls.length === 0) {
    return []
  }

  try {
    // Encode all function calls for Multicall3
    const encodedCalls = calls.map((call) => ({
      target: call.address,
      allowFailure: !requireSuccess,
      callData: encodeFunctionData({
        abi: call.abi,
        functionName: call.functionName,
        args: call.args
      })
    }))

    logger.debug('Multicall batch request', {
      callCount: calls.length,
      requireSuccess
    })

    // Execute multicall using Multicall3's aggregate3
    const results = await client.readContract({
      address: MULTICALL3_ADDRESS,
      abi: MULTICALL3_ABI,
      functionName: 'aggregate3',
      args: [encodedCalls]
    })

    // Decode results
    return (results as any[]).map((result, index) => {
      const call = calls[index]

      if (!result.success) {
        logger.warn('Multicall individual call failed', {
          index,
          address: call.address,
          functionName: call.functionName
        })
        return {
          success: false,
          error: new Error(`Call to ${call.functionName} failed`)
        }
      }

      try {
        const decoded = decodeFunctionResult({
          abi: call.abi,
          functionName: call.functionName,
          data: result.returnData
        })

        return {
          success: true,
          data: decoded
        }
      } catch (error) {
        logger.error('Multicall decode error', error, {
          index,
          functionName: call.functionName
        })
        return {
          success: false,
          error: error as Error
        }
      }
    })
  } catch (error) {
    logger.error('Multicall batch failed', error, {
      callCount: calls.length
    })

    // Return failed results for all calls
    return calls.map(() => ({
      success: false,
      error: error as Error
    }))
  }
}

/**
 * Batch read property data for multiple token IDs
 * Optimized for PropertyShare1155 contract
 */
export async function batchReadProperties(
  client: PublicClient,
  propertyAddress: Address,
  propertyAbi: Abi,
  tokenIds: number[]
): Promise<MulticallResult[]> {
  const calls: MulticallCall[] = tokenIds.flatMap((tokenId) => [
    {
      address: propertyAddress,
      abi: propertyAbi,
      functionName: 'getProperty',
      args: [BigInt(tokenId)]
    },
    {
      address: propertyAddress,
      abi: propertyAbi,
      functionName: 'totalSupply',
      args: [BigInt(tokenId)]
    }
  ])

  return multicallRead(client, calls, false)
}

/**
 * Batch read user balances for multiple token IDs
 */
export async function batchReadBalances(
  client: PublicClient,
  propertyAddress: Address,
  propertyAbi: Abi,
  userAddress: Address,
  tokenIds: number[]
): Promise<MulticallResult[]> {
  const calls: MulticallCall[] = tokenIds.map((tokenId) => ({
    address: propertyAddress,
    abi: propertyAbi,
    functionName: 'balanceOf',
    args: [userAddress, BigInt(tokenId)]
  }))

  return multicallRead(client, calls, false)
}

/**
 * Batch read claimable amounts for multiple token IDs
 */
export async function batchReadClaimableAmounts(
  client: PublicClient,
  revenueSplitterAddress: Address,
  revenueSplitterAbi: Abi,
  userAddress: Address,
  tokenIds: number[]
): Promise<MulticallResult[]> {
  const calls: MulticallCall[] = tokenIds.map((tokenId) => ({
    address: revenueSplitterAddress,
    abi: revenueSplitterAbi,
    functionName: 'getClaimableAmount',
    args: [BigInt(tokenId), userAddress]
  }))

  return multicallRead(client, calls, false)
}
