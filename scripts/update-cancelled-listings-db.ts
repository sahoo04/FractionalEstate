import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables
const envPath = path.resolve(process.cwd(), 'frontend/.env.local')
dotenv.config({ path: envPath })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials')
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function updateCancelledListings() {
  console.log('🔄 Updating cancelled listings in database...\n')

  const listingIds = [1, 2] // Cancelled listing IDs

  for (const listingId of listingIds) {
    try {
      console.log(`📝 Updating listing ${listingId}...`)

      // First check if listing exists
      const { data: existing } = await supabase
        .from('marketplace_listings')
        .select('*')
        .eq('listing_id', listingId)
        .single()

      if (!existing) {
        console.log(`⚠️  Listing ${listingId} not found in database`)
        continue
      }

      console.log(`   Current status: ${existing.status}`)

      // Update listing status to DELISTED (cancelled listings)
      const { data, error } = await supabase
        .from('marketplace_listings')
        .update({
          status: 'DELISTED',
          updated_at: new Date().toISOString()
        })
        .eq('listing_id', listingId)
        .select()
        .single()

      if (error) {
        console.error(`❌ Error updating listing ${listingId}:`, error.message)
        continue
      }

      console.log(`✅ Listing ${listingId} updated successfully`)
      console.log(`   Status: ${data.status}`)
      console.log(`   Updated at: ${data.updated_at}\n`)

    } catch (error: any) {
      console.error(`❌ Failed to update listing ${listingId}:`, error.message)
    }
  }

  console.log('='.repeat(60))
  console.log('📊 UPDATE SUMMARY')
  console.log('='.repeat(60))
  console.log(`Listings processed: ${listingIds.length}`)
  console.log('='.repeat(60))
}

updateCancelledListings()
  .then(() => {
    console.log('\n✅ Database update complete!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Script failed:', error)
    process.exit(1)
  })

