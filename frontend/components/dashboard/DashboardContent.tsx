'use client'

import { useAccount, useReadContract } from 'wagmi'
import { CONTRACTS, PROPERTY_SHARE_1155_ABI, REVENUE_SPLITTER_ABI } from '@/lib/contracts'
import { ClaimRewards } from '@/components/ClaimRewards'
import { CreateListingForm } from '@/components/CreateListingForm'
import { MyListings } from '@/components/MyListings'
import { PortfolioPropertyCard } from '@/components/PortfolioPropertyCard'
import { TotalClaimableSummary } from '@/components/TotalClaimableSummary'
import Link from 'next/link'
import { useState, useEffect } from 'react'
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gray-100 mb-6">
            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Connect Your Wallet</h2>
          <p className="text-gray-600 text-lg mb-8">
            Please connect your wallet to view your dashboard
          </p>
        </div>
      </div>
    )
  }

  const holdings = portfolio?.portfolio?.length || 0
  const totalValue = portfolio?.summary?.current_value || '0'
  const totalRewardsValue = totalRewards ? Number(totalRewards) / 1e6 : 0

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-600">
          Manage your investments and track your portfolio performance
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="card-glass animate-slide-up stagger-1">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-600 transition-colors duration-300">Total Holdings</h3>
            <svg className="w-6 h-6 text-blue-500 transition-transform duration-300 hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div className="text-3xl font-bold text-gray-900 transition-colors duration-300 hover:text-primary-600">{holdings}</div>
          <p className="text-sm text-gray-500 mt-1 transition-colors duration-300">Properties owned</p>
        </div>

        <div className="card-glass animate-slide-up stagger-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-600 transition-colors duration-300">Portfolio Value</h3>
            <svg className="w-6 h-6 text-green-500 transition-transform duration-300 hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="text-3xl font-bold text-gray-900 transition-colors duration-300 hover:text-green-600">${parseFloat(totalValue).toLocaleString()}</div>
          <p className="text-sm text-gray-500 mt-1 transition-colors duration-300">Current value</p>
        </div>

        <div className="card-glass animate-slide-up stagger-3">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-600 transition-colors duration-300">Available Rewards</h3>
            <svg className="w-6 h-6 text-purple-500 transition-transform duration-300 hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
          </div>
          <div className="text-3xl font-bold text-gray-900 transition-colors duration-300 hover:text-purple-600">${totalRewardsValue.toFixed(2)}</div>
          <p className="text-sm text-gray-500 mt-1 transition-colors duration-300">Ready to claim</p>
        </div>
      </div>

      {/* Quick Actions - Removed for now, needs tokenId */}
      {/* Portfolio properties will have individual claim buttons */}

      {/* Portfolio Section */}
      <div className="card-glass mb-8 animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 transition-colors duration-300">My Portfolio</h2>
          <Link href="/marketplace" className="btn-secondary transition-all duration-300">
            Browse Properties
          </Link>
        </div>

        {isLoadingPortfolio ? (
          <div className="text-center py-12 animate-fade-in">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
            <p className="text-gray-600 mt-4 animate-pulse-slow">Loading portfolio...</p>
          </div>
        ) : portfolio?.portfolio?.length > 0 ? (
          <>
            {/* Total Claimable Summary */}
            <TotalClaimableSummary 
              tokenIds={portfolio.portfolio.map((item: any) => item.token_id)}
            />

            {/* Property Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {portfolio.portfolio.map((item: any, index: number) => (
                <div key={item.token_id} className={`animate-slide-up stagger-${Math.min(index + 1, 6)}`}>
                  <PortfolioPropertyCard item={item} />
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Properties Yet</h3>
            <p className="text-gray-600 mb-4">Start investing in fractional real estate</p>
            <Link href="/marketplace" className="btn-primary inline-block">
              Explore Marketplace
            </Link>
          </div>
        )}
      </div>

      {/* My Listings Section */}
      <div className="card-glass animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 transition-colors duration-300">My Listings</h2>
            <p className="text-gray-600 text-sm mt-1 transition-colors duration-300">Shares you've listed for sale on the secondary marketplace</p>
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
    </div>
  )
}
