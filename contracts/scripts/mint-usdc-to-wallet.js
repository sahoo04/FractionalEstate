const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  
  // New USDC contract address from recent deployment
  const USDC_ADDRESS = "0x08E8242c813B8a15351C99b91EE44c76C0a3a468";
  
  // Your wallet address - GET THIS FROM METAMASK!
  const YOUR_WALLET = process.env.WALLET_ADDRESS;
  
  if (!YOUR_WALLET) {
    console.error("❌ Error: Please provide your wallet address");
    console.log("Usage: WALLET_ADDRESS=0xYourAddress npx hardhat run scripts/mint-usdc-to-wallet.js --network arbitrumSepolia");
    process.exit(1);
  }
  
  console.log("Minting USDC from deployer:", deployer.address);
  console.log("To wallet:", YOUR_WALLET);
  
  // Get USDC contract
  const usdc = await hre.ethers.getContractAt("MockUSDC", USDC_ADDRESS);
  
  // Mint 100,000 USDC to your wallet
  const amount = hre.ethers.parseUnits("100000", 6);
  console.log("Minting", hre.ethers.formatUnits(amount, 6), "USDC...");
  
  const tx = await usdc.mint(YOUR_WALLET, amount);
  console.log("Transaction sent:", tx.hash);
  console.log("Waiting for confirmation...");
  
  await tx.wait();
  
  console.log("✅ USDC minted successfully!");
  
  // Check balance
  const balance = await usdc.balanceOf(YOUR_WALLET);
  console.log("💰 New balance:", hre.ethers.formatUnits(balance, 6), "USDC");
  console.log("\n🎉 You can now approve and purchase property shares!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
