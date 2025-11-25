#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

console.log('\n🔄 Syncing deployments.json to all services...\n');

const deploymentsPath = path.join(__dirname, '../contracts/deployments.json');
if (!fs.existsSync(deploymentsPath)) {
  console.error('❌ deployments.json not found at:', deploymentsPath);
  process.exit(1);
}

const raw = JSON.parse(fs.readFileSync(deploymentsPath, 'utf-8'));

// Support two formats:
// 1) { "421614": { PropertyShare1155: "0x...", ... } }
// 2) { network: "arbitrumSepolia", contracts: { PropertyShare1155: "0x..." }, usdc: '0x...' }
let contracts = null;
if (raw['421614'] && typeof raw['421614'] === 'object') {
  contracts = raw['421614'];
} else if (raw.contracts && typeof raw.contracts === 'object') {
  contracts = raw.contracts;
  // Copy usdc into contracts object for backward compatibility
  if (raw.usdc && !contracts.MockUSDC) contracts.MockUSDC = raw.usdc;
} else if (raw.contracts?.PropertyShare1155) {
  contracts = raw.contracts;
} else {
  console.error('❌ No recognizable deployments structure found in deployments.json');
  process.exit(1);
}

// Update frontend .env.local
const frontendEnvPath = path.join(__dirname, '../frontend/.env.local');
let frontendEnv = fs.readFileSync(frontendEnvPath, 'utf-8');

// Update contract addresses
const updates = [
  ['NEXT_PUBLIC_PROPERTY_TOKEN_ADDRESS', contracts.PropertyShare1155],
  ['NEXT_PUBLIC_REVENUE_SPLITTER_ADDRESS', contracts.RevenueSplitter || ''],
  ['NEXT_PUBLIC_MARKETPLACE_ADDRESS', contracts.Marketplace || ''],
  ['NEXT_PUBLIC_GOVERNANCE_ADDRESS', contracts.Governance || ''],
  ['NEXT_PUBLIC_USDC_ADDRESS', contracts.MockUSDC || raw.usdc || ''],
  ['NEXT_PUBLIC_USER_REGISTRY_ADDRESS', contracts.UserRegistry || ''],
  ['NEXT_PUBLIC_ZK_REGISTRY_ADDRESS', contracts.ZKRegistry || ''],
  ['NEXT_PUBLIC_IDENTITY_SBT_ADDRESS', contracts.IdentitySBT || '']
];

for (const [envKey, address] of updates) {
  if (address) {
    const regex = new RegExp(`${envKey}=.*`, 'g');
    if (frontendEnv.match(regex)) {
      frontendEnv = frontendEnv.replace(regex, `${envKey}=${address}`);
      console.log(`✅ Updated ${envKey}`);
    } else {
      frontendEnv += `\n${envKey}=${address}`;
      console.log(`✅ Added ${envKey}`);
    }
  }
}

fs.writeFileSync(frontendEnvPath, frontendEnv);
console.log('\n✅ Frontend .env.local updated');

// Update indexer .env
const indexerEnvPath = path.join(__dirname, '../indexer/.env');
let indexerEnv = fs.readFileSync(indexerEnvPath, 'utf-8');

const indexerUpdates = [
  ['PROPERTY_SHARE_ADDRESS', contracts.PropertyShare1155],
  ['REVENUE_SPLITTER_ADDRESS', contracts.RevenueSplitter || ''],
  ['MARKETPLACE_ADDRESS', contracts.Marketplace || ''],
  ['USER_REGISTRY_ADDRESS', contracts.UserRegistry || ''],
  ['ZK_REGISTRY_ADDRESS', contracts.ZKRegistry || ''],
  ['IDENTITY_SBT_ADDRESS', contracts.IdentitySBT || '']
];

for (const [envKey, address] of indexerUpdates) {
  if (address) {
    const regex = new RegExp(`${envKey}=.*`, 'g');
    if (indexerEnv.match(regex)) {
      indexerEnv = indexerEnv.replace(regex, `${envKey}=${address}`);
      console.log(`✅ Updated ${envKey}`);
    }
  }
}

fs.writeFileSync(indexerEnvPath, indexerEnv);
console.log('✅ Indexer .env updated\n');

console.log('📋 Current Contract Addresses:');
console.log('================================');
for (const [name, address] of Object.entries(contracts)) {
  console.log(`${name.padEnd(20)} ${address}`);
}
console.log('================================\n');

console.log('✅ Deployment sync complete!\n');
console.log('⚠️  Next steps:');
console.log('   1. Restart indexer: cd indexer && npm run dev');
console.log('   2. Run migration if needed: cd contracts && npx hardhat run scripts/migrate-all-sbts.ts --network arbitrumSepolia');
console.log('   3. Restart frontend: cd frontend && npm run dev\n');
