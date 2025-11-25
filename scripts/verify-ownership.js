/**
 * Verify Contract Ownership
 *
 * Verifies that all core contracts have the correct owner address
 *
 * Usage: node scripts/verify-ownership.js
 */

const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

const ADMIN_OWNER = "0xac869c83abde601bb9a0379170fa7d51e7a47c55";

// ABI for owner() function
const OWNER_ABI = ["function owner() view returns (address)"];

async function verifyOwnership() {
  try {
    // Setup provider (Arbitrum Sepolia)
    const provider = new ethers.JsonRpcProvider(
      process.env.NEXT_PUBLIC_ARBITRUM_RPC_URL ||
        "https://sepolia-rollup.arbitrum.io/rpc"
    );

    console.log("🔗 Connecting to Arbitrum Sepolia...");
    console.log("👑 Expected owner:", ADMIN_OWNER);
    console.log("");

    // Load deployment addresses
    const deploymentPath = path.join(
      __dirname,
      "../contracts/deployments.json"
    );
    if (!fs.existsSync(deploymentPath)) {
      console.error(
        "❌ deployments.json not found. Please deploy contracts first."
      );
      process.exit(1);
    }

    const deployments = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
    const contracts = deployments.contracts;

    if (!contracts) {
      console.error("❌ No contracts found in deployments.json");
      process.exit(1);
    }

    const contractsToCheck = [
      { name: "PropertyShare1155", address: contracts.PropertyShare1155 },
      { name: "RevenueSplitter", address: contracts.RevenueSplitter },
      { name: "Marketplace", address: contracts.Marketplace },
      { name: "Governance", address: contracts.Governance },
    ];

    console.log("🔍 Verifying ownership for core contracts...\n");

    let allCorrect = true;

    for (const contract of contractsToCheck) {
      if (!contract.address) {
        console.log(`⚠️  ${contract.name}: Not deployed`);
        continue;
      }

      try {
        const contractInstance = new ethers.Contract(
          contract.address,
          OWNER_ABI,
          provider
        );

        const owner = await contractInstance.owner();
        const isCorrect = owner.toLowerCase() === ADMIN_OWNER.toLowerCase();

        if (isCorrect) {
          console.log(`✅ ${contract.name}:`);
          console.log(`   Address: ${contract.address}`);
          console.log(`   Owner: ${owner} (CORRECT)`);
        } else {
          console.log(`❌ ${contract.name}:`);
          console.log(`   Address: ${contract.address}`);
          console.log(`   Owner: ${owner} (EXPECTED: ${ADMIN_OWNER})`);
          allCorrect = false;
        }
        console.log("");
      } catch (error) {
        console.log(`❌ ${contract.name}: Error checking ownership`);
        console.log(`   Address: ${contract.address}`);
        console.log(`   Error: ${error.message}`);
        console.log("");
        allCorrect = false;
      }
    }

    console.log("=".repeat(60));
    if (allCorrect) {
      console.log("✅ All contracts have correct ownership!");
    } else {
      console.log("❌ Some contracts have incorrect ownership!");
      process.exit(1);
    }
    console.log("=".repeat(60));
  } catch (error) {
    console.error("❌ Verification failed:", error);
    process.exit(1);
  }
}

verifyOwnership();
