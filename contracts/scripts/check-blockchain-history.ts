import hre from 'hardhat'

const MARKETPLACE = '0x1213096b326408A556905A38bf1Dd209b06e5161'
const PROPERTY_SHARE_1155 = '0x7406C24Ac3e4D38b7477345C51a6528A70dd9c8b'
const SELLER_WALLET = '0xbaE9b8B0b94Ad045b0E3eDb2B56CFecd7601cF53'
const BUYER_WALLET = '0x7d5B1D69a839b27Bf120363f6c5Af6427BC763ea'
const TOKEN_ID = 2

async function checkBlockchainHistory() {
  console.log('\n🔍 Checking Blockchain State...\n')
  
  const propertyShare = await hre.ethers.getContractAt('PropertyShare1155', PROPERTY_SHARE_1155)
  const marketplace = await hre.ethers.getContractAt('Marketplace', MARKETPLACE)
  
  // Check current balances
  const sellerBalance = await propertyShare.balanceOf(SELLER_WALLET, TOKEN_ID)
  const buyerBalance = await propertyShare.balanceOf(BUYER_WALLET, TOKEN_ID)
  
  console.log('📊 Current Balances:')
  console.log(`Seller (${SELLER_WALLET}):`)
  console.log(`  Balance: ${sellerBalance.toString()} shares`)
  console.log(`\nBuyer (${BUYER_WALLET}):`)
  console.log(`  Balance: ${buyerBalance.toString()} shares`)
  
  // Check total supply
  const totalSupply = await propertyShare.totalSupply(TOKEN_ID)
  console.log(`\n📈 Total Supply: ${totalSupply.toString()} shares`)
  
  // Get Transfer events to see history
  console.log('\n📜 Transfer History (recent events):')
  const filter = propertyShare.filters.TransferSingle(null, null, null, TOKEN_ID)
  const events = await propertyShare.queryFilter(filter, -10000) // Last 10000 blocks
  
  events.forEach((event: any, i: number) => {
    const from = event.args.from
    const to = event.args.to
    const value = event.args.value
    
    console.log(`\n${i + 1}. Transfer:`)
    console.log(`   From: ${from}`)
    console.log(`   To: ${to}`)
    console.log(`   Amount: ${value.toString()} shares`)
    console.log(`   Block: ${event.blockNumber}`)
  })
  
  // Calculate: Seller should have = (total minted by seller) - (sold to buyer)
  console.log('\n🧮 Summary:')
  console.log(`Total minted: ${totalSupply.toString()}`)
  console.log(`Seller current: ${sellerBalance.toString()}`)
  console.log(`Buyer current: ${buyerBalance.toString()}`)
  console.log(`Seller original = Seller current + Buyer current = ${Number(sellerBalance) + Number(buyerBalance)}`)
}

checkBlockchainHistory().catch(console.error)
