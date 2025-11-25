import { ethers } from 'ethers'

async function main() {
  // Get the user address from environment or use a default
  const userAddress = process.env.USER_ADDRESS || '0x7d5b1d69a839b27bf120363f6c5af6427bc763ea'
  
  console.log('Checking USDC balance for:', userAddress)
  
  // Connect to Arbitrum Sepolia
  const provider = new ethers.JsonRpcProvider('https://arbitrum-sepolia.infura.io/v3/')
  
  // USDC contract address
  const usdcAddress = '0x08E8242c813B8a15351C99b91EE44c76C0a3a468'
  
  // USDC ABI (minimal - just balanceOf)
  const usdcAbi = [
    'function balanceOf(address account) view returns (uint256)',
    'function decimals() view returns (uint8)'
  ]
  
  // Get USDC contract
  const usdc = new ethers.Contract(usdcAddress, usdcAbi, provider)
  
  // Get balance
  const balance = await usdc.balanceOf(userAddress)
  const decimals = await usdc.decimals()
  
  // Format balance
  const formattedBalance = ethers.formatUnits(balance, decimals)
  
  console.log('\n=== USDC Balance ===')
  console.log('Raw balance:', balance.toString())
  console.log('Formatted balance:', formattedBalance, 'USDC')
  console.log('Decimals:', decimals)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
