/**
 * Add environment variables to Vercel from .env.local
 * Usage: node scripts/add-vercel-env.js
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const envPath = path.join(__dirname, "../.env.local");

if (!fs.existsSync(envPath)) {
  console.error("❌ .env.local file not found!");
  process.exit(1);
}

// Read .env.local
const envContent = fs.readFileSync(envPath, "utf8");
const lines = envContent.split("\n");

const envVars = {};

lines.forEach((line) => {
  line = line.trim();
  if (line && !line.startsWith("#") && line.includes("=")) {
    const [key, ...valueParts] = line.split("=");
    const value = valueParts.join("=").trim();
    if (key && value) {
      envVars[key.trim()] = value;
    }
  }
});

console.log("📋 Found", Object.keys(envVars).length, "environment variables\n");

// Add each variable to Vercel
const environments = ["production", "preview", "development"];

Object.entries(envVars).forEach(([key, value]) => {
  console.log(`Adding ${key}...`);

  environments.forEach((env) => {
    try {
      // Use vercel env add command
      const command = `echo "${value}" | vercel env add ${key} ${env}`;
      execSync(command, {
        stdio: "pipe",
        cwd: path.join(__dirname, ".."),
      });
      console.log(`  ✓ Added to ${env}`);
    } catch (error) {
      console.log(`  ⚠️  ${env}: ${error.message.split("\n")[0]}`);
    }
  });

  console.log("");
});

console.log("✅ Done! All environment variables added.");
console.log("💡 Run: vercel --prod to deploy");
