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

async function verifyListing() {
  console.log('🔍 Verifying listing will appear in API...\n')

  // Fetch active listings (same as API does)
  const { data: listings, error: listingsError } = await supabase
    .from('marketplace_listings')
    .select('*')
    .eq('status', 'ACTIVE')
    .order('created_at', { ascending: false })

  if (listingsError) {
    console.error('❌ Error fetching listings:', listingsError)
    return
  }

  console.log(`📋 Found ${listings?.length || 0} active listings\n`)

  if (!listings || listings.length === 0) {
    console.log('⚠️ No active listings found')
    return
  }

  // Get unique token IDs
  const tokenIds = [...new Set(listings.map((l: any) => l.token_id).filter((id: any) => id != null))]
  
  console.log(`🔍 Fetching properties for token IDs: ${tokenIds.join(', ')}\n`)

  // Fetch properties
  let properties: any[] = []
  if (tokenIds.length > 0) {
    const { data: propertiesData, error: propertiesError } = await supabase
      .from('properties')
      .select('token_id, name, location, images, property_type, status')
      .in('token_id', tokenIds)

    if (propertiesError) {
      console.error('❌ Error fetching properties:', propertiesError)
    } else {
      properties = propertiesData || []
    }
  }

  console.log(`📋 Found ${properties.length} properties\n`)

  // Create properties map
  const propertiesMap = new Map()
  properties.forEach((prop: any) => {
    propertiesMap.set(prop.token_id, prop)
  })

  // Format listings (same logic as API)
  const formattedListings = listings
    .map((listing: any) => {
      const property = propertiesMap.get(listing.token_id)
      
      if (!property) {
        console.log(`⚠️ Listing ${listing.listing_id} references non-existent property (token_id: ${listing.token_id})`)
        return null
      }

      return {
        id: listing.id,
        listingId: listing.listing_id,
        sellerWallet: listing.seller_wallet,
        tokenId: listing.token_id,
        propertyName: listing.property_name,
        sharesAmount: listing.shares_amount,
        pricePerShare: listing.price_per_share,
        totalPrice: listing.total_price,
        status: listing.status,
        createdAt: listing.created_at,
        property: {
          name: property.name,
          location: property.location,
          images: property.images,
          propertyType: property.property_type
        }
      }
    })
    .filter((listing: any) => listing !== null)

  console.log(`✅ ${formattedListings.length} listings will appear in marketplace API\n`)

  if (formattedListings.length > 0) {
    console.log('📋 Formatted listings:')
    formattedListings.forEach((listing: any) => {
      console.log(`\n${'='.repeat(60)}`)
      console.log(`Listing ID: ${listing.listingId}`)
      console.log(`Token ID: ${listing.tokenId}`)
      console.log(`Property: ${listing.property.name}`)
      console.log(`Location: ${listing.property.location}`)
      console.log(`Shares: ${listing.sharesAmount}`)
      console.log(`Price/Share: $${listing.pricePerShare}`)
      console.log(`Total: $${listing.totalPrice}`)
      console.log(`Seller: ${listing.sellerWallet}`)
      console.log(`Status: ${listing.status}`)
      console.log('='.repeat(60))
    })
  } else {
    console.log('⚠️ No listings will appear - all filtered out (missing properties)')
  }
}

verifyListing().catch(console.error)

