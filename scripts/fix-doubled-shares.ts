import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { createPublicClient, http, parseAbiItem } from 'viem'
import { arbitrumSepolia } from 'viem/chains'
import path from 'path'

// Load .env from frontend directory
dotenv.config({ path: path.join(__dirname, '../frontend/.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const publicClient = createPublicClient({
  chain: arbitrumSepolia,
  transport: http(process.env.NEXT_PUBLIC_ARBITRUM_SEPOLIA_RPC_URL || 'https://sepolia-rollup.arbitrum.io/rpc')
})

const PROPERTY_SHARE_ADDRESS = '0x3809c6480Fde57d20522778514DacACb073c96ba'

async function main() {
  console.log('\n🔧 Fixing Doubled Shares Issue...')
  console.log('=' .repeat(50))

  // Get all user portfolios
  const { data: portfolios, error } = await supabase
    .from('user_portfolios')
    .select('*')
    .order('wallet_address')

  if (error) {
    console.error('❌ Error fetching portfolios:', error)
    return
  }

  console.log(`\nFound ${portfolios.length} portfolio entries`)

  for (const portfolio of portfolios) {
    const { wallet_address, token_id, shares_owned } = portfolio

    console.log(`\n📊 Checking ${wallet_address.slice(0, 8)}... Token #${token_id}`)
    console.log(`   Database: ${shares_owned} shares`)

    // Get actual balance from blockchain
    try {
      const balance = await publicClient.readContract({
        address: PROPERTY_SHARE_ADDRESS as `0x${string}`,
        abi: [{
          name: 'balanceOf',
          type: 'function',
          stateMutability: 'view',
          inputs: [
            { name: 'account', type: 'address' },
            { name: 'id', type: 'uint256' }
          ],
          outputs: [{ name: '', type: 'uint256' }]
        }],
        functionName: 'balanceOf',
        args: [wallet_address as `0x${string}`, BigInt(token_id)]
      })

      const actualShares = Number(balance)
      console.log(`   Blockchain: ${actualShares} shares`)

      if (actualShares !== shares_owned) {
        console.log(`   ⚠️  MISMATCH! Updating database...`)
        
        const { error: updateError } = await supabase
          .from('user_portfolios')
          .update({
            shares_owned: actualShares,
            last_updated: new Date().toISOString()
          })
          .eq('id', portfolio.id)

        if (updateError) {
          console.error(`   ❌ Update failed:`, updateError)
        } else {
          console.log(`   ✅ Updated: ${shares_owned} → ${actualShares}`)
        }
      } else {
        console.log(`   ✅ Correct!`)
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100))

    } catch (error: any) {
      console.error(`   ❌ Error reading blockchain:`, error.message)
    }
  }

  console.log('\n' + '='.repeat(50))
  console.log('✨ Fix complete!\n')
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
