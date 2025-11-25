import hre from "hardhat";

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  
  // New USDC contract address
  const USDC_ADDRESS = "0x08E8242c813B8a15351C99b91EE44c76C0a3a468";
  
  // Your wallet address - UPDATE THIS!
  const YOUR_WALLET = "0xYourWalletAddressHere"; // CHANGE THIS TO YOUR METAMASK ADDRESS!
  
  console.log("Minting USDC from deployer:", deployer.address);
  console.log("To wallet:", YOUR_WALLET);
  
  // Get USDC contract
  const usdc = await hre.ethers.getContractAt("MockUSDC", USDC_ADDRESS);
  
  // Mint 100,000 USDC to your wallet
  const amount = hre.ethers.parseUnits("100000", 6); // 100,000 USDC
  console.log("Minting", hre.ethers.formatUnits(amount, 6), "USDC...");
  
  const tx = await usdc.mint(YOUR_WALLET, amount);
  await tx.wait();
  
  console.log("✓ USDC minted successfully!");
  console.log("Transaction hash:", tx.hash);
  
  // Check balance
  const balance = await usdc.balanceOf(YOUR_WALLET);
  console.log("New balance:", hre.ethers.formatUnits(balance, 6), "USDC");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
