'use client'

import { useAccount, useReadContract } from 'wagmi'
import { useEffect, useState, useMemo } from 'react'
import { CONTRACTS, USER_REGISTRY_ABI } from '@/lib/contracts'
import { logger } from '@/lib/logger'

type UserRole = 'NONE' | 'CLIENT' | 'SELLER' | 'ADMIN'
type KYCStatus = 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED'

interface UserProfile {
  role: UserRole
  kycStatus: KYCStatus
  name: string
  email: string
  documentHash: string
  exists: boolean
}

/**
 * Custom hook to fetch user role and KYC status from blockchain + database
 */
export function useUserRole() {
  const { address, isConnected } = useAccount()
  const [dbUser, setDbUser] = useState<any>(null)
  const [isLoadingDb, setIsLoadingDb] = useState(false)
  const [hasFetchedDb, setHasFetchedDb] = useState(false)
  const [lastAddress, setLastAddress] = useState<string | undefined>()

  // Reset when address changes
  useEffect(() => {
    if (address !== lastAddress) {
      setDbUser(null)
      setHasFetchedDb(false)
      setIsLoadingDb(false)
      setLastAddress(address)
    }
  }, [address, lastAddress])
  
  // Read user profile from blockchain
  const { data: profileData, isLoading: isLoadingChain, error, refetch } = useReadContract({
    address: CONTRACTS.UserRegistry,
    abi: USER_REGISTRY_ABI,
    functionName: 'getUserProfile',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && isConnected && CONTRACTS.UserRegistry !== '0x0000000000000000000000000000000000000000',
    }
  })

  // Fetch from database as backup/supplementary data
  useEffect(() => {
    // Reset when address changes
    if (!address) {
      setDbUser(null)
      setHasFetchedDb(false)
      setIsLoadingDb(false)
      return
    }

    // Don't fetch again if already fetched for this address
    if (hasFetchedDb) {
      return
    }

    let isMounted = true

    const fetchDbUser = async () => {
      setIsLoadingDb(true)
      try {
        console.log('🔍 Fetching user from database:', address)
        
        // Add timestamp to prevent caching
        const timestamp = Date.now()
        const response = await fetch(`/api/users/${address}?t=${timestamp}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache'
          }
        })
        
        console.log('📡 Response status:', response.status)
        
        if (!isMounted) return
        
        if (response.ok) {
          const data = await response.json()
          console.log('✅ User data received:', data)
          
          if (data.exists && isMounted) {
            setDbUser(data.user)
            console.log('👤 User role:', data.user.role, 'KYC:', data.user.kyc_status)
            logger.debug('User data fetched from database', { address })
          } else if (isMounted) {
            console.log('❌ User not found in database')
            setDbUser(null)
          }
        } else if (isMounted) {
          console.log('⚠️ Response not OK:', response.status)
          setDbUser(null)
        }
      } catch (error) {
        if (isMounted) {
          console.error('❌ Error fetching user:', error)
          logger.warn('Could not fetch user from database', { error })
          setDbUser(null)
        }
      } finally {
        if (isMounted) {
          setIsLoadingDb(false)
          setHasFetchedDb(true)
        }
      }
    }

    fetchDbUser()

    return () => {
      isMounted = false
    }
  }, [address, hasFetchedDb])
  
  // Parse profile data (prefer blockchain, fallback to database) - memoized
  const profile = useMemo(() => {
    const dataArray = (profileData as any) || []
    const blockchainProfile: UserProfile = profileData ? {
      role: parseRole(dataArray[0] as number),
      kycStatus: parseKYCStatus(dataArray[1] as number),
      name: dataArray[2] as string,
      email: dataArray[3] as string,
      documentHash: dataArray[4] as string,
      exists: dataArray[5] as boolean,
    } : {
      role: 'NONE',
      kycStatus: 'NONE',
      name: '',
      email: '',
      documentHash: '',
      exists: false,
    }

    // Merge blockchain + database data (blockchain is source of truth)
    return {
      role: blockchainProfile.exists ? blockchainProfile.role : (dbUser?.role || 'NONE'),
      kycStatus: blockchainProfile.exists ? blockchainProfile.kycStatus : (dbUser?.kyc_status || 'NONE'),
      name: blockchainProfile.name || dbUser?.name || '',
      email: blockchainProfile.email || dbUser?.email || '',
      documentHash: blockchainProfile.documentHash || '',
      exists: blockchainProfile.exists || !!dbUser,
    }
  }, [profileData, dbUser])
  
  // Debug logging - only when profile actually changes
  useEffect(() => {
    if (address) {
      console.log('🔐 Final profile:', {
        address,
        role: profile.role,
        kycStatus: profile.kycStatus,
        exists: profile.exists,
        fromBlockchain: !!(profileData as any)?.[5],
        fromDatabase: !!dbUser
      })
      console.log('⏱️ Loading states:', {
        isLoadingChain,
        isLoadingDb,
        totalLoading: isLoadingChain || isLoadingDb
      })
    }
  }, [address, profile.role, profile.kycStatus, profile.exists, isLoadingChain, isLoadingDb, profileData, dbUser])
  
  // Don't wait for blockchain if database has user info
  const actualLoading = dbUser ? isLoadingDb : (isLoadingChain || isLoadingDb)
  
  return {
    role: profile.role,
    kycStatus: profile.kycStatus,
    profile,
    isLoading: actualLoading,
    error,
    refetch,
    isRegistered: profile.exists,
    isKYCApproved: profile.kycStatus === 'APPROVED',
    isClient: profile.role === 'CLIENT',
    isSeller: profile.role === 'SELLER',
    isAdmin: profile.role === 'ADMIN',
  }
}

/**
 * Parse role enum from contract
 */
function parseRole(role: number): UserRole {
  switch (role) {
    case 0:
      return 'NONE'
    case 1:
      return 'CLIENT'
    case 2:
      return 'SELLER'
    case 3:
      return 'ADMIN'
    default:
      return 'NONE'
  }
}

/**
 * Parse KYC status enum from contract
 */
function parseKYCStatus(status: number): KYCStatus {
  switch (status) {
    case 0:
      return 'NONE'
    case 1:
      return 'PENDING'
    case 2:
      return 'APPROVED'
    case 3:
      return 'REJECTED'
    default:
      return 'NONE'
  }
}
