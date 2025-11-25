/**
 * Transfer RevenueSplitter Contract Ownership
 *
 * Usage:
 * 1. Install dependencies: npm install ethers dotenv
 * 2. Create .env file with: PRIVATE_KEY=your_private_key_here
 * 3. Run: node scripts/transfer-ownership.js
 *
 * IMPORTANT: Never share your private key or commit it to git!
 */

const { ethers } = require("ethers");
require("dotenv").config({ path: ".env.local" });
require("dotenv").config(); // Also try .env as fallback

// Contract addresses (Arbitrum Sepolia)
const REVENUE_SPLITTER_ADDRESS = "0x624D82B44B6790CE3ef88E1de456E918dc77Bf2A";
const NEW_OWNER_ADDRESS = "0xac869c83abde601bb9a0379170fa7d51e7a47c55";

// ABI for transferOwnership
const ABI = [
  "function owner() view returns (address)",
  "function transferOwnership(address newOwner)",
];

async function transferOwnership() {
  try {
    // Check for private key (from .env.local or .env)
    if (!process.env.PRIVATE_KEY) {
      console.error(
        "❌ Error: PRIVATE_KEY not found in .env.local or .env file"
      );
      console.log("\n📝 Add to .env.local file:");
      console.log("PRIVATE_KEY=your_private_key_here");
      console.log("\nOr create .env file with:");
      console.log("PRIVATE_KEY=your_private_key_here");
      process.exit(1);
    }

    // Setup provider (Arbitrum Sepolia)
    const provider = new ethers.JsonRpcProvider(
      "https://sepolia-rollup.arbitrum.io/rpc"
    );

    // Create wallet from private key
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

    console.log("🔗 Connecting to Arbitrum Sepolia...");
    console.log("👤 Current wallet:", wallet.address);

    // Get contract instance
    const contract = new ethers.Contract(REVENUE_SPLITTER_ADDRESS, ABI, wallet);

    // Check current owner
    console.log("\n📋 Checking current owner...");
    const currentOwner = await contract.owner();
    console.log("   Current owner:", currentOwner);

    // Check if already transferred (check this first!)
    if (currentOwner.toLowerCase() === NEW_OWNER_ADDRESS.toLowerCase()) {
      console.log("\n✅ Ownership already transferred!");
      console.log("   Current owner:", currentOwner);
      console.log("   Target owner:", NEW_OWNER_ADDRESS);
      console.log("   ✅ They match! Ownership transfer is complete.");
      console.log(
        "\n🎉 You can now use wallet",
        NEW_OWNER_ADDRESS,
        "to assign ward boys!"
      );
      process.exit(0);
    }

    // Check if connected wallet is the owner
    if (currentOwner.toLowerCase() !== wallet.address.toLowerCase()) {
      console.error("\n❌ Error: Connected wallet is not the contract owner!");
      console.log("   Current owner:", currentOwner);
      console.log("   Your wallet:", wallet.address);
      console.log("   You need to use the wallet that owns the contract.");
      process.exit(1);
    }

    // Confirm transfer
    console.log(
      "\n⚠️  WARNING: This will transfer ownership to:",
      NEW_OWNER_ADDRESS
    );
    console.log("   This action is IRREVERSIBLE!");

    // Transfer ownership
    console.log("\n🔄 Transferring ownership...");
    const tx = await contract.transferOwnership(NEW_OWNER_ADDRESS);
    console.log("   Transaction hash:", tx.hash);
    console.log("   Waiting for confirmation...");

    const receipt = await tx.wait();
    console.log("\n✅ Ownership transferred successfully!");
    console.log("   Block number:", receipt.blockNumber);
    console.log("   Gas used:", receipt.gasUsed.toString());
    console.log("   New owner:", NEW_OWNER_ADDRESS);
    console.log("\n🔗 View on Arbiscan:");
    console.log(`   https://sepolia.arbiscan.io/tx/${tx.hash}`);
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    if (error.reason) {
      console.error("   Reason:", error.reason);
    }
    process.exit(1);
  }
}

// Run the script
transferOwnership();
