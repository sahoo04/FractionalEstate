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

async function syncAllListings() {
  console.log('🔍 Fetching listing count from blockchain...\n')

  try {
    // Get total listing count
    const listingCount = await publicClient.readContract({
      address: MARKETPLACE_ADDRESS as `0x${string}`,
      abi: MARKETPLACE_ABI,
      functionName: 'listingCount',
    })

    const count = Number(listingCount)
    console.log(`📊 Found ${count} total listings on-chain\n`)

    if (count === 0) {
      console.log('⚠️ No listings found on-chain')
      return
    }

    // Sync each listing
    for (let i = 1; i <= count; i++) {
      console.log(`\n${'='.repeat(60)}`)
      console.log(`Syncing listing ${i}/${count}...`)
      console.log('='.repeat(60))

      try {
        const listing = await publicClient.readContract({
          address: MARKETPLACE_ADDRESS as `0x${string}`,
          abi: MARKETPLACE_ABI,
          functionName: 'getListing',
          args: [BigInt(i)],
        }) as {
          seller: `0x${string}`
          tokenId: bigint
          amount: bigint
          pricePerShare: bigint
          active: boolean
        }

        if (!listing.active) {
          console.log(`⏭️  Listing ${i} is not active, skipping...`)
          continue
        }

        // Get property info
        const { data: property } = await supabase
          .from('properties')
          .select('name, location, images, property_type')
          .eq('token_id', Number(listing.tokenId))
          .single()

        const propertyName = property?.name || `Property #${listing.tokenId}`
        const totalPrice = (Number(listing.pricePerShare) / 1e6) * Number(listing.amount)

        // Check if listing already exists
        const { data: existingListing } = await supabase
          .from('marketplace_listings')
          .select('*')
          .eq('listing_id', i)
          .single()

        const listingData = {
          listing_id: i,
          seller_wallet: getAddress(listing.seller).toLowerCase(),
          token_id: Number(listing.tokenId),
          property_name: propertyName,
          shares_amount: Number(listing.amount),
          price_per_share: (Number(listing.pricePerShare) / 1e6).toString(),
          total_price: totalPrice.toString(),
          status: 'ACTIVE',
        }

        if (existingListing) {
          console.log(`🔄 Updating listing ${i}...`)
          const { error: updateError } = await supabase
            .from('marketplace_listings')
            .update(listingData)
            .eq('listing_id', i)

          if (updateError) {
            console.error(`❌ Error updating listing ${i}:`, updateError.message)
          } else {
            console.log(`✅ Listing ${i} updated successfully`)
          }
        } else {
          console.log(`➕ Creating listing ${i}...`)
          const { error: createError } = await supabase
            .from('marketplace_listings')
            .insert(listingData)

          if (createError) {
            console.error(`❌ Error creating listing ${i}:`, createError.message)
          } else {
            console.log(`✅ Listing ${i} created successfully`)
          }
        }

        console.log(`   Token ID: ${listing.tokenId}`)
        console.log(`   Property: ${propertyName}`)
        console.log(`   Shares: ${listing.amount}`)
        console.log(`   Price/Share: $${Number(listing.pricePerShare) / 1e6}`)
      } catch (error: any) {
        console.error(`❌ Error syncing listing ${i}:`, error.message)
      }
    }

    console.log('\n' + '='.repeat(60))
    console.log('✅ Sync complete!')
    console.log('='.repeat(60))
  } catch (error: any) {
    console.error('❌ Error:', error.message)
  }
}

syncAllListings().catch(console.error)

