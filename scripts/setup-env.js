#!/usr/bin/env node

/**
 * Setup script to help create .env files
 * Usage: node scripts/setup-env.js
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function setupContracts() {
  console.log('\n=== Contracts Configuration ===');
  const rpcUrl = await question('Enter Arbitrum Sepolia RPC URL: ');
  const privateKey = await question('Enter deployer private key (without 0x): ');
  const usdcAddress = await question('Enter USDC address (or press Enter for default): ') || '0x75faf114eafb1BDbe2F0316DF893fd58cE45e4C8';
  const arbiscanKey = await question('Enter Arbiscan API key (optional, press Enter to skip): ') || '';

  const envContent = `ARBITRUM_SEPOLIA_RPC_URL=${rpcUrl}
PRIVATE_KEY=${privateKey}
USDC_ADDRESS=${usdcAddress}
ARBISCAN_API_KEY=${arbiscanKey}
REPORT_GAS=false
`;

  fs.writeFileSync(path.join(__dirname, '../contracts/.env'), envContent);
  console.log('✅ Created contracts/.env');
}

async function setupFrontend(deployments) {
  console.log('\n=== Frontend Configuration ===');
  const walletConnectId = await question('Enter WalletConnect Project ID (get from https://cloud.walletconnect.com): ');

  const envContent = `NEXT_PUBLIC_PROPERTY_TOKEN_ADDRESS=${deployments?.PropertyShare1155 || ''}
NEXT_PUBLIC_REVENUE_SPLITTER_ADDRESS=${deployments?.RevenueSplitter || ''}
NEXT_PUBLIC_MARKETPLACE_ADDRESS=${deployments?.Marketplace || ''}
NEXT_PUBLIC_GOVERNANCE_ADDRESS=${deployments?.Governance || ''}
NEXT_PUBLIC_USDC_ADDRESS=${deployments?.usdc || '0x75faf114eafb1BDbe2F0316DF893fd58cE45e4C8'}
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=${walletConnectId}
`;

  fs.writeFileSync(path.join(__dirname, '../frontend/.env.local'), envContent);
  console.log('✅ Created frontend/.env.local');
}

async function setupRelayer(deployments, rpcUrl) {
  console.log('\n=== Relayer Service Configuration ===');
  const privateKey = await question('Enter relayer wallet private key (without 0x): ');

  const envContent = `RPC_URL=${rpcUrl}
PRIVATE_KEY=${privateKey}
USDC_ADDRESS=${deployments?.usdc || '0x75faf114eafb1BDbe2F0316DF893fd58cE45e4C8'}
REVENUE_SPLITTER_ADDRESS=${deployments?.RevenueSplitter || ''}
INTERVAL_SECONDS=0
PROPERTIES=[{"tokenId":1,"amount":1000}]
`;

  fs.writeFileSync(path.join(__dirname, '../relayer-service/.env'), envContent);
  console.log('✅ Created relayer-service/.env');
}

async function loadDeployments() {
  const deploymentsPath = path.join(__dirname, '../contracts/deployments.json');
  if (fs.existsSync(deploymentsPath)) {
    const data = JSON.parse(fs.readFileSync(deploymentsPath, 'utf-8'));
    return data.contracts;
  }
  return null;
}

async function main() {
  console.log('🚀 FractionalStay Environment Setup\n');

  // Setup contracts first
  await setupContracts();

  // Try to load deployments
  const deployments = await loadDeployments();
  if (deployments) {
    console.log('\n📋 Found deployment addresses, using them...');
  } else {
    console.log('\n⚠️  No deployments found. Deploy contracts first, then run this script again.');
    console.log('   Or manually update the .env files after deployment.');
  }

  // Setup frontend
  await setupFrontend(deployments);

  // Setup relayer
  const rpcUrl = process.env.ARBITRUM_SEPOLIA_RPC_URL || await question('\nEnter RPC URL for relayer (or press Enter to use same as contracts): ');
  await setupRelayer(deployments, rpcUrl);

  console.log('\n✅ Setup complete!');
  console.log('\nNext steps:');
  console.log('1. Deploy contracts: cd contracts && npm run deploy:sepolia');
  console.log('2. Update .env files with deployment addresses');
  console.log('3. Start frontend: cd frontend && npm run dev');

  rl.close();
}

main().catch(console.error);






