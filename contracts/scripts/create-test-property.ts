const hre = require("hardhat")

async function main() {
  const ethers = hre.ethers
  const [deployer] = await ethers.getSigners()
  
  console.log("Creating test property...")
  console.log("Deployer:", deployer.address)
  
  const PropertyShare1155 = await ethers.getContractAt(
    "PropertyShare1155",
    "0x7406C24Ac3e4D38b7477345C51a6528A70dd9c8b"
  )
  
  // Property details
  const name = "Test Beach Villa"
  const location = "Goa, India"
  const totalShares = 1000
  const pricePerShare = ethers.parseUnits("117", 6) // 117 USDC per share
  const metadataUri = "ipfs://QmTest123"
  const initialOwner = deployer.address
  const initialMint = 0
  
  console.log("\nProperty Details:")
  console.log("Name:", name)
  console.log("Location:", location)
  console.log("Total Shares:", totalShares)
  console.log("Price per Share:", ethers.formatUnits(pricePerShare, 6), "USDC")
  console.log("Initial Owner:", initialOwner)
  
  console.log("\nCreating property on-chain...")
  const tx = await PropertyShare1155.createProperty(
    name,
    location,
    totalShares,
    pricePerShare,
    metadataUri,
    initialOwner,
    initialMint
  )
  
  console.log("Transaction sent:", tx.hash)
  console.log("Waiting for confirmation...")
  
  const receipt = await tx.wait()
  console.log("✅ Transaction confirmed!")
  console.log("Block:", receipt.blockNumber)
  
  // Get the tokenId from the event
  const event = receipt.logs.find(log => {
    try {
      const parsed = PropertyShare1155.interface.parseLog(log)
      return parsed?.name === 'PropertyCreated'
    } catch {
      return false
    }
  })
  
  if (event) {
    const parsed = PropertyShare1155.interface.parseLog(event)
    const tokenId = parsed.args.tokenId
    console.log("\n🎉 Property Created!")
    console.log("Token ID:", tokenId.toString())
    console.log("\n✅ You can now purchase shares with tokenId:", tokenId.toString())
    
    // Verify property exists
    const property = await PropertyShare1155.getProperty(tokenId)
    console.log("\nVerification:")
    console.log("Exists:", property.exists)
    console.log("Seller:", property.seller)
    console.log("Price per Share:", ethers.formatUnits(property.pricePerShare, 6), "USDC")
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
