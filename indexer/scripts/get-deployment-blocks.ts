/**
 * Get deployment block numbers for all contracts
 * This helps set the correct START_BLOCK for the indexer
 * 
 * Usage: npm run get-deployment-blocks
 */

import { createPublicClient, http, Address } from 'viem'
import { arbitrumSepolia } from 'viem/chains'
import { config } from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'

config()

const RPC_URL = process.env.RPC_URL || 'https://sepolia-rollup.arbitrum.io/rpc'

const publicClient = createPublicClient({
  chain: arbitrumSepolia,
  transport: http(RPC_URL),
})

interface ContractInfo {
  name: string
  address: Address
  deploymentBlock?: number
  deploymentTx?: string
}

/**
 * Get contract deployment block using binary search
 * More efficient than linear search
 */
async function getContractDeploymentBlock(address: Address): Promise<{ block: number; tx: string } | null> {
  try {
    console.log(`🔍 Finding deployment block for ${address}...`)
    
    // Check if contract exists
    const code = await publicClient.getBytecode({ address })
    if (!code || code === '0x') {
      console.log(`   ⚠️  Contract not deployed yet`)
      return null
    }

    const currentBlock = await publicClient.getBlockNumber()
    const searchRange = BigInt(500000) // Search last 500k blocks (should be enough)
    const searchStart = currentBlock > searchRange ? currentBlock - searchRange : BigInt(0)
    
    // Binary search for deployment block
    let low = searchStart
    let high = currentBlock
    let foundBlock: bigint | null = null
    let iterations = 0
    const maxIterations = 50 // Prevent infinite loops
    
    while (low <= high && iterations < maxIterations) {
      iterations++
      const mid = (low + high) / BigInt(2)
      
      try {
        const codeAtBlock = await publicClient.getBytecode({ address, blockNumber: mid })
        
        if (codeAtBlock && codeAtBlock !== '0x') {
          // Contract exists at this block, search earlier
          foundBlock = mid
          high = mid - BigInt(1)
        } else {
          // Contract doesn't exist, search later
          low = mid + BigInt(1)
        }
      } catch (error) {
        // Block might not exist, search later
        low = mid + BigInt(1)
      }
    }
    
    if (foundBlock) {
      // Try to find the exact creation transaction
      try {
        const block = await publicClient.getBlock({ blockNumber: foundBlock })
        // The deployment block is where contract first appeared
        return {
          block: Number(foundBlock),
          tx: 'see_arbiscan', // Can't easily get tx hash without more complex search
        }
      } catch (error) {
        return {
          block: Number(foundBlock),
          tx: 'unknown',
        }
      }
    }
    
    return null
  } catch (error) {
    console.error(`   ❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    return null
  }
}

async function main() {
  console.log('🚀 Fetching contract deployment blocks from blockchain...\n')
  console.log('This may take a few minutes...\n')
  
  const contracts: ContractInfo[] = [
    { name: 'PropertyShare1155', address: process.env.PROPERTY_SHARE_ADDRESS as Address },
    { name: 'RevenueSplitter', address: process.env.REVENUE_SPLITTER_ADDRESS as Address },
    { name: 'Marketplace', address: process.env.MARKETPLACE_ADDRESS as Address },
    { name: 'UserRegistry', address: process.env.USER_REGISTRY_ADDRESS as Address },
    { name: 'ZKRegistry', address: process.env.ZK_REGISTRY_ADDRESS as Address },
    { name: 'IdentitySBT', address: process.env.IDENTITY_SBT_ADDRESS as Address },
  ]

  const results: Record<string, { block: number; tx: string }> = {}
  let earliestBlock = Infinity

  for (const contract of contracts) {
    if (!contract.address) {
      console.log(`⚠️  ${contract.name}: Address not set, skipping\n`)
      continue
    }

    console.log(`📋 ${contract.name}`)
    console.log(`   Address: ${contract.address}`)
    const deployment = await getContractDeploymentBlock(contract.address)
    
    if (deployment) {
      results[contract.name] = deployment
      if (deployment.block < earliestBlock) {
        earliestBlock = deployment.block
      }
      console.log(`   ✅ Deployment Block: ${deployment.block}\n`)
    } else {
      console.log(`   ❌ Could not find deployment block\n`)
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log('📊 SUMMARY')
  console.log('='.repeat(60))
  
  if (earliestBlock !== Infinity) {
    console.log(`\n🎯 Recommended START_BLOCK: ${earliestBlock}`)
    console.log(`   (Earliest contract deployment block)\n`)
    
    console.log('📝 Update your indexer/.env:')
    console.log(`   START_BLOCK=${earliestBlock}\n`)
    
    console.log('💡 Alternative: If you only want new events, use:')
    console.log(`   START_BLOCK=0  (starts from current block)\n`)
  } else {
    console.log('\n⚠️  Could not determine deployment blocks')
    console.log('   You can manually check on Arbiscan:')
    console.log('   https://sepolia.arbiscan.io/\n')
  }

  // Save results to file
  const outputPath = path.join(__dirname, '../deployment-blocks.json')
  fs.writeFileSync(
    outputPath,
    JSON.stringify(
      {
        earliestBlock: earliestBlock !== Infinity ? earliestBlock : null,
        contracts: results,
        recommendedStartBlock: earliestBlock !== Infinity ? earliestBlock : null,
        generatedAt: new Date().toISOString(),
        note: 'Use earliestBlock as START_BLOCK in indexer/.env for historical indexing',
      },
      null,
      2
    )
  )
  
  console.log(`💾 Results saved to: ${outputPath}`)
}

main().catch(console.error)

