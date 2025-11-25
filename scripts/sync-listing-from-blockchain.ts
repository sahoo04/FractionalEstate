import { createClient } from '@supabase/supabase-js'
import { createPublicClient, http, getAddress } from 'viem'
import { arbitrumSepolia } from 'viem/chains'
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

const MARKETPLACE_ADDRESS = process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS || '0x9679087b60Cf6f87E14342114B921707B099947d'

const MARKETPLACE_ABI = [
  {
    name: 'getListing',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'listingId', type: 'uint256' }],
    outputs: [
      {
        type: 'tuple',
        components: [
          { name: 'seller', type: 'address' },
          { name: 'tokenId', type: 'uint256' },
          { name: 'amount', type: 'uint256' },
          { name: 'pricePerShare', type: 'uint256' },
          { name: 'active', type: 'bool' },
        ],
      },
    ],
  },
  {
    name: 'listingCount',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const

const publicClient = createPublicClient({
  chain: arbitrumSepolia,
  transport: http(),
})

async function syncListingFromBlockchain(listingId: number) {
  console.log(`🔍 Fetching listing ${listingId} from blockchain...\n`)

  try {
    // Get listing from blockchain
    const listing = await publicClient.readContract({
      address: MARKETPLACE_ADDRESS as `0x${string}`,
      abi: MARKETPLACE_ABI,
      functionName: 'getListing',
      args: [BigInt(listingId)],
    }) as {
      seller: `0x${string}`
      tokenId: bigint
      amount: bigint
      pricePerShare: bigint
      active: boolean
    }

    if (!listing.active) {
      console.log('⚠️ Listing is not active on-chain')
      return
    }

    console.log('✅ Listing found on-chain:')
    console.log(`   Seller: ${listing.seller}`)
    console.log(`   Token ID: ${listing.tokenId.toString()}`)
    console.log(`   Amount: ${listing.amount.toString()}`)
    console.log(`   Price Per Share: ${listing.pricePerShare.toString()} (${Number(listing.pricePerShare) / 1e6} USDC)`)
    console.log(`   Active: ${listing.active}\n`)

    // Get property info
    const { data: property } = await supabase
      .from('properties')
      .select('name, location, images, property_type')
      .eq('token_id', Number(listing.tokenId))
      .single()

    const propertyName = property?.name || `Property #${listing.tokenId}`
    const totalPrice = (Number(listing.pricePerShare) / 1e6) * Number(listing.amount)

    console.log('📋 Property info:')
    console.log(`   Name: ${propertyName}`)
    console.log(`   Location: ${property?.location || 'N/A'}\n`)

    // Check if listing already exists
    const { data: existingListing } = await supabase
      .from('marketplace_listings')
      .select('*')
      .eq('listing_id', listingId)
      .single()

    const listingData = {
      listing_id: listingId,
      seller_wallet: getAddress(listing.seller).toLowerCase(),
      token_id: Number(listing.tokenId),
      property_name: propertyName,
      shares_amount: Number(listing.amount),
      price_per_share: (Number(listing.pricePerShare) / 1e6).toString(),
      total_price: totalPrice.toString(),
      status: 'ACTIVE',
    }

    if (existingListing) {
      console.log('🔄 Updating existing listing in database...')
      const { data: updated, error: updateError } = await supabase
        .from('marketplace_listings')
        .update(listingData)
        .eq('listing_id', listingId)
        .select()
        .single()

      if (updateError) {
        console.error('❌ Error updating listing:', updateError)
      } else {
        console.log('✅ Listing updated successfully!')
        console.log(JSON.stringify(updated, null, 2))
      }
    } else {
      console.log('➕ Creating new listing in database...')
      const { data: created, error: createError } = await supabase
        .from('marketplace_listings')
        .insert(listingData)
        .select()
        .single()

      if (createError) {
        console.error('❌ Error creating listing:', createError)
      } else {
        console.log('✅ Listing created successfully!')
        console.log(JSON.stringify(created, null, 2))
      }
    }
  } catch (error: any) {
    console.error('❌ Error:', error.message)
    if (error.message.includes('execution reverted')) {
      console.log('\n💡 Listing may not exist on-chain. Check the listing ID.')
    }
  }
}

// Get listing ID from command line or use 1 as default
const listingId = process.argv[2] ? parseInt(process.argv[2]) : 1

console.log(`📝 Syncing listing ID: ${listingId}\n`)
syncListingFromBlockchain(listingId).catch(console.error)

