import hre from 'hardhat'
import { ethers } from 'ethers'

async function checkBalance() {
  const CONTRACT_ADDRESS = '0x7406C24Ac3e4D38b7477345C51a6528A70dd9c8b'
  const USER_ADDRESS = '0xbae9b8b0b94ad045b0e3edb2b56cfecd7601cf53'
  const TOKEN_ID = 2
  
  const PropertyShare1155 = await hre.viem.getContractAt(
    'PropertyShare1155',
    CONTRACT_ADDRESS as `0x${string}`
  )
  
  console.log('\n📊 Checking balance...')
  console.log(`Contract: ${CONTRACT_ADDRESS}`)
  console.log(`User: ${USER_ADDRESS}`)
  console.log(`Token ID: ${TOKEN_ID}\n`)
  
  // Get balance
  const balance = await PropertyShare1155.read.balanceOf([USER_ADDRESS as `0x${string}`, BigInt(TOKEN_ID)])
  console.log(`✅ On-chain balance: ${balance.toString()} shares\n`)
  
  // Get property details
  try {
    const propertyCount = await PropertyShare1155.propertyCount()
    console.log(`Total properties: ${propertyCount.toString()}`)
  } catch (error) {
    console.log('Could not fetch property count')
  }
}

checkBalance()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
