'use client'

import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'

interface KYCDocument {
  id: string
  user_wallet: string
  wallet_address: string
  full_name: string
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
}

export function KYCManagementContent() {
  const { address } = useAccount()
  const [kycDocuments, setKycDocuments] = useState<KYCDocument[]>([])
  const [filteredDocs, setFilteredDocs] = useState<KYCDocument[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING')
  const [selectedDoc, setSelectedDoc] = useState<KYCDocument | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  // Fetch all KYC documents
  useEffect(() => {
    const fetchKYCDocuments = async () => {
      try {
        const response = await fetch('/api/admin/kyc/list')
        if (response.ok) {
          const data = await response.json()
          setKycDocuments(data.documents || [])
        }
      } catch (error) {
        console.error('Error fetching KYC documents:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchKYCDocuments()
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
    try {
      const response = await fetch('/api/admin/kyc/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: doc.wallet_address || doc.user_wallet,
          adminAddress: address
        })
      })

      if (response.ok) {
        // Refresh list
        setKycDocuments(prev => prev.map(d => 
          d.id === doc.id ? { ...d, status: 'APPROVED', reviewed_at: new Date().toISOString(), reviewed_by: address } : d
        ))
        setSelectedDoc(null)
        alert('✅ KYC Approved successfully!')
      } else {
        const data = await response.json()
        alert('❌ Failed to approve: ' + data.error)
      }
    } catch (error) {
      alert('❌ Error: ' + error)
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
        // Refresh list
        setKycDocuments(prev => prev.map(d => 
          d.id === doc.id 
            ? { ...d, status: 'REJECTED', rejection_reason: rejectionReason, reviewed_at: new Date().toISOString(), reviewed_by: address } 
            : d
        ))
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
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">KYC Document Management</h1>
        <p className="text-gray-600">Review and approve user KYC submissions</p>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white rounded-lg shadow mb-6 p-4">
        <div className="flex gap-4">
          {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f as any)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === f
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {f} ({kycDocuments.filter(d => f === 'ALL' || d.status === f).length})
            </button>
          ))}
        </div>
      </div>

      {/* KYC Documents List */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading KYC documents...</p>
        </div>
      ) : filteredDocs.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-500 text-lg">No KYC documents found for {filter}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredDocs.map((doc) => (
            <div key={doc.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-4">
                    <h3 className="text-xl font-bold">{doc.full_name}</h3>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        doc.status === 'APPROVED'
                          ? 'bg-green-100 text-green-800'
                          : doc.status === 'REJECTED'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {doc.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Wallet:</span>
                      <p className="font-mono">{doc.wallet_address || doc.user_wallet}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">DOB:</span>
                      <p>{doc.date_of_birth}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Nationality:</span>
                      <p>{doc.nationality}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">ID Type:</span>
                      <p className="uppercase">{doc.id_type}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">ID Number:</span>
                      <p>{doc.id_number}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Submitted:</span>
                      <p>{new Date(doc.submitted_at).toLocaleDateString()}</p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <span className="text-gray-500 text-sm">Address:</span>
                    <p className="text-sm">
                      {doc.address}, {doc.city}, {doc.state} - {doc.pincode}
                    </p>
                  </div>

                  {doc.rejection_reason && (
                    <div className="mt-4 p-3 bg-red-50 rounded">
                      <span className="text-red-800 font-semibold">Rejection Reason:</span>
                      <p className="text-red-700 text-sm">{doc.rejection_reason}</p>
                    </div>
                  )}
                </div>

                <div className="ml-6 flex flex-col gap-2">
                  <button
                    onClick={() => setSelectedDoc(doc)}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    View Details
                  </button>
                  {doc.status === 'PENDING' && (
                    <>
                      <button
                        onClick={() => handleApprove(doc)}
                        disabled={actionLoading}
                        className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
                      >
                        ✓ Approve
                      </button>
                      <button
                        onClick={() => {
                          setSelectedDoc(doc)
                          setRejectionReason('')
                        }}
                        disabled={actionLoading}
                        className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
                      >
                        ✗ Reject
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Document Detail Modal */}
      {selectedDoc && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-2xl font-bold">KYC Document Details</h2>
              <button
                onClick={() => {
                  setSelectedDoc(null)
                  setRejectionReason('')
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Personal Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><strong>Full Name:</strong> {selectedDoc.full_name}</div>
                  <div><strong>Date of Birth:</strong> {selectedDoc.date_of_birth}</div>
                  <div><strong>Nationality:</strong> {selectedDoc.nationality}</div>
                  <div><strong>Wallet:</strong> {selectedDoc.wallet_address || selectedDoc.user_wallet}</div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Address</h3>
                <p className="text-sm">
                  {selectedDoc.address}<br />
                  {selectedDoc.city}, {selectedDoc.state} - {selectedDoc.pincode}
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Identity Verification</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><strong>ID Type:</strong> {selectedDoc.id_type?.toUpperCase()}</div>
                  <div><strong>ID Number:</strong> {selectedDoc.id_number}</div>
                  <div><strong>Address Proof:</strong> {selectedDoc.address_proof_type?.toUpperCase()}</div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Documents (IPFS)</h3>
                <a
                  href={`https://gateway.pinata.cloud/ipfs/${selectedDoc.document_hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline text-sm"
                >
                  View Documents on IPFS →
                </a>
              </div>

              {selectedDoc.status === 'PENDING' && (
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-4">Review Actions</h3>
                  
                  {/* Rejection Form */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">
                      Rejection Reason (if rejecting):
                    </label>
                    <textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      className="w-full border rounded p-2 text-sm"
                      rows={3}
                      placeholder="Provide a clear reason for rejection..."
                    />
                  </div>

                  <div className="flex gap-4">
                    <button
                      onClick={() => handleApprove(selectedDoc)}
                      disabled={actionLoading}
                      className="flex-1 px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
                    >
                      ✓ Approve KYC
                    </button>
                    <button
                      onClick={() => handleReject(selectedDoc)}
                      disabled={actionLoading || !rejectionReason.trim()}
                      className="flex-1 px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
                    >
                      ✗ Reject KYC
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
