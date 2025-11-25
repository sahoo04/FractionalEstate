import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://phzglkmanavjvsjeonnh.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBoemdsa21hbmF2anZzamVvbm5oIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzgwMDM2NSwiZXhwIjoyMDc5Mzc2MzY1fQ.tNpn0B-uDE6_gz9fKxHMtjL4wVPB1f8VSzPzSBi3zNg'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkPortfolio() {
  const buyerWallet = '0x7d5b1d69a839b27bf120363f6c5af6427bc763ea'
  
  console.log('=== Checking Portfolio ===')
  console.log('Wallet:', buyerWallet)
  console.log('')
  
  const { data: portfolio, error } = await supabase
    .from('user_portfolios')
    .select('*')
    .eq('user_wallet', buyerWallet.toLowerCase())
  
  if (error) {
    console.error('Error:', error)
    return
  }
  
  if (!portfolio || portfolio.length === 0) {
    console.log('❌ No properties in portfolio')
  } else {
    console.log(`✅ Found ${portfolio.length} propert${portfolio.length > 1 ? 'ies' : 'y'}:\n`)
    portfolio.forEach((p, i) => {
      console.log(`${i + 1}. ${p.property_name}`)
      console.log(`   Token ID: ${p.token_id}`)
      console.log(`   Shares Owned: ${p.shares_owned}`)
      console.log(`   Total Invested: $${p.total_invested}`)
      console.log(`   Last Updated: ${p.last_updated}`)
      console.log('')
    })
  }
}

checkPortfolio()
  .then(() => process.exit(0))
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
