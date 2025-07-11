#!/usr/bin/env node

/**
 * Debug script to check project board status
 */

import { IssueEngine } from '../src/issue-engine.js';
import { GitHubProjectsAdapter } from '../src/adapters/github-projects-adapter.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load configuration
const config = JSON.parse(
  await fs.readFile(path.join(__dirname, '../.antonova/config.json'), 'utf8')
);

console.log('🔍 Debugging Project Board Status');
console.log('=================================');

try {
  // Initialize adapter directly
  const adapter = new GitHubProjectsAdapter(config);
  await adapter.initialize();
  
  console.log('\n📊 Adapter initialized successfully');
  console.log('Project ID:', adapter.projectId);
  console.log('Fields:', Object.keys(adapter.fields || {}));
  
  // Get all issues
  console.log('\n🔍 Fetching all issues...');
  const allIssues = await adapter.getAllIssues();
  console.log(`Total issues found: ${allIssues.length}`);
  
  // Group by status
  const statusGroups = {};
  for (const issue of allIssues) {
    const status = issue.status || 'unknown';
    if (!statusGroups[status]) {
      statusGroups[status] = [];
    }
    statusGroups[status].push(issue);
  }
  
  console.log('\n📊 Issues by status:');
  for (const [status, issues] of Object.entries(statusGroups)) {
    console.log(`\n${status}: ${issues.length} issues`);
    for (const issue of issues.slice(0, 3)) {
      console.log(`  - #${issue.number}: ${issue.title}`);
      console.log(`    Fields:`, issue.fields);
    }
    if (issues.length > 3) {
      console.log(`  ... and ${issues.length - 3} more`);
    }
  }
  
  // Test ready issues specifically
  console.log('\n🔍 Testing ready status filter...');
  const readyIssues = await adapter.getAllIssues({ status: 'ready' });
  console.log(`Ready issues found: ${readyIssues.length}`);
  
  if (readyIssues.length > 0) {
    console.log('\n✅ Ready issues:');
    for (const issue of readyIssues.slice(0, 5)) {
      console.log(`  - #${issue.number}: ${issue.title}`);
      console.log(`    Priority: ${issue.priority}`);
      console.log(`    Labels: ${issue.labels.join(', ')}`);
    }
  }
  
  // Test getNextIssue
  console.log('\n🎯 Testing getNextIssue...');
  const nextIssue = await adapter.getNextIssue();
  if (nextIssue) {
    console.log(`Next issue: #${nextIssue.number} - ${nextIssue.title}`);
    console.log(`Priority: ${nextIssue.priority}`);
  } else {
    console.log('❌ No next issue found');
  }
  
  // Save debug report
  const debugReport = {
    timestamp: new Date().toISOString(),
    adapter: 'github-projects',
    config: config,
    projectId: adapter.projectId,
    fields: adapter.fields,
    statusGroups: Object.fromEntries(
      Object.entries(statusGroups).map(([status, issues]) => [
        status,
        {
          count: issues.length,
          samples: issues.slice(0, 3).map(i => ({
            number: i.number,
            title: i.title,
            fields: i.fields
          }))
        }
      ])
    ),
    readyIssuesCount: readyIssues.length,
    nextIssue: nextIssue ? {
      number: nextIssue.number,
      title: nextIssue.title,
      priority: nextIssue.priority
    } : null
  };
  
  const logDir = path.join(__dirname, '../logs');
  await fs.mkdir(logDir, { recursive: true });
  
  const debugFile = path.join(logDir, 'debug-project-status.json');
  await fs.writeFile(debugFile, JSON.stringify(debugReport, null, 2));
  console.log(`\n📝 Debug report saved to: ${debugFile}`);
  
} catch (error) {
  console.error('\n❌ Error:', error.message);
  console.error(error.stack);
}