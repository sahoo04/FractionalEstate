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

async function updateListing() {
  console.log('🔍 Checking existing listing...\n')

  // Get the listing that exists
  const { data: listing, error: listingError } = await supabase
    .from('marketplace_listings')
    .select('*')
    .eq('listing_id', 1)
    .single()

  if (listingError) {
    console.error('❌ Error fetching listing:', listingError)
    return
  }

  if (!listing) {
    console.log('⚠️ No listing found with listing_id 1')
    return
  }

  console.log('📋 Current listing data:')
  console.log(JSON.stringify(listing, null, 2))
  console.log('\n')

  // Check if property exists
  const { data: property, error: propertyError } = await supabase
    .from('properties')
    .select('token_id, name, location, images, property_type, status')
    .eq('token_id', listing.token_id)
    .single()

  if (propertyError && propertyError.code !== 'PGRST116') {
    console.error('❌ Error checking property:', propertyError)
    return
  }

  if (!property) {
    console.log(`⚠️ Property with token_id ${listing.token_id} does not exist`)
    console.log('   This is expected after contract redeployment')
  } else {
    console.log('✅ Property exists:')
    console.log(`   Name: ${property.name}`)
    console.log(`   Status: ${property.status}`)
  }

  // Verify listing has all required fields
  const updates: any = {}
  let needsUpdate = false

  if (!listing.property_name) {
    updates.property_name = property?.name || `Property #${listing.token_id}`
    needsUpdate = true
    console.log(`\n📝 Will update property_name to: ${updates.property_name}`)
  }

  if (!listing.status || listing.status !== 'ACTIVE') {
    updates.status = 'ACTIVE'
    needsUpdate = true
    console.log(`📝 Will update status to: ACTIVE`)
  }

  // Ensure seller_wallet is lowercase
  if (listing.seller_wallet && listing.seller_wallet !== listing.seller_wallet.toLowerCase()) {
    updates.seller_wallet = listing.seller_wallet.toLowerCase()
    needsUpdate = true
    console.log(`📝 Will update seller_wallet to lowercase`)
  }

  if (needsUpdate) {
    console.log('\n🔄 Updating listing...')
    const { data: updatedListing, error: updateError } = await supabase
      .from('marketplace_listings')
      .update(updates)
      .eq('listing_id', 1)
      .select()
      .single()

    if (updateError) {
      console.error('❌ Error updating listing:', updateError)
    } else {
      console.log('✅ Listing updated successfully!')
      console.log(JSON.stringify(updatedListing, null, 2))
    }
  } else {
    console.log('\n✅ Listing is already up to date!')
  }

  // Final check - verify listing will show in API
  console.log('\n🔍 Final verification:')
  const { data: finalListing } = await supabase
    .from('marketplace_listings')
    .select('*')
    .eq('listing_id', 1)
    .eq('status', 'ACTIVE')
    .single()

  if (finalListing) {
    console.log('✅ Listing is ACTIVE and should appear in marketplace')
    console.log(`   Listing ID: ${finalListing.listing_id}`)
    console.log(`   Token ID: ${finalListing.token_id}`)
    console.log(`   Property Name: ${finalListing.property_name}`)
    console.log(`   Shares: ${finalListing.shares_amount}`)
    console.log(`   Price/Share: $${finalListing.price_per_share}`)
    console.log(`   Total: $${finalListing.total_price}`)
  } else {
    console.log('⚠️ Listing not found or not ACTIVE')
  }
}

updateListing().catch(console.error)

