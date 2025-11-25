const hre = require("hardhat")

async function main() {
  const ethers = hre.ethers
  const tokenId = process.env.TOKEN_ID || "1763845456498 "
  
  console.log(`Checking property with tokenId: ${tokenId}`)
  
  const PropertyShare1155 = await ethers.getContractAt(
    "PropertyShare1155",
    "0x7406C24Ac3e4D38b7477345C51a6528A70dd9c8b"
  )
  
  try {
    const property = await PropertyShare1155.getProperty(tokenId)
    
    console.log("\n✅ Property Details:")
    console.log("Exists:", property.exists)
    console.log("Seller:", property.seller)
    console.log("Price per Share:", ethers.formatUnits(property.pricePerShare, 6), "USDC")
    console.log("Total Shares:", property.totalShares.toString())
    console.log("Tokenized:", property.tokenized)
    
    const totalSupply = await PropertyShare1155.totalSupply(tokenId)
    console.log("Shares Sold:", totalSupply.toString())
    console.log("Shares Available:", (property.totalShares - totalSupply).toString())
    
  } catch (error: any) {
    console.error("\n❌ Error:", error.message)
    console.log("\nThis property may not exist on-chain.")
  }
  
  // Check USDC balance and allowance for the caller
  const [caller] = await ethers.getSigners()
  console.log("\n📊 Caller Details:")
  console.log("Address:", caller.address)
  
  const USDC = await ethers.getContractAt("MockUSDC", "0x08E8242c813B8a15351C99b91EE44c76C0a3a468")
  const balance = await USDC.balanceOf(caller.address)
  console.log("USDC Balance:", ethers.formatUnits(balance, 6), "USDC")
  
  const allowance = await USDC.allowance(caller.address, "0x7406C24Ac3e4D38b7477345C51a6528A70dd9c8b")
  console.log("USDC Allowance:", ethers.formatUnits(allowance, 6), "USDC")
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
