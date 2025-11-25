import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://phzglkmanavjvsjeonnh.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBoemdsa21hbmF2anZzamVvbm5oIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzgwMDM2NSwiZXhwIjoyMDc5Mzc2MzY1fQ.tNpn0B-uDE6_gz9fKxHMtjL4wVPB1f8VSzPzSBi3zNg'

const supabase = createClient(supabaseUrl, supabaseKey)

async function fixSellerPortfolio() {
  const sellerWallet = '0xbae9b8b0b94ad045b0e3edb2b56cfecd7601cf53'
  const tokenId = 2
  
  console.log('\n🔧 Fixing seller portfolio...')
  console.log('Seller wallet:', sellerWallet)
  console.log('Token ID:', tokenId)
  
  // Update shares from 2 to 1 (sold 1 share on marketplace)
  const { data, error } = await supabase
    .from('user_portfolios')
    .update({
      shares_owned: 1,
      total_invested: 751, // 1 share @ $751
      last_updated: new Date().toISOString()
    })
    .eq('user_wallet', sellerWallet)
    .eq('token_id', tokenId)
    .select()
  
  if (error) {
    console.error('❌ Error:', error)
    return
  }
  
  console.log('✅ Updated successfully!')
  console.log('New data:', data)
}

fixSellerPortfolio().catch(console.error)
