import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://phzglkmanavjvsjeonnh.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBoemdsa21hbmF2anZzamVvbm5oIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzgwMDM2NSwiZXhwIjoyMDc5Mzc2MzY1fQ.tNpn0B-uDE6_gz9fKxHMtjL4wVPB1f8VSzPzSBi3zNg'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkWardBoyTable() {
  console.log('\n🔍 Checking ward_boy_mappings table...\n')
  
  // Get all columns
  const { data, error } = await supabase
    .from('ward_boy_mappings')
    .select('*')
    .limit(5)
  
  if (error) {
    console.error('Error:', error)
    return
  }
  
  console.log('Raw data:', JSON.stringify(data, null, 2))
}

checkWardBoyTable().catch(console.error)
