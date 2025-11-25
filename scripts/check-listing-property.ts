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

async function checkListingAndProperty() {
  console.log('🔍 Checking listing and property relationship...\n')

  // Get active listings
  const { data: listings, error: listingsError } = await supabase
    .from('marketplace_listings')
    .select('*')
    .eq('status', 'ACTIVE')

  if (listingsError) {
    console.error('❌ Error fetching listings:', listingsError)
    return
  }

  console.log(`📋 Found ${listings?.length || 0} active listings\n`)

  if (listings && listings.length > 0) {
    for (const listing of listings) {
      console.log(`Listing ID: ${listing.listing_id}`)
      console.log(`Token ID: ${listing.token_id}`)
      console.log(`Property Name: ${listing.property_name}`)
      console.log(`Status: ${listing.status}\n`)

      // Check if property exists
      const { data: property, error: propertyError } = await supabase
        .from('properties')
        .select('token_id, name, location, images, property_type, status')
        .eq('token_id', listing.token_id)
        .single()

      if (propertyError) {
        console.error(`❌ Error fetching property for token_id ${listing.token_id}:`, propertyError)
      } else if (property) {
        console.log(`✅ Property found:`)
        console.log(`   Name: ${property.name}`)
        console.log(`   Status: ${property.status}`)
        console.log(`   Type: ${property.property_type}`)
      } else {
        console.log(`⚠️ Property with token_id ${listing.token_id} NOT FOUND`)
      }
      console.log('\n' + '='.repeat(50) + '\n')
    }
  }
}

checkListingAndProperty().catch(console.error)

