#!/usr/bin/env node

/**
 * Script to update frontend and relayer .env files with deployed contract addresses
 * Usage: node scripts/update-addresses.js
 */

const fs = require('fs');
const path = require('path');

function updateEnvFile(filePath, updates) {
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  ${filePath} not found, skipping...`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf-8');
  
  for (const [key, value] of Object.entries(updates)) {
    const regex = new RegExp(`^${key}=.*$`, 'm');
    if (regex.test(content)) {
      content = content.replace(regex, `${key}=${value}`);
    } else {
      content += `\n${key}=${value}`;
    }
  }

  fs.writeFileSync(filePath, content);
  console.log(`✅ Updated ${filePath}`);
}

function main() {
  const deploymentsPath = path.join(__dirname, '../contracts/deployments.json');
  
  if (!fs.existsSync(deploymentsPath)) {
    console.error('❌ deployments.json not found!');
    console.log('   Please deploy contracts first: cd contracts && npm run deploy:sepolia');
    process.exit(1);
  }

  const deploymentData = JSON.parse(fs.readFileSync(deploymentsPath, 'utf-8'));
  const { contracts, usdc } = deploymentData;

  console.log('📋 Updating environment files with deployed addresses...\n');

  // Update frontend .env.local
  const frontendEnv = path.join(__dirname, '../frontend/.env.local');
  updateEnvFile(frontendEnv, {
    'NEXT_PUBLIC_PROPERTY_TOKEN_ADDRESS': contracts.PropertyShare1155,
    'NEXT_PUBLIC_REVENUE_SPLITTER_ADDRESS': contracts.RevenueSplitter,
    'NEXT_PUBLIC_MARKETPLACE_ADDRESS': contracts.Marketplace,
    'NEXT_PUBLIC_GOVERNANCE_ADDRESS': contracts.Governance,
    'NEXT_PUBLIC_USDC_ADDRESS': usdc,
  });

  // Update relayer .env
  const relayerEnv = path.join(__dirname, '../relayer-service/.env');
  updateEnvFile(relayerEnv, {
    'USDC_ADDRESS': usdc,
    'REVENUE_SPLITTER_ADDRESS': contracts.RevenueSplitter,
  });

  console.log('\n✅ All addresses updated!');
  console.log('\nContract addresses:');
  console.log(`  PropertyShare1155: ${contracts.PropertyShare1155}`);
  console.log(`  RevenueSplitter: ${contracts.RevenueSplitter}`);
  console.log(`  Marketplace: ${contracts.Marketplace}`);
  console.log(`  Governance: ${contracts.Governance}`);
  console.log(`  USDC: ${usdc}`);
}

main();

