/**
 * Update existing portfolio entry with additional shares
 * Usage: npx ts-node scripts/update-portfolio.ts <wallet> <tokenId> <additionalShares>
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function updatePortfolio(wallet: string, tokenId: string, additionalShares: number) {
  try {
    const normalizedWallet = wallet.toLowerCase()
    
    console.log(`\n🔄 Updating portfolio for ${normalizedWallet}`)
    console.log(`   Token ID: ${tokenId}`)
    console.log(`   Additional shares: ${additionalShares}`)
    
    // Get current portfolio entry
    const { data: existing, error: fetchError } = await supabase
      .from('user_portfolios')
      .select('*')
      .eq('user_wallet', normalizedWallet)
      .eq('token_id', tokenId)
      .single()
    
    if (fetchError || !existing) {
      console.error('❌ Portfolio entry not found:', fetchError)
      return
    }
    
    console.log(`\n📊 Current state:`)
    console.log(`   Shares: ${existing.shares_owned}`)
    console.log(`   Invested: $${existing.total_invested}`)
    
    // Get property price
    const { data: property } = await supabase
      .from('properties')
      .select('price_per_share, name')
      .eq('token_id', tokenId)
      .single()
    
    const pricePerShare = parseFloat(property?.price_per_share || '0')
    const additionalInvestment = pricePerShare * additionalShares
    
    console.log(`\n💰 Price per share: $${pricePerShare}`)
    console.log(`   Additional investment: $${additionalInvestment}`)
    
    // Calculate new values
    const newShares = existing.shares_owned + additionalShares
    const newInvested = parseFloat(existing.total_invested) + additionalInvestment
    
    // Update portfolio
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
    console.log(`   Shares: ${existing.shares_owned} → ${newShares}`)
    console.log(`   Invested: $${parseFloat(existing.total_invested).toFixed(2)} → $${newInvested.toFixed(2)}`)
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

// Get args
const wallet = process.argv[2]
const tokenId = process.argv[3]
const shares = parseInt(process.argv[4])

if (!wallet || !tokenId || !shares) {
  console.log('Usage: npx ts-node scripts/update-portfolio.ts <wallet> <tokenId> <additionalShares>')
  console.log('\nExample: Add 5 more shares to existing portfolio')
  console.log('  npx ts-node scripts/update-portfolio.ts 0xbae9b8b0b94ad045b0e3edb2b56cfecd7601cf53 2 5')
  process.exit(1)
}

updatePortfolio(wallet, tokenId, shares)
  .then(() => {
    console.log('\n✅ Done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error)
    process.exit(1)
  })
