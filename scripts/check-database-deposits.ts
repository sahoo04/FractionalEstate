import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://phzglkmanavjvsjeonnh.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBoemdsa21hbmF2anZzamVvbm5oIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzgwMDM2NSwiZXhwIjoyMDc5Mzc2MzY1fQ.tNpn0B-uDE6_gz9fKxHMtjL4wVPB1f8VSzPzSBi3zNg'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkDatabaseDeposits() {
  console.log('\n💰 Checking Database Deposits...\n')
  
  // Check pending deposits (status = PENDING)
  const { data: pendingDeposits, error: pendingError } = await supabase
    .from('rent_deposits')
    .select('*')
    .eq('status', 'PENDING')
    .order('deposited_at', { ascending: false })
  
  console.log('📋 PENDING Deposits:')
  if (pendingDeposits && pendingDeposits.length > 0) {
    pendingDeposits.forEach((deposit, i) => {
      console.log(`\n${i + 1}. Property ID: ${deposit.property_id}`)
      console.log(`   Ward Boy: ${deposit.ward_boy_wallet}`)
      console.log(`   Amount: $${deposit.amount}`)
      console.log(`   Deposited: ${deposit.deposited_at}`)
      console.log(`   Status: ${deposit.status}`)
    })
  } else {
    console.log('❌ No pending deposits found!')
  }
  
  // Check approved deposits
  const { data: approvedDeposits } = await supabase
    .from('rent_deposits')
    .select('*')
    .eq('status', 'APPROVED')
    .order('approved_at', { ascending: false })
    .limit(5)
  
  console.log('\n\n✅ APPROVED Deposits (last 5):')
  if (approvedDeposits && approvedDeposits.length > 0) {
    approvedDeposits.forEach((deposit, i) => {
      console.log(`\n${i + 1}. Property ID: ${deposit.property_id}`)
      console.log(`   Amount: $${deposit.amount}`)
      console.log(`   Approved: ${deposit.approved_at}`)
    })
  } else {
    console.log('❌ No approved deposits found!')
  }
  
  // Check all deposits for token ID 2
  console.log('\n\n📊 All Deposits for Token ID 2:')
  const { data: token2Deposits } = await supabase
    .from('rent_deposits')
    .select('*')
    .eq('property_id', 2)
    .order('deposited_at', { ascending: false })
  
  if (token2Deposits && token2Deposits.length > 0) {
    token2Deposits.forEach((deposit, i) => {
      console.log(`\n${i + 1}. Status: ${deposit.status}`)
      console.log(`   Amount: $${deposit.amount}`)
      console.log(`   Ward Boy: ${deposit.ward_boy_wallet}`)
      console.log(`   Deposited: ${deposit.deposited_at}`)
      if (deposit.approved_at) {
        console.log(`   Approved: ${deposit.approved_at}`)
      }
    })
  } else {
    console.log('❌ No deposits found for token ID 2!')
  }
}

checkDatabaseDeposits().catch(console.error)
