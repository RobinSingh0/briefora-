/**
 * 🚀 Briefora Setup Utility: External Heartbeat
 * 
 * This script helps you generate the "Magic URL" needed for cron-job.org
 * to trigger your news bot every 3 minutes with 100% reliability.
 */

const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const REPO_OWNER = "RobinSingh0";
const REPO_NAME = "briefora-";
const EVENT_TYPE = "ping_heartbeat";

console.log("\n--- 🏁 Briefora Heartbeat Setup ---");
console.log("GitHub's internal scheduler is too slow. We are going to use an external 'Ping'.");
console.log("\nSTEP 1: Create a GitHub Token");
console.log("Go to: https://github.com/settings/tokens/new");
console.log("- Note: 'Briefora Heartbeat'");
console.log("- Expiration: 'No expiration' (recommended)");
console.log("- Select Scopes: [x] repo (Full control of private repositories)");
console.log("\nSTEP 2: Once you have the token (it starts with kghp_...), paste it below:");

rl.question("\n🔑 Paste your GitHub Token: ", (token) => {
  if (!token || token.length < 10) {
    console.log("❌ Invalid token. Please try again.");
    process.exit(1);
  }

  const authHeader = `Bearer ${token.trim()}`;
  const apiUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/dispatches`;

  console.log("\n--- ✅ CONFIGURATION GENERATED ---");
  console.log("Go to https://cron-job.org, create an account, and create a NEW CRONJOB:");
  
  console.log("\n📍 1. Title: Briefora Pulse");
  console.log(`📍 2. URL: ${apiUrl}`);
  console.log("📍 3. Execution Schedule: Every 3 minutes");
  console.log("📍 4. Request Method: POST");
  
  console.log("\n📍 5. HTTP Headers (IMPORTANT):");
  console.log(`   - Accept: application/vnd.github+json`);
  console.log(`   - Authorization: ${authHeader}`);
  console.log(`   - X-GitHub-Api-Version: 2022-11-28`);
  console.log(`   - User-Agent: Briefora-Heartbeat-Bot`);

  console.log("\n📍 6. Request Body (JSON Raw):");
  console.log(`   { "event_type": "${EVENT_TYPE}" }`);

  console.log("\n----------------------------------");
  console.log("🚀 Once you save this in cron-job.org, your news will refresh every 3 minutes!");
  rl.close();
});
