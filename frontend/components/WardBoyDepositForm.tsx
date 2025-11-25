'use client'

import React, { useState, useEffect } from 'react'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseUnits, formatUnits } from 'viem'
import { CONTRACTS, REVENUE_SPLITTER_ABI, USDC_ABI } from '@/lib/contracts'
import { uploadMultipleFilesToPinata, uploadJSONToPinata } from '@/lib/pinata'
import { supabase } from '@/lib/supabase'
import MultiFileUpload, { BillFileWithCategory } from './MultiFileUpload'
import { AlertCircle, CheckCircle, Loader2, ExternalLink, X } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'

interface RentDepositFormData {
  propertyId: string
  propertyName: string
  month: string
  grossRent: string
  repairs: string
  utilities: string
  cleaning: string
  otherExpenses: string
  notes: string
}

interface PropertyDetails {
  id: string
  token_id: number
  name: string
  city: string
  state: string
  address: string
  location: string
}

interface WardBoyDepositFormProps {
  prefilledPropertyId?: number
  assignedProperties?: number[]
  propertyDetails?: PropertyDetails
  onSuccess?: () => void
}

export default function WardBoyDepositForm({ prefilledPropertyId, assignedProperties, propertyDetails: propDetails, onSuccess }: WardBoyDepositFormProps) {
  const { address } = useAccount()
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState<RentDepositFormData>({
    propertyId: prefilledPropertyId?.toString() || '',
    propertyName: propDetails?.name || '',
    month: new Date().toISOString().slice(0, 7), // YYYY-MM
    grossRent: '',
    repairs: '0',
    utilities: '0',
    cleaning: '0',
    otherExpenses: '0',
    notes: '',
  })
  const [billFiles, setBillFiles] = useState<BillFileWithCategory[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [propertyDetails, setPropertyDetails] = useState<Array<{id: number, name: string}>>([])
  const [isLoadingProperties, setIsLoadingProperties] = useState(false)
  const [submittedTxHash, setSubmittedTxHash] = useState<string | null>(null)
  const [isProcessingTransaction, setIsProcessingTransaction] = useState(false)
  const [showProgressDialog, setShowProgressDialog] = useState(false)
  const [progressStatus, setProgressStatus] = useState<{
    uploadingIPFS: 'pending' | 'processing' | 'completed' | 'error'
    confirmingTransaction: 'pending' | 'processing' | 'completed' | 'error'
    savingDatabase: 'pending' | 'processing' | 'completed' | 'error'
  }>({
    uploadingIPFS: 'pending',
    confirmingTransaction: 'pending',
    savingDatabase: 'pending',
  })
  const [pendingDepositData, setPendingDepositData] = useState<{
    billsMetadata: any[]
    summaryUpload: any
    formData: RentDepositFormData
    totalMiscellaneous: number
    netAmount: number
  } | null>(null)

  // Check USDC balance
  const { data: usdcBalance, refetch: refetchBalance } = useReadContract({
    address: CONTRACTS.USDC,
    abi: USDC_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
      refetchInterval: 5000, // Refetch every 5 seconds
    },
  })

  // Check USDC allowance for RevenueSplitter
  const { data: usdcAllowance, refetch: refetchAllowance } = useReadContract({
    address: CONTRACTS.USDC,
    abi: USDC_ABI,
    functionName: 'allowance',
    args: address ? [address, CONTRACTS.RevenueSplitter] : undefined,
    query: {
      enabled: !!address,
      refetchInterval: 5000, // Refetch every 5 seconds
    },
  })

  // Contract interactions
  const { writeContract, data: txHash, error: writeError } = useWriteContract()
  const { isLoading: isTxPending, isSuccess: isTxSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  })

  // Separate state for deposit transaction
  const [depositTxHash, setDepositTxHash] = useState<string | null>(null)
  const { 
    isLoading: isDepositTxPending, 
    isSuccess: isDepositTxSuccess,
    isError: isDepositTxError,
    error: depositTxError
  } = useWaitForTransactionReceipt({
    hash: depositTxHash as `0x${string}` | undefined,
  })

  // Handle write contract errors (e.g., user rejection)
  useEffect(() => {
    if (writeError && isProcessingTransaction) {
      console.error('Write contract error:', writeError)
      let errorMessage = 'Transaction failed. '
      
      if (writeError.message?.includes('user rejected') || writeError.message?.includes('User rejected')) {
        errorMessage = 'Transaction was rejected. Please try again.'
      } else if (writeError.message?.includes('insufficient funds')) {
        errorMessage = 'Insufficient funds for gas. Please add ETH to your wallet.'
      } else {
        errorMessage += writeError.message || 'Please check your wallet and try again.'
      }
      
      setError(errorMessage)
      setIsProcessingTransaction(false)
      setPendingDepositData(null)
      setDepositTxHash(null)
      setProgressStatus(prev => ({
        ...prev,
        confirmingTransaction: 'error',
      }))
      setShowProgressDialog(false)
    }
  }, [writeError, isProcessingTransaction])

  // Track deposit transaction hash separately
  useEffect(() => {
    if (txHash && isProcessingTransaction && !depositTxHash) {
      // This is the deposit transaction (not approval)
      setDepositTxHash(txHash)
    }
  }, [txHash, isProcessingTransaction, depositTxHash])

  // Refetch balance and allowance after approval transaction
  useEffect(() => {
    if (isTxSuccess && txHash && !depositTxHash) {
      // This is the approval transaction
      refetchBalance()
      refetchAllowance()
    }
  }, [isTxSuccess, txHash, refetchBalance, refetchAllowance, depositTxHash])

  // Handle deposit transaction errors
  useEffect(() => {
    if (isDepositTxError && depositTxHash) {
      console.error('Transaction failed:', depositTxError)
      setError('Transaction failed on blockchain. Please try again.')
      setIsProcessingTransaction(false)
      setPendingDepositData(null)
      setDepositTxHash(null)
      setProgressStatus(prev => ({
        ...prev,
        confirmingTransaction: 'error',
      }))
      setShowProgressDialog(false)
    }
  }, [isDepositTxError, depositTxError, depositTxHash])

  // Handle deposit transaction confirmation and update database
  useEffect(() => {
    const updateDatabaseAfterConfirmation = async () => {
      if (!isDepositTxSuccess || !depositTxHash || !pendingDepositData || !address) {
        return
      }

      try {
        console.log('Transaction confirmed! Saving to database...')
        setIsProcessingTransaction(true)
        
        // Update progress: transaction confirmed, now saving to database
        setProgressStatus(prev => ({
          ...prev,
          confirmingTransaction: 'completed',
          savingDatabase: 'processing',
        }))

        if (!supabase) {
          throw new Error('Database connection not available')
        }

        const { error: dbError } = await (supabase as any)
          .from('rent_deposits')
          .insert({
            property_id: parseInt(pendingDepositData.formData.propertyId),
            property_name: pendingDepositData.formData.propertyName,
            ward_boy_address: address.toLowerCase(),
            deposit_month: pendingDepositData.formData.month,
            gross_rent: parseUnits(pendingDepositData.formData.grossRent, 6).toString(),
            repairs: parseUnits(pendingDepositData.formData.repairs || '0', 6).toString(),
            utilities: parseUnits(pendingDepositData.formData.utilities || '0', 6).toString(),
            cleaning: parseUnits(pendingDepositData.formData.cleaning || '0', 6).toString(),
            other_expenses: parseUnits(pendingDepositData.formData.otherExpenses || '0', 6).toString(),
            total_miscellaneous: parseUnits(pendingDepositData.totalMiscellaneous.toString(), 6).toString(),
            net_amount: parseUnits(pendingDepositData.netAmount.toString(), 6).toString(),
            notes: pendingDepositData.formData.notes,
            bills_metadata: pendingDepositData.billsMetadata,
            summary_ipfs_hash: pendingDepositData.summaryUpload.IpfsHash,
            status: 'pending',
            deposit_tx_hash: depositTxHash,
          })

        if (dbError) {
          console.error('Database error:', dbError)
          throw new Error('Failed to save to database')
        }

        // Mark database save as completed
        setProgressStatus(prev => ({
          ...prev,
          savingDatabase: 'completed',
        }))

        setSubmittedTxHash(depositTxHash)
        setSuccess('Deposit submitted successfully! Waiting for admin approval.')
        setPendingDepositData(null)
        setIsProcessingTransaction(false)
        setDepositTxHash(null)
        
        // Close dialog after a short delay to show completion, then navigate to overview
        setTimeout(() => {
          setShowProgressDialog(false)
          // Navigate to overview after successful completion
          if (onSuccess) {
            setTimeout(() => {
              onSuccess()
            }, 500) // Small delay to ensure dialog is closed
          }
        }, 2000)
      } catch (err: any) {
        console.error('Database update error:', err)
        setError(err.message || 'Failed to save to database after transaction confirmation')
        setIsProcessingTransaction(false)
        setPendingDepositData(null)
        setDepositTxHash(null)
        setProgressStatus(prev => ({
          ...prev,
          savingDatabase: 'error',
        }))
        setShowProgressDialog(false)
      }
    }

    updateDatabaseAfterConfirmation()
  }, [isDepositTxSuccess, depositTxHash, pendingDepositData, address])

  // Calculate totals
  const totalMiscellaneous = 
    parseFloat(formData.repairs || '0') +
    parseFloat(formData.utilities || '0') +
    parseFloat(formData.cleaning || '0') +
    parseFloat(formData.otherExpenses || '0')

  const grossRent = parseFloat(formData.grossRent || '0')
  const netAmount = grossRent - totalMiscellaneous

  const platformFee = netAmount * 0.03 // 3%
  const shareholderAmount = netAmount - platformFee

  // Pre-populate form when propertyDetails prop is provided
  useEffect(() => {
    if (propDetails && prefilledPropertyId) {
      setFormData(prev => ({
        ...prev,
        propertyId: prefilledPropertyId.toString(),
        propertyName: propDetails.name || '',
      }))
    }
  }, [propDetails, prefilledPropertyId])

  // Fetch property details when property ID changes (fallback if propDetails not provided)
  useEffect(() => {
    const fetchPropertyName = async () => {
      if (!formData.propertyId || !supabase || propDetails) return // Skip if propDetails already provided
      
      try {
        setIsLoadingProperties(true)
        const { data, error } = await supabase
          .from('properties')
          .select('id, name, city, state, address, location, token_id')
          .eq('token_id', parseInt(formData.propertyId))
          .single()

        if (!error && data) {
          const propertyData = data as { name?: string } | null
          setFormData(prev => ({ ...prev, propertyName: propertyData?.name || '' }))
        }
      } catch (error) {
        console.error('Error fetching property name:', error)
      } finally {
        setIsLoadingProperties(false)
      }
    }

    if (formData.propertyId && !propDetails) {
      fetchPropertyName()
    }
  }, [formData.propertyId, propDetails])

  const handleInputChange = (field: keyof RentDepositFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleApproveUSDC = async () => {
    if (!address) {
      setError('Please connect your wallet')
      return
    }

    // Check if user has enough USDC balance
    const requiredAmount = parseUnits(netAmount.toString(), 6)
    if (!usdcBalance || usdcBalance < requiredAmount) {
      setError(`Insufficient USDC balance. Required: ${formatUnits(requiredAmount, 6)} USDC, Available: ${usdcBalance ? formatUnits(usdcBalance, 6) : '0'} USDC`)
      return
    }
    
    try {
      setError('')
      const amount = parseUnits(netAmount.toString(), 6) // USDC has 6 decimals
      
      writeContract({
        address: CONTRACTS.USDC,
        abi: USDC_ABI,
        functionName: 'approve',
        args: [CONTRACTS.RevenueSplitter, amount],
        gas: 100000n, // Explicit gas for approve
      })
    } catch (err: any) {
      setError(err.message || 'Failed to approve USDC')
    }
  }

  const handleSubmit = async () => {
    if (!address) {
      setError('Please connect your wallet')
      return
    }

    if (netAmount <= 0) {
      setError('Net amount must be greater than 0')
      return
    }

    // Check USDC balance before submitting
    const requiredAmount = parseUnits(netAmount.toString(), 6)
    if (!usdcBalance || usdcBalance < requiredAmount) {
      setError(`Insufficient USDC balance. Required: ${formatUnits(requiredAmount, 6)} USDC, Available: ${usdcBalance ? formatUnits(usdcBalance, 6) : '0'} USDC. Please ensure you have enough USDC in your wallet.`)
      return
    }

    // Check USDC allowance before submitting
    if (!usdcAllowance || usdcAllowance < requiredAmount) {
      setError(`USDC not approved. Please approve USDC first. Required: ${formatUnits(requiredAmount, 6)} USDC, Approved: ${usdcAllowance ? formatUnits(usdcAllowance, 6) : '0'} USDC`)
      return
    }

    setIsSubmitting(true)
    setError('')
    setShowProgressDialog(true)
    
    // Reset progress status
    setProgressStatus({
      uploadingIPFS: 'processing',
      confirmingTransaction: 'pending',
      savingDatabase: 'pending',
    })

    try {
      // 1. Upload bills to IPFS
      let billsMetadata: any[] = []
      if (billFiles.length > 0) {
        console.log('Uploading bills to IPFS...')
        billsMetadata = await uploadMultipleFilesToPinata(
          billFiles.map(file => ({
            file,
            category: file.category,
            description: file.description || '',
          }))
        )
      }

      // 2. Create summary metadata and upload to IPFS
      const summaryData = {
        propertyId: formData.propertyId,
        propertyName: formData.propertyName,
        month: formData.month,
        wardBoyAddress: address,
        grossRent: formData.grossRent,
        miscellaneous: {
          repairs: formData.repairs,
          utilities: formData.utilities,
          cleaning: formData.cleaning,
          otherExpenses: formData.otherExpenses,
          total: totalMiscellaneous.toString(),
        },
        netAmount: netAmount.toString(),
        notes: formData.notes,
        bills: billsMetadata,
        timestamp: new Date().toISOString(),
      }

      console.log('Uploading summary to IPFS...')
      const summaryUpload = await uploadJSONToPinata(
        summaryData,
        `rent-deposit-${formData.propertyId}-${formData.month}`
      )

      // Mark IPFS upload as completed
      setProgressStatus(prev => ({
        ...prev,
        uploadingIPFS: 'completed',
        confirmingTransaction: 'processing',
      }))

      // 3. Store deposit data for database update after transaction confirmation
      setPendingDepositData({
        billsMetadata,
        summaryUpload,
        formData,
        totalMiscellaneous,
        netAmount,
      })

      // 4. Submit blockchain transaction
      console.log('Submitting to blockchain...')
      const netAmountWei = parseUnits(netAmount.toString(), 6)
      const grossRentWei = parseUnits(formData.grossRent, 6)
      const miscWei = parseUnits(totalMiscellaneous.toString(), 6)

      writeContract({
        address: CONTRACTS.RevenueSplitter,
        abi: REVENUE_SPLITTER_ABI,
        functionName: 'depositRentByManager',
        args: [
          BigInt(formData.propertyId),
          netAmountWei,
          grossRentWei,
          miscWei,
        ],
        gas: 300000n, // Explicit gas for deposit
      })

      // Transaction hash will be set by writeContract hook
      // We'll track it separately for deposit transactions
      setIsProcessingTransaction(true)

    } catch (err: any) {
      console.error('Submission error:', err)
      setError(err.message || 'Failed to submit deposit')
      setPendingDepositData(null)
      setIsProcessingTransaction(false)
      setProgressStatus(prev => ({
        ...prev,
        uploadingIPFS: 'error',
      }))
      setShowProgressDialog(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  const canProceedToStep2 = formData.propertyId && formData.propertyName && formData.month && formData.grossRent
  const canProceedToStep3 = canProceedToStep2 && netAmount > 0

  const getStatusIcon = (status: 'pending' | 'processing' | 'completed' | 'error') => {
    switch (status) {
      case 'pending':
        return <div className="w-6 h-6 rounded-full border-2 border-gray-300" />
      case 'processing':
        return <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
      case 'completed':
        return <CheckCircle className="w-6 h-6 text-green-600" />
      case 'error':
        return <AlertCircle className="w-6 h-6 text-red-600" />
    }
  }

  const getStatusText = (status: 'pending' | 'processing' | 'completed' | 'error') => {
    switch (status) {
      case 'pending':
        return 'Pending'
      case 'processing':
        return 'Processing...'
      case 'completed':
        return 'Completed'
      case 'error':
        return 'Error'
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress Dialog */}
      <Modal
        isOpen={showProgressDialog}
        onClose={() => {
          // Only allow closing if all steps are completed or there's an error
          const allCompleted = 
            progressStatus.uploadingIPFS === 'completed' &&
            progressStatus.confirmingTransaction === 'completed' &&
            progressStatus.savingDatabase === 'completed'
          const hasError = 
            progressStatus.uploadingIPFS === 'error' ||
            progressStatus.confirmingTransaction === 'error' ||
            progressStatus.savingDatabase === 'error'
          
          if (allCompleted || hasError) {
            setShowProgressDialog(false)
          }
        }}
        title="Processing Deposit"
        description="Please wait while we process your deposit"
        size="md"
        showCloseButton={progressStatus.savingDatabase === 'completed' || 
                         progressStatus.uploadingIPFS === 'error' ||
                         progressStatus.confirmingTransaction === 'error' ||
                         progressStatus.savingDatabase === 'error'}
      >
        <div className="space-y-4">
          {/* Step 1: Uploading to IPFS */}
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex-shrink-0">
              {getStatusIcon(progressStatus.uploadingIPFS)}
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">Uploading to IPFS</h3>
              <p className="text-sm text-gray-600">
                {progressStatus.uploadingIPFS === 'processing' && 'Uploading bills and summary metadata...'}
                {progressStatus.uploadingIPFS === 'completed' && 'Files uploaded successfully'}
                {progressStatus.uploadingIPFS === 'pending' && 'Waiting to start...'}
                {progressStatus.uploadingIPFS === 'error' && 'Upload failed'}
              </p>
            </div>
          </div>

          {/* Step 2: Confirming Transaction */}
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex-shrink-0">
              {getStatusIcon(progressStatus.confirmingTransaction)}
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">Confirming Transaction</h3>
              <p className="text-sm text-gray-600">
                {progressStatus.confirmingTransaction === 'processing' && 'Waiting for blockchain confirmation...'}
                {progressStatus.confirmingTransaction === 'completed' && 'Transaction confirmed'}
                {progressStatus.confirmingTransaction === 'pending' && 'Waiting for transaction...'}
                {progressStatus.confirmingTransaction === 'error' && 'Transaction failed'}
              </p>
              {depositTxHash && progressStatus.confirmingTransaction === 'processing' && (
                <a
                  href={`https://sepolia.arbiscan.io/tx/${depositTxHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:text-blue-800 mt-1 flex items-center gap-1"
                >
                  View on Arbiscan <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>

          {/* Step 3: Saving to Database */}
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex-shrink-0">
              {getStatusIcon(progressStatus.savingDatabase)}
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">Saving to Database</h3>
              <p className="text-sm text-gray-600">
                {progressStatus.savingDatabase === 'processing' && 'Saving deposit record...'}
                {progressStatus.savingDatabase === 'completed' && 'Deposit saved successfully'}
                {progressStatus.savingDatabase === 'pending' && 'Waiting for transaction confirmation...'}
                {progressStatus.savingDatabase === 'error' && 'Database save failed'}
              </p>
            </div>
          </div>

          {/* Success Message */}
          {progressStatus.savingDatabase === 'completed' && (
            <div className="mt-4 p-4 bg-green-50 border-2 border-green-200 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <p className="text-sm font-semibold text-green-800">
                  Deposit submitted successfully! Waiting for admin approval.
                </p>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Progress Steps */}
      <div className="mb-8 bg-gradient-to-br from-blue-50 via-white to-purple-50 rounded-2xl shadow-card p-6 border-2 border-blue-200">
        <div className="flex items-center justify-between">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold shadow-lg transition-all ${
                  step >= s
                    ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white scale-110'
                    : 'bg-white border-2 border-gray-300 text-gray-400'
                }`}
              >
                {s}
              </div>
              {s < 3 && (
                <div
                  className={`w-20 h-2 mx-3 rounded-full transition-all ${
                    step > s ? 'bg-gradient-to-r from-blue-500 to-purple-600' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-4">
          <span className="text-sm font-semibold text-gray-700">Basic Info</span>
          <span className="text-sm font-semibold text-gray-700">Amounts</span>
          <span className="text-sm font-semibold text-gray-700">Review</span>
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="mb-6 bg-red-50 border-2 border-red-200 rounded-xl p-4 flex items-start gap-3">
          <div className="p-2 bg-red-100 rounded-lg flex-shrink-0">
            <AlertCircle className="h-5 w-5 text-red-600" />
          </div>
          <p className="text-sm text-red-800 font-semibold">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-6 bg-green-50 border-2 border-green-200 rounded-xl p-6">
          <div className="flex items-start gap-3 mb-4">
          <div className="p-2 bg-green-100 rounded-lg flex-shrink-0">
            <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-green-800 font-semibold mb-2">{success}</p>
              {submittedTxHash && (
                <a
                  href={`https://sepolia.arbiscan.io/tx/${submittedTxHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-green-700 hover:text-green-900 font-semibold underline flex items-center gap-1"
                >
                  View Transaction on Arbiscan
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-green-200">
            <p className="text-sm font-semibold text-gray-900 mb-2">Next Steps:</p>
            <ol className="text-sm text-gray-700 space-y-1 list-decimal list-inside">
              <li>Your deposit is now pending admin approval</li>
              <li>Admin will review and trigger payout distribution</li>
              <li>You can track the status in the History tab</li>
            </ol>
          </div>
          <button
            onClick={() => {
              setFormData({
                propertyId: prefilledPropertyId?.toString() || '',
                propertyName: propDetails?.name || '',
                month: new Date().toISOString().slice(0, 7),
                grossRent: '',
                repairs: '0',
                utilities: '0',
                cleaning: '0',
                otherExpenses: '0',
                notes: '',
              })
              setBillFiles([])
              setStep(1)
              setSuccess('')
              setSubmittedTxHash(null)
            }}
            className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold text-sm"
          >
            Submit Another Deposit
          </button>
        </div>
      )}

      {/* Step 1: Basic Info */}
      {step === 1 && (
        <div className="bg-gradient-to-br from-blue-50 via-white to-indigo-50 rounded-2xl shadow-card p-8 border-2 border-blue-200 space-y-6">
          <h2 className="text-2xl font-bold text-gray-900">
            Step 1: Basic Information
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Property ID *
              </label>
              {assignedProperties && assignedProperties.length > 1 ? (
                <select
                  value={formData.propertyId}
                  onChange={(e) => handleInputChange('propertyId', e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl bg-white text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                  disabled={!!prefilledPropertyId}
                >
                  <option value="">Select a property</option>
                  {assignedProperties.map((propId) => (
                    <option key={propId} value={propId.toString()}>
                      Property #{propId}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="number"
                  value={formData.propertyId}
                  onChange={(e) => handleInputChange('propertyId', e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl bg-gray-100 text-gray-700 cursor-not-allowed"
                  placeholder="Enter property ID"
                  disabled={!!prefilledPropertyId}
                  readOnly={!!prefilledPropertyId}
                />
              )}
              {isLoadingProperties && formData.propertyId && (
                <p className="text-xs text-gray-500 mt-1">Loading property details...</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Property Name *
              </label>
              <input
                type="text"
                value={formData.propertyName}
                onChange={(e) => handleInputChange('propertyName', e.target.value)}
                className={`w-full px-4 py-3 border-2 rounded-xl transition-all ${
                  prefilledPropertyId 
                    ? 'border-gray-300 bg-gray-100 text-gray-700 cursor-not-allowed' 
                    : 'border-gray-300 bg-white text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
                }`}
                placeholder="e.g., Mumbai Villa"
                disabled={!!prefilledPropertyId}
                readOnly={!!prefilledPropertyId}
              />
              {propDetails && (
                <div className="mt-2 space-y-1 text-xs text-gray-600">
                  <p><span className="font-semibold">Location:</span> {propDetails.location}</p>
                  <p><span className="font-semibold">Address:</span> {propDetails.address}</p>
                  <p><span className="font-semibold">City:</span> {propDetails.city}, {propDetails.state}</p>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Month/Period *
              </label>
              <input
                type="month"
                value={formData.month}
                onChange={(e) => handleInputChange('month', e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl bg-white text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Gross Rent Collected (USDC) *
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.grossRent}
                onChange={(e) => handleInputChange('grossRent', e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl bg-white text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                placeholder="50000"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => setStep(2)}
              disabled={!canProceedToStep2}
              className="px-8 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:shadow-lg disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all font-bold"
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Amounts & Bills */}
      {step === 2 && (
        <div className="bg-gradient-to-br from-purple-50 via-white to-pink-50 rounded-2xl shadow-card p-8 border-2 border-purple-200 space-y-6">
          <h2 className="text-2xl font-bold text-gray-900">
            Step 2: Miscellaneous Expenses & Bills
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Repairs & Maintenance (USDC)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.repairs}
                onChange={(e) => handleInputChange('repairs', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Utilities (Electricity + Water + Gas)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.utilities}
                onChange={(e) => handleInputChange('utilities', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Cleaning Service (USDC)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.cleaning}
                onChange={(e) => handleInputChange('cleaning', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Other Expenses (USDC)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.otherExpenses}
                onChange={(e) => handleInputChange('otherExpenses', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="0"
              />
            </div>
          </div>

          {/* Calculation Summary */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 border-2 border-blue-200 space-y-3">
            <div className="flex justify-between">
              <span className="font-semibold text-gray-700">Gross Rent:</span>
              <span className="font-bold text-gray-900 text-lg">${grossRent.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold text-gray-700">Total Miscellaneous:</span>
              <span className="font-bold text-red-600 text-lg">-${totalMiscellaneous.toFixed(2)}</span>
            </div>
            <div className="border-t-2 border-blue-300 pt-3 flex justify-between">
              <span className="font-bold text-gray-900">Net Amount:</span>
              <span className="font-bold text-blue-600 text-xl">${netAmount.toFixed(2)}</span>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Notes (Optional)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Any additional notes or comments..."
            />
          </div>

          {/* File Upload */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Upload Bills & Receipts
            </h3>
            <MultiFileUpload onFilesChange={setBillFiles} />
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => setStep(1)}
              className="px-8 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all font-bold"
            >
              ← Back
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={!canProceedToStep3}
              className="px-8 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl hover:shadow-lg disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all font-bold"
            >
              Review →
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Review & Submit */}
      {step === 3 && (
        <div className="bg-gradient-to-br from-green-50 via-white to-emerald-50 rounded-2xl shadow-card p-8 border-2 border-green-200 space-y-6">
          <h2 className="text-2xl font-bold text-gray-900">
            Step 3: Review & Submit
          </h2>

          <div className="space-y-4">
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 space-y-3">
              <h3 className="font-medium text-gray-900 dark:text-white">Property Details</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Property:</span>
                  <p className="font-medium text-gray-900 dark:text-white">{formData.propertyName}</p>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Period:</span>
                  <p className="font-medium text-gray-900 dark:text-white">{formData.month}</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 space-y-3">
              <h3 className="font-medium text-gray-900 dark:text-white">Financial Breakdown</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Gross Rent:</span>
                  <span className="font-medium text-gray-900 dark:text-white">${grossRent.toFixed(2)}</span>
                </div>
                <div className="ml-4 space-y-1 border-l-2 border-gray-300 dark:border-gray-600 pl-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Repairs:</span>
                    <span className="text-gray-900 dark:text-white">${formData.repairs}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Utilities:</span>
                    <span className="text-gray-900 dark:text-white">${formData.utilities}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Cleaning:</span>
                    <span className="text-gray-900 dark:text-white">${formData.cleaning}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Other:</span>
                    <span className="text-gray-900 dark:text-white">${formData.otherExpenses}</span>
                  </div>
                </div>
                <div className="flex justify-between font-medium">
                  <span className="text-gray-900 dark:text-white">Total Miscellaneous:</span>
                  <span className="text-red-600 dark:text-red-400">-${totalMiscellaneous.toFixed(2)}</span>
                </div>
                <div className="border-t border-gray-300 dark:border-gray-600 pt-2 flex justify-between font-bold">
                  <span className="text-gray-900 dark:text-white">Net Deposit Amount:</span>
                  <span className="text-blue-600 dark:text-blue-400">${netAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 space-y-2">
              <h3 className="font-medium text-gray-900 dark:text-white">After Admin Approval:</h3>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Platform Fee (3%):</span>
                  <span className="text-gray-900 dark:text-white">-${platformFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span className="text-gray-900 dark:text-white">For Shareholders:</span>
                  <span className="text-green-600 dark:text-green-400">${shareholderAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {billFiles.length > 0 && (
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 dark:text-white mb-2">Uploaded Bills</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {billFiles.length} file(s) will be uploaded to IPFS
                </p>
              </div>
            )}

            {formData.notes && (
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 dark:text-white mb-2">Notes</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{formData.notes}</p>
              </div>
            )}

            {/* USDC Balance & Approval Status */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border-2 border-blue-200 space-y-3">
              <h3 className="font-bold text-gray-900 mb-3">USDC Status Check</h3>
              
              {/* USDC Balance */}
              <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                <div className="flex items-center gap-2">
                  <span className="text-xl">
                    {usdcBalance && usdcBalance >= parseUnits(netAmount.toString(), 6) ? '✅' : '❌'}
                  </span>
                  <span className="text-sm font-semibold text-gray-700">USDC Balance:</span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-gray-900">
                    {usdcBalance ? formatUnits(usdcBalance, 6) : '0.00'} USDC
                  </span>
                  {usdcBalance && usdcBalance < parseUnits(netAmount.toString(), 6) && (
                    <p className="text-xs text-red-600 mt-1">
                      Need: {formatUnits(parseUnits(netAmount.toString(), 6), 6)} USDC
                    </p>
                  )}
                </div>
              </div>

              {/* USDC Allowance */}
              <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                <div className="flex items-center gap-2">
                  <span className="text-xl">
                    {usdcAllowance && usdcAllowance >= parseUnits(netAmount.toString(), 6) ? '✅' : '⚠️'}
                  </span>
                  <span className="text-sm font-semibold text-gray-700">USDC Approved:</span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-gray-900">
                    {usdcAllowance ? formatUnits(usdcAllowance, 6) : '0.00'} USDC
                  </span>
                  {usdcAllowance && usdcAllowance < parseUnits(netAmount.toString(), 6) && (
                    <p className="text-xs text-yellow-600 mt-1">
                      Need: {formatUnits(parseUnits(netAmount.toString(), 6), 6)} USDC
                    </p>
                  )}
                </div>
              </div>

              {/* Status Messages */}
              {(!usdcBalance || usdcBalance < parseUnits(netAmount.toString(), 6)) && (
                <div className="bg-red-50 border-2 border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-800 font-semibold">
                    ⚠️ Insufficient USDC balance. Please add USDC to your wallet before proceeding.
                  </p>
                </div>
              )}

              {usdcBalance && usdcBalance >= parseUnits(netAmount.toString(), 6) && 
               (!usdcAllowance || usdcAllowance < parseUnits(netAmount.toString(), 6)) && (
                <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-3">
                  <p className="text-sm text-yellow-800 font-semibold">
                    ⚠️ USDC not approved. Please approve USDC first before submitting deposit.
                  </p>
                </div>
              )}

              {usdcBalance && usdcBalance >= parseUnits(netAmount.toString(), 6) && 
               usdcAllowance && usdcAllowance >= parseUnits(netAmount.toString(), 6) && (
                <div className="bg-green-50 border-2 border-green-200 rounded-lg p-3">
                  <p className="text-sm text-green-800 font-semibold">
                    ✅ All checks passed! You can proceed with deposit.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => setStep(2)}
              disabled={isSubmitting || isTxPending}
              className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all disabled:opacity-50 font-bold"
            >
              ← Back
            </button>
            <button
              onClick={handleApproveUSDC}
              disabled={
                isSubmitting || 
                isTxPending || 
                !usdcBalance || 
                usdcBalance < parseUnits(netAmount.toString(), 6) ||
                (usdcAllowance ? usdcAllowance >= parseUnits(netAmount.toString(), 6) : false)
              }
              className="flex-1 px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-xl hover:shadow-lg disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 font-bold"
            >
              {isTxPending ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Approving...
                </>
              ) : usdcAllowance && usdcAllowance >= parseUnits(netAmount.toString(), 6) ? (
                <>
                  <CheckCircle className="h-5 w-5" />
                  Approved ✓
                </>
              ) : (
                'Approve USDC'
              )}
            </button>
            <button
              onClick={handleSubmit}
              disabled={
                isSubmitting || 
                isTxPending || 
                isProcessingTransaction ||
                isDepositTxPending ||
                !usdcBalance || 
                usdcBalance < parseUnits(netAmount.toString(), 6) ||
                !usdcAllowance || 
                usdcAllowance < parseUnits(netAmount.toString(), 6)
              }
              className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:shadow-lg disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 font-bold"
            >
              {isSubmitting || isProcessingTransaction || isDepositTxPending ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  {isProcessingTransaction || isDepositTxPending ? 'Processing...' : 'Submitting...'}
                </>
              ) : (
                'Submit Deposit'
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
