/**
 * Start dev server with tunnel
 * Combines dev server + tunnel in one command
 */

const { spawn } = require('child_process');
const PORT = process.env.PORT || 3000;
const TUNNEL_TYPE = process.env.TUNNEL_TYPE || 'localtunnel'; // localtunnel, ngrok, cloudflare

console.log('🚀 Starting dev server with tunnel...\n');
console.log(`📡 Tunnel type: ${TUNNEL_TYPE}`);
console.log(`🌐 Local port: ${PORT}\n`);

// Start Next.js dev server
const nextDev = spawn('npx', ['next', 'dev', '-p', PORT.toString()], {
  stdio: 'inherit',
  shell: true,
});

// Wait a bit for server to start, then start tunnel
setTimeout(() => {
  console.log('\n' + '='.repeat(60));
  console.log('🌐 Starting tunnel...');
  console.log('='.repeat(60) + '\n');

  let tunnelProcess;
  
  switch (TUNNEL_TYPE) {
    case 'ngrok':
      tunnelProcess = spawn('ngrok', ['http', PORT.toString()], {
        stdio: 'inherit',
        shell: true,
      });
      break;
      
    case 'cloudflare':
      tunnelProcess = spawn('cloudflared', ['tunnel', '--url', `http://localhost:${PORT}`], {
        stdio: 'inherit',
        shell: true,
      });
      break;
      
    case 'localtunnel':
    default:
      tunnelProcess = spawn('npx', ['localtunnel', '--port', PORT.toString()], {
        stdio: 'inherit',
        shell: true,
      });
      break;
  }

  tunnelProcess.on('error', (error) => {
    console.error(`\n❌ Tunnel error: ${error.message}`);
    console.log('\n💡 Try a different tunnel:');
    console.log('   TUNNEL_TYPE=localtunnel npm run dev:tunnel');
    console.log('   TUNNEL_TYPE=ngrok npm run dev:tunnel');
    console.log('   TUNNEL_TYPE=cloudflare npm run dev:tunnel');
  });

  // Handle termination
  process.on('SIGINT', () => {
    console.log('\n\n🛑 Shutting down...');
    nextDev.kill();
    if (tunnelProcess) tunnelProcess.kill();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    nextDev.kill();
    if (tunnelProcess) tunnelProcess.kill();
    process.exit(0);
  });
}, 5000); // Wait 5 seconds for server to start

