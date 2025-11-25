'use client'

import { useEffect, useCallback } from 'react'
import { useAccount, useSignMessage } from 'wagmi'
import { logger } from '@/lib/logger'

/**
 * Custom hook to handle wallet authentication via signature
 * This fixes MetaMask authorization issues by requesting a signature on connect
 */
export function useWalletAuth() {
  const { address, isConnected, connector } = useAccount()
  const { signMessageAsync } = useSignMessage()

  const authenticateWallet = useCallback(async () => {
    if (!address || !isConnected) return

    try {
      // Check if we've already authenticated this session
      const authKey = `wallet_auth_${address}`
      const alreadyAuthed = sessionStorage.getItem(authKey)
      
      if (alreadyAuthed) {
        logger.debug('Wallet already authenticated this session', { address })
        return
      }

      // Request signature to authorize the dApp
      const message = `Welcome to FractionalStay!\n\nSign this message to verify your wallet ownership.\n\nThis request will not trigger a blockchain transaction or cost any gas fees.\n\nWallet: ${address}\nTimestamp: ${Date.now()}`
      
      logger.info('Requesting wallet signature for authorization', { address })
      
      const signature = await signMessageAsync({ message })
      
      if (signature) {
        // Store authentication in session
        sessionStorage.setItem(authKey, 'true')
        logger.info('Wallet authenticated successfully', { 
          address,
          signatureLength: signature.length 
        })
      }
    } catch (error: any) {
      // User rejected signature - this is okay, app will still work
      if (error?.message?.includes('User rejected')) {
        logger.warn('User rejected signature request', { address })
      } else {
        logger.error('Error authenticating wallet', error, { address })
      }
    }
  }, [address, isConnected, signMessageAsync])

  // Auto-authenticate when wallet connects
  useEffect(() => {
    if (isConnected && address) {
      // Small delay to ensure wallet is fully connected
      const timer = setTimeout(() => {
        authenticateWallet()
      }, 1000)

      return () => clearTimeout(timer)
    }
  }, [isConnected, address, authenticateWallet])

  return {
    isAuthenticated: isConnected && !!sessionStorage.getItem(`wallet_auth_${address}`),
    authenticate: authenticateWallet,
  }
}
