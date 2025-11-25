/**
 * Relayer utilities for creating wallet clients with private key
 * Used for server-side blockchain interactions (e.g., KYC approval, SBT minting)
 */

import { createPublicClient, createWalletClient, http } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { arbitrumSepolia } from 'viem/chains'
import { logger } from './logger'

/**
 * Get the relayer wallet client for signing transactions
 * Reads RELAYER_PRIVATE_KEY from environment variables
 */
export function getRelayerWalletClient() {
  const relayerPrivateKey = process.env.RELAYER_PRIVATE_KEY

  if (!relayerPrivateKey) {
    const error = new Error('RELAYER_PRIVATE_KEY not configured in environment variables')
    logger.error('Relayer configuration error', error)
    throw error
  }

  // Ensure private key starts with 0x
  const formattedKey = relayerPrivateKey.startsWith('0x')
    ? relayerPrivateKey
    : `0x${relayerPrivateKey}`

  try {
    const account = privateKeyToAccount(formattedKey as `0x${string}`)
    const rpcUrl = process.env.NEXT_PUBLIC_ARBITRUM_RPC_URL || 'https://sepolia-rollup.arbitrum.io/rpc'

    const walletClient = createWalletClient({
      account,
      chain: arbitrumSepolia,
      transport: http(rpcUrl),
    })

    logger.info('Relayer wallet client created', {
      address: account.address,
      chain: arbitrumSepolia.name,
    })

    return {
      walletClient,
      account,
      address: account.address,
    }
  } catch (error) {
    logger.error('Failed to create relayer wallet client', error)
    throw new Error('Invalid relayer private key')
  }
}

/**
 * Get a public client for reading blockchain data
 */
export function getPublicClient() {
  const rpcUrl = process.env.NEXT_PUBLIC_ARBITRUM_RPC_URL || 'https://sepolia-rollup.arbitrum.io/rpc'

  return createPublicClient({
    chain: arbitrumSepolia,
    transport: http(rpcUrl),
  })
}




