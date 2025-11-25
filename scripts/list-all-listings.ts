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

async function listAllListings() {
  console.log('🔍 Fetching all listings...\n')

  // Get all listings
  const { data: allListings, error: allError } = await supabase
    .from('marketplace_listings')
    .select('*')
    .order('created_at', { ascending: false })

  if (allError) {
    console.error('❌ Error fetching listings:', allError)
    return
  }

  console.log(`📋 Found ${allListings?.length || 0} total listings\n`)

  if (allListings && allListings.length > 0) {
    for (const listing of allListings) {
      console.log('='.repeat(60))
      console.log(`Listing ID: ${listing.listing_id}`)
      console.log(`Token ID: ${listing.token_id}`)
      console.log(`Property Name: ${listing.property_name || 'N/A'}`)
      console.log(`Seller: ${listing.seller_wallet}`)
      console.log(`Shares: ${listing.shares_amount}`)
      console.log(`Price/Share: $${listing.price_per_share}`)
      console.log(`Total: $${listing.total_price}`)
      console.log(`Status: ${listing.status}`)
      console.log(`Created: ${listing.created_at}`)
      console.log('='.repeat(60) + '\n')
    }
  } else {
    console.log('⚠️ No listings found in database')
    console.log('\n💡 You may need to create a listing on-chain first, then sync it to the database.')
  }
}

listAllListings().catch(console.error)

