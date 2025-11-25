import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://phzglkmanavjvsjeonnh.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBoemdsa21hbmF2anZzamVvbm5oIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzgwMDM2NSwiZXhwIjoyMDc5Mzc2MzY1fQ.tNpn0B-uDE6_gz9fKxHMtjL4wVPB1f8VSzPzSBi3zNg'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkWalletInDatabase() {
  console.log('=== Checking Wallet Cases in Database ===\n')
  
  // Test different cases
  const testWallets = [
    '0x7d5b1d69a839b27bf120363f6c5af6427bc763ea', // lowercase
    '0x7D5B1D69A839b27BF120363F6C5AF6427BC763EA', // mixed (from browser)
    '0x7d5b1d69a839b27bf120363f6c5af6427bc763ea'.toUpperCase(), // uppercase
  ]
  
  for (const wallet of testWallets) {
    console.log(`Testing: ${wallet}`)
    const normalized = wallet.toLowerCase()
    console.log(`Normalized: ${normalized}`)
    
    const { data, error } = await supabase
      .from('user_portfolios')
      .select('*')
      .eq('user_wallet', normalized)
    
    console.log(`  Result: ${data?.length || 0} found`)
    if (data && data.length > 0) {
      console.log(`  ✅ Found with wallet: ${data[0].user_wallet}`)
    }
    console.log('')
  }
  
  // Check all portfolios
  console.log('=== All Portfolio Entries ===')
  const { data: allPortfolios } = await supabase
    .from('user_portfolios')
    .select('user_wallet, token_id, shares_owned')
  
  if (allPortfolios) {
    console.log(`Total entries: ${allPortfolios.length}`)
    allPortfolios.forEach(p => {
      console.log(`  ${p.user_wallet} - Token ${p.token_id} - ${p.shares_owned} shares`)
    })
  }
}

checkWalletInDatabase()
  .then(() => process.exit(0))
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
