/**
 * Manually log a transaction
 * Usage: npx ts-node scripts/log-transaction.ts <txHash> <fromAddress> <tokenId> <shares> <amount>
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function logTransaction(
  txHash: string, 
  fromAddress: string, 
  tokenId: string, 
  shares: number,
  amount: string
) {
  try {
    const normalizedFrom = fromAddress.toLowerCase()
    
    console.log(`\n📝 Logging transaction...`)
    console.log(`   TX Hash: ${txHash}`)
    console.log(`   From: ${normalizedFrom}`)
    console.log(`   Token ID: ${tokenId}`)
    console.log(`   Shares: ${shares}`)
    console.log(`   Amount: ${amount} USDC`)
    
    // Check if already exists
    const { data: existing } = await supabase
      .from('transactions')
      .select('id')
      .eq('tx_hash', txHash)
      .single()
    
    if (existing) {
      console.log('\n⚠️  Transaction already exists in database')
      return
    }
    
    // Insert transaction
    const { data, error } = await supabase
      .from('transactions')
      .insert([{
        tx_hash: txHash,
        type: 'PURCHASE',
        from_wallet: normalizedFrom,
        to_wallet: '0x7406c24ac3e4d38b7477345c51a6528a70dd9c8b', // PropertyShare1155 contract (lowercase)
        token_id: parseInt(tokenId),
        amount: shares,
        price: parseFloat(amount),
        timestamp: new Date().toISOString(),
        block_number: 0, // Unknown
        status: 'SUCCESS'
      }])
      .select()
    
    if (error) {
      console.error('❌ Error:', error)
      return
    }
    
    console.log(`\n✅ Transaction logged successfully!`)
    console.log(`   ID: ${data[0].id}`)
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

// Get args
const txHash = process.argv[2]
const fromAddress = process.argv[3]
const tokenId = process.argv[4]
const shares = parseInt(process.argv[5])
const amount = process.argv[6]

if (!txHash || !fromAddress || !tokenId || !shares || !amount) {
  console.log('Usage: npx ts-node scripts/log-transaction.ts <txHash> <fromAddress> <tokenId> <shares> <amount>')
  console.log('\nExample:')
  console.log('  npx ts-node scripts/log-transaction.ts \\')
  console.log('    0x1fc9938aa684fb6807636b7bd066204583f5ce61dd4ff28c3f91cb258cf59fb0 \\')
  console.log('    0xbae9b8b0b94ad045b0e3edb2b56cfecd7601cf53 \\')
  console.log('    2 \\')
  console.log('    4 \\')
  console.log('    3004')
  process.exit(1)
}

logTransaction(txHash, fromAddress, tokenId, shares, amount)
  .then(() => {
    console.log('\n✅ Done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error)
    process.exit(1)
  })
