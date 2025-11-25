import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * Deploy core contracts (PropertyShare1155, Marketplace, RevenueSplitter, Governance)
 * WITHOUT redeploying: IdentitySBT, UserRegistry, ZKRegistry
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  const ADMIN_OWNER = "0xac869c83abde601bb9a0379170fa7d51e7a47c55";
  
  console.log("🚀 Deploying core contracts with account:", deployer.address);
  console.log("👑 Admin owner address:", ADMIN_OWNER);
  console.log(
    "💰 Account balance:",
    ethers.formatEther(await ethers.provider.getBalance(deployer.address)),
    "ETH"
  );

  // Load existing deployments to preserve addresses we're NOT redeploying
  const deploymentPath = path.join(__dirname, "../deployments.json");
  let existingDeployments: any = {};

  if (fs.existsSync(deploymentPath)) {
    existingDeployments = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
    console.log("\n📋 Existing deployments found, preserving:");
    if (existingDeployments.contracts?.IdentitySBT) {
      console.log(
        "  - IdentitySBT:",
        existingDeployments.contracts.IdentitySBT
      );
    }
    if (existingDeployments.contracts?.UserRegistry) {
      console.log(
        "  - UserRegistry:",
        existingDeployments.contracts.UserRegistry
      );
    }
    if (existingDeployments.contracts?.ZKRegistry) {
      console.log("  - ZKRegistry:", existingDeployments.contracts.ZKRegistry);
    }
  }

  // Use existing USDC or from env
  let USDC_ADDRESS: string;

  if (process.env.USDC_ADDRESS) {
    USDC_ADDRESS = process.env.USDC_ADDRESS;
    console.log("\n✅ Using existing USDC from env:", USDC_ADDRESS);
  } else if (existingDeployments.usdc) {
    USDC_ADDRESS = existingDeployments.usdc;
    console.log(
      "\n✅ Using existing USDC from deployments.json:",
      USDC_ADDRESS
    );
  } else {
    console.log("\n⚠️  No USDC address found. Deploying Mock USDC...");
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    const usdc = await MockUSDC.deploy(deployer.address);
    await usdc.waitForDeployment();
    USDC_ADDRESS = await usdc.getAddress();
    console.log("✅ Mock USDC deployed to:", USDC_ADDRESS);

    // Mint some USDC to deployer for testing
    console.log("💰 Minting 1,000,000 USDC to deployer...");
    const mintTx = await usdc.mint(
      deployer.address,
      ethers.parseUnits("1000000", 6)
    );
    await mintTx.wait();
    console.log("✅ USDC minted successfully");
  }

  // Deploy PropertyShare1155
  console.log("\n📦 Deploying PropertyShare1155...");
  const PropertyShare1155 = await ethers.getContractFactory(
    "PropertyShare1155"
  );
  const propertyToken = await PropertyShare1155.deploy(
    ADMIN_OWNER, // initialOwner - admin address
    USDC_ADDRESS // USDC token address
  );
  await propertyToken.waitForDeployment();
  const propertyTokenAddress = await propertyToken.getAddress();
  console.log("✅ PropertyShare1155 deployed to:", propertyTokenAddress);

  // Deploy RevenueSplitter
  console.log("\n📦 Deploying RevenueSplitter...");
  const RevenueSplitter = await ethers.getContractFactory("RevenueSplitter");
  const revenueSplitter = await RevenueSplitter.deploy(
    USDC_ADDRESS,
    propertyTokenAddress,
    ADMIN_OWNER, // initialOwner - admin address
    250, // 2.5% platform fee (250 basis points)
    ADMIN_OWNER // fee recipient - admin address
  );
  await revenueSplitter.waitForDeployment();
  const revenueSplitterAddress = await revenueSplitter.getAddress();
  console.log("✅ RevenueSplitter deployed to:", revenueSplitterAddress);

  // Deploy Marketplace
  console.log("\n📦 Deploying Marketplace...");
  const Marketplace = await ethers.getContractFactory("Marketplace");
  const marketplace = await Marketplace.deploy(
    USDC_ADDRESS,
    propertyTokenAddress,
    ADMIN_OWNER, // initialOwner - admin address
    250, // 2.5% marketplace fee (250 basis points)
    ADMIN_OWNER // fee recipient - admin address
  );
  await marketplace.waitForDeployment();
  const marketplaceAddress = await marketplace.getAddress();
  console.log("✅ Marketplace deployed to:", marketplaceAddress);

  // Deploy Governance
  console.log("\n📦 Deploying Governance...");
  const Governance = await ethers.getContractFactory("Governance");
  const governance = await Governance.deploy(
    propertyTokenAddress,
    ADMIN_OWNER, // initialOwner - admin address
    7 * 24 * 60 * 60, // 7 days voting period
    1 // minimum 1 share to create proposal
  );
  await governance.waitForDeployment();
  const governanceAddress = await governance.getAddress();
  console.log("✅ Governance deployed to:", governanceAddress);

  // Prepare deployment info, preserving existing contracts we're NOT redeploying
  const deploymentInfo = {
    network: "arbitrumSepolia",
    deployer: deployer.address,
    contracts: {
      PropertyShare1155: propertyTokenAddress,
      RevenueSplitter: revenueSplitterAddress,
      Marketplace: marketplaceAddress,
      Governance: governanceAddress,
      // Preserve existing contracts we're NOT redeploying
      ...(existingDeployments.contracts?.IdentitySBT && {
        IdentitySBT: existingDeployments.contracts.IdentitySBT,
      }),
      ...(existingDeployments.contracts?.UserRegistry && {
        UserRegistry: existingDeployments.contracts.UserRegistry,
      }),
      ...(existingDeployments.contracts?.ZKRegistry && {
        ZKRegistry: existingDeployments.contracts.ZKRegistry,
      }),
    },
    usdc: USDC_ADDRESS,
    timestamp: new Date().toISOString(),
  };

  // Save deployment addresses
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log("\n💾 Deployment info saved to:", deploymentPath);

  // Print summary
  console.log("\n" + "=".repeat(60));
  console.log("📊 DEPLOYMENT SUMMARY");
  console.log("=".repeat(60));
  console.log("Network:", deploymentInfo.network);
  console.log("Deployer:", deployer.address);
  console.log("\n✅ NEWLY DEPLOYED:");
  console.log("  PropertyShare1155:", propertyTokenAddress);
  console.log("  RevenueSplitter:", revenueSplitterAddress);
  console.log("  Marketplace:", marketplaceAddress);
  console.log("  Governance:", governanceAddress);
  console.log("\n🔒 PRESERVED (NOT REDEPLOYED):");
  if (deploymentInfo.contracts.IdentitySBT) {
    console.log("  IdentitySBT:", deploymentInfo.contracts.IdentitySBT);
  }
  if (deploymentInfo.contracts.UserRegistry) {
    console.log("  UserRegistry:", deploymentInfo.contracts.UserRegistry);
  }
  if (deploymentInfo.contracts.ZKRegistry) {
    console.log("  ZKRegistry:", deploymentInfo.contracts.ZKRegistry);
  }
  console.log("\n💵 USDC:", USDC_ADDRESS);
  console.log("=".repeat(60));

  console.log("\n📝 Next steps:");
  console.log("1. Update frontend/.env.local with new contract addresses");
  console.log("2. Update frontend/lib/contracts.ts with new addresses");
  console.log("3. Verify ownership for all contracts");
  console.log("4. Test property creation flow");
  
  console.log("\n✅ All contracts deployed with admin owner:", ADMIN_OWNER);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
