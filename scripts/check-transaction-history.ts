import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://phzglkmanavjvsjeonnh.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBoemdsa21hbmF2anZzamVvbm5oIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzgwMDM2NSwiZXhwIjoyMDc5Mzc2MzY1fQ.tNpn0B-uDE6_gz9fKxHMtjL4wVPB1f8VSzPzSBi3zNg'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkHistory() {
  console.log('\n=== CHECKING TRANSACTION HISTORY ===\n')
  
  // Check marketplace transactions
  const { data: transactions } = await supabase
    .from('marketplace_transactions')
    .select('*')
    .eq('token_id', 2)
  
  console.log('Marketplace Transactions:')
  transactions?.forEach(tx => {
    console.log(`- Buyer: ${tx.buyer_wallet}`)
    console.log(`  Seller: ${tx.seller_wallet}`)
    console.log(`  Shares: ${tx.shares_amount}`)
    console.log(`  Price: $${tx.total_price}`)
    console.log(`  Date: ${tx.completed_at}`)
    console.log('')
  })
  
  // Check marketplace listings
  const { data: listings } = await supabase
    .from('marketplace_listings')
    .select('*')
    .eq('token_id', 2)
  
  console.log('\nMarketplace Listings:')
  listings?.forEach(listing => {
    console.log(`- Seller: ${listing.seller_wallet}`)
    console.log(`  Shares: ${listing.shares_amount}`)
    console.log(`  Status: ${listing.status}`)
    console.log(`  Listed: ${listing.created_at}`)
    console.log('')
  })
  
  // Check current portfolios
  const { data: portfolios } = await supabase
    .from('user_portfolios')
    .select('*')
    .eq('token_id', 2)
  
  console.log('\nCurrent Portfolios:')
  portfolios?.forEach(p => {
    console.log(`- Wallet: ${p.user_wallet}`)
    console.log(`  Shares: ${p.shares_owned}`)
    console.log(`  Invested: $${p.total_invested}`)
    console.log('')
  })
}

checkHistory().catch(console.error)
