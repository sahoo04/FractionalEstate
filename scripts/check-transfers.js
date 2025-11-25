const { createPublicClient, http } = require('viem')
const { arbitrumSepolia } = require('viem/chains')

const client = createPublicClient({
  chain: arbitrumSepolia,
  transport: http('https://sepolia-rollup.arbitrum.io/rpc')
})

const CONTRACT = '0x7406C24Ac3e4D38b7477345C51a6528A70dd9c8b'
const YOUR_WALLET = '0xbae9b8b0b94ad045b0e3edb2b56cfecd7601cf53'

async function checkTransfers() {
  console.log('🔍 Checking all transfers to your wallet...\n')
  
  const logs = await client.getLogs({
    address: CONTRACT,
    event: {
      type: 'event',
      name: 'TransferSingle',
      inputs: [
        { name: 'operator', type: 'address', indexed: true },
        { name: 'from', type: 'address', indexed: true },
        { name: 'to', type: 'address', indexed: true },
        { name: 'id', type: 'uint256' },
        { name: 'value', type: 'uint256' }
      ]
    },
    args: { to: YOUR_WALLET },
    fromBlock: 'earliest'
  })
  
  console.log(`Total transfers TO your wallet: ${logs.length}\n`)
  
  let totalShares = 0n
  logs.forEach((log, i) => {
    console.log(`Transfer ${i+1}:`)
    console.log(`  From: ${log.args.from}`)
    console.log(`  Token ID: ${log.args.id?.toString()}`)
    console.log(`  Amount: ${log.args.value?.toString()} shares`)
    console.log(`  Tx: ${log.transactionHash}`)
    console.log(`  Block: ${log.blockNumber}\n`)
    
    if (log.args.id?.toString() === '2') {
      totalShares += log.args.value || 0n
    }
  })
  
  console.log(`\n📊 Total tokenId 2 shares received: ${totalShares.toString()}`)
  
  // Now check current balance
  const balance = await client.readContract({
    address: CONTRACT,
    abi: [{
      name: 'balanceOf',
      type: 'function',
      stateMutability: 'view',
      inputs: [{ name: 'account', type: 'address' }, { name: 'id', type: 'uint256' }],
      outputs: [{ type: 'uint256' }]
    }],
    functionName: 'balanceOf',
    args: [YOUR_WALLET, 2n]
  })
  
  console.log(`💼 Current balance: ${balance.toString()} shares\n`)
  
  if (totalShares !== balance) {
    console.log('⚠️  Mismatch! You received more but current balance is less.')
    console.log('   Possible reasons: You sold/transferred some shares')
  }
}

checkTransfers().catch(console.error)
