/**
 * Tunnel using Cloudflare Tunnel (cloudflared)
 * Free, reliable, no signup required
 * Requires: npm install -g cloudflared or download from cloudflare.com
 */

const { spawn } = require("child_process");
const PORT = process.env.PORT || 3000;

console.log("🌐 Starting Cloudflare Tunnel...\n");
console.log(`📡 Local server: http://localhost:${PORT}`);
console.log("⏳ Creating tunnel...\n");

// Try cloudflared command
const tunnel = spawn(
  "cloudflared",
  ["tunnel", "--url", `http://localhost:${PORT}`],
  {
    stdio: "inherit",
    shell: true,
  }
);

// Handle errors
tunnel.on("error", (error) => {
  console.error("❌ Error starting Cloudflare Tunnel:", error.message);
  console.log("\n💡 Install cloudflared:");
  console.log(
    "   Windows: Download from https://github.com/cloudflare/cloudflared/releases"
  );
  console.log("   Mac: brew install cloudflared");
  console.log(
    "   Linux: Download from https://github.com/cloudflare/cloudflared/releases"
  );
  console.log(
    "\n   OR use: npm run tunnel:localtunnel (no installation needed)"
  );
  process.exit(1);
});

// Handle termination
process.on("SIGINT", () => {
  console.log("\n\n🛑 Closing tunnel...");
  tunnel.kill();
  process.exit(0);
});

process.on("SIGTERM", () => {
  tunnel.kill();
  process.exit(0);
});
