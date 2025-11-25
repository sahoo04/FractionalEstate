const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Deploying RevenueSplitter...");

  // Read existing deployments
  const deploymentsPath = path.join(__dirname, "../deployments.json");
  const deployments = JSON.parse(fs.readFileSync(deploymentsPath, "utf8"));
  
  // Get existing contract addresses
  const propertyShareAddress = deployments.contracts.PropertyShare1155;
  const usdcAddress = deployments.usdc;
  
  console.log("Using PropertyShare1155:", propertyShareAddress);
  console.log("Using MockUSDC:", usdcAddress);

  // Get deployer
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "ETH");

  // Deploy RevenueSplitter
  const RevenueSplitter = await hre.ethers.getContractFactory("RevenueSplitter");
  const platformFeeBps = 300; // 3% platform fee
  
  console.log("\nDeployment parameters:");
  console.log("- USDC:", usdcAddress);
  console.log("- PropertyShare1155:", propertyShareAddress);
  console.log("- Owner:", deployer.address);
  console.log("- Platform Fee:", platformFeeBps, "bps (3%)");
  console.log("- Fee Recipient:", deployer.address);
  
  const revenueSplitter = await RevenueSplitter.deploy(
    usdcAddress,              // USDC token address
    propertyShareAddress,     // PropertyShare1155 address
    deployer.address,         // initialOwner
    platformFeeBps,           // platformFeeBps (300 = 3%)
    deployer.address          // feeRecipient
  );

  await revenueSplitter.waitForDeployment();
  const revenueSplitterAddress = await revenueSplitter.getAddress();

  console.log("\n✅ RevenueSplitter deployed to:", revenueSplitterAddress);

  // Update deployments.json
  deployments.contracts.RevenueSplitter = revenueSplitterAddress;
  deployments.timestamp = new Date().toISOString();
  fs.writeFileSync(deploymentsPath, JSON.stringify(deployments, null, 2));

  console.log("\n📝 Updated deployments.json");
  console.log("\nDeployment complete!");
  console.log("\n🎉 Ward Boy System Features:");
  console.log("- Admin can assign property managers (ward boys)");
  console.log("- Ward boys deposit net rent after miscellaneous fees");
  console.log("- Admin triggers payout via callOutPay()");
  console.log("- 3% platform fee automatically deducted");
  console.log("- Shareholders can claim their proportional share");
  console.log("\nNext steps:");
  console.log("1. Update frontend/lib/contracts.ts with new RevenueSplitter address");
  console.log("2. Implement ward boy management UI");
  console.log("3. Add 'Call Out Pay' button for admin");
  console.log("4. Test complete rent distribution flow");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
