import { ethers } from "hardhat";

async function main() {
  const tokenId = BigInt(process.env.TOKEN_ID || '1')
  const shares = BigInt(process.env.SHARES || '1')
  
  const [caller] = await ethers.getSigners()
  console.log('Buyer wallet:', caller.address)
  
  const PropertyShare1155 = await ethers.getContractAt(
    'PropertyShare1155',
    '0x7406C24Ac3e4D38b7477345C51a6528A70dd9c8b'
  )
  
  const USDC = await ethers.getContractAt(
    'MockUSDC',
    '0x08E8242c813B8a15351C99b91EE44c76C0a3a468'
  )
  
  // Get property details
  console.log('\n📋 Property Details:')
  const property = await PropertyShare1155.getProperty(tokenId)
  console.log('Seller:', property.seller)
  console.log('Price per Share:', ethers.formatUnits(property.pricePerShare, 6), 'USDC')
  console.log('Available Shares:', (property.totalShares - await PropertyShare1155.totalSupply(tokenId)).toString())
  
  // Calculate total cost
  const totalCost = property.pricePerShare * shares
  console.log('\n💰 Purchase Details:')
  console.log('Shares to buy:', shares.toString())
  console.log('Total cost:', ethers.formatUnits(totalCost, 6), 'USDC')
  
  // Check balance
  const balance = await USDC.balanceOf(caller.address)
  console.log('\n💳 Buyer Balance:', ethers.formatUnits(balance, 6), 'USDC')
  
  // Check allowance
  const allowance = await USDC.allowance(caller.address, await PropertyShare1155.getAddress())
  console.log('Current Allowance:', ethers.formatUnits(allowance, 6), 'USDC')
  
  if (allowance < totalCost) {
    console.log('\n⚠️  Insufficient allowance. Approving USDC...')
    const approveTx = await USDC.approve(await PropertyShare1155.getAddress(), totalCost * 2n)
    await approveTx.wait()
    console.log('✅ USDC approved')
  }
  
  // Estimate gas
  console.log('\n⛽ Estimating gas...')
  try {
    const gasEstimate = await PropertyShare1155.purchaseShares.estimateGas(tokenId, shares)
    console.log('Estimated gas:', gasEstimate.toString())
    
    // Get gas price
    const feeData = await ethers.provider.getFeeData()
    const gasPrice = feeData.gasPrice || 0n
    const gasCostWei = gasEstimate * gasPrice
    const gasCostEth = ethers.formatEther(gasCostWei)
    console.log('Estimated gas cost:', gasCostEth, 'ETH (≈$', (parseFloat(gasCostEth) * 2000).toFixed(4), 'USD at $2000/ETH)')
    
    console.log('\n✅ Gas estimate looks normal! You can proceed with the purchase.')
  } catch (error: any) {
    console.error('\n❌ Gas estimation failed:', error.message)
    console.log('This usually means the transaction would fail.')
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
