'use client'

import { useState, useEffect } from 'react'
import { useAccount, useSignMessage } from 'wagmi'
import { useRouter } from 'next/navigation'
import { MainLayout } from '@/components/layouts/MainLayout'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { MintUSDCButton } from '@/components/MintUSDCButton'
import { CONTRACTS, USER_REGISTRY_ABI } from '@/lib/contracts'
import { UserIcon, BuildingOfficeIcon, HomeIcon } from '@heroicons/react/24/outline'
import { logger } from '@/lib/logger'
import { useUserRole } from '@/hooks/useUserRole'

type Role = 'CLIENT' | 'SELLER' | null

export default function RegisterPage() {
  const router = useRouter()
  const { address, isConnected } = useAccount()
  const { isRegistered, isLoading: isCheckingRole } = useUserRole()
  const { signMessageAsync } = useSignMessage()
  const [selectedRole, setSelectedRole] = useState<Role>(null)
  const [isMockLoading, setIsMockLoading] = useState(false)
  const [isSavingToDb, setIsSavingToDb] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [registrationError, setRegistrationError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    businessName: ''
  })

  // Check if user is already registered and redirect
  useEffect(() => {
    if (isConnected && !isCheckingRole && isRegistered) {
      logger.info('User already registered, redirecting to dashboard', { address })
      router.push('/dashboard')
    }
  }, [isConnected, isCheckingRole, isRegistered, address, router])

  // Save to database after success
  useEffect(() => {
    if (isSuccess && address && !isSavingToDb) {
      saveToDatabase()
    }
  }, [isSuccess, address])

  const saveToDatabase = async () => {
    if (!address || !selectedRole) return
    
    setIsSavingToDb(true)
    try {
      logger.info('Saving user to database', { address, role: selectedRole })
      
      const response = await fetch('/api/users/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: address,
          role: selectedRole,
          name: formData.name,
          email: formData.email,
          businessName: selectedRole === 'SELLER' ? formData.businessName : null,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        logger.info('User saved to database', { wallet: address })
        setIsSuccess(true)
        setRegistrationError(null)
        // Redirect to KYC after successful save
        setTimeout(() => {
          router.push('/kyc')
        }, 2000)
      } else {
        logger.warn('Failed to save user to database', { error: data.error })
        setRegistrationError(data.error || 'Failed to save to database')
        // Still redirect even if database save fails
        setTimeout(() => {
          router.push('/kyc')
        }, 2000)
      }
    } catch (error: any) {
      logger.error('Error saving to database', error)
      setRegistrationError(error.message || 'Network error')
      // Still redirect even on error
      setTimeout(() => {
        router.push('/kyc')
      }, 2000)
    } finally {
      setIsSavingToDb(false)
    }
  }

  const handleRegister = async () => {
    if (!selectedRole || !formData.name || !formData.email) {
      logger.warn('Registration validation failed', { 
        selectedRole, 
        hasName: !!formData.name, 
        hasEmail: !!formData.email 
      })
      return
    }

    logger.info('Starting registration', { 
      role: selectedRole, 
      name: formData.name, 
      email: formData.email 
    })

    setIsMockLoading(true)

    try {
      // Signature-based registration (No blockchain transaction, gas-free!)
      
      logger.info('Creating signature for registration', { address })
      
      // Request signature from user (proof of wallet ownership)
      const message = `Welcome to FractionalEstate!

By signing this message, you agree to register as a ${selectedRole}.

This signature is free and does not cost any gas fees.

Wallet: ${address}
Email: ${formData.email}
Timestamp: ${Date.now()}`
      
      // Get real signature from wallet
      const signature = await signMessageAsync({ message })
      
      logger.info('Signature obtained', { 
        signature: signature.substring(0, 10) + '...',
        length: signature.length 
      })
      
      // Save directly to database with signature proof
      await saveToDatabase()
      
      logger.info('Registration complete without blockchain transaction')
      
    } catch (error: any) {
      logger.error('Registration error', { 
        error: error.message,
        code: error.code 
      })
      
      // Handle user rejection gracefully
      if (error.message?.includes('User rejected') || error.code === 4001) {
        setRegistrationError('You rejected the signature request. Please try again.')
      } else {
        setRegistrationError(error.message || 'Registration failed. Please try again.')
      }
    } finally {
      setIsMockLoading(false)
    }
  }

  if (!isConnected) {
    return (
      <MainLayout>
        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
          <Card className="max-w-md w-full text-center">
            <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <UserIcon className="w-8 h-8 text-primary-500" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Connect Your Wallet</h2>
            <p className="text-gray-600 mb-6">
              Please connect your wallet to register on the platform. Use the wallet button in the top right corner.
            </p>
          </Card>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="container-app py-12">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">Create Your Account</h1>
            <p className="text-gray-600">Choose your role to get started with FractionalEstate</p>
          </div>

          {/* Step 1: Role Selection */}
          {!selectedRole && (
            <div>
              <h2 className="text-2xl font-semibold mb-6">Select Your Role</h2>
              <div className="grid md:grid-cols-2 gap-6">
                {/* Investor/Client Card */}
                <Card 
                  variant="interactive"
                  onClick={() => setSelectedRole('CLIENT')}
                  className="cursor-pointer hover:border-primary-500 hover:shadow-lg transition-all"
                >
                  <div className="text-center">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <UserIcon className="w-8 h-8 text-blue-600" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">Investor</h3>
                    <p className="text-gray-600 mb-4">
                      Browse properties, invest in fractional shares, and earn monthly rental income
                    </p>
                    <Badge variant="info">Most Popular</Badge>
                    
                    <div className="mt-6 text-left space-y-2">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Invest from ₹1,000
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Earn passive income
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Trade on secondary market
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Property Owner/Seller Card */}
                <Card 
                  variant="interactive"
                  onClick={() => setSelectedRole('SELLER')}
                  className="cursor-pointer hover:border-primary-500 hover:shadow-lg transition-all"
                >
                  <div className="text-center">
                    <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <BuildingOfficeIcon className="w-8 h-8 text-primary-500" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">Property Owner</h3>
                    <p className="text-gray-600 mb-4">
                      List your properties, fractional ize ownership, and receive instant liquidity
                    </p>
                    <Badge variant="warning">Business</Badge>
                    
                    <div className="mt-6 text-left space-y-2">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        List multiple properties
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Get instant funding
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Platform takes 2% fee
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* Step 2: Registration Form */}
          {selectedRole && (
            <div>
              <button 
                onClick={() => setSelectedRole(null)}
                className="text-primary-500 hover:text-primary-600 mb-6 flex items-center gap-2"
              >
                ← Back to role selection
              </button>

              <Card>
                <div className="mb-6">
                  <h2 className="text-2xl font-semibold mb-2">
                    Register as {selectedRole === 'CLIENT' ? 'Investor' : 'Property Owner'}
                  </h2>
                  <p className="text-gray-600">
                    Fill in your details to create your account
                  </p>
                </div>

                <div className="space-y-4">
                  <Input
                    label="Full Name"
                    placeholder="Enter your full name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />

                  <Input
                    label="Email Address"
                    type="email"
                    placeholder="your@email.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />

                  {selectedRole === 'SELLER' && (
                    <Input
                      label="Business Name"
                      placeholder="Your company or business name"
                      value={formData.businessName}
                      onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                      required
                    />
                  )}

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
                    <h4 className="font-semibold text-blue-900 mb-2">Next Steps</h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• Complete registration on blockchain</li>
                      <li>• Submit KYC documents for verification</li>
                      <li>• Start {selectedRole === 'CLIENT' ? 'investing' : 'listing properties'} once approved</li>
                    </ul>
                  </div>

                  {/* Validation Warning */}
                  {(!formData.name || !formData.email || (selectedRole === 'SELLER' && !formData.businessName)) && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <p className="text-sm text-yellow-800">
                        ⚠️ Please fill all required fields to continue
                      </p>
                    </div>
                  )}

                  <Button
                    onClick={handleRegister}
                    className="btn-primary w-full py-4 text-lg"
                    size="lg"
                    isLoading={isMockLoading || isSavingToDb}
                    disabled={!formData.name || !formData.email || (selectedRole === 'SELLER' && !formData.businessName) || isSuccess}
                  >
                    {isMockLoading ? 'Creating Account...' : 
                     isSavingToDb ? 'Saving to Database...' :
                     isSuccess ? 'Registration Complete!' :
                     'Create Account'}
                  </Button>

                  {isSuccess && (
                    <div className="space-y-4">
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <p className="text-sm font-medium text-green-900 mb-1">
                          ✅ Registration Successful!
                        </p>
                        <p className="text-xs text-green-700">
                          Redirecting to KYC verification...
                        </p>
                      </div>
                      <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-lg p-6">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900">Get Test USDC</h4>
                            <p className="text-sm text-gray-600">Mint 10,000 test USDC to start investing</p>
                          </div>
                        </div>
                        <MintUSDCButton variant="default" showBalance={false} />
                      </div>
                    </div>
                  )}

                  {registrationError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <p className="text-sm font-medium text-red-900 mb-1">
                        ❌ Registration Failed
                      </p>
                      <p className="text-xs text-red-700">
                        {registrationError}
                      </p>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  )
}
