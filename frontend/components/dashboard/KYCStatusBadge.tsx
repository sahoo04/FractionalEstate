'use client'

import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { CONTRACTS } from '@/lib/contracts'
import Link from 'next/link'

interface SBTData {
  hasSBT: boolean
  tokenId: number | null
  metadataURI: string | null
  metadataCID: string | null
  proofHash: string | null
  verifiedAt: string | null
  userName: string | null
  kycStatus: string | null
}

export function KYCStatusBadge() {
  const { address, isConnected } = useAccount()
  const [sbtData, setSbtData] = useState<SBTData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    if (!address || !isConnected) {
      setIsLoading(false)
      return
    }

    const fetchSBTData = async () => {
      try {
        const response = await fetch(`/api/users/${address}`)
        if (response.ok) {
          const data = await response.json()
          const user = data.user
          
          setSbtData({
            hasSBT: !!user.sbt_token_id,
            tokenId: user.sbt_token_id || null,
            metadataURI: user.sbt_metadata_cid ? `ipfs://${user.sbt_metadata_cid}` : null,
            metadataCID: user.sbt_metadata_cid || null,
            proofHash: user.proof_hash || null,
            verifiedAt: user.verified_at || null,
            userName: user.name || null,
            kycStatus: user.kyc_status || null,
          })
        }
      } catch (error) {
        console.error('Error fetching SBT data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchSBTData()
  }, [address, isConnected])

  if (!isConnected || isLoading) {
    return (
      <div className="group bg-white rounded-2xl shadow-card p-6 border border-gray-100">
        <div className="animate-pulse">
          <div className="h-12 w-12 bg-gray-200 rounded-xl mb-4"></div>
          <div className="h-8 bg-gray-200 rounded mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
      </div>
    )
  }

  // Show Complete KYC card if no SBT
  if (!sbtData?.hasSBT) {
    const isPending = sbtData?.kycStatus === 'PENDING'
    
    return (
      <div className="group relative bg-white rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 p-7 border border-gray-100 hover:-translate-y-2 overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-50 rounded-full blur-3xl opacity-50 group-hover:opacity-100 transition-opacity"></div>
        <div className="relative">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              {isPending ? 'KYC Pending' : 'Identity Verification'}
            </h3>
            <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
              {isPending ? (
                <svg className="w-7 h-7 text-white animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              ) : (
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              )}
            </div>
          </div>
          
          {isPending ? (
            <>
              <div className="text-5xl font-extrabold text-gray-900 mb-2 tracking-tight">⏳</div>
              <p className="text-sm text-gray-600 font-medium flex items-center gap-1.5">
                <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
                <span>KYC under review</span>
              </p>
            </>
          ) : (
            <>
              <div className="text-5xl font-extrabold text-gray-900 mb-2 tracking-tight">🔒</div>
              <p className="text-sm text-gray-600 font-medium mb-4">Complete KYC to invest</p>
              <Link 
                href="/kyc"
                className="inline-flex items-center gap-2 text-sm font-bold text-amber-600 hover:text-amber-700 transition-colors"
              >
                <span>Start Verification</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            </>
          )}
        </div>
      </div>
    )
  }

  const arbiscanUrl = `https://sepolia.arbiscan.io/token/${CONTRACTS.IdentitySBT}?a=${sbtData.tokenId}`
  const ipfsGatewayUrl = sbtData.metadataCID 
    ? `https://gateway.pinata.cloud/ipfs/${sbtData.metadataCID}` 
    : null
  const badgeImageUrl = 'https://gateway.pinata.cloud/ipfs/QmbbBCcJWZsSG9aYBoKjgzqExHMeVriuywFwaKnWrojcpK'

  // Show SBT Badge Card with actual image - Matching stat card style
  return (
    <>
      <div 
        onClick={() => setShowModal(true)}
        className="group relative bg-white rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 p-7 border border-gray-100 hover:-translate-y-2 overflow-hidden cursor-pointer"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-50 rounded-full blur-3xl opacity-50 group-hover:opacity-100 transition-opacity"></div>
        
        <div className="relative">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">KYC Status</h3>
            </div>
            <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
          </div>
          
          <div className="text-5xl font-extrabold text-gray-900 mb-2 tracking-tight">✓</div>
          <p className="text-sm text-gray-600 font-medium flex items-center gap-1.5 mb-3">
            <svg className="w-4 h-4 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="text-emerald-600 font-bold">Verified Identity</span>
          </p>
          <p className="text-xs text-gray-500 mb-4">Click to view SBT details</p>
          
          <div className="flex items-center gap-2">
            <div className="px-3 py-1.5 bg-purple-50 rounded-lg border border-purple-100 flex items-center gap-1.5">
              <span className="text-xs font-bold text-purple-700">Token #{sbtData.tokenId}</span>
            </div>
            <div className="px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-100">
              <span className="text-xs font-bold text-gray-600">Soulbound</span>
            </div>
          </div>
        </div>
      </div>

      {/* Modal - Opens on Click */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl border border-gray-200 transform transition-all" onClick={(e) => e.stopPropagation()}>
            {/* Header with Gradient Background */}
            <div className="relative bg-gradient-to-br from-purple-600 via-violet-600 to-purple-700 p-8 overflow-hidden">
              {/* Decorative Elements */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32"></div>
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full -ml-24 -mb-24"></div>
              
              <div className="relative flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-lg">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-3xl font-bold text-white">Identity Verified</h2>
                      <p className="text-purple-100 text-sm mt-1">Soulbound Token (SBT)</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 mt-4">
                    <div className="px-3 py-1.5 bg-white/20 backdrop-blur-sm rounded-full flex items-center gap-2 border border-white/30">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-lg shadow-green-400/50"></div>
                      <span className="text-sm font-semibold text-white">KYC Verified</span>
                    </div>
                    <div className="px-3 py-1.5 bg-white/20 backdrop-blur-sm rounded-full border border-white/30">
                      <span className="text-sm font-semibold text-white">Token #{sbtData.tokenId}</span>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => setShowModal(false)}
                  className="w-10 h-10 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl transition-all duration-200 flex items-center justify-center group border border-white/30"
                >
                  <svg className="w-5 h-5 text-white group-hover:rotate-90 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content Section */}
            <div className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {/* Badge Image */}
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-400 to-violet-600 rounded-2xl blur-xl opacity-30 group-hover:opacity-50 transition-opacity"></div>
                  <div className="relative bg-gradient-to-br from-purple-50 to-violet-50 rounded-2xl p-6 border-2 border-purple-200 shadow-lg">
                    <img 
                      src={badgeImageUrl} 
                      alt="FractionalStay Identity Badge"
                      className="w-full h-auto rounded-xl shadow-2xl"
                    />
                    <div className="absolute -top-3 -right-3 w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-lg border-4 border-white">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* User Information */}
                <div className="space-y-4">
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-5 border border-gray-200">
                    <div className="flex items-center gap-2 mb-3">
                      <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wider">Holder Information</h3>
                    </div>
                    <p className="text-lg font-bold text-gray-900">{sbtData.userName || 'Verified User'}</p>
                    {sbtData.verifiedAt && (
                      <p className="text-sm text-gray-500 mt-2 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Verified on {new Date(sbtData.verifiedAt).toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </p>
                    )}
                  </div>

                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-5 border border-blue-200">
                    <div className="flex items-center gap-2 mb-3">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                      </svg>
                      <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wider">Network</h3>
                    </div>
                    <p className="text-lg font-bold text-gray-900">Arbitrum Sepolia</p>
                    <p className="text-sm text-gray-500 mt-1">Testnet Environment</p>
                  </div>

                  <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-2xl p-5 border border-red-200">
                    <div className="flex items-center gap-2 mb-3">
                      <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wider">Soulbound</h3>
                    </div>
                    <p className="text-sm text-gray-700 font-medium">This token is permanently bound to your wallet and cannot be transferred or sold.</p>
                  </div>
                </div>
              </div>

              {/* Features Grid */}
              <div className="bg-gradient-to-br from-purple-50 via-violet-50 to-purple-50 rounded-2xl p-6 mb-6 border border-purple-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  What This Badge Unlocks
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex items-start gap-3 p-3 bg-white/60 rounded-xl">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">Verified Identity</p>
                      <p className="text-xs text-gray-600">Proof of KYC completion</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-white/60 rounded-xl">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">Property Access</p>
                      <p className="text-xs text-gray-600">Invest in properties</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-white/60 rounded-xl">
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">Earn Rewards</p>
                      <p className="text-xs text-gray-600">Rental income & dividends</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-white/60 rounded-xl">
                    <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">Trust Badge</p>
                      <p className="text-xs text-gray-600">Enhanced credibility</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <a
                  href={arbiscanUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 px-5 py-4 bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-xl hover:from-purple-700 hover:to-violet-700 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl hover:-translate-y-0.5 group"
                >
                  <svg className="w-5 h-5 group-hover:rotate-12 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  View on Arbiscan
                </a>

                {ipfsGatewayUrl && (
                  <a
                    href={ipfsGatewayUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 px-5 py-4 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all duration-300 font-semibold hover:-translate-y-0.5 group border-2 border-gray-200"
                  >
                    <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    View IPFS Metadata
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
