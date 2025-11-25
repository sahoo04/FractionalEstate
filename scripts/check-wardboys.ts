import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://phzglkmanavjvsjeonnh.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBoemdsa21hbmF2anZzamVvbm5oIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzgwMDM2NSwiZXhwIjoyMDc5Mzc2MzY1fQ.tNpn0B-uDE6_gz9fKxHMtjL4wVPB1f8VSzPzSBi3zNg'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkWardBoys() {
  console.log('\n👷 Checking Ward Boy Assignments...\n')
  
  // Check ward_boy_mappings table
  const { data: assignments, error } = await supabase
    .from('ward_boy_mappings')
    .select('*')
  
  if (error) {
    console.error('Error:', error)
    return
  }
  
  console.log(`Total Assignments: ${assignments?.length || 0}\n`)
  
  if (assignments && assignments.length > 0) {
    assignments.forEach((assignment, i) => {
      console.log(`${i + 1}. Property ID: ${assignment.property_id}`)
      console.log(`   Ward Boy: ${assignment.ward_boy_wallet}`)
      console.log(`   Assigned: ${assignment.assigned_at}`)
      console.log(`   Active: ${assignment.is_active}`)
      console.log('')
    })
  } else {
    console.log('❌ No ward boys assigned to any properties!')
  }
  
  // Check users with WARD_BOY role
  console.log('\n\n👤 Users with WARD_BOY role:')
  const { data: wardBoyUsers } = await supabase
    .from('users')
    .select('wallet_address, name, role, kyc_status')
    .eq('role', 'WARD_BOY')
  
  if (wardBoyUsers && wardBoyUsers.length > 0) {
    wardBoyUsers.forEach((user, i) => {
      console.log(`\n${i + 1}. ${user.name || 'Unnamed'}`)
      console.log(`   Wallet: ${user.wallet_address}`)
      console.log(`   KYC: ${user.kyc_status}`)
    })
  } else {
    console.log('❌ No users with WARD_BOY role!')
  }
}

checkWardBoys().catch(console.error)
