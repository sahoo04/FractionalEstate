import { ethers } from 'hardhat'
import deployments from '../deployments.json'

async function main() {
  const [deployer] = await ethers.getSigners()
  console.log('Current owner (deployer):', deployer.address)

  // Get new owner address from command line or use default
  const newOwnerAddress = process.env.NEW_OWNER_ADDRESS
  if (!newOwnerAddress) {
    console.error('Please provide NEW_OWNER_ADDRESS environment variable')
    console.log('\nUsage:')
    console.log('NEW_OWNER_ADDRESS=0xYourAdminAddress npx hardhat run scripts/transfer-ownership.ts --network arbitrumSepolia')
    process.exit(1)
  }

  console.log('New owner address:', newOwnerAddress)

  // Get RevenueSplitter contract
  const revenueSplitterAddress = deployments.contracts.RevenueSplitter
  const RevenueSplitter = await ethers.getContractFactory('RevenueSplitter')
  const revenueSplitter = RevenueSplitter.attach(revenueSplitterAddress)

  console.log('\n📝 Transferring ownership of RevenueSplitter...')
  console.log('Contract:', revenueSplitterAddress)

  // Transfer ownership
  const tx = await revenueSplitter.transferOwnership(newOwnerAddress)
  console.log('Transaction hash:', tx.hash)
  
  await tx.wait()
  console.log('✅ Ownership transferred!')

  // Verify new owner
  const currentOwner = await revenueSplitter.owner()
  console.log('\nVerification:')
  console.log('Current owner:', currentOwner)
  console.log('Expected owner:', newOwnerAddress)
  console.log('Match:', currentOwner.toLowerCase() === newOwnerAddress.toLowerCase() ? '✅' : '❌')
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
