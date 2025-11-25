import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying PropertyShare1155 with account:", deployer.address);
  console.log(
    "Account balance:",
    (await ethers.provider.getBalance(deployer.address)).toString()
  );

  // Use existing USDC or deploy MockUSDC
  let USDC_ADDRESS: string;

  if (process.env.USDC_ADDRESS) {
    USDC_ADDRESS = process.env.USDC_ADDRESS;
    console.log("Using existing USDC at:", USDC_ADDRESS);
  } else {
    console.log("\nDeploying Mock USDC...");
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    const usdc = await MockUSDC.deploy(deployer.address);
    await usdc.waitForDeployment();
    USDC_ADDRESS = await usdc.getAddress();
    console.log("Mock USDC deployed to:", USDC_ADDRESS);

    // Mint some USDC to deployer for testing
    console.log("Minting 1,000,000 USDC to deployer...");
    const mintTx = await usdc.mint(deployer.address, ethers.parseUnits("1000000", 6));
    await mintTx.wait();
    console.log("USDC minted successfully");
  }

  // Deploy PropertyShare1155
  console.log("\nDeploying PropertyShare1155...");
  const PropertyShare1155 = await ethers.getContractFactory("PropertyShare1155");
  const propertyToken = await PropertyShare1155.deploy(
    deployer.address,  // initialOwner
    USDC_ADDRESS       // USDC token address
  );
  await propertyToken.waitForDeployment();
  const propertyTokenAddress = await propertyToken.getAddress();
  console.log("PropertyShare1155 deployed to:", propertyTokenAddress);

  // Save deployment addresses
  const deploymentInfo = {
    network: "arbitrumSepolia",
    deployer: deployer.address,
    contracts: {
      PropertyShare1155: propertyTokenAddress,
    },
    usdc: USDC_ADDRESS,
    timestamp: new Date().toISOString(),
  };

  const deploymentPath = path.join(__dirname, "../deployments.json");
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log("\nDeployment info saved to:", deploymentPath);

  console.log("\n=== Deployment Summary ===");
  console.log("PropertyShare1155:", propertyTokenAddress);
  console.log("USDC:", USDC_ADDRESS);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });