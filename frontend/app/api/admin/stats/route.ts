import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

interface Activity {
  icon: string
  title: string
  description: string
  time: string
}

export async function GET() {
  try {
    const supabase = createClient()
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 })
    }

    // Get total users count
    const { count: totalUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })

    // Get total properties
    const { count: totalProperties } = await supabase
      .from('properties')
      .select('*', { count: 'exact', head: true })

    // Get pending KYC count
    const { count: pendingKYC } = await supabase
      .from('kyc_documents')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'PENDING')

    // Get approved KYC count
    const { count: approvedKYC } = await supabase
      .from('kyc_documents')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'APPROVED')

    // Get active listings
    const { count: activeListings } = await supabase
      .from('properties')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'ACTIVE')

    // Get total investment from portfolios
    const { data: portfolios } = await supabase
      .from('user_portfolios')
      .select('shares')

    let totalInvestment = 0
    if (portfolios) {
      portfolios.forEach((p: any) => {
        if (p.shares) {
          totalInvestment += Number(p.shares) || 0
        }
      })
    }

    // Get recent activity (last 10 KYC submissions and property listings)
    const { data: recentKYC } = await supabase
      .from('kyc_documents')
      .select('wallet_address, full_name, status, submitted_at')
      .order('submitted_at', { ascending: false })
      .limit(5)

    const { data: recentProperties } = await supabase
      .from('properties')
      .select('name, created_at')
      .order('created_at', { ascending: false })
      .limit(5)

    const recentActivity: Activity[] = []

    // Add KYC activities
    if (recentKYC) {
      recentKYC.forEach((kyc: any) => {
        recentActivity.push({
          icon: kyc.status === 'APPROVED' ? '✅' : kyc.status === 'REJECTED' ? '❌' : '⏳',
          title: `KYC ${kyc.status}`,
          description: `${kyc.full_name || kyc.wallet_address?.slice(0, 10)}...`,
          time: new Date(kyc.submitted_at).toLocaleString()
        })
      })
    }

    // Add property activities
    if (recentProperties) {
      recentProperties.forEach((prop: any) => {
        recentActivity.push({
          icon: '🏠',
          title: 'New Property',
          description: prop.name,
          time: new Date(prop.created_at).toLocaleString()
        })
      })
    }

    // Sort by time
    recentActivity.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())

    return NextResponse.json({
      stats: {
        totalUsers: totalUsers || 0,
        totalProperties: totalProperties || 0,
        pendingKYC: pendingKYC || 0,
        approvedKYC: approvedKYC || 0,
        activeListings: activeListings || 0,
        totalInvestment: totalInvestment.toFixed(2)
      },
      recentActivity: recentActivity.slice(0, 10)
    })

  } catch (error: any) {
    console.error('Error fetching admin stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stats', details: error.message },
      { status: 500 }
    )
  }
}
