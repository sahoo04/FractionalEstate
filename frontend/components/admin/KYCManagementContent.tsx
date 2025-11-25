'use client'

import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { useRouter } from 'next/navigation'

interface KYCDocument {
  id: string
  user_wallet: string
  wallet_address: string
  full_name: string // Original from kyc_documents table (for details modal)
  display_name?: string // Normalized name for list display (optional, falls back to full_name)
  date_of_birth: string
  nationality: string
  address: string
  city: string
  state: string
  pincode: string
  id_type: string
  id_number: string
  address_proof_type: string
  document_hash: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  submitted_at: string
  reviewed_at?: string
  reviewed_by?: string
  rejection_reason?: string
  user_name?: string // From users table (optional)
  user_email?: string // From users table (optional)
}

export function KYCManagementContent() {
  const { address } = useAccount()
  const router = useRouter()
  const [kycDocuments, setKycDocuments] = useState<KYCDocument[]>([])
  const [filteredDocs, setFilteredDocs] = useState<KYCDocument[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING')
  const [selectedDoc, setSelectedDoc] = useState<KYCDocument | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [approvalProgress, setApprovalProgress] = useState<{
    step: string
    message: string
    currentStepIndex: number
    txHash?: string
  } | null>(null)

  // Fetch all KYC documents
  const fetchKYCDocuments = async () => {
    try {
      // Add multiple cache-busting parameters to force fresh data
      const timestamp = Date.now()
      const randomId = Math.random().toString(36).substring(7)
      const response = await fetch(`/api/admin/kyc/list?t=${timestamp}&_=${timestamp}&r=${randomId}&nocache=${Date.now()}`, {
        cache: 'no-store',
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0',
          'X-Requested-With': 'XMLHttpRequest',
        },
        credentials: 'same-origin',
      })
      if (response.ok) {
        const data = await response.json()
        console.log('[KYC Fetch] Documents loaded:', data.documents?.length || 0)
        const documents = data.documents || []
        setKycDocuments(documents)
        
        // Log status distribution for debugging
        const statusCounts = documents.reduce((acc: any, d: any) => {
          acc[d.status] = (acc[d.status] || 0) + 1
          return acc
        }, {})
        console.log('[KYC Fetch] Status distribution:', statusCounts)
      } else {
        console.error('Failed to fetch KYC documents:', response.status, response.statusText)
      }
    } catch (error) {
      console.error('Error fetching KYC documents:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchKYCDocuments()
    // Refetch every 5 seconds to catch updates
    const interval = setInterval(() => {
      fetchKYCDocuments()
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  // Filter documents
  useEffect(() => {
    if (filter === 'ALL') {
      setFilteredDocs(kycDocuments)
    } else {
      setFilteredDocs(kycDocuments.filter(doc => doc.status === filter))
    }
  }, [filter, kycDocuments])

  const handleApprove = async (doc: KYCDocument) => {
    setActionLoading(true)
    const userWallet = doc.wallet_address || doc.user_wallet
    const docId = doc.id // Store doc.id to use in optimistic update
    
    try {
      // Step 1: Initializing
      setApprovalProgress({ 
        step: 'initializing', 
        message: 'Starting approval process...', 
        currentStepIndex: 0 
      })
      await new Promise(resolve => setTimeout(resolve, 800))

      // Step 2: Generating ZK Proof
      setApprovalProgress({ 
        step: 'proof', 
        message: 'Generating ZK proof...', 
        currentStepIndex: 1 
      })
      await new Promise(resolve => setTimeout(resolve, 500))

      const response = await fetch('/api/admin/kyc/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: userWallet,
          adminAddress: address
        })
      })

      const data = await response.json()

      if (response.ok) {
        // Step 3: Uploading to IPFS
        setApprovalProgress({ 
          step: 'ipfs', 
          message: 'Uploading metadata to IPFS...', 
          currentStepIndex: 2 
        })
        await new Promise(resolve => setTimeout(resolve, 800))

        // Step 4: Minting SBT
        setApprovalProgress({ 
          step: 'minting', 
          message: 'Minting SBT NFT...', 
          currentStepIndex: 3 
        })
        await new Promise(resolve => setTimeout(resolve, 1000))

        // Step 5: Updating Database
        setApprovalProgress({ 
          step: 'database', 
          message: 'Updating database...', 
          currentStepIndex: 4 
        })
        await new Promise(resolve => setTimeout(resolve, 500))

        // Immediately update local state optimistically
        const normalizedWallet = (userWallet || '').toLowerCase()
        setKycDocuments(prev => prev.map(d => {
          const docWallet = (d.wallet_address || d.user_wallet || '').toLowerCase()
          if (d.id === docId || docWallet === normalizedWallet) {
            return { ...d, status: 'APPROVED' as const }
          }
          return d
        }))

        // Completed
        setApprovalProgress({
          step: 'completed',
          message: 'KYC Approved Successfully!',
          currentStepIndex: 5,
          txHash: data.sbtTxHash
        })

        setSelectedDoc(null)

        // Force immediate refetch and clear all caches
        router.refresh() // Force Next.js to refresh the page data
        await fetchKYCDocuments()
        
        // Retry after 2 seconds with router refresh
        setTimeout(async () => {
          router.refresh()
          await fetchKYCDocuments()
        }, 2000)
        
        // Retry after 5 seconds with router refresh
        setTimeout(async () => {
          router.refresh()
          await fetchKYCDocuments()
        }, 5000)

        // Auto-close progress modal after 3 seconds
        setTimeout(() => {
          setApprovalProgress(null)
          router.refresh() // Final refresh to ensure UI is in sync
        }, 3000)
      } else {
        const errorMsg = data.error || data.details || 'Unknown error'
        setApprovalProgress({
          step: 'error',
          message: `Failed to approve KYC: ${errorMsg}`,
          currentStepIndex: -1
        })
        console.error('KYC Approval Error:', data)
        
        // Auto-close error after 5 seconds
        setTimeout(() => {
          setApprovalProgress(null)
        }, 5000)
      }
    } catch (error) {
      setApprovalProgress({
        step: 'error',
        message: (error as Error).message,
        currentStepIndex: -1
      })
      
      // Auto-close error after 5 seconds
      setTimeout(() => {
        setApprovalProgress(null)
      }, 5000)
    } finally {
      setActionLoading(false)
    }
  }

  const handleReject = async (doc: KYCDocument) => {
    if (!rejectionReason.trim()) {
      alert('Please provide a rejection reason')
      return
    }

    setActionLoading(true)
    try {
      const response = await fetch('/api/admin/kyc/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: doc.wallet_address || doc.user_wallet,
          reason: rejectionReason,
          adminAddress: address
        })
      })

      if (response.ok) {
        // Force refetch to get updated data from database (don't rely on local state update)
        router.refresh() // Force Next.js to refresh the page data
        await fetchKYCDocuments()
        setSelectedDoc(null)
        setRejectionReason('')
        alert('❌ KYC Rejected')
      } else {
        const data = await response.json()
        alert('❌ Failed to reject: ' + data.error)
      }
    } catch (error) {
      alert('❌ Error: ' + error)
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header with gradient accent */}
      <div className="relative overflow-hidden bg-gradient-to-r from-primary-500 to-web3-500 rounded-2xl p-8 shadow-card">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white break-words">KYC Management</h1>
              <p className="text-white/90 break-words">Review and approve user KYC submissions</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-card p-6 border border-gray-100">
        <div className="flex flex-wrap gap-3">
          {[
            { key: 'ALL', label: 'All', icon: 'M4 6h16M4 12h16M4 18h16', gradient: 'from-gray-500 to-gray-600' },
            { key: 'PENDING', label: 'Pending', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', gradient: 'from-yellow-500 to-yellow-600' },
            { key: 'APPROVED', label: 'Approved', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', gradient: 'from-success-500 to-success-600' },
            { key: 'REJECTED', label: 'Rejected', icon: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z', gradient: 'from-red-500 to-red-600' }
          ].map((f) => {
            const count = kycDocuments.filter(d => f.key === 'ALL' || d.status === f.key).length
            const isActive = filter === f.key
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key as any)}
                className={`group relative px-5 py-3 rounded-xl font-semibold transition-all duration-300 ${
                  isActive
                    ? `bg-gradient-to-r ${f.gradient} text-white shadow-lg hover:shadow-xl scale-105`
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100 hover:scale-105'
                }`}
              >
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={f.icon} />
                  </svg>
                  <span>{f.label}</span>
                  <span className={`px-2 py-0.5 text-xs rounded-full ${
                    isActive ? 'bg-white/20' : 'bg-gray-200'
                  }`}>
                    {count}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* KYC Documents List */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-2xl p-6 shadow-card border border-gray-100 animate-pulse">
              <div className="flex gap-4">
                <div className="w-16 h-16 bg-gray-200 rounded-xl" />
                <div className="flex-1 space-y-3">
                  <div className="h-6 bg-gray-200 rounded-lg w-1/3" />
                  <div className="h-4 bg-gray-200 rounded w-2/3" />
                  <div className="grid grid-cols-3 gap-4">
                    <div className="h-4 bg-gray-200 rounded" />
                    <div className="h-4 bg-gray-200 rounded" />
                    <div className="h-4 bg-gray-200 rounded" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredDocs.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-card p-16 text-center border border-gray-100">
          <div className="w-24 h-24 bg-gradient-to-br from-primary-100 to-web3-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-12 h-12 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-gray-500 text-lg font-medium mb-2">No KYC documents found</p>
          <p className="text-gray-400 text-sm">Filtering by: {filter}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {filteredDocs.map((doc) => (
            <div key={doc.id} className="group bg-white rounded-2xl shadow-card hover:shadow-card-hover border border-gray-100 overflow-hidden transition-all duration-300 hover:-translate-y-1">
              <div className="p-6">
                <div className="flex justify-between items-start gap-6">
                  <div className="flex-1 min-w-0">
                    {/* Header with Status */}
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-14 h-14 bg-gradient-to-br from-primary-500 to-web3-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                        <span className="text-white font-bold text-lg">
                          {(doc.display_name || doc.full_name || doc.user_name || 'U').charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-xl font-bold text-gray-900 break-words mb-1">
                          {doc.display_name || doc.full_name || doc.user_name || doc.wallet_address?.slice(0, 10) + '...' || 'Unknown User'}
                        </h3>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-sm font-semibold shadow-sm ${
                              doc.status === 'APPROVED'
                                ? 'bg-gradient-to-r from-success-500 to-success-600 text-white'
                                : doc.status === 'REJECTED'
                                ? 'bg-gradient-to-r from-red-500 to-red-600 text-white'
                                : 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-white'
                            }`}
                          >
                            {doc.status === 'APPROVED' && (
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                            )}
                            {doc.status === 'REJECTED' && (
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                              </svg>
                            )}
                            {doc.status === 'PENDING' && (
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                              </svg>
                            )}
                            {doc.status}
                          </span>
                          <span className="text-sm text-gray-500">
                            Submitted {new Date(doc.submitted_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Info Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="bg-gray-50 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <svg className="w-4 h-4 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                          </svg>
                          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Nationality</span>
                        </div>
                        <p className="font-semibold text-gray-900 break-words">{doc.nationality}</p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <svg className="w-4 h-4 text-web3-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Date of Birth</span>
                        </div>
                        <p className="font-semibold text-gray-900">{doc.date_of_birth}</p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <svg className="w-4 h-4 text-success-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                          </svg>
                          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">ID Type</span>
                        </div>
                        <p className="font-semibold text-gray-900 uppercase">{doc.id_type}</p>
                      </div>
                    </div>

                    {/* Wallet Address */}
                    <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-4 mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                        </svg>
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Wallet Address</span>
                      </div>
                      <p className="font-mono text-sm text-gray-900 break-all">{doc.wallet_address || doc.user_wallet}</p>
                    </div>

                    {/* Address Info */}
                    <div className="bg-gray-50 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Residential Address</span>
                      </div>
                      <p className="text-sm text-gray-900 break-words">
                        {doc.address}, {doc.city}, {doc.state} - {doc.pincode}
                      </p>
                    </div>

                    {/* Rejection Reason */}
                    {doc.rejection_reason && (
                      <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl">
                        <div className="flex items-start gap-3">
                          <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <div className="min-w-0">
                            <span className="text-red-800 font-semibold text-sm break-words">Rejection Reason:</span>
                            <p className="text-red-700 text-sm mt-1 break-words">{doc.rejection_reason}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col gap-3 flex-shrink-0">
                    <button
                      onClick={() => setSelectedDoc(doc)}
                      className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 font-medium flex items-center justify-center gap-2 hover:-translate-y-0.5"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      View
                    </button>
                    {doc.status === 'PENDING' && (
                      <>
                        <button
                          onClick={() => handleApprove(doc)}
                          disabled={actionLoading}
                          className="px-5 py-2.5 bg-gradient-to-r from-success-500 to-success-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:-translate-y-0.5"
                        >
                          {actionLoading ? (
                            <>
                              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              <span>Processing...</span>
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                              Approve
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => {
                            setSelectedDoc(doc)
                            setRejectionReason('')
                          }}
                          disabled={actionLoading}
                          className="px-5 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:-translate-y-0.5"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                          Reject
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Document Detail Modal */}
      {selectedDoc && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-200">
            {/* Modal Header with Gradient */}
            <div className="sticky top-0 bg-gradient-to-r from-primary-500 to-web3-500 px-8 py-6 rounded-t-3xl z-10">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold text-white break-words">KYC Document Details</h2>
                  <p className="text-white/90 text-sm mt-1">Complete verification information</p>
                </div>
                <button
                  onClick={() => {
                    setSelectedDoc(null)
                    setRejectionReason('')
                  }}
                  className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-xl transition-colors flex items-center justify-center"
                >
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-8 space-y-6">
              {/* Personal Information */}
              <div className="bg-gray-50 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">Personal Information</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Full Name</span>
                    <p className="text-gray-900 font-semibold mt-1 break-words">{selectedDoc.full_name}</p>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Date of Birth</span>
                    <p className="text-gray-900 font-semibold mt-1">{selectedDoc.date_of_birth}</p>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Nationality</span>
                    <p className="text-gray-900 font-semibold mt-1">{selectedDoc.nationality}</p>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Wallet Address</span>
                    <p className="text-gray-900 font-mono text-xs mt-1 break-all">{selectedDoc.wallet_address || selectedDoc.user_wallet}</p>
                  </div>
                </div>
              </div>

              {/* Address Information */}
              <div className="bg-gray-50 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 bg-web3-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-web3-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">Residential Address</h3>
                </div>
                <p className="text-gray-900 break-words">
                  {selectedDoc.address}<br />
                  {selectedDoc.city}, {selectedDoc.state} - {selectedDoc.pincode}
                </p>
              </div>

              {/* Identity Verification */}
              <div className="bg-gray-50 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 bg-success-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-success-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">Identity Verification</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">ID Type</span>
                    <p className="text-gray-900 font-semibold mt-1 uppercase">{selectedDoc.id_type}</p>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">ID Number</span>
                    <p className="text-gray-900 font-semibold mt-1 break-words">{selectedDoc.id_number}</p>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Address Proof</span>
                    <p className="text-gray-900 font-semibold mt-1 uppercase">{selectedDoc.address_proof_type}</p>
                  </div>
                </div>
              </div>

              {/* Documents */}
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">Documents (IPFS)</h3>
                </div>
                <a
                  href={`https://gateway.pinata.cloud/ipfs/${selectedDoc.document_hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  View Documents on IPFS
                </a>
              </div>

              {/* Review Actions */}
              {selectedDoc.status === 'PENDING' && (
                <div className="border-t-2 border-gray-200 pt-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Review Actions</h3>
                  
                  <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 mb-4">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Rejection Reason (if rejecting):
                    </label>
                    <textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      className="w-full border-2 border-gray-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                      rows={3}
                      placeholder="Provide a clear reason for rejection..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => handleApprove(selectedDoc)}
                      disabled={actionLoading}
                      className="px-6 py-4 bg-gradient-to-r from-success-500 to-success-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:-translate-y-0.5"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Approve KYC
                    </button>
                    <button
                      onClick={() => handleReject(selectedDoc)}
                      disabled={actionLoading || !rejectionReason.trim()}
                      className="px-6 py-4 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:-translate-y-0.5"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      Reject KYC
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Approval Progress Modal */}
      {approvalProgress && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-gray-200 overflow-hidden">
            {approvalProgress.step === 'completed' ? (
              <div className="p-8">
                <div className="flex flex-col items-center text-center">
                  <div className="w-20 h-20 bg-gradient-to-br from-success-400 to-success-600 rounded-full flex items-center justify-center mb-6 animate-bounce-slow">
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">KYC Approved!</h3>
                  <p className="text-gray-600 mb-6">SBT has been successfully minted</p>
                  
                  {approvalProgress.txHash && (
                    <div className="w-full bg-gradient-to-r from-primary-50 to-web3-50 rounded-xl p-4 mb-4">
                      <p className="text-xs text-gray-500 mb-2">Transaction Hash</p>
                      <p className="font-mono text-xs text-gray-900 break-all">{approvalProgress.txHash}</p>
                      <a
                        href={`https://sepolia.arbiscan.io/tx/${approvalProgress.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 inline-flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 font-medium"
                      >
                        <span>View on Arbiscan</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    </div>
                  )}
                  
                  <div className="text-sm text-gray-500">Closing automatically...</div>
                </div>
              </div>
            ) : approvalProgress.step === 'error' ? (
              <div className="p-8">
                <div className="flex flex-col items-center text-center">
                  <div className="w-20 h-20 bg-gradient-to-br from-red-400 to-red-600 rounded-full flex items-center justify-center mb-6">
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Approval Failed</h3>
                  <p className="text-gray-600 mb-4">{approvalProgress.message}</p>
                  
                  <div className="text-sm text-gray-500">Closing automatically...</div>
                </div>
              </div>
            ) : (
              <div className="p-8">
                <div className="flex flex-col items-center text-center">
                  <div className="relative w-20 h-20 mb-6">
                    <div className="absolute inset-0 border-4 border-primary-200 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-primary-600 rounded-full border-t-transparent animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                  
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Processing Approval</h3>
                  <p className="text-gray-600 mb-6">{approvalProgress.message}</p>
                  
                  <div className="w-full space-y-3">
                    {/* Step 1: ZK Proof */}
                    <div className="flex items-center gap-3 text-sm">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                        approvalProgress.currentStepIndex >= 1 
                          ? 'bg-success-100' 
                          : approvalProgress.currentStepIndex === 0 
                          ? 'bg-primary-100' 
                          : 'bg-gray-100'
                      }`}>
                        {approvalProgress.currentStepIndex > 1 ? (
                          <svg className="w-3 h-3 text-success-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : approvalProgress.currentStepIndex === 1 ? (
                          <div className="w-2 h-2 rounded-full bg-primary-600 animate-pulse"></div>
                        ) : (
                          <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                        )}
                      </div>
                      <span className={approvalProgress.currentStepIndex >= 1 ? 'text-gray-900 font-medium' : 'text-gray-500'}>Generating ZK proof...</span>
                    </div>

                    {/* Step 2: IPFS Upload */}
                    <div className="flex items-center gap-3 text-sm">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                        approvalProgress.currentStepIndex >= 3 
                          ? 'bg-success-100' 
                          : approvalProgress.currentStepIndex === 2 
                          ? 'bg-primary-100' 
                          : 'bg-gray-100'
                      }`}>
                        {approvalProgress.currentStepIndex > 2 ? (
                          <svg className="w-3 h-3 text-success-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : approvalProgress.currentStepIndex === 2 ? (
                          <div className="w-2 h-2 rounded-full bg-primary-600 animate-pulse"></div>
                        ) : (
                          <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                        )}
                      </div>
                      <span className={approvalProgress.currentStepIndex >= 2 ? 'text-gray-900 font-medium' : 'text-gray-500'}>Uploading metadata to IPFS...</span>
                    </div>

                    {/* Step 3: Minting SBT */}
                    <div className="flex items-center gap-3 text-sm">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                        approvalProgress.currentStepIndex >= 4 
                          ? 'bg-success-100' 
                          : approvalProgress.currentStepIndex === 3 
                          ? 'bg-primary-100' 
                          : 'bg-gray-100'
                      }`}>
                        {approvalProgress.currentStepIndex > 3 ? (
                          <svg className="w-3 h-3 text-success-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : approvalProgress.currentStepIndex === 3 ? (
                          <div className="w-2 h-2 rounded-full bg-primary-600 animate-pulse"></div>
                        ) : (
                          <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                        )}
                      </div>
                      <span className={approvalProgress.currentStepIndex >= 3 ? 'text-gray-900 font-medium' : 'text-gray-500'}>Minting SBT NFT...</span>
                    </div>

                    {/* Step 4: Database Update */}
                    <div className="flex items-center gap-3 text-sm">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                        approvalProgress.currentStepIndex >= 5 
                          ? 'bg-success-100' 
                          : approvalProgress.currentStepIndex === 4 
                          ? 'bg-primary-100' 
                          : 'bg-gray-100'
                      }`}>
                        {approvalProgress.currentStepIndex >= 5 ? (
                          <svg className="w-3 h-3 text-success-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : approvalProgress.currentStepIndex === 4 ? (
                          <div className="w-2 h-2 rounded-full bg-primary-600 animate-pulse"></div>
                        ) : (
                          <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                        )}
                      </div>
                      <span className={approvalProgress.currentStepIndex >= 4 ? 'text-gray-900 font-medium' : 'text-gray-500'}>Updating database...</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
