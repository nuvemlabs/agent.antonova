#!/usr/bin/env node

/**
 * Integration test for complete agent flow
 * Tests: issue detection → execution → PR creation
 */

import { AutonomousAgent } from '../src/autonomous-agent.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('🧪 Agent Antonova Integration Test');
console.log('==================================\n');

// Test configuration
const TEST_TIMEOUT = 300000; // 5 minutes
const testStartTime = Date.now();

// Initialize test report
const testReport = {
  timestamp: new Date().toISOString(),
  tests: [],
  summary: {
    total: 0,
    passed: 0,
    failed: 0
  }
};

/**
 * Run a test step
 */
async function runTest(name, testFn) {
  console.log(`\n📋 ${name}`);
  const startTime = Date.now();
  
  try {
    await testFn();
    const duration = Date.now() - startTime;
    console.log(`✅ PASSED (${(duration / 1000).toFixed(2)}s)`);
    
    testReport.tests.push({
      name,
      status: 'passed',
      duration
    });
    testReport.summary.total++;
    testReport.summary.passed++;
    
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ FAILED (${(duration / 1000).toFixed(2)}s)`);
    console.error(`   Error: ${error.message}`);
    
    testReport.tests.push({
      name,
      status: 'failed',
      duration,
      error: error.message
    });
    testReport.summary.total++;
    testReport.summary.failed++;
  }
}

// Test 1: Check project board has ready issues
await runTest('Project board has ready issues', async () => {
  const { stdout } = await execAsync('node scripts/debug-project-status.js | grep "Ready issues found:"');
  const match = stdout.match(/Ready issues found: (\d+)/);
  const readyCount = match ? parseInt(match[1]) : 0;
  
  if (readyCount === 0) {
    throw new Error('No ready issues found in project board');
  }
  
  console.log(`   Found ${readyCount} ready issues`);
});

// Test 2: Agent can find next issue
await runTest('Agent can find next issue', async () => {
  const agent = new AutonomousAgent();
  const issue = await agent.issueEngine.getNextIssue();
  
  if (!issue) {
    throw new Error('Agent could not find next issue');
  }
  
  console.log(`   Next issue: #${issue.number} - ${issue.title}`);
  console.log(`   Priority: ${issue.priority}`);
});

// Test 3: Agent can execute issue (with fallback)
await runTest('Agent can execute issue', async () => {
  const agent = new AutonomousAgent();
  
  // Get the next issue
  const issue = await agent.issueEngine.getNextIssue();
  if (!issue) {
    throw new Error('No issue to execute');
  }
  
  // Parse the issue
  const parsedIssue = agent.issueEngine.parseIssue(issue);
  
  // Execute the issue
  console.log(`   Executing issue #${parsedIssue.number}...`);
  const result = await agent.executeIssue(parsedIssue);
  
  if (!result.success) {
    throw new Error('Execution failed');
  }
  
  console.log(`   Execution completed`);
  console.log(`   Output length: ${result.output.length} characters`);
});

// Test 4: Full agent cycle (single iteration)
await runTest('Full agent cycle', async () => {
  const agent = new AutonomousAgent();
  
  // Override loop interval for testing
  agent.loopInterval = 1000;
  
  // Start agent
  console.log('   Starting agent for one cycle...');
  agent.isRunning = true;
  
  // Run one cycle
  await agent.processNextIssue();
  
  // Check execution history
  if (agent.executionHistory.length === 0) {
    throw new Error('No execution recorded');
  }
  
  const lastExecution = agent.executionHistory[agent.executionHistory.length - 1];
  console.log(`   Processed issue #${lastExecution.issueNumber}`);
  console.log(`   Success: ${lastExecution.success}`);
});

// Test 5: Check if PR would be created
await runTest('PR creation readiness', async () => {
  // Check if we have a feature branch
  try {
    const { stdout: branches } = await execAsync('git branch -a | grep feature/issue-');
    if (branches.trim()) {
      console.log('   Feature branches found:');
      console.log(branches.trim().split('\n').map(b => `     ${b.trim()}`).join('\n'));
    }
  } catch (error) {
    console.log('   No feature branches found (expected for simulated execution)');
  }
  
  // Check git status
  const { stdout: status } = await execAsync('git status --porcelain');
  if (status.trim()) {
    console.log('   Uncommitted changes detected (may affect PR creation)');
  }
});

// Generate test report
const totalDuration = Date.now() - testStartTime;
testReport.totalDuration = totalDuration;

console.log('\n' + '='.repeat(50));
console.log('📊 Test Summary');
console.log('='.repeat(50));
console.log(`Total Tests: ${testReport.summary.total}`);
console.log(`✅ Passed: ${testReport.summary.passed}`);
console.log(`❌ Failed: ${testReport.summary.failed}`);
console.log(`⏱️  Total Duration: ${(totalDuration / 1000).toFixed(2)}s`);

// Save test report
const reportDir = path.join(__dirname, '../logs');
await fs.mkdir(reportDir, { recursive: true });

const reportFile = path.join(reportDir, 'test-results.md');
const reportContent = `# Integration Test Results

**Date**: ${testReport.timestamp}
**Duration**: ${(totalDuration / 1000).toFixed(2)}s

## Summary
- Total Tests: ${testReport.summary.total}
- Passed: ${testReport.summary.passed}
- Failed: ${testReport.summary.failed}

## Test Results

| Test | Status | Duration |
|------|--------|----------|
${testReport.tests.map(test => 
  `| ${test.name} | ${test.status === 'passed' ? '✅' : '❌'} ${test.status} | ${(test.duration / 1000).toFixed(2)}s |`
).join('\n')}

## Error Details
${testReport.tests
  .filter(test => test.status === 'failed')
  .map(test => `### ${test.name}\n\`\`\`\n${test.error}\n\`\`\``)
  .join('\n\n') || 'No errors'}

## Notes
- Claude Code execution may fall back to simulated mode if Claude is unavailable
- PR creation requires actual code changes to be committed
- The agent uses the highest priority ready issue from the project board
`;

await fs.writeFile(reportFile, reportContent);
console.log(`\n📝 Test report saved to: ${reportFile}`);

// Exit with appropriate code
process.exit(testReport.summary.failed > 0 ? 1 : 0);