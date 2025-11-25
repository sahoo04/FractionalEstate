import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://phzglkmanavjvsjeonnh.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBoemdsa21hbmF2anZzamVvbm5oIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzgwMDM2NSwiZXhwIjoyMDc5Mzc2MzY1fQ.tNpn0B-uDE6_gz9fKxHMtjL4wVPB1f8VSzPzSBi3zNg'

const supabase = createClient(supabaseUrl, supabaseKey)

async function verifyTransaction() {
  const sellerWallet = '0xbaE9b8B0b94Ad045b0E3eDb2B56CFecd7601cF53'
  const buyerWallet = '0x7d5b1d69a839b27bf120363f6c5af6427bc763ea'
  const tokenId = 2
  
  console.log('=== Marketplace Transaction Verification ===\n')
  
  // Check seller portfolio
  console.log('SELLER:', sellerWallet)
  const { data: sellerPortfolio } = await supabase
    .from('user_portfolios')
    .select('*')
    .eq('user_wallet', sellerWallet.toLowerCase())
    .eq('token_id', tokenId)
    .single()
  
  if (sellerPortfolio) {
    console.log('✅ Seller Portfolio Found')
    console.log('   Shares Owned:', sellerPortfolio.shares_owned)
    console.log('   Total Invested: $', sellerPortfolio.total_invested)
  } else {
    console.log('❌ Seller has no shares (sold all)')
  }
  
  console.log('')
  
  // Check buyer portfolio
  console.log('BUYER:', buyerWallet)
  const { data: buyerPortfolio } = await supabase
    .from('user_portfolios')
    .select('*')
    .eq('user_wallet', buyerWallet.toLowerCase())
    .eq('token_id', tokenId)
    .single()
  
  if (buyerPortfolio) {
    console.log('✅ Buyer Portfolio Found')
    console.log('   Shares Owned:', buyerPortfolio.shares_owned)
    console.log('   Total Invested: $', buyerPortfolio.total_invested)
  } else {
    console.log('❌ Buyer portfolio not found')
  }
  
  console.log('\n=== Listing Status ===')
  const { data: listing } = await supabase
    .from('marketplace_listings')
    .select('*')
    .eq('listing_id', 2)
    .single()
  
  if (listing) {
    console.log('Status:', listing.status)
    console.log('Updated:', listing.updated_at)
  }
  
  console.log('\n=== Transaction History ===')
  const { data: transactions } = await supabase
    .from('marketplace_transactions')
    .select('*')
    .eq('token_id', tokenId)
    .order('completed_at', { ascending: false })
    .limit(5)
  
  if (transactions && transactions.length > 0) {
    transactions.forEach((tx, i) => {
      console.log(`\n${i + 1}. Transaction`)
      console.log('   Buyer:', tx.buyer_wallet)
      console.log('   Seller:', tx.seller_wallet)
      console.log('   Shares:', tx.shares_amount)
      console.log('   Total: $', tx.total_price)
      console.log('   Date:', tx.completed_at)
    })
  } else {
    console.log('No transaction records found')
  }
}

verifyTransaction()
  .then(() => process.exit(0))
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
