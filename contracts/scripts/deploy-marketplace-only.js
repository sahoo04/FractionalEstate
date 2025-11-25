const hre = require("hardhat");
const fs = require('fs');

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying Marketplace with account:", deployer.address);

  // Read existing addresses from deployments.json
  const deploymentsPath = './deployments.json';
  let PROPERTY_SHARE_1155, USDC, REVENUE_SPLITTER;
  
  if (fs.existsSync(deploymentsPath)) {
    const deployments = JSON.parse(fs.readFileSync(deploymentsPath, 'utf8'));
    PROPERTY_SHARE_1155 = deployments.contracts?.PropertyShare1155;
    REVENUE_SPLITTER = deployments.contracts?.RevenueSplitter;
    USDC = deployments.usdc || process.env.USDC_ADDRESS;
  }
  
  // Fallback to env or default
  if (!PROPERTY_SHARE_1155) {
    console.error('❌ PropertyShare1155 address not found in deployments.json');
    process.exit(1);
  }
  if (!REVENUE_SPLITTER) {
    console.error('❌ RevenueSplitter address not found in deployments.json');
    process.exit(1);
  }
  if (!USDC) {
    USDC = process.env.USDC_ADDRESS || "0x87917eE5e87Ed830F3D26A14Df3549f6A6Aa332C";
  }

  console.log("\nUsing existing contracts:");
  console.log("PropertyShare1155:", PROPERTY_SHARE_1155);
  console.log("USDC:", USDC);
  console.log("RevenueSplitter:", REVENUE_SPLITTER);

  // Deploy Marketplace
  console.log("\n📦 Deploying Marketplace...");
  const Marketplace = await hre.ethers.getContractFactory("Marketplace");
  const marketplace = await Marketplace.deploy(
    USDC,
    PROPERTY_SHARE_1155,
    deployer.address, // Initial owner
    250, // 2.5% marketplace fee
    deployer.address // Fee recipient
  );

  await marketplace.waitForDeployment();
  const marketplaceAddress = await marketplace.getAddress();

  console.log("✅ Marketplace deployed to:", marketplaceAddress);

  // Update deployments.json
  const deployments = JSON.parse(fs.readFileSync(deploymentsPath, 'utf8'));

  deployments.contracts.Marketplace = marketplaceAddress;
  deployments.contracts.RevenueSplitter = REVENUE_SPLITTER;
  deployments.timestamp = new Date().toISOString();

  fs.writeFileSync(deploymentsPath, JSON.stringify(deployments, null, 2));
  console.log("\n✅ Updated deployments.json");

  console.log("\n📝 Summary:");
  console.log("Network:", deployments.network);
  console.log("Deployer:", deployer.address);
  console.log("PropertyShare1155:", PROPERTY_SHARE_1155);
  console.log("Marketplace:", marketplaceAddress);
  console.log("RevenueSplitter:", REVENUE_SPLITTER);
  console.log("USDC:", USDC);

  console.log("\n⚠️  IMPORTANT: Update frontend .env with:");
  console.log("NEXT_PUBLIC_MARKETPLACE_ADDRESS=" + marketplaceAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
