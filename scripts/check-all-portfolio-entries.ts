import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://phzglkmanavjvsjeonnh.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBoemdsa21hbmF2anZzamVvbm5oIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzgwMDM2NSwiZXhwIjoyMDc5Mzc2MzY1fQ.tNpn0B-uDE6_gz9fKxHMtjL4wVPB1f8VSzPzSBi3zNg'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkAllWallets() {
  console.log('\n=== ALL PORTFOLIO ENTRIES ===\n')
  
  const { data, error } = await supabase
    .from('user_portfolios')
    .select('*')
    .order('last_updated', { ascending: false })
  
  if (error) {
    console.error('Error:', error)
    return
  }
  
  console.log(`Total entries: ${data?.length}\n`)
  
  data?.forEach((entry, i) => {
    console.log(`${i + 1}. Wallet: ${entry.user_wallet}`)
    console.log(`   Property: ${entry.property_name} (Token ${entry.token_id})`)
    console.log(`   Shares: ${entry.shares_owned}`)
    console.log(`   Invested: $${entry.total_invested}`)
    console.log(`   Updated: ${entry.last_updated}`)
    console.log('')
  })
  
  // Check specific wallet
  const targetWallet = '0x7d5b1d69a839b27bf120363f6c5af6427bc763ea'
  console.log(`\n=== ENTRIES FOR ${targetWallet} ===\n`)
  
  const { data: specificData } = await supabase
    .from('user_portfolios')
    .select('*')
    .eq('user_wallet', targetWallet)
  
  if (specificData && specificData.length > 0) {
    specificData.forEach(entry => {
      console.log(`Property: ${entry.property_name}`)
      console.log(`Shares: ${entry.shares_owned}`)
      console.log(`Invested: $${entry.total_invested}`)
    })
  } else {
    console.log('No entries found!')
  }
}

checkAllWallets().catch(console.error)
