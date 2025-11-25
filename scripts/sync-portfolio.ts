/**
 * Manually sync portfolio for a user's purchase
 * Run from frontend directory: npx ts-node ../scripts/sync-portfolio.ts <wallet> <tokenId> <shares>
 */

import { createClient } from '@supabase/supabase-js'

// Environment variables should be loaded from frontend/.env.local
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials')
  console.error('   Make sure to run this from the frontend directory:')
  console.error('   cd frontend && npx ts-node ../scripts/sync-portfolio.ts <wallet> <tokenId> <shares>')
  console.error('\n   Or export the variables:')
  console.error('   $env:NEXT_PUBLIC_SUPABASE_URL="https://phzglkmanavjvsjeonnh.supabase.co"')
  console.error('   $env:SUPABASE_SERVICE_ROLE_KEY="your-key"')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function syncPortfolio(wallet: string, tokenId: string, shares: number) {
  try {
    const normalizedWallet = wallet.toLowerCase()
    
    console.log(`\n🔄 Syncing portfolio for ${normalizedWallet}`)
    console.log(`   Token ID: ${tokenId}`)
    console.log(`   Shares: ${shares}`)
    
    // Get property details
    const { data: property, error: propError } = await supabase
      .from('properties')
      .select('price_per_share, name')
      .eq('token_id', tokenId)
      .single()
    
    if (propError || !property) {
      console.error('❌ Property not found:', propError)
      return
    }
    
    console.log(`   Property: ${property.name}`)
    console.log(`   Price per share (raw): ${property.price_per_share}`)
    
    // Check if portfolio entry exists
    const { data: existing } = await supabase
      .from('user_portfolios')
      .select('*')
      .eq('user_wallet', normalizedWallet)
      .eq('token_id', tokenId)
      .single()
    
    // Database stores price_per_share as raw value (can be wei or already in USDC)
    // Need to check if it's already in proper USDC format or needs conversion
    const pricePerShare = parseFloat(property.price_per_share)
    
    // If price is very small (< 1000), it's likely already in USDC format
    // Otherwise it needs to be divided by 1e6
    const purchaseAmount = pricePerShare < 1000 
      ? pricePerShare * shares  // Already in USDC
      : (pricePerShare * shares) / 1e6  // Convert from wei
    
    if (existing) {
      // Update existing
      const newShares = existing.shares_owned + shares
      const newInvested = parseFloat(existing.total_invested) + purchaseAmount
      
      const { error: updateError } = await supabase
        .from('user_portfolios')
        .update({
          shares_owned: newShares,
          total_invested: newInvested.toString(),
          last_updated: new Date().toISOString()
        })
        .eq('id', existing.id)
      
      if (updateError) {
        console.error('❌ Update error:', updateError)
        return
      }
      
      console.log(`\n✅ Portfolio updated!`)
      console.log(`   Total shares: ${existing.shares_owned} → ${newShares}`)
      console.log(`   Total invested: $${parseFloat(existing.total_invested).toFixed(2)} → $${newInvested.toFixed(2)}`)
    } else {
      // Create new entry
      const { error: insertError } = await supabase
        .from('user_portfolios')
        .insert({
          user_wallet: normalizedWallet,
          token_id: tokenId,
          property_name: property.name,
          shares_owned: shares,
          total_invested: purchaseAmount.toString()
        })
      
      if (insertError) {
        console.error('❌ Insert error:', insertError)
        return
      }
      
      console.log(`\n✅ Portfolio entry created!`)
      console.log(`   Shares: ${shares}`)
      console.log(`   Invested: $${purchaseAmount.toFixed(2)}`)
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

// Get args
const wallet = process.argv[2]
const tokenId = process.argv[3]
const shares = parseInt(process.argv[4])

if (!wallet || !tokenId || !shares) {
  console.log('Usage: npx ts-node scripts/sync-portfolio.ts <wallet> <tokenId> <shares>')
  console.log('Example: npx ts-node scripts/sync-portfolio.ts 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb 2 4')
  process.exit(1)
}

syncPortfolio(wallet, tokenId, shares)
  .then(() => {
    console.log('\n✅ Done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error)
    process.exit(1)
  })
