'use client'

import { useAccount, useDisconnect } from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import Link from 'next/link'
import { Badge } from '@/components/ui/Badge'
import { formatAddress } from '@/lib/utils'
import { useUserRole } from '@/hooks/useUserRole'

export function WalletButton() {
  const { address, isConnected } = useAccount()
  const { disconnect } = useDisconnect()
  const { role, kycStatus, isLoading } = useUserRole()
  
  if (!isConnected) {
    return <ConnectButton />
  }
  
  return (
    <div className="flex items-center gap-3">
      {/* KYC Status Badge - Not shown for Admin */}
      {role !== 'NONE' && role !== 'ADMIN' && (
        <Badge 
          variant={
            kycStatus === 'APPROVED' ? 'success' :
            kycStatus === 'PENDING' ? 'warning' :
            kycStatus === 'REJECTED' ? 'error' : 'default'
          }
          size="sm"
          dot
        >
          {kycStatus === 'APPROVED' && 'Verified'}
          {kycStatus === 'PENDING' && 'KYC Pending'}
          {kycStatus === 'REJECTED' && 'KYC Rejected'}
          {kycStatus === 'NONE' && 'Complete KYC'}
        </Badge>
      )}
      
      {/* Admin Badge */}
      {role === 'ADMIN' && (
        <Badge variant="success" size="sm" dot>
          Admin
        </Badge>
      )}
      
      {/* Wallet Dropdown */}
      <div className="relative group">
        <button className="btn-secondary flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span className="font-mono">{formatAddress(address!)}</span>
        </button>
        
        {/* Dropdown Menu */}
        <div className="absolute right-0 mt-2 w-48 glass-modal rounded-lg shadow-lg border border-gray-200/50 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50 animate-slide-down">
          <div className="px-4 py-2 text-sm text-gray-500 border-b">
            {role !== 'NONE' ? role : 'Not Registered'}
          </div>
          <Link 
            href="/dashboard" 
            className="block px-4 py-2 text-sm hover:bg-white/50 transition-all duration-300 hover:scale-105"
          >
            Dashboard
          </Link>
          {/* Admin Panel Link - Only for Admin */}
          {role === 'ADMIN' && (
            <Link 
              href="/admin" 
              className="block px-4 py-2 text-sm hover:bg-white/50 transition-all duration-300 hover:scale-105"
            >
              Admin Panel
            </Link>
          )}
          {/* Register Link - Only if not registered */}
          {role === 'NONE' && (
            <Link 
              href="/register" 
              className="block px-4 py-2 text-sm hover:bg-white/50 transition-all duration-300 hover:scale-105"
            >
              Register Account
            </Link>
          )}
          {/* KYC Link - Only if not admin and KYC not done */}
          {kycStatus === 'NONE' && role !== 'NONE' && role !== 'ADMIN' && (
            <Link 
              href="/kyc" 
              className="block px-4 py-2 text-sm hover:bg-white/50 transition-all duration-300 hover:scale-105"
            >
              Complete KYC
            </Link>
          )}
          <button 
            onClick={() => disconnect()}
            className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50/50 transition-all duration-300 hover:scale-105"
          >
            Disconnect
          </button>
        </div>
      </div>
    </div>
  )
}
