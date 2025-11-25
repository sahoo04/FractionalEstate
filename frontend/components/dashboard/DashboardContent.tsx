'use client'

import React, { useState, useEffect } from 'react'
import { useAccount, useReadContract } from 'wagmi'
import { CONTRACTS, PROPERTY_SHARE_1155_ABI, REVENUE_SPLITTER_ABI } from '@/lib/contracts'
import { ClaimRewards } from '@/components/ClaimRewards'
import { CreateListingForm } from '@/components/CreateListingForm'
import { MyListings } from '@/components/MyListings'
import { PortfolioPropertyCard } from '@/components/PortfolioPropertyCard'
import { TotalClaimableSummary } from '@/components/TotalClaimableSummary'
import { KYCStatusBadge } from '@/components/dashboard/KYCStatusBadge'
import { MintUSDCButton } from '@/components/MintUSDCButton'
import { AnimatedSection } from '@/components/ui/AnimatedSection'
import { CardSkeleton } from '@/components/ui/LoadingSkeleton'
import Link from 'next/link'
import { logger } from '@/lib/logger'
import { getImageUrl } from '@/lib/image-utils'

export function DashboardContent() {
  const { address, isConnected } = useAccount()
  const [portfolio, setPortfolio] = useState<any>(null)
  const [isLoadingPortfolio, setIsLoadingPortfolio] = useState(false)

  // Fetch portfolio from database
  useEffect(() => {
    if (!address || !isConnected) return

    const fetchPortfolio = async () => {
      setIsLoadingPortfolio(true)
      try {
        logger.info('Fetching portfolio from database', { address })
        const response = await fetch(`/api/users/${address}/portfolio`)
        
        logger.info('Portfolio API response status', { 
          status: response.status, 
          ok: response.ok 
        })
        
        if (response.ok) {
          const data = await response.json()
          
          logger.info('Portfolio data received', { 
            portfolioLength: data.portfolio?.length,
            summary: data.summary,
            firstProperty: data.portfolio?.[0]
          })
          
          setPortfolio(data)
          logger.info('Portfolio loaded', { 
            properties: data.portfolio.length,
            totalInvested: data.summary.total_invested 
          })
        } else {
          const errorText = await response.text()
          logger.warn('Portfolio not found', { address, status: response.status, error: errorText })
          setPortfolio({ portfolio: [], summary: {
            total_properties: 0,
            total_invested: '0',
            current_value: '0',
            profit_loss: '0',
            profit_loss_percentage: '0'
          }})
        }
      } catch (error) {
        logger.error('Error fetching portfolio', error)
        setPortfolio({ portfolio: [], summary: {
          total_properties: 0,
          total_invested: '0',
          current_value: '0',
          profit_loss: '0',
          profit_loss_percentage: '0'
        }})
      } finally {
        setIsLoadingPortfolio(false)
      }
    }

    fetchPortfolio()
  }, [address, isConnected])

  // Read total unclaimed rewards from contract
  const { data: totalRewards } = useReadContract({
    address: CONTRACTS.RevenueSplitter,
    abi: REVENUE_SPLITTER_ABI,
    functionName: 'getClaimableAmount',
    args: address ? [BigInt(0), address] : undefined, // tokenId, investor address
  })

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-primary-50/20 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="inline-flex items-center justify-center w-28 h-28 rounded-3xl bg-gradient-to-br from-primary-100 to-web3-100 mb-6 shadow-lg">
            <svg className="w-14 h-14 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-4xl font-bold text-gray-900 mb-4">Connect Your Wallet</h2>
          <p className="text-gray-600 text-lg mb-8">
            Please connect your wallet to access your personalized dashboard and manage investments
          </p>
          <div className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-web3-500 to-web3-600 text-white rounded-xl font-semibold shadow-lg">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Wallet Required
          </div>
        </div>
      </div>
    )
  }

  const holdings = portfolio?.portfolio?.length || 0
  const totalValue = portfolio?.summary?.current_value || '0'
  const totalRewardsValue = totalRewards ? Number(totalRewards) / 1e6 : 0

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Hero Header - Enhanced */}
      <div className="relative bg-gradient-to-br from-primary-600 via-primary-500 to-web3-500 text-white overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary-800/20 rounded-full blur-3xl"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <AnimatedSection animation="slideUp" threshold={0}>
                <div className="inline-flex items-center gap-3 bg-white/15 backdrop-blur-md px-5 py-2.5 rounded-2xl mb-6 border border-white/20 shadow-lg">
                  <span className="text-2xl animate-bounce">👋</span>
                  <span className="font-semibold text-lg">Welcome back{address ? `, ${address.slice(0, 6)}...${address.slice(-4)}` : ''}</span>
                </div>
              </AnimatedSection>
              <AnimatedSection animation="slideUp" threshold={0} delay={0.1}>
                <h1 className="text-5xl md:text-6xl font-extrabold mb-4 bg-gradient-to-r from-white via-white to-white/80 bg-clip-text">
                  Your Portfolio Dashboard
                </h1>
                <p className="text-xl text-white/90 max-w-2xl leading-relaxed">
                  Track your investments, claim rewards, and manage your fractional real estate holdings all in one place
                </p>
              </AnimatedSection>
            </div>
            <div className="hidden lg:block">
              <AnimatedSection animation="slideUp" threshold={0} delay={0.2}>
                <div className="relative">
                  <div className="w-32 h-32 bg-gradient-to-br from-white/20 to-white/5 backdrop-blur-xl rounded-3xl flex items-center justify-center shadow-2xl border border-white/20 transform hover:scale-110 transition-transform duration-300">
                    <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-success-400 rounded-full flex items-center justify-center text-xs font-bold shadow-lg">
                    {holdings}
                  </div>
                </div>
              </AnimatedSection>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid - Enhanced Design with Animations */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10 -mt-20">
          <AnimatedSection animation="slideUp" threshold={0.1} delay={0}>
            <div className="group relative bg-white rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 p-7 border border-gray-100 hover:-translate-y-2 overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full blur-3xl opacity-50 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Holdings</h3>
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                </div>
                <div className="text-5xl font-extrabold text-gray-900 mb-2 tracking-tight">{holdings}</div>
                <p className="text-sm text-gray-600 font-medium flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z"/>
                  </svg>
                  <span>Properties in portfolio</span>
                </p>
              </div>
            </div>
          </AnimatedSection>

          <AnimatedSection animation="slideUp" threshold={0.1} delay={0.1}>
            <div className="group relative bg-white rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 p-7 border border-gray-100 hover:-translate-y-2 overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-success-50 rounded-full blur-3xl opacity-50 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Portfolio Value</h3>
                  <div className="w-14 h-14 bg-gradient-to-br from-success-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="text-5xl font-extrabold bg-gradient-to-r from-success-600 via-success-500 to-emerald-500 bg-clip-text text-transparent mb-2 tracking-tight">
                  ${parseFloat(totalValue).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                </div>
                <p className="text-sm text-gray-600 font-medium flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-success-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
                  </svg>
                  <span>Current market value</span>
                </p>
              </div>
            </div>
          </AnimatedSection>

          <AnimatedSection animation="slideUp" threshold={0.1} delay={0.2}>
            <div className="group relative bg-white rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 p-7 border border-gray-100 hover:-translate-y-2 overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-50 rounded-full blur-3xl opacity-50 group-hover:opacity-100 transition-opacity"></div>
              {totalRewardsValue > 0 && (
                <div className="absolute -top-1 -right-1 w-3 h-3">
                  <span className="flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                  </span>
                </div>
              )}
              <div className="relative">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Available Rewards</h3>
                  <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                    </svg>
                  </div>
                </div>
                <div className="text-5xl font-extrabold text-gray-900 mb-2 tracking-tight">
                  ${totalRewardsValue.toFixed(2)}
                </div>
                <p className="text-sm text-gray-600 font-medium flex items-center gap-1.5">
                  {totalRewardsValue > 0 ? (
                    <>
                      <svg className="w-4 h-4 text-amber-500 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                      </svg>
                      <span className="text-amber-600 font-semibold">Ready to claim now!</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                      </svg>
                      <span>No rewards yet</span>
                    </>
                  )}
                </p>
              </div>
            </div>
          </AnimatedSection>

          {/* NFT Card in Stats Grid */}
          <KYCStatusBadge />
        </div>

        {/* Get Test USDC Card */}
        <AnimatedSection animation="slideUp" threshold={0.1} delay={0.3}>
          <div className="bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 rounded-3xl shadow-xl p-8 mb-10 border-2 border-green-200">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-1">Get Test USDC</h3>
                  <p className="text-gray-600">Mint 10,000 test USDC for free on Arbitrum Sepolia</p>
                </div>
              </div>
            </div>
            <MintUSDCButton variant="default" showBalance={true} />
          </div>
        </AnimatedSection>

        {/* Portfolio Section - Modern Design */}
        <AnimatedSection animation="slideUp" threshold={0.1}>
          <div className="bg-white rounded-3xl shadow-xl p-8 mb-10 border border-gray-100">
            <div className="flex items-center justify-between mb-10">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-gradient-to-br from-primary-100 to-web3-100 rounded-xl">
                    <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <h2 className="text-4xl font-extrabold text-gray-900">My Portfolio</h2>
                </div>
                <p className="text-gray-600 text-lg">Your fractional real estate investment properties</p>
              </div>
              <Link 
                href="/marketplace" 
                className="group inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-primary-600 to-primary-500 text-white font-bold rounded-2xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 hover:scale-105"
              >
                <svg className="w-6 h-6 group-hover:rotate-12 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <span>Browse Properties</span>
              </Link>
            </div>

          {isLoadingPortfolio ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <CardSkeleton key={i} />
              ))}
            </div>
          ) : portfolio?.portfolio?.length > 0 ? (
            <>
              {/* Total Claimable Summary */}
              <TotalClaimableSummary 
                tokenIds={portfolio.portfolio.map((item: any) => item.token_id)}
              />

              {/* Property Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {portfolio.portfolio.map((item: any) => (
                  <PortfolioPropertyCard key={item.token_id} item={item} />
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-20">
              <AnimatedSection animation="slideUp" threshold={0.1}>
                <div className="inline-flex items-center justify-center w-32 h-32 rounded-3xl bg-gradient-to-br from-gray-50 to-gray-100 mb-8 border-4 border-gray-200 shadow-inner">
                  <svg className="w-16 h-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <h3 className="text-3xl font-extrabold text-gray-900 mb-4">
                  🏗️ Start Your Investment Journey
                </h3>
                <p className="text-gray-600 mb-8 text-xl max-w-md mx-auto leading-relaxed">
                  You don't own any properties yet. Browse the marketplace to discover premium real estate investment opportunities.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                  <Link 
                    href="/marketplace" 
                    className="group inline-flex items-center gap-3 px-10 py-5 bg-gradient-to-r from-primary-600 via-primary-500 to-web3-500 text-white font-bold rounded-2xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 hover:scale-105"
                  >
                    <svg className="w-6 h-6 group-hover:rotate-12 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span className="text-lg">Explore Marketplace</span>
                  </Link>
                  <Link 
                    href="/marketplace"
                    className="inline-flex items-center gap-2 px-8 py-5 bg-white text-gray-700 font-semibold rounded-2xl border-2 border-gray-200 hover:border-primary-300 hover:bg-gray-50 transition-all duration-300"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Learn More</span>
                  </Link>
                </div>
              </AnimatedSection>
            </div>
          )}
          </div>
        </AnimatedSection>

        {/* My Listings Section - Modern Design */}
        <AnimatedSection animation="slideUp" threshold={0.1} delay={0.1}>
          <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100">
            <div className="flex items-center justify-between mb-10">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-gradient-to-br from-web3-100 to-primary-100 rounded-xl">
                    <svg className="w-6 h-6 text-web3-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <h2 className="text-4xl font-extrabold text-gray-900">My Listings</h2>
                </div>
                <p className="text-gray-600 text-lg">Shares you've listed for sale on the secondary marketplace</p>
              </div>
            </div>
          
          <MyListings onUpdate={() => {
            // Refresh portfolio when listing is cancelled
            if (address) {
              fetch(`/api/users/${address}/portfolio`)
                .then(res => res.json())
                .then(data => setPortfolio(data))
            }
          }} />
          </div>
        </AnimatedSection>
      </div>
    </div>
  )
}
