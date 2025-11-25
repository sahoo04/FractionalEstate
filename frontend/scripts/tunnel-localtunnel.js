/**
 * Tunnel using localtunnel (free, no signup required)
 * Requires: npm install -g localtunnel or npx localtunnel
 */

const { spawn } = require('child_process');
const PORT = process.env.PORT || 3000;

console.log('🌐 Starting localtunnel...\n');
console.log(`📡 Local server: http://localhost:${PORT}`);
console.log('⏳ Creating tunnel (this may take a few seconds)...\n');

// Use npx to run localtunnel
const tunnel = spawn('npx', ['localtunnel', '--port', PORT.toString()], {
  stdio: 'inherit',
  shell: true,
});

// Handle errors
tunnel.on('error', (error) => {
  console.error('❌ Error starting localtunnel:', error.message);
  console.log('\n💡 Installing localtunnel...');
  console.log('   npm install -g localtunnel');
  process.exit(1);
});

// Handle termination
process.on('SIGINT', () => {
  console.log('\n\n🛑 Closing tunnel...');
  tunnel.kill();
  process.exit(0);
});

process.on('SIGTERM', () => {
  tunnel.kill();
  process.exit(0);
});

