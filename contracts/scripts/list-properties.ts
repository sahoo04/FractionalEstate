const hre = require("hardhat")

async function main() {
  const ethers = hre.ethers
  
  console.log("Fetching all properties from the blockchain...")
  
  const PropertyShare1155 = await ethers.getContractAt(
    "PropertyShare1155",
    "0x7406C24Ac3e4D38b7477345C51a6528A70dd9c8b"
  )
  
  // Try common tokenId patterns
  const commonIds = [1, 2, 3, 4, 5]
  
  console.log("\nChecking common tokenIds...")
  for (const id of commonIds) {
    try {
      const property = await PropertyShare1155.getProperty(id)
      if (property.exists) {
        console.log(`\n✅ Found Property ${id}:`)
        console.log("  Seller:", property.seller)
        console.log("  Price per Share:", ethers.formatUnits(property.pricePerShare, 6), "USDC")
        console.log("  Total Shares:", property.totalShares.toString())
        const totalSupply = await PropertyShare1155.totalSupply(id)
        console.log("  Shares Sold:", totalSupply.toString())
        console.log("  Shares Available:", (property.totalShares - totalSupply).toString())
      }
    } catch (error) {
      // Property doesn't exist
    }
  }
  
  console.log("\n💡 Tip: Check your database for property records and their tokenIds")
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
