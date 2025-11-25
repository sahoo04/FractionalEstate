import { ethers } from "hardhat";

async function main() {
  console.log("Deploying UserRegistry contract...");

  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

  // Deploy UserRegistry
  const UserRegistry = await ethers.getContractFactory("UserRegistry");
  const userRegistry = await UserRegistry.deploy();
  await userRegistry.waitForDeployment();

  const userRegistryAddress = await userRegistry.getAddress();
  console.log("✅ UserRegistry deployed to:", userRegistryAddress);

  // Verify deployer is admin
  const isAdmin = await userRegistry.isAdmin(deployer.address);
  console.log("Deployer is admin:", isAdmin);

  // Get deployer profile
  const profile = await userRegistry.getUserProfile(deployer.address);
  console.log("Deployer profile:", {
    role: profile.role.toString(),
    kycStatus: profile.kycStatus.toString(),
    name: profile.name,
    exists: profile.exists
  });

  console.log("\n📝 Add this to your .env.local:");
  console.log(`NEXT_PUBLIC_USER_REGISTRY_ADDRESS=${userRegistryAddress}`);

  console.log("\n🔍 Verify on Arbiscan:");
  console.log(`https://sepolia.arbiscan.io/address/${userRegistryAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
