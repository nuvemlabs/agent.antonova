#!/usr/bin/env node

/**
 * Priority CLI Tool for Antonova Agent
 * Manage issue priorities across different adapters
 */

import { IssueEngine } from '../src/issue-engine.js';
import { loadRepoConfig } from '../src/config/repo-config.js';

const commands = {
  list: 'List all issues ordered by priority',
  set: 'Set priority score for an issue: priority set <issue> <score>',
  show: 'Show detailed priority breakdown for an issue: priority show <issue>',
  recalc: 'Recalculate all priority scores based on Impact/Urgency/Effort',
  summary: 'Show priority distribution summary'
};

async function listIssues(engine) {
  console.log('\n📋 Issues by Priority\n' + '='.repeat(50));
  
  const summary = await engine.getIssuesSummary();
  const allIssues = [
    ...summary.ready || [],
    ...summary.inProgress || [],
    ...summary.backlog || [],
    ...summary.blocked || [],
    ...summary.review || []
  ];
  
  if (allIssues.length === 0) {
    console.log('No issues found.');
    return;
  }
  
  // Sort by priority score
  allIssues.sort((a, b) => b.priority - a.priority);
  
  console.log(`${'#'.padEnd(6)} ${'Priority'.padEnd(10)} ${'Status'.padEnd(12)} ${'Title'.padEnd(50)}`);
  console.log('-'.repeat(80));
  
  for (const issue of allIssues) {
    const priorityStr = issue.priority?.toString().padEnd(10) || 'N/A'.padEnd(10);
    const statusStr = issue.status?.padEnd(12) || 'unknown'.padEnd(12);
    const titleStr = issue.title?.length > 50 ? issue.title.substring(0, 47) + '...' : issue.title?.padEnd(50) || '';
    
    console.log(`#${issue.number.toString().padEnd(5)} ${priorityStr} ${statusStr} ${titleStr}`);
  }
  
  console.log(`\nTotal: ${allIssues.length} issues`);
}

async function setIssuePriority(engine, issueNumber, priorityScore) {
  const score = parseInt(priorityScore);
  if (isNaN(score)) {
    console.error('❌ Priority score must be a number');
    return;
  }
  
  console.log(`🎯 Setting priority for issue #${issueNumber} to ${score}...`);
  
  const success = await engine.setIssuePriority(issueNumber, score);
  if (success) {
    console.log(`✅ Priority updated successfully`);
  } else {
    console.error(`❌ Failed to update priority`);
  }
}

async function showIssueDetails(engine, issueNumber) {
  const allIssues = await engine.getAllIssues();
  const issue = allIssues.find(i => i.number === parseInt(issueNumber));
  
  if (!issue) {
    console.error(`❌ Issue #${issueNumber} not found`);
    return;
  }
  
  console.log(`\n📊 Issue #${issue.number}: ${issue.title}\n` + '='.repeat(60));
  console.log(`Status: ${issue.status}`);
  console.log(`Priority Score: ${issue.priority}`);
  
  if (issue.priorityComponents) {
    console.log(`\nPriority Breakdown:`);
    console.log(`  Impact: ${issue.priorityComponents.impact}`);
    console.log(`  Urgency: ${issue.priorityComponents.urgency}`);
    console.log(`  Effort: ${issue.priorityComponents.effort}`);
    console.log(`  Base Score: ${issue.priorityComponents.baseScore}`);
    console.log(`  Manual Adjustment: ${issue.priorityComponents.manualAdjustment}`);
  }
  
  if (issue.labels?.length > 0) {
    console.log(`Labels: ${issue.labels.join(', ')}`);
  }
  
  console.log(`URL: ${issue.url}`);
}

async function showSummary(engine) {
  console.log('\n📈 Priority Distribution Summary\n' + '='.repeat(50));
  
  const summary = await engine.getIssuesSummary();
  const statusGroups = ['backlog', 'ready', 'inProgress', 'blocked', 'review', 'done'];
  
  for (const status of statusGroups) {
    const issues = summary[status] || [];
    if (issues.length === 0) continue;
    
    const avgPriority = issues.reduce((sum, issue) => sum + (issue.priority || 0), 0) / issues.length;
    const maxPriority = Math.max(...issues.map(issue => issue.priority || 0));
    const minPriority = Math.min(...issues.map(issue => issue.priority || 0));
    
    console.log(`\n${status.toUpperCase().padEnd(12)} (${issues.length} issues)`);
    console.log(`  Average Priority: ${avgPriority.toFixed(1)}`);
    console.log(`  Range: ${minPriority} - ${maxPriority}`);
  }
}

async function recalculatePriorities(engine) {
  console.log('🔄 Recalculating all priority scores...');
  
  const config = await loadRepoConfig('.');
  if (config.adapter !== 'github-projects') {
    console.error('❌ Priority recalculation only available for GitHub Projects adapter');
    return;
  }
  
  const allIssues = await engine.getAllIssues();
  let updated = 0;
  
  for (const issue of allIssues) {
    if (issue.priorityComponents?.baseScore !== undefined) {
      const newScore = issue.priorityComponents.baseScore + (issue.priorityComponents.manualAdjustment || 0);
      const success = await engine.setIssuePriority(issue.number, newScore);
      if (success) updated++;
    }
  }
  
  console.log(`✅ Updated ${updated} issues`);
}

function showHelp() {
  console.log('\n🎯 Antonova Priority CLI\n' + '='.repeat(30));
  console.log('Usage: node priority-cli.js <command> [args]\n');
  console.log('Commands:');
  
  for (const [cmd, desc] of Object.entries(commands)) {
    console.log(`  ${cmd.padEnd(10)} ${desc}`);
  }
  
  console.log('\nExamples:');
  console.log('  node priority-cli.js list');
  console.log('  node priority-cli.js set 42 850');
  console.log('  node priority-cli.js show 42');
  console.log('  node priority-cli.js summary');
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  if (!command || command === 'help' || command === '--help') {
    showHelp();
    return;
  }
  
  if (!commands[command]) {
    console.error(`❌ Unknown command: ${command}`);
    showHelp();
    process.exit(1);
  }
  
  try {
    // Initialize engine (it will auto-detect adapter)
    const engine = new IssueEngine();
    
    switch (command) {
      case 'list':
        await listIssues(engine);
        break;
        
      case 'set':
        const issueNumber = args[1];
        const priorityScore = args[2];
        
        if (!issueNumber || !priorityScore) {
          console.error('❌ Usage: priority set <issue> <score>');
          process.exit(1);
        }
        
        await setIssuePriority(engine, issueNumber, priorityScore);
        break;
        
      case 'show':
        const showIssueNumber = args[1];
        
        if (!showIssueNumber) {
          console.error('❌ Usage: priority show <issue>');
          process.exit(1);
        }
        
        await showIssueDetails(engine, showIssueNumber);
        break;
        
      case 'summary':
        await showSummary(engine);
        break;
        
      case 'recalc':
        await recalculatePriorities(engine);
        break;
        
      default:
        console.error(`❌ Command not implemented: ${command}`);
        process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main().catch(console.error);