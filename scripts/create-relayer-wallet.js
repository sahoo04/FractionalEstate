#!/usr/bin/env node

/**
 * Quick script to generate a new wallet for relayer
 * Usage: node scripts/create-relayer-wallet.js
 */

const { ethers } = require('ethers');

function createRelayerWallet() {
  // Create a new random wallet
  const wallet = ethers.Wallet.createRandom();
  
  console.log('\n🔑 New Relayer Wallet Created!\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📝 Address:');
  console.log(`   ${wallet.address}\n`);
  console.log('🔐 Private Key (for .env file):');
  console.log(`   ${wallet.privateKey.replace('0x', '')}\n`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n⚠️  IMPORTANT:');
  console.log('1. Save this private key securely');
  console.log('2. Add to relayer-service/.env:');
  console.log(`   PRIVATE_KEY=${wallet.privateKey.replace('0x', '')}`);
  console.log('3. Fund this wallet with:');
  console.log('   - Arbitrum Sepolia ETH (for gas)');
  console.log('   - Arbitrum Sepolia USDC (for rent deposits)');
  console.log('\n💧 Get testnet funds:');
  console.log('   ETH: https://faucet.quicknode.com/arbitrum/sepolia');
  console.log('   USDC: Bridge or faucet\n');
}

try {
  createRelayerWallet();
} catch (error) {
  console.error('Error: ethers not found. Install it first:');
  console.error('  cd relayer-service && npm install ethers');
  process.exit(1);
}

