/**
 * Tunnel using ngrok
 * Requires: npm install -g ngrok or npx ngrok
 */

const { spawn } = require('child_process');
const PORT = process.env.PORT || 3000;

console.log('🌐 Starting ngrok tunnel...\n');
console.log(`📡 Local server: http://localhost:${PORT}`);
console.log('⏳ Creating tunnel...\n');

// Check if ngrok is installed globally, otherwise use npx
const ngrok = spawn('ngrok', ['http', PORT.toString()], {
  stdio: 'inherit',
  shell: true,
});

// Handle errors
ngrok.on('error', (error) => {
  console.error('❌ Error starting ngrok:', error.message);
  console.log('\n💡 Try installing ngrok:');
  console.log('   npm install -g ngrok');
  console.log('   OR');
  console.log('   npx ngrok http', PORT);
  process.exit(1);
});

// Handle termination
process.on('SIGINT', () => {
  console.log('\n\n🛑 Closing tunnel...');
  ngrok.kill();
  process.exit(0);
});

process.on('SIGTERM', () => {
  ngrok.kill();
  process.exit(0);
});

