import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Setting up contracts with account:", deployer.address);

  // Load deployment addresses
  const deploymentPath = path.join(__dirname, "../deployments.json");
  if (!fs.existsSync(deploymentPath)) {
    throw new Error("deployments.json not found. Please run deploy.ts first.");
  }

  const deploymentInfo = JSON.parse(fs.readFileSync(deploymentPath, "utf-8"));
  const { PropertyShare1155 } = deploymentInfo.contracts;
  const USDC_ADDRESS = deploymentInfo.usdc;

  // Get contract instances
  const propertyToken = await ethers.getContractAt("PropertyShare1155", PropertyShare1155);
  const usdc = await ethers.getContractAt("IERC20", USDC_ADDRESS);

  // Create a sample property
  console.log("\nCreating sample property...");
  const tx1 = await propertyToken.createProperty(
    "Luxury Beachfront Villa",
    "Miami Beach, FL",
    1000, // 1000 total shares
    ethers.parseUnits("100", 6), // $100 per share (USDC has 6 decimals)
    "https://ipfs.io/ipfs/QmSamplePropertyURI", // Metadata URI
    deployer.address, // Initial owner
    100 // Mint 100 shares to deployer
  );
  await tx1.wait();
  console.log("Property created! Token ID: 1");

  // Create another sample property
  console.log("\nCreating second property...");
  const tx2 = await propertyToken.createProperty(
    "Downtown Loft",
    "New York, NY",
    500, // 500 total shares
    ethers.parseUnits("200", 6), // $200 per share
    "https://ipfs.io/ipfs/QmSamplePropertyURI2",
    deployer.address,
    50 // Mint 50 shares to deployer
  );
  await tx2.wait();
  console.log("Property created! Token ID: 2");

  // Approve USDC for RevenueSplitter (for relayer)
  console.log("\nApproving USDC for RevenueSplitter...");
  const revenueSplitterAddress = deploymentInfo.contracts.RevenueSplitter;
  const approveTx = await usdc.approve(
    revenueSplitterAddress,
    ethers.MaxUint256
  );
  await approveTx.wait();
  console.log("USDC approved for RevenueSplitter");

  // Approve USDC for Marketplace
  console.log("\nApproving USDC for Marketplace...");
  const marketplaceAddress = deploymentInfo.contracts.Marketplace;
  const approveMarketplaceTx = await usdc.approve(
    marketplaceAddress,
    ethers.MaxUint256
  );
  await approveMarketplaceTx.wait();
  console.log("USDC approved for Marketplace");

  // Approve PropertyShare1155 for Marketplace
  console.log("\nApproving PropertyShare1155 for Marketplace...");
  const approveTokenTx = await propertyToken.setApprovalForAll(
    marketplaceAddress,
    true
  );
  await approveTokenTx.wait();
  console.log("PropertyShare1155 approved for Marketplace");

  console.log("\n=== Setup Complete ===");
  console.log("Properties created:");
  console.log("  - Token ID 1: Luxury Beachfront Villa (100 shares minted)");
  console.log("  - Token ID 2: Downtown Loft (50 shares minted)");
  console.log("\nApprovals set for:");
  console.log("  - USDC → RevenueSplitter");
  console.log("  - USDC → Marketplace");
  console.log("  - PropertyShare1155 → Marketplace");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });


