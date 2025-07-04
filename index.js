import { AutonomousAgent } from './src/autonomous-agent.js';
import { createInterface } from 'readline';

function createReadlineInterface() {
  return createInterface({
    input: process.stdin,
    output: process.stdout
  });
}

async function getUserInput(prompt) {
  const rl = createReadlineInterface();
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function main() {
  console.log("🤖 Agent Antonova - Autonomous Development Agent");
  console.log("=".repeat(50));
  console.log("This agent continuously processes GitHub issues without human intervention.");
  console.log("It will work on the highest priority 'ready' issues in the repository.");
  console.log("");

  const agent = new AutonomousAgent();
  
  // Setup graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n\n🛑 Shutdown signal received...');
    agent.stop();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\n\n🛑 Termination signal received...');
    agent.stop();
    process.exit(0);
  });

  try {
    console.log("🚀 Starting autonomous agent...");
    console.log("Press Ctrl+C to stop the agent gracefully\n");
    
    // Start the never-ending autonomous cycle
    await agent.start();
    
  } catch (error) {
    console.error("❌ Fatal error:", error.message);
    process.exit(1);
  }
}

main().catch(console.error);
