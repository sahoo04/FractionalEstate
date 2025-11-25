import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://phzglkmanavjvsjeonnh.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBoemdsa21hbmF2anZzamVvbm5oIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzgwMDM2NSwiZXhwIjoyMDc5Mzc2MzY1fQ.tNpn0B-uDE6_gz9fKxHMtjL4wVPB1f8VSzPzSBi3zNg'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkUser() {
  const wallet = '0x7d5b1d69a839b27bf120363f6c5af6427bc763ea'
  
  console.log('=== Checking User Registration ===')
  console.log('Wallet:', wallet)
  console.log('')
  
  // Check if user exists
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('wallet_address', wallet.toLowerCase())
    .single()
  
  if (error || !user) {
    console.log('❌ User not found in users table')
    console.log('Error:', error?.message)
    console.log('\nThis might be the issue! User needs to be registered first.')
    console.log('\nCreating user entry...')
    
    // Create user entry
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert({
        wallet_address: wallet.toLowerCase(),
        role: 'CLIENT',
        kyc_status: 'NONE',
        name: 'Marketplace Buyer',
        email: '',
        created_at: new Date().toISOString()
      })
      .select()
    
    if (createError) {
      console.error('❌ Failed to create user:', createError)
    } else {
      console.log('✅ User created successfully!')
    }
  } else {
    console.log('✅ User found:')
    console.log('   Role:', user.role)
    console.log('   KYC Status:', user.kyc_status)
    console.log('   Name:', user.name || 'Not set')
    console.log('   Email:', user.email || 'Not set')
  }
  
  // Now check portfolio again
  console.log('\n=== Portfolio Check ===')
  const { data: portfolio, error: portError } = await supabase
    .from('user_portfolios')
    .select('*')
    .eq('user_wallet', wallet.toLowerCase())
  
  if (portError) {
    console.error('❌ Portfolio error:', portError)
  } else if (portfolio && portfolio.length > 0) {
    console.log(`✅ Found ${portfolio.length} propert${portfolio.length > 1 ? 'ies' : 'y'}`)
    portfolio.forEach(p => {
      console.log(`   - ${p.property_name} (Token ${p.token_id}): ${p.shares_owned} shares`)
    })
  } else {
    console.log('❌ No portfolio entries found')
  }
}

checkUser()
  .then(() => process.exit(0))
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
