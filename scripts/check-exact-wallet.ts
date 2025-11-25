import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://phzglkmanavjvsjeonnh.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBoemdsa21hbmF2anZzamVvbm5oIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzgwMDM2NSwiZXhwIjoyMDc5Mzc2MzY1fQ.tNpn0B-uDE6_gz9fKxHMtjL4wVPB1f8VSzPzSBi3zNg'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkWallet() {
  console.log('\n=== Checking EXACT wallet format in database ===\n')
  
  // Get all entries
  const { data, error } = await supabase
    .from('user_portfolios')
    .select('user_wallet, property_name, shares_owned')
  
  if (error) {
    console.error('Error:', error)
    return
  }
  
  console.log('All entries in database:')
  data?.forEach((entry, i) => {
    console.log(`\n${i + 1}. Property: ${entry.property_name}`)
    console.log(`   Wallet (exact): "${entry.user_wallet}"`)
    console.log(`   Wallet length: ${entry.user_wallet.length}`)
    console.log(`   Has uppercase: ${/[A-Z]/.test(entry.user_wallet)}`)
    console.log(`   Shares: ${entry.shares_owned}`)
  })
  
  // Now try exact match with what API is using
  const testWallet = '0x7d5b1d69a839b27bf120363f6c5af6427bc763ea'
  console.log(`\n\n=== Testing query with: "${testWallet}" ===`)
  
  const { data: result, error: err } = await supabase
    .from('user_portfolios')
    .select('*')
    .eq('user_wallet', testWallet)
  
  console.log('Result:', result?.length || 0, 'entries')
  console.log('Error:', err)
  
  if (result && result.length > 0) {
    console.log('✅ FOUND!')
  } else {
    console.log('❌ NOT FOUND')
  }
}

checkWallet().catch(console.error)
