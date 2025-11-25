import { createPublicClient, http } from 'viem'
import { arbitrumSepolia } from 'viem/chains'

const client = createPublicClient({
  chain: arbitrumSepolia,
  transport: http('https://arb-sepolia.g.alchemy.com/v2/_dehAHJ6i1FIe7mapiiDs')
})

async function main() {
  const txHash = '0x4af714047d42fb3bc696c1b4c0144c141cc738465eb6cf271b85772da8353a66'
  const tx = await client.getTransaction({ hash: txHash })
  console.log('Mint transaction block number:', Number(tx.blockNumber))
}

main().catch(console.error)