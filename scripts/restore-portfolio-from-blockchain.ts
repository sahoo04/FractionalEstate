/**
 * Restore user portfolio from blockchain
 * Reads all token balances from blockchain and recreates portfolio entries
 * Run from frontend directory: npx ts-node ../scripts/restore-portfolio-from-blockchain.ts <wallet>
 */

import { createClient } from '@supabase/supabase-js'
import { createPublicClient, http, formatUnits } from 'viem'
import { arbitrumSepolia } from 'viem/chains'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables from frontend/.env.local
// If running from frontend directory, use .env.local directly
// If running from root, use frontend/.env.local
const envPath = process.cwd().endsWith('frontend') 
  ? path.resolve(process.cwd(), '.env.local')
  : path.resolve(process.cwd(), 'frontend/.env.local')
dotenv.config({ path: envPath })
console.log(`📁 Loading env from: ${envPath}`)

// Import contracts - need to use dynamic import or define inline
// For now, let's define the contract address and ABI inline
const PROPERTY_SHARE_1155_ABI = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "account", type: "address" },
      { name: "id", type: "uint256" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const

// Get contract address from env
const PROPERTY_TOKEN_ADDRESS = process.env.NEXT_PUBLIC_PROPERTY_TOKEN_ADDRESS as `0x${string}`

// Environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials')
  console.error('   Make sure to run this from the frontend directory:')
  console.error('   cd frontend && npx ts-node ../scripts/restore-portfolio-from-blockchain.ts <wallet>')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Create public client for blockchain reads
const publicClient = createPublicClient({
  chain: arbitrumSepolia,
  transport: http(process.env.NEXT_PUBLIC_RPC_URL || 'https://sepolia-rollup.arbitrum.io/rpc')
})

async function restorePortfolio(wallet: string) {
  try {
    const normalizedWallet = wallet.toLowerCase() as `0x${string}`
    
    if (!PROPERTY_TOKEN_ADDRESS) {
      console.error('❌ Missing NEXT_PUBLIC_PROPERTY_TOKEN_ADDRESS environment variable')
      process.exit(1)
    }
    
    console.log(`\n🔄 Restoring portfolio from blockchain for ${normalizedWallet}`)
    console.log(`   Contract: ${PROPERTY_TOKEN_ADDRESS}`)
    
    // Get all properties from database to know which token IDs to check
    const { data: properties, error: propError } = await supabase
      .from('properties')
      .select('token_id, name, price_per_share')
      .order('token_id', { ascending: true })
    
    if (propError || !properties || properties.length === 0) {
      console.error('❌ Error fetching properties:', propError)
      return
    }
    
    console.log(`\n📋 Found ${properties.length} properties in database`)
    console.log(`   Checking balances for each property...\n`)
    
    const tokenIds = properties.map(p => p.token_id)
    let restoredCount = 0
    let skippedCount = 0
    
    // Check balance for each token ID
    for (const property of properties) {
      const tokenId = property.token_id
      
      try {
        // Read balance from blockchain
        const balance = await publicClient.readContract({
          address: PROPERTY_TOKEN_ADDRESS,
          abi: PROPERTY_SHARE_1155_ABI,
          functionName: 'balanceOf',
          args: [normalizedWallet, BigInt(tokenId)]
        })
        
        const balanceNum = Number(balance)
        
        if (balanceNum > 0) {
          console.log(`   ✅ Token ${tokenId} (${property.name}): ${balanceNum} shares`)
          
          // Check if portfolio entry exists
          const { data: existing } = await supabase
            .from('user_portfolios')
            .select('*')
            .eq('user_wallet', normalizedWallet)
            .eq('token_id', tokenId)
            .single()
          
          // Calculate total invested
          const pricePerShare = parseFloat(property.price_per_share || '0')
          const totalInvested = (pricePerShare * balanceNum).toFixed(2)
          
          if (existing) {
            // Update existing entry
            const { error: updateError } = await supabase
              .from('user_portfolios')
              .update({
                shares_owned: balanceNum,
                total_invested: totalInvested,
                property_name: property.name,
                last_updated: new Date().toISOString()
              })
              .eq('id', existing.id)
            
            if (updateError) {
              console.error(`      ❌ Error updating: ${updateError.message}`)
            } else {
              console.log(`      ✅ Updated portfolio entry`)
              restoredCount++
            }
          } else {
            // Create new entry
            const { error: insertError } = await supabase
              .from('user_portfolios')
              .insert({
                user_wallet: normalizedWallet,
                token_id: tokenId,
                property_name: property.name,
                shares_owned: balanceNum,
                total_invested: totalInvested,
                total_rewards_claimed: '0',
                last_updated: new Date().toISOString()
              })
            
            if (insertError) {
              console.error(`      ❌ Error creating: ${insertError.message}`)
            } else {
              console.log(`      ✅ Created portfolio entry`)
              restoredCount++
            }
          }
        } else {
          console.log(`   ⏭️  Token ${tokenId} (${property.name}): 0 shares (skipped)`)
          skippedCount++
        }
      } catch (error: any) {
        console.error(`   ❌ Error checking token ${tokenId}:`, error.message)
      }
    }
    
    console.log(`\n✅ Portfolio restoration complete!`)
    console.log(`   Restored: ${restoredCount} entries`)
    console.log(`   Skipped: ${skippedCount} (0 balance)`)
    
  } catch (error: any) {
    console.error('❌ Fatal error:', error)
    throw error
  }
}

// Get wallet from args
const wallet = process.argv[2]

if (!wallet) {
  console.log('Usage: npx ts-node scripts/restore-portfolio-from-blockchain.ts <wallet>')
  console.log('Example: npx ts-node scripts/restore-portfolio-from-blockchain.ts 0xbae9b8b0b94ad045b0e3edb2b56cfecd7601cf53')
  process.exit(1)
}

restorePortfolio(wallet)
  .then(() => {
    console.log('\n✅ Done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error)
    process.exit(1)
  })

