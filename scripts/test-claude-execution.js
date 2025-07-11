#!/usr/bin/env node

/**
 * Test Claude Code execution methods
 */

import { ClaudeExecutor } from '../src/claude-executor.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('🧪 Testing Claude Code Execution Methods');
console.log('=======================================\n');

// Simple test prompt
const testPrompt = `
Please create a simple test file called test-execution.txt with the following content:

"Hello from Claude Code!
This file was created during execution testing.
Timestamp: ${new Date().toISOString()}"

Then tell me you've completed the task.
`;

// Initialize executor
const executor = new ClaudeExecutor({
  maxTurns: 5,
  timeout: 60000, // 1 minute for testing
  logDir: path.join(__dirname, '../logs/claude-execution-test')
});

console.log('📝 Test prompt:');
console.log(testPrompt);
console.log('\n' + '='.repeat(50) + '\n');

try {
  // Run the test
  console.log('🚀 Starting execution test...');
  const startTime = Date.now();
  
  const result = await executor.execute(testPrompt, {
    test: true,
    timestamp: new Date().toISOString()
  });
  
  const duration = Date.now() - startTime;
  
  console.log('\n✅ Execution completed!');
  console.log(`⏱️  Duration: ${(duration / 1000).toFixed(2)}s`);
  console.log(`📋 Strategy used: ${result.strategy}`);
  console.log(`📝 Output length: ${result.output.length} characters`);
  
  // Display output preview
  console.log('\n📄 Output preview:');
  console.log('-'.repeat(50));
  const preview = result.output.substring(0, 500);
  console.log(preview);
  if (result.output.length > 500) {
    console.log('... (truncated)');
  }
  console.log('-'.repeat(50));
  
  // Check if test file was created (for non-simulated strategies)
  if (!result.simulated) {
    try {
      const testFile = path.join(process.cwd(), 'test-execution.txt');
      const fileExists = await fs.access(testFile).then(() => true).catch(() => false);
      
      if (fileExists) {
        console.log('\n✅ Test file created successfully!');
        const content = await fs.readFile(testFile, 'utf8');
        console.log('📄 File content:');
        console.log(content);
        
        // Clean up
        await fs.unlink(testFile);
        console.log('🧹 Test file cleaned up');
      } else {
        console.log('\n⚠️  Test file was not created');
      }
    } catch (error) {
      console.log('\n⚠️  Could not check for test file:', error.message);
    }
  }
  
  // Save test report
  const reportDir = path.join(__dirname, '../logs');
  await fs.mkdir(reportDir, { recursive: true });
  
  const report = {
    timestamp: new Date().toISOString(),
    success: true,
    strategy: result.strategy,
    duration: duration,
    outputLength: result.output.length,
    simulated: result.simulated || false,
    executionHistory: executor.getHistory()
  };
  
  const reportFile = path.join(reportDir, 'claude-execution-test.json');
  await fs.writeFile(reportFile, JSON.stringify(report, null, 2));
  console.log(`\n📊 Test report saved to: ${reportFile}`);
  
} catch (error) {
  console.error('\n❌ Execution test failed:', error.message);
  console.error('Stack:', error.stack);
  
  // Save error report
  const errorReport = {
    timestamp: new Date().toISOString(),
    success: false,
    error: error.message,
    stack: error.stack,
    executionHistory: executor.getHistory()
  };
  
  const reportDir = path.join(__dirname, '../logs');
  await fs.mkdir(reportDir, { recursive: true });
  
  const errorFile = path.join(reportDir, 'claude-execution-test-error.json');
  await fs.writeFile(errorFile, JSON.stringify(errorReport, null, 2));
  console.error(`\n📊 Error report saved to: ${errorFile}`);
  
  process.exit(1);
}