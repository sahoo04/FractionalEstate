import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * Deploy Marketplace contract only (with purchasePartial function)
 * Preserves all other contracts from deployments.json
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("🚀 Deploying Marketplace with account:", deployer.address);
  console.log(
    "💰 Account balance:",
    ethers.formatEther(await ethers.provider.getBalance(deployer.address)),
    "ETH"
  );

  // Load existing deployments
  const deploymentPath = path.join(__dirname, "../deployments.json");
  let existingDeployments: any = {};

  if (!fs.existsSync(deploymentPath)) {
    console.error("❌ deployments.json not found. Please deploy core contracts first.");
    process.exit(1);
  }

  existingDeployments = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  console.log("\n📋 Using existing contracts from deployments.json:");

  const PROPERTY_SHARE_1155 = existingDeployments.contracts?.PropertyShare1155;
  const USDC = existingDeployments.usdc || process.env.USDC_ADDRESS;

  if (!PROPERTY_SHARE_1155) {
    console.error("❌ PropertyShare1155 address not found in deployments.json");
    process.exit(1);
  }

  if (!USDC) {
    console.error("❌ USDC address not found in deployments.json or env");
    process.exit(1);
  }

  console.log("  PropertyShare1155:", PROPERTY_SHARE_1155);
  console.log("  USDC:", USDC);

  // Deploy Marketplace
  console.log("\n📦 Deploying Marketplace (with purchasePartial function)...");
  const Marketplace = await ethers.getContractFactory("Marketplace");
  const marketplace = await Marketplace.deploy(
    USDC,
    PROPERTY_SHARE_1155,
    deployer.address, // Initial owner
    250, // 2.5% marketplace fee (250 basis points)
    deployer.address // Fee recipient
  );

  await marketplace.waitForDeployment();
  const marketplaceAddress = await marketplace.getAddress();

  console.log("✅ Marketplace deployed to:", marketplaceAddress);

  // Update deployments.json (preserve all other contracts)
  const updatedDeployments = {
    ...existingDeployments,
    contracts: {
      ...existingDeployments.contracts,
      Marketplace: marketplaceAddress,
    },
    timestamp: new Date().toISOString(),
  };

  fs.writeFileSync(deploymentPath, JSON.stringify(updatedDeployments, null, 2));
  console.log("\n💾 Updated deployments.json");

  // Print summary
  console.log("\n" + "=".repeat(60));
  console.log("📊 MARKETPLACE DEPLOYMENT SUMMARY");
  console.log("=".repeat(60));
  console.log("Network:", existingDeployments.network || "arbitrumSepolia");
  console.log("Deployer:", deployer.address);
  console.log("\n✅ NEWLY DEPLOYED:");
  console.log("  Marketplace:", marketplaceAddress);
  console.log("\n🔒 PRESERVED:");
  console.log("  PropertyShare1155:", PROPERTY_SHARE_1155);
  if (existingDeployments.contracts?.RevenueSplitter) {
    console.log("  RevenueSplitter:", existingDeployments.contracts.RevenueSplitter);
  }
  if (existingDeployments.contracts?.Governance) {
    console.log("  Governance:", existingDeployments.contracts.Governance);
  }
  if (existingDeployments.contracts?.IdentitySBT) {
    console.log("  IdentitySBT:", existingDeployments.contracts.IdentitySBT);
  }
  if (existingDeployments.contracts?.UserRegistry) {
    console.log("  UserRegistry:", existingDeployments.contracts.UserRegistry);
  }
  console.log("\n💵 USDC:", USDC);
  console.log("=".repeat(60));

  console.log("\n📝 Next steps:");
  console.log("1. Run: node scripts/sync-deployments.js");
  console.log("2. Restart frontend and indexer services");
  console.log("3. Test partial purchase functionality");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });

