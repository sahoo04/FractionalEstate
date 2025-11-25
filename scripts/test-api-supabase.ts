import { createClient } from '@supabase/supabase-js'

// Using the correct Supabase URL and key
const supabaseUrl = 'https://phzglkmanavjvsjeonnh.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBoemdsa21hbmF2anZzamVvbm5oIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzgwMDM2NSwiZXhwIjoyMDc5Mzc2MzY1fQ.tNpn0B-uDE6_gz9fKxHMtjL4wVPB1f8VSzPzSBi3zNg'

console.log('\n🔍 Testing Supabase Connection...')
console.log('URL:', supabaseUrl)
console.log('Key exists:', !!supabaseKey)

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function testQuery() {
  const wallet = '0x7d5b1d69a839b27bf120363f6c5af6427bc763ea'
  const normalizedWallet = wallet.toLowerCase()
  
  console.log('\n📊 Testing Query...')
  console.log('Wallet:', wallet)
  console.log('Normalized:', normalizedWallet)
  
  const { data, error } = await supabaseAdmin
    .from('user_portfolios')
    .select('*')
    .eq('user_wallet', normalizedWallet)
    .order('last_updated', { ascending: false })
  
  console.log('\n✅ Query Result:')
  console.log('Data:', data)
  console.log('Length:', data?.length)
  console.log('Error:', error)
  
  if (data && data.length > 0) {
    console.log('\n🎉 Found portfolio entries:')
    data.forEach((entry, i) => {
      console.log(`\n${i + 1}. ${entry.property_name}`)
      console.log(`   Token ID: ${entry.token_id}`)
      console.log(`   Shares: ${entry.shares_owned}`)
      console.log(`   Invested: $${entry.total_invested}`)
    })
  } else {
    console.log('\n❌ No portfolio entries found')
  }
}

testQuery().catch(console.error)
