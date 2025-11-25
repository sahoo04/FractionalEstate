'use client'

import { useState, useEffect } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { CONTRACTS, PROPERTY_SHARE_1155_ABI } from '@/lib/contracts'
import { extractTokenIdFromReceipt, extractTokenIdWithRetry, validateTokenId, getLatestTokenId } from '@/lib/contract-events'
import { uploadPropertyDocuments } from '@/lib/ipfs'
import { HomeIcon, DocumentTextIcon, CameraIcon, CheckCircleIcon } from '@heroicons/react/24/outline'
import { logger } from '@/lib/logger'
import { getContract } from 'viem'

type PropertyStep = 1 | 2 | 3 | 4

interface PropertyFormData {
  name: string
  location: string
  propertyType: 'VILLA' | 'APARTMENT' | 'LAND' | 'COMMERCIAL' | ''
  totalShares: number
  pricePerShare: number
  bedrooms: number
  bathrooms: number
  squareFeet: number
  yearBuilt: string
  description: string
  amenities: string[]
  expectedAPY: number
  estimatedMonthlyRent: number
  propertyValue: number
  managementFee: number
  titleDeed: File | null
  propertyImages: File[]
  valuationReport: File | null
  taxClearance: File | null
}

const availableAmenities = [
  'WiFi', 'Pool', 'Gym', 'Parking', 'Security', 'Garden',
  'AC', 'Heating', 'Balcony', 'Elevator', 'Pet Friendly', 'Furnished'
]

export function CreatePropertyContent() {
  const router = useRouter()
  const { address } = useAccount()
  const publicClient = usePublicClient()
  const [currentStep, setCurrentStep] = useState<PropertyStep>(1)
  const [uploadingToIPFS, setUploadingToIPFS] = useState(false)
  const [isSavingToDb, setIsSavingToDb] = useState(false)
  const [createdTokenId, setCreatedTokenId] = useState<string | null>(null)
  
  const { writeContractAsync, isPending } = useWriteContract()
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>()
  const [metadataUri, setMetadataUri] = useState<string>('')
  const { isLoading: isConfirming, isSuccess, data: receipt } = useWaitForTransactionReceipt({ hash: txHash })
  
  // Save to database after successful transaction
  useEffect(() => {
    if (isSuccess && txHash && receipt && !isSavingToDb && metadataUri && publicClient) {
      // Extract tokenId from PropertyCreated event logs with retry
      const extractAndSave = async () => {
        try {
          logger.info('✅ Transaction confirmed, extracting tokenId with retry', { txHash })
          
          // Method 1: Try extracting from current receipt first (fast)
          let tokenId = extractTokenIdFromReceipt(receipt as any)
          
          // Method 2: If failed, retry with fresh receipt fetch
          if (!tokenId) {
            logger.warn('⚠️ Initial extraction failed, trying with retry mechanism')
            tokenId = await extractTokenIdWithRetry(txHash, publicClient, 3)
          }
          
          // Method 3: If still failed, get latest tokenId from contract
          if (!tokenId) {
            logger.warn('⚠️ Retry extraction failed, fetching latest tokenId from contract')
            const propertyContract = getContract({
              address: CONTRACTS.PropertyShare1155,
              abi: PROPERTY_SHARE_1155_ABI,
              client: publicClient,
            })
            tokenId = await getLatestTokenId(propertyContract)
          }
          
          if (tokenId) {
            const tokenIdStr = tokenId.toString()
            logger.info('🎯 TokenId obtained', { tokenId: tokenIdStr, method: 'extraction/contract' })
            
            // Validate tokenId before saving
            const propertyContract = getContract({
              address: CONTRACTS.PropertyShare1155,
              abi: PROPERTY_SHARE_1155_ABI,
              client: publicClient,
            })
            
            const isValid = await validateTokenId(tokenIdStr, propertyContract)
            
            if (isValid) {
              logger.info('✅ TokenId validated successfully', { tokenId: tokenIdStr })
              setCreatedTokenId(tokenIdStr)
              await saveToDatabase(tokenIdStr, metadataUri)
            } else {
              logger.error('❌ TokenId validation failed', { tokenId: tokenIdStr })
              alert('⚠️ Property created on blockchain but tokenId validation failed. Please contact support with transaction hash: ' + txHash)
              // Still try to save - admin can fix later
              setCreatedTokenId(tokenIdStr)
              await saveToDatabase(tokenIdStr, metadataUri)
            }
          } else {
            // All methods failed - don't use timestamp fallback!
            logger.error('❌ All tokenId extraction methods failed', { txHash })
            alert('⚠️ Property created on blockchain but tokenId extraction failed. Transaction: ' + txHash + '\n\nPlease contact support to complete the listing.')
            // Redirect without saving to database
            setTimeout(() => {
              router.push('/seller/properties')
            }, 3000)
          }
        } catch (error) {
          logger.error('❌ Error in post-transaction flow', error)
          alert('⚠️ Property created on blockchain but database save failed. Transaction: ' + txHash + '\n\nPlease contact support.')
          // Redirect anyway - property exists on-chain
          setTimeout(() => {
            router.push('/seller/properties')
          }, 3000)
        }
      }
      
      extractAndSave()
    }
  }, [isSuccess, txHash, receipt, metadataUri, publicClient])
  
  const [formData, setFormData] = useState<PropertyFormData>({
    name: '',
    location: '',
    propertyType: '',
    totalShares: 1000,
    pricePerShare: 15000,
    bedrooms: 3,
    bathrooms: 2,
    squareFeet: 1500,
    yearBuilt: new Date().getFullYear().toString(),
    description: '',
    amenities: [],
    expectedAPY: 8.5,
    estimatedMonthlyRent: 50000,
    propertyValue: 15000000,
    managementFee: 10,
    titleDeed: null,
    propertyImages: [],
    valuationReport: null,
    taxClearance: null,
  })

  const handleFileChange = (field: keyof PropertyFormData, file: File | null) => {
    setFormData({ ...formData, [field]: file })
  }

  const handleMultipleFiles = (files: FileList | null) => {
    if (files) {
      setFormData({ ...formData, propertyImages: Array.from(files) })
    }
  }

  const toggleAmenity = (amenity: string) => {
    const current = formData.amenities
    if (current.includes(amenity)) {
      setFormData({ ...formData, amenities: current.filter(a => a !== amenity) })
    } else {
      setFormData({ ...formData, amenities: [...current, amenity] })
    }
  }

  const uploadToIPFS = async (): Promise<string> => {
    if (!address) throw new Error('Wallet not connected')
    
    setUploadingToIPFS(true)
    try {
      logger.info('📤 Starting IPFS upload', { propertyName: formData.name })
      
      // Use existing uploadPropertyDocuments function
      const result = await uploadPropertyDocuments({
        images: formData.propertyImages,
        titleDeed: formData.titleDeed || undefined,
        valuationReport: formData.valuationReport || undefined,
        taxClearance: formData.taxClearance || undefined,
        propertyData: {
          name: formData.name,
          description: formData.description,
          location: formData.location,
          propertyType: formData.propertyType,
          totalShares: formData.totalShares,
          pricePerShare: formData.pricePerShare,
          expectedReturn: formData.expectedAPY,
          amenities: formData.amenities,
          propertyDetails: {
            bedrooms: formData.bedrooms,
            bathrooms: formData.bathrooms,
            area: formData.squareFeet,
            yearBuilt: formData.yearBuilt || new Date().getFullYear(),
            propertyValue: formData.propertyValue,
          },
          seller: address,
          createdAt: new Date().toISOString(),
        }
      })
      
      if (!result.success || !result.metadataUrl) {
        throw new Error(result.error || 'IPFS upload failed')
      }
      
      logger.info('✅ IPFS upload complete', { 
        metadataUri: result.metadataUrl,
        metadataHash: result.metadataHash 
      })
      
      return result.metadataUrl
    } catch (error) {
      logger.error('❌ IPFS upload error', error)
      throw error
    } finally {
      setUploadingToIPFS(false)
    }
  }

  const saveToDatabase = async (tokenId: string, metadataUri: string) => {
    if (!address) return
    
    setIsSavingToDb(true)
    try {
      logger.info('💾 Saving property to database', { tokenId, metadataUri })
      
      // Fetch the metadata to get image URLs
      let imageUrls: string[] = []
      try {
        const metadataResponse = await fetch(metadataUri.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/'))
        if (metadataResponse.ok) {
          const metadata = await metadataResponse.json()
          imageUrls = metadata.images || []
          logger.info('📸 Extracted image URLs from metadata', { count: imageUrls.length })
        }
      } catch (err) {
        logger.warn('⚠️ Could not fetch metadata for images', { error: err })
        // Fallback to empty array
        imageUrls = []
      }
      
      // Parse location into address components (simple split)
      const locationParts = formData.location.split(',').map(s => s.trim())
      const city = locationParts[0] || 'Unknown City'
      const state = locationParts[1] || 'Unknown State'
      
      const response = await fetch('/api/properties/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token_id: tokenId,
          seller_wallet: address.toLowerCase(),
          name: formData.name,
          description: formData.description,
          location: formData.location,
          address: formData.location, // Full address
          city: city,
          state: state,
          zipcode: '000000', // Default zipcode
          property_type: formData.propertyType, // Already in uppercase
          total_shares: formData.totalShares,
          price_per_share: formData.pricePerShare.toString(),
          images: imageUrls, // Use IPFS URLs instead of filenames
          amenities: formData.amenities,
          metadata_uri: metadataUri,
          status: 'DRAFT', // Using property_status enum value
        }),
      })

      const data = await response.json()

      if (response.ok) {
        logger.info('✅ Property saved to database', { tokenId })
        setCreatedTokenId(tokenId)
        setTimeout(() => {
          router.push('/seller/properties')
        }, 2000)
      } else {
        logger.warn('⚠️ Failed to save property to database', { error: data.error })
        // Still redirect - property exists on-chain
        setCreatedTokenId(tokenId)
        setTimeout(() => {
          router.push('/seller/properties')
        }, 2000)
      }
    } catch (error) {
      logger.error('❌ Error saving property to database', error)
      // Still redirect - property exists on-chain
      setCreatedTokenId(tokenId)
      setTimeout(() => {
        router.push('/seller/properties')
      }, 2000)
    } finally {
      setIsSavingToDb(false)
    }
  }

  const handleCreateProperty = async () => {
    try {
      if (!address) {
        alert('Please connect your wallet first')
        return
      }

      logger.info('🚀 Starting property creation', { name: formData.name, address })
      
      // STEP 1: Upload to IPFS (images + documents + metadata JSON)
      const uploadedMetadataUri = await uploadToIPFS()
      setMetadataUri(uploadedMetadataUri)
      
      // STEP 2: Convert pricePerShare to USDC format (6 decimals)
      const pricePerShareInUSDC = BigInt(formData.pricePerShare) * BigInt(1e6)
      
      logger.info('⛓️ Creating property on blockchain', { 
        metadataUri: uploadedMetadataUri,
        pricePerShare: pricePerShareInUSDC.toString(),
        contract: CONTRACTS.PropertyShare1155,
        seller: address
      })
      
      // STEP 3: Seller directly calls contract (pays gas)
      const hash = await writeContractAsync({
        address: CONTRACTS.PropertyShare1155,
        abi: PROPERTY_SHARE_1155_ABI,
        functionName: 'createProperty',
        args: [
          formData.name,
          formData.location,
          BigInt(formData.totalShares),
          pricePerShareInUSDC,
          uploadedMetadataUri,
          address!, // initialOwner = seller
          BigInt(0)  // no initial mint
        ],
      })
      
      setTxHash(hash)
      logger.info('✅ Transaction submitted', { hash })
      
      // STEP 4: After transaction confirms, useEffect will save to database
      
    } catch (error) {
      const errorMessage = typeof error === 'object' && error !== null && 'message' in error 
        ? String(error.message)
        : typeof error === 'string' 
        ? error 
        : 'Unknown error occurred'
      
      logger.error('❌ Property creation error', { error: errorMessage })
      console.error('Full error:', error)
      
      // Show detailed error to user
      if (errorMessage.includes('User rejected')) {
        alert('❌ Transaction cancelled by user')
      } else if (errorMessage.includes('insufficient funds')) {
        alert('❌ Insufficient funds for gas. Please add ETH to your wallet.')
      } else if (errorMessage.toLowerCase().includes('failed to fetch')) {
        alert('❌ Network error. Please check:\n1. You are connected to Arbitrum Sepolia\n2. Your RPC is working\n3. Try clearing browser cache (Ctrl+Shift+Delete)')
      } else {
        alert('❌ Error: ' + errorMessage)
      }
    }
  }

  const isStep1Valid = formData.name && formData.location && formData.propertyType && 
                       formData.totalShares > 0 && formData.pricePerShare > 0
  const isStep2Valid = formData.description && formData.squareFeet > 0
  const isStep3Valid = formData.expectedAPY > 0 && formData.propertyValue > 0
  const isStep4Valid = formData.titleDeed && formData.propertyImages.length > 0

  // Show transaction progress
  if (uploadingToIPFS || isPending || isConfirming || isSavingToDb) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
        <Card className="max-w-md w-full text-center p-8">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-500 mx-auto mb-4"></div>
          
          <h2 className="text-2xl font-bold mb-2">
            {uploadingToIPFS && '📤 Uploading to IPFS...'}
            {isPending && '⏳ Waiting for wallet approval...'}
            {isConfirming && '⛓️ Confirming transaction...'}
            {isSavingToDb && '💾 Saving to database...'}
          </h2>
          
          <p className="text-gray-600 mb-4">
            {uploadingToIPFS && 'Uploading property images and documents to IPFS. This may take a minute...'}
            {isPending && 'Please confirm the transaction in your wallet.'}
            {isConfirming && 'Transaction submitted! Waiting for blockchain confirmation. This usually takes 10-30 seconds...'}
            {isSavingToDb && 'Transaction confirmed! Saving property details to database...'}
          </p>

          {txHash && (
            <a 
              href={`https://sepolia.arbiscan.io/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-500 hover:underline text-sm"
            >
              View on Arbiscan →
            </a>
          )}

          <div className="mt-6 text-xs text-gray-500">
            {uploadingToIPFS && 'Step 1 of 4'}
            {isPending && 'Step 2 of 4'}
            {isConfirming && 'Step 3 of 4'}
            {isSavingToDb && 'Step 4 of 4'}
          </div>
        </Card>
      </div>
    )
  }

  if (isSuccess) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
        <Card className="max-w-md w-full text-center">
          <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Property Listed Successfully!</h2>
          <p className="text-gray-600 mb-6">
            Your property is now pending admin verification.
          </p>
          <Button onClick={() => router.push('/seller/dashboard')} fullWidth>
            Go to Dashboard
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="container-app py-12">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">List Your Property</h1>
          <p className="text-gray-600">Fractionalize your property and get instant funding</p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            {[1, 2, 3, 4].map((step, idx) => (
              <div key={step} className="flex items-center flex-1">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold ${
                  currentStep >= step 
                    ? 'bg-primary-500 text-white' 
                    : 'bg-gray-200 text-gray-500'
                }`}>
                  {step}
                </div>
                {idx < 3 && (
                  <div className="flex-1 mx-2">
                    <div className={`h-1 rounded ${
                      currentStep > step ? 'bg-primary-500' : 'bg-gray-200'
                    }`} />
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-sm">
            <span className={currentStep >= 1 ? 'text-primary-500 font-medium' : 'text-gray-500'}>Basic Info</span>
            <span className={currentStep >= 2 ? 'text-primary-500 font-medium' : 'text-gray-500'}>Details</span>
            <span className={currentStep >= 3 ? 'text-primary-500 font-medium' : 'text-gray-500'}>Financial</span>
            <span className={currentStep >= 4 ? 'text-primary-500 font-medium' : 'text-gray-500'}>Documents</span>
          </div>
        </div>

        {/* Step 1: Basic Information */}
        {currentStep === 1 && (
          <Card>
            <h2 className="text-2xl font-semibold mb-6">Basic Information</h2>
            <div className="space-y-4">
              <Input
                label="Property Name"
                placeholder="e.g., Luxury Villa in Goa"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
              
              <Input
                label="Location"
                placeholder="e.g., Candolim, Goa"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                required
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Property Type *
                </label>
                <div className="grid md:grid-cols-4 gap-4">
                  {[
                    { value: 'VILLA', label: '🏡 Villa' },
                    { value: 'APARTMENT', label: '🏢 Apartment' },
                    { value: 'LAND', label: '� Land' },
                    { value: 'COMMERCIAL', label: '� Commercial' }
                  ].map((option) => (
                    <Card
                      key={option.value}
                      variant={formData.propertyType === option.value ? 'outlined' : 'default'}
                      className={`cursor-pointer text-center ${
                        formData.propertyType === option.value ? 'border-primary-500 border-2' : ''
                      }`}
                      onClick={() => setFormData({ ...formData, propertyType: option.value as any })}
                    >
                      <div className="font-medium">{option.label}</div>
                    </Card>
                  ))}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <Input
                  label="Total Shares"
                  type="number"
                  min={1}
                  value={formData.totalShares}
                  onChange={(e) => setFormData({ ...formData, totalShares: parseInt(e.target.value) || 0 })}
                  helperText="Number of fractional shares to create"
                  required
                />
                <Input
                  label="Price per Share (₹)"
                  type="number"
                  min={100}
                  value={formData.pricePerShare}
                  onChange={(e) => setFormData({ ...formData, pricePerShare: parseInt(e.target.value) || 0 })}
                  helperText="Minimum ₹100 per share"
                  required
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="font-semibold text-blue-900 mb-1">💡 Funding Potential</div>
                <div className="text-2xl font-bold text-blue-600">
                  ₹{(formData.totalShares * formData.pricePerShare).toLocaleString()}
                </div>
                <div className="text-sm text-blue-800">
                  Total capital you'll receive (minus 2% platform fee)
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button 
                  onClick={() => setCurrentStep(2)}
                  disabled={!isStep1Valid}
                >
                  Next: Property Details →
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Step 2: Property Details */}
        {currentStep === 2 && (
          <Card>
            <h2 className="text-2xl font-semibold mb-6">Property Details</h2>
            <div className="space-y-4">
              <div className="grid md:grid-cols-3 gap-4">
                <Input
                  label="Bedrooms"
                  type="number"
                  min={1}
                  value={formData.bedrooms}
                  onChange={(e) => setFormData({ ...formData, bedrooms: parseInt(e.target.value) || 0 })}
                />
                <Input
                  label="Bathrooms"
                  type="number"
                  min={1}
                  value={formData.bathrooms}
                  onChange={(e) => setFormData({ ...formData, bathrooms: parseInt(e.target.value) || 0 })}
                />
                <Input
                  label="Square Feet"
                  type="number"
                  min={100}
                  value={formData.squareFeet}
                  onChange={(e) => setFormData({ ...formData, squareFeet: parseInt(e.target.value) || 0 })}
                  required
                />
              </div>

              <Input
                label="Year Built"
                type="number"
                min={1900}
                max={new Date().getFullYear()}
                value={formData.yearBuilt}
                onChange={(e) => setFormData({ ...formData, yearBuilt: e.target.value })}
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description *
                </label>
                <textarea
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500"
                  rows={5}
                  placeholder="Describe your property..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amenities
                </label>
                <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                  {availableAmenities.map((amenity) => (
                    <Badge
                      key={amenity}
                      variant={formData.amenities.includes(amenity) ? 'info' : 'default'}
                      className="cursor-pointer justify-center py-2"
                      onClick={() => toggleAmenity(amenity)}
                    >
                      {amenity}
                    </Badge>
                  ))}
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
                  Next: Financial Details →
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Step 3: Financial Details */}
        {currentStep === 3 && (
          <Card>
            <h2 className="text-2xl font-semibold mb-6">Financial Details</h2>
            <div className="space-y-4">
              <Input
                label="Expected Annual Yield (%)"
                type="number"
                step="0.1"
                min={0}
                value={formData.expectedAPY}
                onChange={(e) => setFormData({ ...formData, expectedAPY: parseFloat(e.target.value) || 0 })}
                required
              />

              <Input
                label="Estimated Monthly Rent (₹)"
                type="number"
                min={0}
                value={formData.estimatedMonthlyRent}
                onChange={(e) => setFormData({ ...formData, estimatedMonthlyRent: parseInt(e.target.value) || 0 })}
              />

              <Input
                label="Property Valuation (₹)"
                type="number"
                min={0}
                value={formData.propertyValue}
                onChange={(e) => setFormData({ ...formData, propertyValue: parseInt(e.target.value) || 0 })}
                required
              />

              <Input
                label="Management Fee (%)"
                type="number"
                min={0}
                max={50}
                value={formData.managementFee}
                onChange={(e) => setFormData({ ...formData, managementFee: parseInt(e.target.value) || 0 })}
              />

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-semibold text-green-900 mb-2">📊 Investment Metrics</h4>
                <div className="space-y-2 text-sm text-green-800">
                  <div className="flex justify-between">
                    <span>Monthly Investor Returns:</span>
                    <span className="font-medium">
                      ₹{Math.floor(formData.estimatedMonthlyRent * (1 - formData.managementFee / 100)).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Return per Share/Month:</span>
                    <span className="font-medium">
                      ₹{Math.floor((formData.estimatedMonthlyRent * (1 - formData.managementFee / 100)) / formData.totalShares)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <Button variant="ghost" onClick={() => setCurrentStep(2)}>
                  ← Back
                </Button>
                <Button 
                  onClick={() => setCurrentStep(4)}
                  disabled={!isStep3Valid}
                >
                  Next: Documents →
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Step 4: Documents & Images */}
        {currentStep === 4 && (
          <Card>
            <h2 className="text-2xl font-semibold mb-6">Documents & Images</h2>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Property Images * (Max 10)
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-primary-500 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => handleMultipleFiles(e.target.files)}
                    className="hidden"
                    id="property-images"
                  />
                  <label htmlFor="property-images" className="cursor-pointer">
                    <CameraIcon className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                    <div className="text-sm text-gray-600">
                      {formData.propertyImages.length > 0 
                        ? `${formData.propertyImages.length} images selected` 
                        : 'Click to upload property images'}
                    </div>
                  </label>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Title Deed *
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary-500 transition-colors">
                    <input
                      type="file"
                      accept=".pdf,image/*"
                      onChange={(e) => handleFileChange('titleDeed', e.target.files?.[0] || null)}
                      className="hidden"
                      id="title-deed"
                    />
                    <label htmlFor="title-deed" className="cursor-pointer">
                      <DocumentTextIcon className="w-10 h-10 mx-auto mb-2 text-gray-400" />
                      <div className="text-sm text-gray-600">
                        {formData.titleDeed ? formData.titleDeed.name : 'Upload Title Deed'}
                      </div>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Valuation Report
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary-500 transition-colors">
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={(e) => handleFileChange('valuationReport', e.target.files?.[0] || null)}
                      className="hidden"
                      id="valuation"
                    />
                    <label htmlFor="valuation" className="cursor-pointer">
                      <DocumentTextIcon className="w-10 h-10 mx-auto mb-2 text-gray-400" />
                      <div className="text-sm text-gray-600">
                        {formData.valuationReport ? formData.valuationReport.name : 'Upload Report'}
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-semibold text-yellow-900 mb-2">⚠️ Document Requirements</h4>
                <ul className="text-sm text-yellow-800 space-y-1">
                  <li>• All documents must be clear and legible</li>
                  <li>• Admin will verify all documents before approval</li>
                </ul>
              </div>

              <div className="flex justify-between pt-4">
                <Button variant="ghost" onClick={() => setCurrentStep(3)}>
                  ← Back
                </Button>
                <Button 
                  onClick={handleCreateProperty}
                  disabled={!isStep4Valid || isSuccess}
                  isLoading={uploadingToIPFS || isPending || isConfirming || isSavingToDb}
                >
                  {uploadingToIPFS ? 'Uploading to IPFS...' : 
                   isPending ? 'Confirm in Wallet...' :
                   isConfirming ? 'Creating on Blockchain...' :
                   isSavingToDb ? 'Saving to Database...' :
                   'Submit for Approval'}
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
