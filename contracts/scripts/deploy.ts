import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log(
    "Account balance:",
    (await ethers.provider.getBalance(deployer.address)).toString()
  );

  // Deploy or use existing USDC
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
  const PropertyShare1155 = await ethers.getContractFactory(
    "PropertyShare1155"
  );
  const propertyToken = await PropertyShare1155.deploy(
    deployer.address,  // initialOwner
    USDC_ADDRESS       // USDC token address
  );
  await propertyToken.waitForDeployment();
  const propertyTokenAddress = await propertyToken.getAddress();
  console.log("PropertyShare1155 deployed to:", propertyTokenAddress);

  // Deploy RevenueSplitter
  console.log("\nDeploying RevenueSplitter...");
  const RevenueSplitter = await ethers.getContractFactory("RevenueSplitter");
  const revenueSplitter = await RevenueSplitter.deploy(
    USDC_ADDRESS,
    propertyTokenAddress,
    deployer.address,
    250, // 2.5% platform fee
    deployer.address // fee recipient
  );
  await revenueSplitter.waitForDeployment();
  const revenueSplitterAddress = await revenueSplitter.getAddress();
  console.log("RevenueSplitter deployed to:", revenueSplitterAddress);

  // Deploy Marketplace
  console.log("\nDeploying Marketplace...");
  const Marketplace = await ethers.getContractFactory("Marketplace");
  const marketplace = await Marketplace.deploy(
    USDC_ADDRESS,
    propertyTokenAddress,
    deployer.address,
    250, // 2.5% marketplace fee
    deployer.address // fee recipient
  );
  await marketplace.waitForDeployment();
  const marketplaceAddress = await marketplace.getAddress();
  console.log("Marketplace deployed to:", marketplaceAddress);

  // Deploy Governance
  console.log("\nDeploying Governance...");
  const Governance = await ethers.getContractFactory("Governance");
  const governance = await Governance.deploy(
    propertyTokenAddress,
    deployer.address,
    7 * 24 * 60 * 60, // 7 days voting period
    1 // minimum 1 share to create proposal
  );
  await governance.waitForDeployment();
  const governanceAddress = await governance.getAddress();
  console.log("Governance deployed to:", governanceAddress);

  // Deploy ZKRegistry
  console.log("\nDeploying ZKRegistry...");
  const ZKRegistry = await ethers.getContractFactory("ZKRegistry");
  const zkRegistry = await ZKRegistry.deploy(deployer.address);
  await zkRegistry.waitForDeployment();
  const zkRegistryAddress = await zkRegistry.getAddress();
  console.log("ZKRegistry deployed to:", zkRegistryAddress);

  // Deploy IdentitySBT
  console.log("\nDeploying IdentitySBT...");
  const IdentitySBT = await ethers.getContractFactory("IdentitySBT");
  const identitySBT = await IdentitySBT.deploy(deployer.address);
  await identitySBT.waitForDeployment();
  const identitySBTAddress = await identitySBT.getAddress();
  console.log("IdentitySBT deployed to:", identitySBTAddress);

  // Save deployment addresses
  const deploymentInfo = {
    network: "arbitrumSepolia",
    deployer: deployer.address,
    contracts: {
      PropertyShare1155: propertyTokenAddress,
      RevenueSplitter: revenueSplitterAddress,
      Marketplace: marketplaceAddress,
      Governance: governanceAddress,
      ZKRegistry: zkRegistryAddress,
      IdentitySBT: identitySBTAddress,
    },
    usdc: USDC_ADDRESS,
    timestamp: new Date().toISOString(),
  };

  const deploymentPath = path.join(__dirname, "../deployments.json");
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log("\nDeployment info saved to:", deploymentPath);

  console.log("\n=== Deployment Summary ===");
  console.log("PropertyShare1155:", propertyTokenAddress);
  console.log("RevenueSplitter:", revenueSplitterAddress);
  console.log("Marketplace:", marketplaceAddress);
  console.log("Governance:", governanceAddress);
  console.log("ZKRegistry:", zkRegistryAddress);
  console.log("IdentitySBT:", identitySBTAddress);
  console.log("USDC:", USDC_ADDRESS);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });


