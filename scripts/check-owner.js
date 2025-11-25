/**
 * Check RevenueSplitter Contract Owner
 */

const { ethers } = require("ethers");

// Contract address (Arbitrum Sepolia)
const REVENUE_SPLITTER_ADDRESS = "0x624D82B44B6790CE3ef88E1de456E918dc77Bf2A";
const CHECK_ADDRESS = "0xac869c83abde601bb9a0379170fa7d51e7a47c55";

// ABI for owner function
const ABI = ["function owner() view returns (address)"];

async function checkOwner() {
  try {
    // Setup provider (Arbitrum Sepolia)
    const provider = new ethers.JsonRpcProvider(
      "https://sepolia-rollup.arbitrum.io/rpc"
    );

    console.log("🔗 Connecting to Arbitrum Sepolia...");
    console.log("📋 Checking contract owner...\n");

    // Get contract instance
    const contract = new ethers.Contract(
      REVENUE_SPLITTER_ADDRESS,
      ABI,
      provider
    );

    // Get current owner
    const currentOwner = await contract.owner();

    console.log("📊 Results:");
    console.log("   Contract:", REVENUE_SPLITTER_ADDRESS);
    console.log("   Current Owner:", currentOwner);
    console.log("   Check Address:", CHECK_ADDRESS);
    console.log("\n");

    // Compare addresses (case-insensitive)
    const isOwner = currentOwner.toLowerCase() === CHECK_ADDRESS.toLowerCase();

    if (isOwner) {
      console.log("✅ YES! The address IS the contract owner!");
      console.log("   ✅", CHECK_ADDRESS, "can assign ward boys");
    } else {
      console.log("❌ NO! The address is NOT the contract owner");
      console.log("   Current owner:", currentOwner);
      console.log("   Check address:", CHECK_ADDRESS);
      console.log(
        "\n⚠️  You need to connect with the owner wallet to assign ward boys"
      );
    }
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    if (error.reason) {
      console.error("   Reason:", error.reason);
    }
    process.exit(1);
  }
}

// Run the script
checkOwner();
