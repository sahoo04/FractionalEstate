import hre from "hardhat";

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  
  // USDC contract address from deployments.json
  const USDC_ADDRESS = "0x87917eE5e87Ed830F3D26A14Df3549f6A6Aa332C";
  
  // Recipient wallet address
  const YOUR_WALLET = "0xbae9b8b0b94ad045b0e3edb2b56cfecd7601cf53";
  
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
