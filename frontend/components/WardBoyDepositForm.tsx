'use client'

import React, { useState } from 'react'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseUnits, formatUnits } from 'viem'
import { CONTRACTS, REVENUE_SPLITTER_ABI, USDC_ABI } from '@/lib/contracts'
import { uploadMultipleFilesToPinata, uploadJSONToPinata } from '@/lib/pinata'
import { supabase } from '@/lib/supabase'
import MultiFileUpload, { BillFileWithCategory } from './MultiFileUpload'
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react'

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

interface WardBoyDepositFormProps {
  prefilledPropertyId?: number
}

export default function WardBoyDepositForm({ prefilledPropertyId }: WardBoyDepositFormProps) {
  const { address } = useAccount()
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState<RentDepositFormData>({
    propertyId: prefilledPropertyId?.toString() || '',
    propertyName: '',
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

  // Contract interactions
  const { writeContract, data: txHash } = useWriteContract()
  const { isLoading: isTxPending, isSuccess: isTxSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  })

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

  const handleInputChange = (field: keyof RentDepositFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleApproveUSDC = async () => {
    if (!address) return
    
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

    setIsSubmitting(true)
    setError('')

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

      // 3. Submit blockchain transaction
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

      // 4. Save to database
      console.log('Saving to database...')
      const { error: dbError } = await (supabase as any)
        .from('rent_deposits')
        .insert({
          property_id: parseInt(formData.propertyId),
          property_name: formData.propertyName,
          ward_boy_address: address.toLowerCase(),
          deposit_month: formData.month,
          gross_rent: parseUnits(formData.grossRent, 6).toString(),
          repairs: parseUnits(formData.repairs || '0', 6).toString(),
          utilities: parseUnits(formData.utilities || '0', 6).toString(),
          cleaning: parseUnits(formData.cleaning || '0', 6).toString(),
          other_expenses: parseUnits(formData.otherExpenses || '0', 6).toString(),
          total_miscellaneous: parseUnits(totalMiscellaneous.toString(), 6).toString(),
          net_amount: parseUnits(netAmount.toString(), 6).toString(),
          notes: formData.notes,
          bills_metadata: billsMetadata,
          summary_ipfs_hash: summaryUpload.IpfsHash,
          status: 'pending',
          deposit_tx_hash: txHash,
        })

      if (dbError) {
        console.error('Database error:', dbError)
        throw new Error('Failed to save to database')
      }

      setSuccess('Deposit submitted successfully! Waiting for admin approval.')
      
      // Reset form
      setFormData({
        propertyId: '',
        propertyName: '',
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

    } catch (err: any) {
      console.error('Submission error:', err)
      setError(err.message || 'Failed to submit deposit')
    } finally {
      setIsSubmitting(false)
    }
  }

  const canProceedToStep2 = formData.propertyId && formData.propertyName && formData.month && formData.grossRent
  const canProceedToStep3 = canProceedToStep2 && netAmount > 0

  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                  step >= s
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                }`}
              >
                {s}
              </div>
              {s < 3 && (
                <div
                  className={`w-24 h-1 mx-2 ${
                    step > s ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">Basic Info</span>
          <span className="text-sm text-gray-600 dark:text-gray-400">Amounts</span>
          <span className="text-sm text-gray-600 dark:text-gray-400">Review</span>
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 flex items-start gap-3">
          <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-green-800 dark:text-green-200">{success}</p>
        </div>
      )}

      {/* Step 1: Basic Info */}
      {step === 1 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 space-y-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Step 1: Basic Information
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Property ID *
              </label>
              <input
                type="number"
                value={formData.propertyId}
                onChange={(e) => handleInputChange('propertyId', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Enter property ID"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Property Name *
              </label>
              <input
                type="text"
                value={formData.propertyName}
                onChange={(e) => handleInputChange('propertyName', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="e.g., Mumbai Villa"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Month/Period *
              </label>
              <input
                type="month"
                value={formData.month}
                onChange={(e) => handleInputChange('month', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Gross Rent Collected (USDC) *
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.grossRent}
                onChange={(e) => handleInputChange('grossRent', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="50000"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => setStep(2)}
              disabled={!canProceedToStep2}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Amounts & Bills */}
      {step === 2 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 space-y-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
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
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-700 dark:text-gray-300">Gross Rent:</span>
              <span className="font-medium text-gray-900 dark:text-white">${grossRent.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-700 dark:text-gray-300">Total Miscellaneous:</span>
              <span className="font-medium text-red-600 dark:text-red-400">-${totalMiscellaneous.toFixed(2)}</span>
            </div>
            <div className="border-t border-blue-200 dark:border-blue-800 pt-2 flex justify-between">
              <span className="font-medium text-gray-900 dark:text-white">Net Amount:</span>
              <span className="font-bold text-blue-600 dark:text-blue-400">${netAmount.toFixed(2)}</span>
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
              className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Back
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={!canProceedToStep3}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              Review
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Review & Submit */}
      {step === 3 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 space-y-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
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
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => setStep(2)}
              disabled={isSubmitting}
              className="flex-1 px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              Back
            </button>
            <button
              onClick={handleApproveUSDC}
              disabled={isSubmitting || isTxPending}
              className="flex-1 px-6 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:bg-gray-400 transition-colors flex items-center justify-center gap-2"
            >
              {isTxPending ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Approving...
                </>
              ) : (
                'Approve USDC'
              )}
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || isTxPending || !isTxSuccess}
              className="flex-1 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Submitting...
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
