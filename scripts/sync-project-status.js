#!/usr/bin/env node

/**
 * Sync GitHub issue labels with GitHub Projects v2 status fields
 * This ensures issues with "ready" label have "Ready" status in the project board
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load configuration
const config = JSON.parse(
  await fs.readFile(path.join(__dirname, '../.antonova/config.json'), 'utf8')
);

const { owner, repo, projectNumber } = config.github;

console.log('🔄 GitHub Projects Status Synchronization');
console.log('=========================================');
console.log(`Repository: ${owner}/${repo}`);
console.log(`Project: #${projectNumber}`);
console.log('');

// Track results for logging
const syncResults = {
  timestamp: new Date().toISOString(),
  repository: `${owner}/${repo}`,
  projectNumber,
  issuesProcessed: [],
  errors: []
};

try {
  // Step 1: Get all open issues with "ready" label
  console.log('📋 Fetching issues with "ready" label...');
  const { stdout: issuesJson } = await execAsync(
    `gh issue list -R ${owner}/${repo} --label ready --state open --json number,title,labels --limit 100`
  );
  
  const issues = JSON.parse(issuesJson);
  console.log(`Found ${issues.length} ready issues`);
  
  // Step 2: Get project metadata (fields and their options)
  console.log('\n🔍 Fetching project metadata...');
  const { stdout: projectJson } = await execAsync(
    `gh api graphql -f query='
      query($owner: String!, $number: Int!) {
        user(login: $owner) {
          projectV2(number: $number) {
            id
            fields(first: 20) {
              nodes {
                ... on ProjectV2SingleSelectField {
                  id
                  name
                  options {
                    id
                    name
                  }
                }
              }
            }
          }
        }
      }
    ' -f owner=${owner} -F number=${projectNumber}`
  );
  
  const projectData = JSON.parse(projectJson);
  const project = projectData.data.user.projectV2;
  const projectId = project.id;
  
  // Find the Status field
  const statusField = project.fields.nodes.find(field => field.name === 'Status');
  if (!statusField) {
    throw new Error('Status field not found in project');
  }
  
  // Find the "Ready" option (or "Todo" if Ready doesn't exist)
  let readyOption = statusField.options.find(opt => opt.name === 'Ready');
  if (!readyOption) {
    readyOption = statusField.options.find(opt => opt.name === 'Todo');
    if (readyOption) {
      console.log('⚠️  "Ready" status not found, using "Todo" status instead');
    }
  }
  
  if (!readyOption) {
    throw new Error('Neither "Ready" nor "Todo" status option found in project');
  }
  
  console.log(`✅ Found Status field: ${statusField.id}`);
  console.log(`✅ Using status option: ${readyOption.name} (${readyOption.id})`);
  
  // Step 3: Get all project items
  console.log('\n📊 Fetching project items...');
  const { stdout: itemsJson } = await execAsync(
    `gh api graphql -f query='
      query($owner: String!, $number: Int!) {
        user(login: $owner) {
          projectV2(number: $number) {
            items(first: 100) {
              nodes {
                id
                content {
                  ... on Issue {
                    number
                    title
                  }
                }
                fieldValues(first: 10) {
                  nodes {
                    ... on ProjectV2ItemFieldSingleSelectValue {
                      field {
                        ... on ProjectV2SingleSelectField {
                          name
                        }
                      }
                      name
                    }
                  }
                }
              }
            }
          }
        }
      }
    ' -f owner=${owner} -F number=${projectNumber}`
  );
  
  const itemsData = JSON.parse(itemsJson);
  const projectItems = itemsData.data.user.projectV2.items.nodes;
  
  // Step 4: Process each ready issue
  console.log('\n🔄 Synchronizing status for ready issues...');
  
  for (const issue of issues) {
    const issueResult = {
      number: issue.number,
      title: issue.title,
      status: 'pending'
    };
    
    try {
      // Find the project item for this issue
      const projectItem = projectItems.find(
        item => item.content && item.content.number === issue.number
      );
      
      if (!projectItem) {
        // Issue not in project, add it
        console.log(`\n➕ Adding issue #${issue.number} to project...`);
        const { stdout: addResult } = await execAsync(
          `gh project item-add ${projectNumber} --owner ${owner} --url https://github.com/${owner}/${repo}/issues/${issue.number}`
        );
        
        // Get the new item ID
        const { stdout: newItemJson } = await execAsync(
          `gh api graphql -f query='
            query($owner: String!, $number: Int!, $issueNumber: Int!) {
              user(login: $owner) {
                projectV2(number: $number) {
                  items(first: 100) {
                    nodes {
                      id
                      content {
                        ... on Issue {
                          number
                        }
                      }
                    }
                  }
                }
              }
            }
          ' -f owner=${owner} -F number=${projectNumber} -F issueNumber=${issue.number}`
        );
        
        const newItemData = JSON.parse(newItemJson);
        const newItem = newItemData.data.user.projectV2.items.nodes.find(
          item => item.content && item.content.number === issue.number
        );
        
        if (!newItem) {
          throw new Error(`Failed to find newly added issue #${issue.number} in project`);
        }
        
        issueResult.projectItemId = newItem.id;
        issueResult.action = 'added';
      } else {
        issueResult.projectItemId = projectItem.id;
        
        // Check current status
        const currentStatus = projectItem.fieldValues.nodes.find(
          fv => fv.field && fv.field.name === 'Status'
        );
        issueResult.currentStatus = currentStatus?.name || 'none';
        issueResult.action = 'updated';
      }
      
      // Update status to Ready
      console.log(`\n🔧 Setting issue #${issue.number} status to "${readyOption.name}"...`);
      const { stdout: updateResult } = await execAsync(
        `gh project item-edit --id ${issueResult.projectItemId} --field-id ${statusField.id} --project-id ${projectId} --single-select-option-id ${readyOption.id}`
      );
      
      issueResult.status = 'success';
      issueResult.newStatus = readyOption.name;
      console.log(`✅ Issue #${issue.number}: ${issue.title} - Status set to "${readyOption.name}"`);
      
    } catch (error) {
      issueResult.status = 'error';
      issueResult.error = error.message;
      syncResults.errors.push({
        issue: issue.number,
        error: error.message
      });
      console.error(`❌ Error processing issue #${issue.number}: ${error.message}`);
    }
    
    syncResults.issuesProcessed.push(issueResult);
  }
  
  // Step 5: Save results to log file
  const logDir = path.join(__dirname, '../logs');
  await fs.mkdir(logDir, { recursive: true });
  
  const logFile = path.join(logDir, 'fix-project-status.md');
  const logContent = `# Project Status Synchronization Log

## Execution Summary
- **Timestamp**: ${syncResults.timestamp}
- **Repository**: ${syncResults.repository}
- **Project**: #${syncResults.projectNumber}
- **Issues Processed**: ${syncResults.issuesProcessed.length}
- **Errors**: ${syncResults.errors.length}

## Status Field Configuration
- **Field ID**: ${statusField.id}
- **Target Status**: ${readyOption.name} (ID: ${readyOption.id})

## Issues Processed

| Issue | Title | Action | Previous Status | New Status | Result |
|-------|-------|--------|-----------------|------------|--------|
${syncResults.issuesProcessed.map(issue => 
  `| #${issue.number} | ${issue.title} | ${issue.action || 'n/a'} | ${issue.currentStatus || 'n/a'} | ${issue.newStatus || 'n/a'} | ${issue.status} |`
).join('\n')}

## Errors
${syncResults.errors.length === 0 ? 'No errors encountered.' : syncResults.errors.map(err => 
  `- Issue #${err.issue}: ${err.error}`
).join('\n')}

## Verification
To verify the synchronization worked:
1. Visit the project board: https://github.com/users/${owner}/projects/${projectNumber}
2. Check that all ready issues appear in the "${readyOption.name}" column
3. Run the autonomous agent to confirm it finds ready issues

## Next Steps
1. Run \`npm start\` to test the autonomous agent
2. Monitor the agent logs to ensure it finds and processes ready issues
3. Check for PR creation after successful execution
`;
  
  await fs.writeFile(logFile, logContent);
  console.log(`\n📝 Results saved to: ${logFile}`);
  
  // Summary
  console.log('\n✅ Synchronization Complete!');
  console.log(`   - Issues processed: ${syncResults.issuesProcessed.length}`);
  console.log(`   - Successful: ${syncResults.issuesProcessed.filter(i => i.status === 'success').length}`);
  console.log(`   - Errors: ${syncResults.errors.length}`);
  
} catch (error) {
  console.error('\n❌ Fatal error:', error.message);
  syncResults.errors.push({
    type: 'fatal',
    error: error.message
  });
  
  // Save error log
  const logDir = path.join(__dirname, '../logs');
  await fs.mkdir(logDir, { recursive: true });
  
  const errorLog = path.join(logDir, 'fix-project-status-error.log');
  await fs.writeFile(errorLog, JSON.stringify(syncResults, null, 2));
  console.error(`Error details saved to: ${errorLog}`);
  
  process.exit(1);
}