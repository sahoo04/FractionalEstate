import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://phzglkmanavjvsjeonnh.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBoemdsa21hbmF2anZzamVvbm5oIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzgwMDM2NSwiZXhwIjoyMDc5Mzc2MzY1fQ.tNpn0B-uDE6_gz9fKxHMtjL4wVPB1f8VSzPzSBi3zNg'

const supabase = createClient(supabaseUrl, supabaseKey)

async function restoreSellerShares() {
  const sellerWallet = '0xbae9b8b0b94ad045b0e3edb2b56cfecd7601cf53'
  const tokenId = 2
  
  console.log('\n🔧 Restoring seller shares to 2...')
  console.log('Seller wallet:', sellerWallet)
  
  // Update to 2 shares (original 3 - sold 1 = 2)
  const { data, error } = await supabase
    .from('user_portfolios')
    .update({
      shares_owned: 2,
      total_invested: 1502, // 2 shares @ $751 = $1502
      last_updated: new Date().toISOString()
    })
    .eq('user_wallet', sellerWallet)
    .eq('token_id', tokenId)
    .select()
  
  if (error) {
    console.error('❌ Error:', error)
    return
  }
  
  console.log('✅ Restored successfully!')
  console.log('New data:', data)
  
  console.log('\n📊 Expected state:')
  console.log('Seller: 2 shares, $1502')
  console.log('Buyer: 1 share, $2000')
  console.log('\nNote: Blockchain shows seller has 1 share but database reflects')
  console.log('the actual ownership before marketplace listing (2 shares)')
}

restoreSellerShares().catch(console.error)
