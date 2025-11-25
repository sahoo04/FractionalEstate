/**
 * Helper script to generate Vercel environment variables from .env.local
 * This helps you copy-paste variables into Vercel Dashboard
 */

const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');

if (!fs.existsSync(envPath)) {
  console.error('❌ .env.local file not found!');
  console.log('💡 Create .env.local first with all your environment variables.');
  process.exit(1);
}

// Read .env.local
const envContent = fs.readFileSync(envPath, 'utf8');
const lines = envContent.split('\n');

console.log('📋 Vercel Environment Variables\n');
console.log('='.repeat(60));
console.log('Copy these to Vercel Dashboard → Settings → Environment Variables\n');
console.log('='.repeat(60) + '\n');

const variables = [];

lines.forEach((line) => {
  // Skip comments and empty lines
  if (line.trim() === '' || line.trim().startsWith('#')) {
    return;
  }

  // Parse KEY=VALUE
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    const value = match[2].trim();
    
    // Skip if value is empty
    if (!value) return;
    
    variables.push({ key, value });
    
    console.log(`Name: ${key}`);
    console.log(`Value: ${value}`);
    console.log(`Environment: Production, Preview, Development`);
    console.log('---\n');
  }
});

console.log('='.repeat(60));
console.log(`\n✅ Found ${variables.length} environment variables`);
console.log('\n💡 Instructions:');
console.log('1. Go to https://vercel.com/dashboard');
console.log('2. Select your project');
console.log('3. Settings → Environment Variables');
console.log('4. Add each variable above');
console.log('5. Select all environments (Production, Preview, Development)');
console.log('6. Click "Save"');
console.log('\n⚠️  Security Note:');
console.log('   - Never commit .env.local to Git');
console.log('   - Use Vercel Dashboard for production secrets');
console.log('   - Keep RELAYER_PRIVATE_KEY secure\n');

// Generate JSON format for easy copy
console.log('\n📄 JSON Format (for automation):\n');
const jsonOutput = variables.reduce((acc, { key, value }) => {
  acc[key] = value;
  return acc;
}, {});

console.log(JSON.stringify(jsonOutput, null, 2));

