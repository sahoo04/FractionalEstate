import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../frontend/.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkSchema() {
  console.log('🔍 Checking marketplace_listings table schema...\n')

  // Get all listings to see what columns exist
  const { data: allListings, error: allError } = await supabase
    .from('marketplace_listings')
    .select('*')
    .limit(1)

  if (allError) {
    console.error('❌ Error fetching listings:', allError)
    return
  }

  if (allListings && allListings.length > 0) {
    console.log('✅ Sample listing columns:')
    console.log(JSON.stringify(Object.keys(allListings[0]), null, 2))
    console.log('\n📋 Sample listing data:')
    console.log(JSON.stringify(allListings[0], null, 2))
  } else {
    console.log('⚠️ No listings found in database')
  }

  // Count all listings
  const { count: allCount } = await supabase
    .from('marketplace_listings')
    .select('*', { count: 'exact', head: true })

  // Count active listings
  const { count: activeCount } = await supabase
    .from('marketplace_listings')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'ACTIVE')

  console.log('\n📊 Listing counts:')
  console.log(`  Total listings: ${allCount || 0}`)
  console.log(`  Active listings: ${activeCount || 0}`)

  // Check if token_id or property_token_id exists
  if (allListings && allListings.length > 0) {
    const sample = allListings[0]
    if ('token_id' in sample) {
      console.log('\n✅ Column is: token_id')
    } else if ('property_token_id' in sample) {
      console.log('\n✅ Column is: property_token_id')
    } else {
      console.log('\n⚠️ Neither token_id nor property_token_id found!')
    }

    if ('created_at' in sample) {
      console.log('✅ Timestamp column is: created_at')
    } else if ('listed_at' in sample) {
      console.log('✅ Timestamp column is: listed_at')
    } else {
      console.log('⚠️ Neither created_at nor listed_at found!')
    }
  }
}

checkSchema().catch(console.error)

