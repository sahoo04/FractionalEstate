import hre from 'hardhat'

const REVENUE_SPLITTER = '0x624D82B44B6790CE3ef88E1de456E918dc77Bf2A'
const BUYER_WALLET = '0x7d5B1D69a839b27Bf120363f6c5Af6427BC763ea'
const TOKEN_ID = 2

async function checkRevenue() {
  console.log('\n💰 Checking Revenue Distribution...\n')
  
  const revenueSplitter = await hre.ethers.getContractAt('RevenueSplitter', REVENUE_SPLITTER)
  
  // Total deposited for this property
  const totalDeposited = await revenueSplitter.totalDeposited(TOKEN_ID)
  console.log(`📊 Total Revenue Deposited for Token ${TOKEN_ID}: $${Number(totalDeposited) / 1e6} USDC`)
  
  // Buyer's claimable amount
  const claimableAmount = await revenueSplitter.getClaimableAmount(TOKEN_ID, BUYER_WALLET)
  console.log(`\n💵 Buyer's Claimable Amount: $${Number(claimableAmount) / 1e6} USDC`)
  
  // Buyer's total claimed so far
  const totalClaimed = await revenueSplitter.totalClaimed(TOKEN_ID, BUYER_WALLET)
  console.log(`✅ Buyer's Total Claimed: $${Number(totalClaimed) / 1e6} USDC`)
  
  // Buyer's current shares
  const propertyShare = await hre.ethers.getContractAt('PropertyShare1155', '0x7406C24Ac3e4D38b7477345C51a6528A70dd9c8b')
  const buyerShares = await propertyShare.balanceOf(BUYER_WALLET, TOKEN_ID)
  
  // Total shares
  const totalShares = await propertyShare.totalSupply(TOKEN_ID)
  
  console.log(`\n📈 Buyer's Shares: ${buyerShares.toString()} / ${totalShares.toString()} total`)
  console.log(`📊 Ownership: ${(Number(buyerShares) / Number(totalShares) * 100).toFixed(2)}%`)
  
  // Calculate expected share
  const expectedShare = (Number(totalDeposited) * Number(buyerShares)) / Number(totalShares)
  console.log(`\n🧮 Expected Share: $${expectedShare / 1e6} USDC`)
  console.log(`Already Claimed: $${Number(totalClaimed) / 1e6} USDC`)
  console.log(`Remaining Claimable: $${(expectedShare - Number(totalClaimed)) / 1e6} USDC`)
}

checkRevenue().catch(console.error)
