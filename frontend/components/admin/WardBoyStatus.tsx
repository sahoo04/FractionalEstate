'use client'

import { useState, useEffect } from 'react'
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { CONTRACTS, REVENUE_SPLITTER_ABI } from '@/lib/contracts'
import { UserCheck, UserX, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface WardBoyStatusProps {
  tokenId: number
}

export function WardBoyStatus({ tokenId }: WardBoyStatusProps) {
  const [isAssigning, setIsAssigning] = useState(false)
  const [wardBoyAddress, setWardBoyAddress] = useState('')
  const [error, setError] = useState('')

  // Read current ward boy from contract
  const { data: currentWardBoy, refetch } = useReadContract({
    address: CONTRACTS.RevenueSplitter,
    abi: REVENUE_SPLITTER_ABI,
    functionName: 'propertyManagers',
    args: [BigInt(tokenId)],
  })

  const { writeContract, data: txHash, isPending } = useWriteContract()
  
  const { isSuccess: isTxSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  })

  // Refetch after transaction success and update database
  useEffect(() => {
    if (isTxSuccess && txHash) {
      // Update database after successful transaction
      updateDatabase()
      refetch()
      setIsAssigning(false)
      setWardBoyAddress('')
      setError('')
    }
  }, [isTxSuccess, txHash, refetch])

  const updateDatabase = async () => {
    if (!supabase || !txHash) return

    try {
      // If removing, deactivate
      if (!isAssigning && currentWardBoy === '0x0000000000000000000000000000000000000000') {
        await (supabase as any)
          .from('ward_boy_mappings')
          .update({ 
            is_active: false,
            removed_at: new Date().toISOString()
          })
          .eq('property_id', tokenId)
      }
    } catch (err) {
      console.error('Database update error:', err)
    }
  }

  const handleAssign = async () => {
    if (!wardBoyAddress || wardBoyAddress.length !== 42 || !wardBoyAddress.startsWith('0x')) {
      setError('Invalid address format')
      return
    }

    try {
      setError('')
      
      // First update database
      if (supabase) {
        const { error: dbError } = await (supabase as any)
          .from('ward_boy_mappings')
          .upsert({
            property_id: tokenId,
            ward_boy_address: wardBoyAddress.toLowerCase(),
            is_active: true,
            assigned_at: new Date().toISOString(),
          }, {
            onConflict: 'property_id'
          })
        
        if (dbError) {
          console.error('Database error:', dbError)
          setError('Database update failed')
          return
        }
      }

      // Then call contract
      writeContract({
        address: CONTRACTS.RevenueSplitter,
        abi: REVENUE_SPLITTER_ABI,
        functionName: 'assignPropertyManager',
        args: [BigInt(tokenId), wardBoyAddress as `0x${string}`],
        gas: 200000n,
      })
    } catch (err: any) {
      setError(err.message || 'Failed to assign ward boy')
    }
  }

  const handleRemove = async () => {
    if (!confirm('Remove ward boy from this property?')) return

    try {
      setError('')
      
      // First update database
      if (supabase) {
        const { error: dbError } = await (supabase as any)
          .from('ward_boy_mappings')
          .update({ 
            is_active: false,
            removed_at: new Date().toISOString()
          })
          .eq('property_id', tokenId)
        
        if (dbError) {
          console.error('Database error:', dbError)
          setError('Database update failed')
          return
        }
      }

      // Then call contract
      writeContract({
        address: CONTRACTS.RevenueSplitter,
        abi: REVENUE_SPLITTER_ABI,
        functionName: 'removePropertyManager',
        args: [BigInt(tokenId)],
        gas: 150000n,
      })
    } catch (err: any) {
      setError(err.message || 'Failed to remove ward boy')
    }
  }

  const hasWardBoy = currentWardBoy && currentWardBoy !== '0x0000000000000000000000000000000000000000'

  if (isPending) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Processing...</span>
      </div>
    )
  }

  if (hasWardBoy && !isAssigning) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm">
          <UserCheck className="h-4 w-4 text-green-600" />
          <span className="text-green-700 font-medium">Ward Boy Assigned</span>
        </div>
        <div className="text-xs text-gray-600 font-mono bg-gray-50 p-2 rounded">
          {currentWardBoy?.slice(0, 6)}...{currentWardBoy?.slice(-4)}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setIsAssigning(true)}
            className="flex-1 px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
          >
            Change
          </button>
          <button
            onClick={handleRemove}
            className="flex-1 px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
          >
            Remove
          </button>
        </div>
      </div>
    )
  }

  if (isAssigning || !hasWardBoy) {
    return (
      <div className="space-y-2">
        <input
          type="text"
          value={wardBoyAddress}
          onChange={(e) => setWardBoyAddress(e.target.value)}
          placeholder="Ward Boy Address (0x...)"
          className="w-full px-2 py-1 text-sm border rounded"
        />
        {error && (
          <p className="text-xs text-red-600">{error}</p>
        )}
        <div className="flex gap-2">
          <button
            onClick={handleAssign}
            disabled={!wardBoyAddress || isPending}
            className="flex-1 px-2 py-1 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-gray-400"
          >
            {hasWardBoy ? 'Update' : 'Assign'}
          </button>
          {hasWardBoy && (
            <button
              onClick={() => {
                setIsAssigning(false)
                setWardBoyAddress('')
                setError('')
              }}
              className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    )
  }

  return null
}
