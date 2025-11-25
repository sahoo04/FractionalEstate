import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://phzglkmanavjvsjeonnh.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBoemdsa21hbmF2anZzamVvbm5oIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzgwMDM2NSwiZXhwIjoyMDc5Mzc2MzY1fQ.tNpn0B-uDE6_gz9fKxHMtjL4wVPB1f8VSzPzSBi3zNg'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkAllDeposits() {
  console.log('\n💰 Checking ALL Deposits in Database...\n')
  
  // Get all deposits
  const { data: allDeposits, error } = await supabase
    .from('rent_deposits')
    .select('*')
    .order('deposited_at', { ascending: false })
  
  if (error) {
    console.error('Error:', error)
    return
  }
  
  console.log(`Total Deposits: ${allDeposits?.length || 0}\n`)
  
  if (allDeposits && allDeposits.length > 0) {
    allDeposits.forEach((deposit, i) => {
      console.log(`${i + 1}. ID: ${deposit.id}`)
      console.log(`   Property ID: ${deposit.property_id}`)
      console.log(`   Amount: $${deposit.amount}`)
      console.log(`   Status: ${deposit.status}`)
      console.log(`   Ward Boy: ${deposit.ward_boy_wallet}`)
      console.log(`   TX Hash: ${deposit.transaction_hash || 'MISSING'}`)
      console.log(`   Deposited: ${deposit.deposited_at}`)
      if (deposit.approved_at) {
        console.log(`   Approved: ${deposit.approved_at}`)
      }
      console.log('')
    })
    
    // Find deposits without transaction hash
    const noTxHash = allDeposits.filter(d => !d.transaction_hash)
    if (noTxHash.length > 0) {
      console.log(`\n⚠️  ${noTxHash.length} deposits WITHOUT transaction hash (blockchain failed!)`)
      noTxHash.forEach(d => {
        console.log(`   - Deposit ID ${d.id}: $${d.amount} for Property ${d.property_id}`)
      })
    }
  } else {
    console.log('❌ No deposits found!')
  }
}

checkAllDeposits().catch(console.error)
