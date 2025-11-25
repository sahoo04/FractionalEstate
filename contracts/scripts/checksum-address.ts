import { ethers } from "hardhat";

async function main() {
  // Get checksummed USDC address
  const address = "0x75faf114eafb1BDbe2F0316DF893fd58CE45E4C8";
  const checksummed = ethers.getAddress(address);
  console.log("Checksummed USDC address:", checksummed);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
