/**
 * Fix portfolio entry - reset to correct values
 * Usage: npx ts-node scripts/fix-portfolio.ts <wallet> <tokenId> <correct_shares> <correct_invested>
 */

import { createClient } from '@supabase/supabase-js'

// Environment variables should be loaded
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function fixPortfolio(wallet: string, tokenId: string, correctShares: number, correctInvested: number) {
  try {
    const normalizedWallet = wallet.toLowerCase()
    
    console.log(`\n🔧 Fixing portfolio for ${normalizedWallet}`)
    console.log(`   Token ID: ${tokenId}`)
    console.log(`   Correct shares: ${correctShares}`)
    console.log(`   Correct invested: $${correctInvested}`)
    
    // Update the portfolio entry with correct values
    const { error: updateError } = await supabase
      .from('user_portfolios')
      .update({
        shares_owned: correctShares,
        total_invested: correctInvested.toString(),
        last_updated: new Date().toISOString()
      })
      .eq('user_wallet', normalizedWallet)
      .eq('token_id', tokenId)
    
    if (updateError) {
      console.error('❌ Update error:', updateError)
      return
    }
    
    console.log(`\n✅ Portfolio fixed!`)
    console.log(`   Shares: ${correctShares}`)
    console.log(`   Invested: $${correctInvested.toFixed(2)}`)
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

// Get args
const wallet = process.argv[2]
const tokenId = process.argv[3]
const shares = parseInt(process.argv[4])
const invested = parseFloat(process.argv[5])

if (!wallet || !tokenId || !shares || !invested) {
  console.log('Usage: npx ts-node scripts/fix-portfolio.ts <wallet> <tokenId> <shares> <invested>')
  console.log('Example: npx ts-node scripts/fix-portfolio.ts 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb 2 4 3004')
  process.exit(1)
}

fixPortfolio(wallet, tokenId, shares, invested)
  .then(() => {
    console.log('\n✅ Done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error)
    process.exit(1)
  })
