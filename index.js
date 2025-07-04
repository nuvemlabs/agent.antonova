import { query } from "@anthropic-ai/claude-code";
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

async function getPlanFromClaude(userPrompt) {
  console.log("\n🤖 Getting plan from Claude...\n");
  
  let planText = "";
  
  for await (const message of query({
    prompt: userPrompt,
    options: {
      permissionMode: 'plan',
      maxTurns: 1
    }
  })) {
    if (message.type === 'assistant' && message.message?.content) {
      const textContent = message.message.content
        .filter(item => item.type === 'text')
        .map(item => item.text)
        .join('\n');
      if (textContent) {
        planText += textContent;
      }
    }
  }
  
  return planText;
}

async function executeWithClaude(userPrompt) {
  console.log("\n⚡ Executing with Claude...\n");
  
  let executionOutput = "";
  
  for await (const message of query({
    prompt: userPrompt,
    options: {
      permissionMode: 'acceptEdits',
      maxTurns: 10
    }
  })) {
    if (message.type === 'assistant' && message.message?.content) {
      const textContent = message.message.content
        .filter(item => item.type === 'text')
        .map(item => item.text)
        .join('\n');
      if (textContent) {
        executionOutput += textContent + "\n";
      }
    }
    
    // Show real-time progress
    if (message.type === 'assistant') {
      process.stdout.write('.');
    }
  }
  
  console.log("\n");
  return executionOutput;
}

async function main() {
  console.log("🚀 Claude Code Plan & Execute Tool\n");
  
  try {
    // Step 1: Get user input
    const userPrompt = await getUserInput("📝 What would you like Claude to help you with? ");
    
    if (!userPrompt) {
      console.log("❌ No prompt provided. Exiting...");
      return;
    }
    
    // Step 2: Get plan from Claude
    const plan = await getPlanFromClaude(userPrompt);
    
    if (!plan) {
      console.log("❌ No plan received from Claude. Exiting...");
      return;
    }
    
    // Step 3: Show plan to user
    console.log("📋 Claude's Plan:");
    console.log("=" + "=".repeat(50));
    console.log(plan);
    console.log("=" + "=".repeat(50));
    
    // Step 4: Ask for approval
    const approval = await getUserInput("\n✅ Do you approve this plan? (y/n): ");
    
    if (approval.toLowerCase() !== 'y' && approval.toLowerCase() !== 'yes') {
      console.log("❌ Plan not approved. Exiting...");
      return;
    }
    
    // Step 5: Execute with Claude
    console.log("\n🎯 Plan approved! Executing...");
    const executionResult = await executeWithClaude(userPrompt);
    
    console.log("\n✅ Execution completed!");
    console.log("📄 Execution Summary:");
    console.log("-" + "-".repeat(50));
    console.log(executionResult || "Execution completed successfully.");
    
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

main().catch(console.error);
