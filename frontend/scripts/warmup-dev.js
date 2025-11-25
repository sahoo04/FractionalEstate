/**
 * Development server with page warmup
 * Starts Next.js dev server and pre-compiles all pages
 */

const { spawn } = require('child_process');
const { warmupAllPages } = require('./warmup-pages');

const PORT = process.env.PORT || 3000;

console.log('🚀 Starting Next.js dev server with page warmup...\n');

// Start Next.js dev server
const nextDev = spawn('npx', ['next', 'dev', '-p', PORT.toString()], {
  stdio: 'inherit',
  shell: true,
});

// Wait a bit for server to start, then warmup pages
setTimeout(async () => {
  try {
    console.log('\n⏳ Waiting for server to be ready...\n');
    await warmupAllPages();
    console.log('✅ All pages pre-compiled! Server is ready.\n');
  } catch (error) {
    console.error('⚠️  Warmup failed, but server is running:', error.message);
  }
}, 10000); // Wait 10 seconds for server to start

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n\n🛑 Shutting down...');
  nextDev.kill();
  process.exit(0);
});

process.on('SIGTERM', () => {
  nextDev.kill();
  process.exit(0);
});

