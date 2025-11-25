'use client'

import { useState } from 'react'
import { useAccount } from 'wagmi'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { logger } from '@/lib/logger'
import { DocumentTextIcon, CameraIcon, CheckCircleIcon } from '@heroicons/react/24/outline'

type KYCStep = 1 | 2 | 3

interface KYCFormData {
  fullName: string
  dateOfBirth: string
  nationality: string
  address: string
  city: string
  state: string
  pincode: string
  idType: 'passport' | 'aadhar' | 'dl' | ''
  idNumber: string
  idFrontImage: File | null
  idBackImage: File | null
  addressProofType: 'utility' | 'bank' | 'rental' | ''
  addressProofImage: File | null
  selfieImage: File | null
}

export function KYCSubmissionContent() {
  const router = useRouter()
  const { address } = useAccount()
  const [currentStep, setCurrentStep] = useState<KYCStep>(1)
  const [uploadingToIPFS, setUploadingToIPFS] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  
  const [formData, setFormData] = useState<KYCFormData>({
    fullName: '',
    dateOfBirth: '',
    nationality: 'Indian',
    address: '',
    city: '',
    state: '',
    pincode: '',
    idType: '',
    idNumber: '',
    idFrontImage: null,
    idBackImage: null,
    addressProofType: '',
    addressProofImage: null,
    selfieImage: null,
  })

  const handleFileChange = (field: keyof KYCFormData, file: File | null) => {
    setFormData({ ...formData, [field]: file })
  }

  const uploadToIPFS = async (): Promise<string> => {
    setUploadingToIPFS(true)
    try {
      logger.info('Preparing documents for IPFS upload...')

      if (!formData.idFrontImage || !formData.addressProofImage || !formData.selfieImage) {
        throw new Error('Missing required files')
      }

      const uploadData = new FormData()
      uploadData.append('idFront', formData.idFrontImage)
      if (formData.idBackImage) {
        uploadData.append('idBack', formData.idBackImage)
      }
      uploadData.append('addressProof', formData.addressProofImage)
      uploadData.append('selfie', formData.selfieImage)

      const metadata = {
        wallet_address: address,
        full_name: formData.fullName,
        id_type: formData.idType,
        id_number: formData.idNumber,
        address_proof_type: formData.addressProofType,
        uploaded_at: new Date().toISOString()
      }
      uploadData.append('metadata', JSON.stringify(metadata))

      const response = await fetch('/api/ipfs/upload-kyc', {
        method: 'POST',
        body: uploadData
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.details || data.error || 'Failed to upload to IPFS')
      }

      logger.info('Documents uploaded to IPFS', { ipfsHash: data.ipfsHash })
      return data.ipfsHash

    } catch (error: any) {
      logger.error('IPFS upload failed', error)
      throw new Error('Failed to upload documents: ' + error.message)
    } finally {
      setUploadingToIPFS(false)
    }
  }

  const handleSubmitKYC = async () => {
    if (!address) return

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      logger.info('Starting KYC submission', { address })

      const documentHash = await uploadToIPFS()

      const response = await fetch('/api/kyc/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet_address: address,
          full_name: formData.fullName,
          date_of_birth: formData.dateOfBirth,
          nationality: formData.nationality,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          pincode: formData.pincode,
          id_type: formData.idType,
          id_number: formData.idNumber,
          address_proof_type: formData.addressProofType,
          document_hash: documentHash,
          status: 'PENDING'
        })
      })

      const data = await response.json()

      if (response.ok) {
        logger.info('KYC submitted successfully')
        setIsSuccess(true)
        setTimeout(() => {
          router.push('/dashboard')
        }, 2000)
      } else {
        setSubmitError(data.details || data.error || 'Failed to submit KYC')
      }
    } catch (error: any) {
      logger.error('KYC submission error', error)
      setSubmitError(error.message || 'Network error. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const isStep1Valid = formData.fullName && formData.dateOfBirth && formData.address && 
                       formData.city && formData.state && formData.pincode
  const isStep2Valid = formData.idType && formData.idNumber && formData.idFrontImage
  const isStep3Valid = formData.addressProofType && formData.addressProofImage && formData.selfieImage

  if (isSuccess) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
        <Card className="max-w-md w-full text-center">
          <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">KYC Submitted Successfully!</h2>
          <p className="text-gray-600 mb-6">
            Your documents are under review. We'll notify you within 24-48 hours.
          </p>
          <Button onClick={() => router.push('/dashboard')} fullWidth>
            Go to Dashboard
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="container-app py-12">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">KYC Verification</h1>
          <p className="text-gray-600">Complete your identity verification to start investing</p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center flex-1">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold ${
                  currentStep >= step 
                    ? 'bg-primary-500 text-white' 
                    : 'bg-gray-200 text-gray-500'
                }`}>
                  {step}
                </div>
                <div className="flex-1 mx-2">
                  <div className={`h-1 rounded ${
                    currentStep > step ? 'bg-primary-500' : 'bg-gray-200'
                  }`} />
                </div>
              </div>
            ))}
            <div className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold ${
              currentStep > 3 ? 'bg-primary-500 text-white' : 'bg-gray-200 text-gray-500'
            }`}>
              ✓
            </div>
          </div>
          <div className="flex justify-between mt-2 text-sm">
            <span className={currentStep >= 1 ? 'text-primary-500 font-medium' : 'text-gray-500'}>Personal Info</span>
            <span className={currentStep >= 2 ? 'text-primary-500 font-medium' : 'text-gray-500'}>ID Verification</span>
            <span className={currentStep >= 3 ? 'text-primary-500 font-medium' : 'text-gray-500'}>Address Proof</span>
            <span className="text-gray-500">Submit</span>
          </div>
        </div>

        {/* Step 1: Personal Information */}
        {currentStep === 1 && (
          <Card>
            <h2 className="text-2xl font-semibold mb-6">Personal Information</h2>
            <div className="space-y-4">
              <Input
                label="Full Name"
                placeholder="As per government ID"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                required
              />
              
              <div className="grid md:grid-cols-2 gap-4">
                <Input
                  label="Date of Birth"
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                  required
                />
                <Input
                  label="Nationality"
                  value={formData.nationality}
                  onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                  required
                />
              </div>

              <Input
                label="Residential Address"
                placeholder="House/Flat number, Street name"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                required
              />

              <div className="grid md:grid-cols-3 gap-4">
                <Input
                  label="City"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  required
                />
                <Input
                  label="State"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  required
                />
                <Input
                  label="Pincode"
                  type="number"
                  value={formData.pincode}
                  onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                  required
                />
              </div>

              <div className="flex justify-end pt-4">
                <Button 
                  onClick={() => setCurrentStep(2)}
                  disabled={!isStep1Valid}
                >
                  Next: ID Verification →
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Step 2: ID Verification */}
        {currentStep === 2 && (
          <Card>
            <h2 className="text-2xl font-semibold mb-6">Identity Verification</h2>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select ID Type *
                </label>
                <div className="grid md:grid-cols-3 gap-4">
                  {[
                    { value: 'aadhar', label: 'Aadhar Card' },
                    { value: 'passport', label: 'Passport' },
                    { value: 'dl', label: 'Driving License' }
                  ].map((option) => (
                    <Card
                      key={option.value}
                      variant={formData.idType === option.value ? 'outlined' : 'default'}
                      className={`cursor-pointer text-center ${
                        formData.idType === option.value ? 'border-primary-500 border-2' : ''
                      }`}
                      onClick={() => setFormData({ ...formData, idType: option.value as any })}
                    >
                      <DocumentTextIcon className="w-8 h-8 mx-auto mb-2 text-primary-500" />
                      <div className="font-medium">{option.label}</div>
                    </Card>
                  ))}
                </div>
              </div>

              <Input
                label="ID Number"
                placeholder="Enter your ID number"
                value={formData.idNumber}
                onChange={(e) => setFormData({ ...formData, idNumber: e.target.value })}
                required
              />

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Front Side *
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-primary-500 transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileChange('idFrontImage', e.target.files?.[0] || null)}
                      className="hidden"
                      id="id-front"
                    />
                    <label htmlFor="id-front" className="cursor-pointer">
                      <CameraIcon className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                      <div className="text-sm text-gray-600">
                        {formData.idFrontImage ? formData.idFrontImage.name : 'Click to upload'}
                      </div>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Back Side (if applicable)
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-primary-500 transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileChange('idBackImage', e.target.files?.[0] || null)}
                      className="hidden"
                      id="id-back"
                    />
                    <label htmlFor="id-back" className="cursor-pointer">
                      <CameraIcon className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                      <div className="text-sm text-gray-600">
                        {formData.idBackImage ? formData.idBackImage.name : 'Click to upload'}
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <Button variant="ghost" onClick={() => setCurrentStep(1)}>
                  ← Back
                </Button>
                <Button 
                  onClick={() => setCurrentStep(3)}
                  disabled={!isStep2Valid}
                >
                  Next: Address Proof →
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Step 3: Address Proof */}
        {currentStep === 3 && (
          <Card>
            <h2 className="text-2xl font-semibold mb-6">Proof of Address & Selfie</h2>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Address Proof Type *
                </label>
                <div className="grid md:grid-cols-3 gap-4">
                  {[
                    { value: 'utility', label: 'Utility Bill' },
                    { value: 'bank', label: 'Bank Statement' },
                    { value: 'rental', label: 'Rental Agreement' }
                  ].map((option) => (
                    <Card
                      key={option.value}
                      variant={formData.addressProofType === option.value ? 'outlined' : 'default'}
                      className={`cursor-pointer text-center ${
                        formData.addressProofType === option.value ? 'border-primary-500 border-2' : ''
                      }`}
                      onClick={() => setFormData({ ...formData, addressProofType: option.value as any })}
                    >
                      <DocumentTextIcon className="w-8 h-8 mx-auto mb-2 text-primary-500" />
                      <div className="font-medium">{option.label}</div>
                    </Card>
                  ))}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload Address Proof *
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-primary-500 transition-colors">
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={(e) => handleFileChange('addressProofImage', e.target.files?.[0] || null)}
                      className="hidden"
                      id="address-proof"
                    />
                    <label htmlFor="address-proof" className="cursor-pointer">
                      <DocumentTextIcon className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                      <div className="text-sm text-gray-600">
                        {formData.addressProofImage ? formData.addressProofImage.name : 'Click to upload'}
                      </div>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload Selfie *
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-primary-500 transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileChange('selfieImage', e.target.files?.[0] || null)}
                      className="hidden"
                      id="selfie"
                    />
                    <label htmlFor="selfie" className="cursor-pointer">
                      <CameraIcon className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                      <div className="text-sm text-gray-600">
                        {formData.selfieImage ? formData.selfieImage.name : 'Take a selfie'}
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-semibold text-yellow-900 mb-2">📸 Selfie Guidelines</h4>
                <ul className="text-sm text-yellow-800 space-y-1">
                  <li>• Face should be clearly visible</li>
                  <li>• Good lighting, no shadows</li>
                  <li>• Remove sunglasses or hat</li>
                </ul>
              </div>

              {submitError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-red-900">
                    ❌ {submitError}
                  </p>
                </div>
              )}

              <div className="flex justify-between pt-4">
                <Button variant="ghost" onClick={() => setCurrentStep(2)}>
                  ← Back
                </Button>
                <Button 
                  onClick={handleSubmitKYC}
                  disabled={!isStep3Valid || isSubmitting}
                  isLoading={uploadingToIPFS || isSubmitting}
                >
                  {uploadingToIPFS ? 'Uploading...' : 
                   isSubmitting ? 'Submitting...' : 
                   'Submit KYC'}
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Info Box */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="font-semibold text-blue-900 mb-2">🔒 Your Privacy Matters</h3>
          <p className="text-sm text-blue-800">
            All documents are encrypted and stored securely on IPFS. Your data will never be shared with third parties.
          </p>
        </div>
      </div>
    </div>
  )
}
