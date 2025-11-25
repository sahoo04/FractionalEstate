import hre from 'hardhat'
const { ethers } = hre

const PROPERTY_SHARE_1155 = '0x7406C24Ac3e4D38b7477345C51a6528A70dd9c8b'
const WALLET = '0x7d5B1D69a839b27Bf120363f6c5Af6427BC763ea' // Buyer wallet
const TOKEN_ID = 2

async function checkBalance() {
  console.log('\n🔍 Checking on-chain balance...')
  console.log('Wallet:', WALLET)
  console.log('Token ID:', TOKEN_ID)
  
  const propertyShare = await ethers.getContractAt('PropertyShare1155', PROPERTY_SHARE_1155)
  const balance = await propertyShare.balanceOf(WALLET, TOKEN_ID)
  
  console.log('\n📊 On-chain balance:', balance.toString(), 'shares')
}

checkBalance().catch(console.error)
