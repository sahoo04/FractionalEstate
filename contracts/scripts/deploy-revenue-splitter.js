const hre = require("hardhat");
const fs = require("fs");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying RevenueSplitter with account:", deployer.address);

  // Read existing addresses from deployments.json
  const deploymentsPath = "./deployments.json";
  let PROPERTY_SHARE_1155, USDC;

  if (fs.existsSync(deploymentsPath)) {
    const deployments = JSON.parse(fs.readFileSync(deploymentsPath, "utf8"));
    PROPERTY_SHARE_1155 = deployments.contracts?.PropertyShare1155;
    USDC = deployments.usdc || process.env.USDC_ADDRESS;
  }

  // Fallback to env or default
  if (!PROPERTY_SHARE_1155) {
    console.error("❌ PropertyShare1155 address not found in deployments.json");
    process.exit(1);
  }
  if (!USDC) {
    USDC =
      process.env.USDC_ADDRESS || "0x87917eE5e87Ed830F3D26A14Df3549f6A6Aa332C";
  }

  console.log("\nUsing existing contracts:");
  console.log("PropertyShare1155:", PROPERTY_SHARE_1155);
  console.log("USDC:", USDC);

  // Deploy RevenueSplitter
  console.log("\n📦 Deploying RevenueSplitter...");
  const RevenueSplitter = await hre.ethers.getContractFactory(
    "RevenueSplitter"
  );
  const revenueSplitter = await RevenueSplitter.deploy(
    USDC,
    PROPERTY_SHARE_1155,
    deployer.address, // Initial owner
    100, // 1% platform fee
    deployer.address // Fee recipient
  );

  await revenueSplitter.waitForDeployment();
  const revenueSplitterAddress = await revenueSplitter.getAddress();

  console.log("✅ RevenueSplitter deployed to:", revenueSplitterAddress);

  // Update deployments.json
  const deployments = JSON.parse(fs.readFileSync(deploymentsPath, "utf8"));

  deployments.contracts.RevenueSplitter = revenueSplitterAddress;
  deployments.timestamp = new Date().toISOString();

  fs.writeFileSync(deploymentsPath, JSON.stringify(deployments, null, 2));
  console.log("\n✅ Updated deployments.json");

  console.log("\n📝 Summary:");
  console.log("Network:", deployments.network);
  console.log("Deployer:", deployer.address);
  console.log("PropertyShare1155:", PROPERTY_SHARE_1155);
  console.log("RevenueSplitter:", revenueSplitterAddress);
  console.log("Marketplace:", deployments.contracts.Marketplace);
  console.log("USDC:", USDC);

  console.log("\n⚠️  IMPORTANT: Update frontend .env with:");
  console.log("NEXT_PUBLIC_REVENUE_SPLITTER_ADDRESS=" + revenueSplitterAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
