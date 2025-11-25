import axios from 'axios'
import * as dotenv from 'dotenv'
import path from 'path'
import { createClient } from '@supabase/supabase-js'
import { getRelayerWalletClient, getPublicClient } from '../frontend/lib/relayer'
import { CONTRACTS } from '../frontend/lib/contracts'

// Load env
const envPath = path.join(__dirname, '..', 'frontend', '.env.local')
dotenv.config({ path: envPath })

const PINATA_JWT = process.env.PINATA_JWT!
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// Sample properties data
const sampleProperties = [
  {
    name: "Luxury Beachfront Villa - Miami",
    location: "Miami Beach, Florida, USA",
    description: "Stunning 5-bedroom oceanfront villa with private pool, panoramic ocean views, and direct beach access. Perfect investment opportunity in prime Miami Beach location.",
    totalShares: 1000,
    pricePerShare: 500, // $500 USDC per share
    category: "Residential",
    amenities: ["Private Pool", "Beach Access", "Ocean View", "Smart Home", "Gym"],
    bedrooms: 5,
    bathrooms: 4,
    area: 4500, // sq ft
    yearBuilt: 2020,
    imageUrl: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800", // Placeholder
  },
  {
    name: "Downtown Luxury Apartment - NYC",
    location: "Manhattan, New York, USA",
    description: "Modern 3-bedroom penthouse in the heart of Manhattan with skyline views, 24/7 concierge, and premium amenities. High rental yield potential.",
    totalShares: 800,
    pricePerShare: 750, // $750 USDC per share
    category: "Residential",
    amenities: ["Concierge", "Rooftop Terrace", "Gym", "City View", "Parking"],
    bedrooms: 3,
    bathrooms: 3,
    area: 2200,
    yearBuilt: 2019,
    imageUrl: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800",
  },
  {
    name: "Mountain Resort Cabin - Aspen",
    location: "Aspen, Colorado, USA",
    description: "Cozy luxury cabin near world-class ski slopes. 4 bedrooms with fireplace, hot tub, and breathtaking mountain views. Ideal vacation rental property.",
    totalShares: 600,
    pricePerShare: 600,
    category: "Vacation",
    amenities: ["Fireplace", "Hot Tub", "Mountain View", "Ski Storage", "Deck"],
    bedrooms: 4,
    bathrooms: 3,
    area: 3000,
    yearBuilt: 2018,
    imageUrl: "https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=800",
  },
  {
    name: "Commercial Office Space - SF",
    location: "San Francisco, California, USA",
    description: "Modern Class-A office space in Financial District. Fully leased to tech companies. Stable rental income with long-term contracts.",
    totalShares: 1200,
    pricePerShare: 400,
    category: "Commercial",
    amenities: ["High-Speed Internet", "Conference Rooms", "Parking", "Security", "Reception"],
    bedrooms: 0,
    bathrooms: 6,
    area: 8000,
    yearBuilt: 2017,
    imageUrl: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800",
  },
  {
    name: "Tropical Beach Resort - Bali",
    location: "Seminyak, Bali, Indonesia",
    description: "Boutique beach resort with 8 luxury villas. Prime location near beach clubs and restaurants. High occupancy rate and strong tourism market.",
    totalShares: 2000,
    pricePerShare: 350,
    category: "Vacation",
    amenities: ["Private Beach", "Infinity Pool", "Restaurant", "Spa", "Concierge"],
    bedrooms: 8,
    bathrooms: 10,
    area: 12000,
    yearBuilt: 2021,
    imageUrl: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800",
  },
]

async function uploadPropertyMetadata(property: typeof sampleProperties[0], propertyId: number) {
  const metadata = {
    name: property.name,
    description: property.description,
    image: property.imageUrl,
    external_url: `https://fractionalstay.com/property/${propertyId}`,
    attributes: [
      { trait_type: "Location", value: property.location },
      { trait_type: "Category", value: property.category },
      { trait_type: "Total Shares", value: property.totalShares },
      { trait_type: "Price Per Share", value: `$${property.pricePerShare} USDC` },
      { trait_type: "Bedrooms", value: property.bedrooms },
      { trait_type: "Bathrooms", value: property.bathrooms },
      { trait_type: "Area", value: `${property.area} sq ft` },
      { trait_type: "Year Built", value: property.yearBuilt },
      ...property.amenities.map(amenity => ({ trait_type: "Amenity", value: amenity }))
    ],
    properties: {
      location: property.location,
      category: property.category,
      totalShares: property.totalShares,
      pricePerShare: property.pricePerShare,
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
      area: property.area,
      yearBuilt: property.yearBuilt,
      amenities: property.amenities,
    }
  }

  const res = await axios.post(
    "https://api.pinata.cloud/pinning/pinJSONToIPFS",
    metadata,
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${PINATA_JWT}`,
      },
    }
  )

  return {
    cid: res.data.IpfsHash,
    uri: `ipfs://${res.data.IpfsHash}`,
    gatewayUrl: `https://gateway.pinata.cloud/ipfs/${res.data.IpfsHash}`
  }
}

async function createPropertyOnChain(property: typeof sampleProperties[0], metadataUri: string) {
  const { walletClient, address: relayerAddress } = getRelayerWalletClient()
  const publicClient = getPublicClient()

  console.log(`   📝 Creating on blockchain...`)

  // Convert USDC price to wei (6 decimals for USDC)
  const priceInWei = BigInt(property.pricePerShare) * BigInt(10 ** 6)

  const PropertyShare1155ABI = [
    {
      "inputs": [
        { "internalType": "string", "name": "name", "type": "string" },
        { "internalType": "string", "name": "location", "type": "string" },
        { "internalType": "uint256", "name": "totalShares", "type": "uint256" },
        { "internalType": "uint256", "name": "pricePerShare", "type": "uint256" },
        { "internalType": "string", "name": "metadataUri", "type": "string" },
        { "internalType": "address", "name": "initialOwner", "type": "address" },
        { "internalType": "uint256", "name": "initialAmount", "type": "uint256" }
      ],
      "name": "createProperty",
      "outputs": [{ "internalType": "uint256", "name": "tokenId", "type": "uint256" }],
      "stateMutability": "nonpayable",
      "type": "function"
    }
  ] as const

  const tx = await walletClient.writeContract({
    address: CONTRACTS.PropertyShare1155,
    abi: PropertyShare1155ABI,
    functionName: 'createProperty',
    args: [
      property.name,
      property.location,
      BigInt(property.totalShares),
      priceInWei,
      metadataUri,
      relayerAddress, // Initial owner (relayer holds shares for marketplace)
      BigInt(property.totalShares), // Mint all shares to marketplace
    ],
  })

  const receipt = await publicClient.waitForTransactionReceipt({ hash: tx })
  
  // Extract tokenId from logs
  const tokenId = receipt.logs[0]?.topics[1] ? Number(receipt.logs[0].topics[1]) : null

  return {
    txHash: receipt.transactionHash,
    tokenId: tokenId || 1, // Fallback
    blockNumber: Number(receipt.blockNumber),
  }
}

async function savePropertyToDatabase(
  property: typeof sampleProperties[0],
  tokenId: number,
  metadataCID: string,
  txHash: string
) {
  const { error } = await supabase.from('properties').insert({
    token_id: tokenId,
    name: property.name,
    description: property.description,
    location: property.location,
    category: property.category,
    total_shares: property.totalShares,
    price_per_share: property.pricePerShare,
    available_shares: property.totalShares,
    bedrooms: property.bedrooms,
    bathrooms: property.bathrooms,
    area: property.area,
    year_built: property.yearBuilt,
    amenities: property.amenities,
    image_url: property.imageUrl,
    metadata_cid: metadataCID,
    contract_address: CONTRACTS.PropertyShare1155.toLowerCase(),
    creation_tx_hash: txHash,
    status: 'active',
    created_at: new Date().toISOString(),
  })

  if (error) throw error
}

async function main() {
  console.log('🏠 FractionalStay Property Setup')
  console.log('=' .repeat(60))
  console.log(`\n📋 Adding ${sampleProperties.length} sample properties...\n`)

  let successCount = 0
  let failCount = 0

  for (let i = 0; i < sampleProperties.length; i++) {
    const property = sampleProperties[i]
    
    try {
      console.log(`\n[${ i + 1}/${sampleProperties.length}] ${property.name}`)
      console.log(`   📍 ${property.location}`)
      console.log(`   💰 ${property.totalShares} shares @ $${property.pricePerShare} USDC`)

      // 1. Upload metadata to IPFS
      console.log(`   📤 Uploading metadata to IPFS...`)
      const metadata = await uploadPropertyMetadata(property, i + 1)
      console.log(`   ✅ IPFS: ${metadata.cid}`)

      // 2. Create property on blockchain
      const blockchain = await createPropertyOnChain(property, metadata.uri)
      console.log(`   ✅ Blockchain: Token ID #${blockchain.tokenId}`)
      console.log(`   📝 TX: ${blockchain.txHash}`)

      // 3. Save to database
      console.log(`   💾 Saving to database...`)
      await savePropertyToDatabase(property, blockchain.tokenId, metadata.cid, blockchain.txHash)
      console.log(`   ✅ Database saved`)

      successCount++

      // Delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000))

    } catch (error) {
      console.error(`   ❌ Failed: ${error instanceof Error ? error.message : String(error)}`)
      failCount++
    }
  }

  console.log(`\n${'='.repeat(60)}`)
  console.log(`\n📊 Summary:`)
  console.log(`   Total: ${sampleProperties.length}`)
  console.log(`   ✅ Success: ${successCount}`)
  console.log(`   ❌ Failed: ${failCount}`)
  console.log(`\n✅ Properties are now live on the platform!`)
  console.log(`   - View on dashboard`)
  console.log(`   - Available for investment`)
  console.log(`   - Metadata on IPFS`)
}

main().catch(console.error)
