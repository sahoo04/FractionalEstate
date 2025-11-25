import { ethers } from "hardhat";

async function main() {
  // Test with seller wallet (not owner)
  const sellerPrivateKey = "0x63d4f245ae757a06304d3525a87d22d24f9635acf295bbc25b26e75508f52af3";
  const seller = new ethers.Wallet(sellerPrivateKey, ethers.provider);
  
  console.log("Testing with SELLER account:", seller.address);
  console.log("Seller balance:", ethers.formatEther(await ethers.provider.getBalance(seller.address)), "ETH");

  const propertyAddress = "0xe60710deBA728A0CDe63bAef63bf0E63C86c3567";
  const property = await ethers.getContractAt("PropertyShare1155", propertyAddress, seller);

  console.log("\nCreating property from seller wallet...");
  
  const tx = await property.createProperty(
    "Seller Test Property",
    "Goa Beach Villa",
    1000,
    BigInt(15000) * BigInt(1e6), // 15000 USDC in 6 decimals
    "ipfs://test-seller",
    seller.address, // Property owner = seller
    0
  );

  console.log("Transaction hash:", tx.hash);
  console.log("Waiting for confirmation...");
  await tx.wait();
  console.log("✅ Property created successfully by SELLER!");

  const count = await property.propertyCount();
  console.log("Total properties:", count.toString());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error.message);
    process.exit(1);
  });
