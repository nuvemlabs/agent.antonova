# Agent Antonova Operations Guide

## Overview

This guide explains how to operate the autonomous agent, troubleshoot issues, and verify PR creation functionality.

## Quick Start

### Prerequisites
1. GitHub CLI authenticated with project permissions
2. Claude Code CLI installed and authenticated
3. Issues added to the GitHub Projects board

### Basic Operation
```bash
# Start the autonomous agent
npm start

# The agent will:
# 1. Find highest priority "ready" issues
# 2. Execute work using Claude Code
# 3. Create pull requests
# 4. Update issue status to "review"
```

## Issue Management

### Project Board Status Requirements

The agent requires issues to have **"Todo"** status in the project board to be considered "ready":

- ✅ **Todo** - Agent will process
- ❌ **In Progress** - Agent ignores (currently being worked on)
- ❌ **Done** - Agent ignores (completed)

### Synchronizing Issue Labels with Project Board

Many issues have "ready" labels but aren't in the project board or have wrong status:

```bash
# Sync all issues with "ready" label to project board
node scripts/sync-project-status.js

# This will:
# - Add issues to project board
# - Set status to "Todo" 
# - Log all changes
```

### Manual Status Management

To manually set an issue to ready status:

```bash
# Get project item ID for issue #44
ITEM_ID=$(gh project item-list 1 --owner nuvemlabs --format json | jq -r '.items[] | select(.content.number == 44) | .id')

# Set status to Todo
gh project item-edit --id $ITEM_ID --field-id PVTSSF_lAHODJE8Ss4A9RzZzgxBvC4 --project-id PVT_kwHODJE8Ss4A9RzZ --single-select-option-id f75ad846
```

## Troubleshooting

### Agent Can't Find Ready Issues

**Symptoms**: Agent shows "No ready issues found"

**Diagnosis**:
```bash
# Check project board status
node scripts/debug-project-status.js

# Look for:
# - "Ready issues found: 0"
# - Issues in "inProgress" or "unknown" status
```

**Solutions**:
1. **Sync project board**: `node scripts/sync-project-status.js`
2. **Manual fix**: Set specific issues to "Todo" status
3. **Check configuration**: Verify `.antonova/config.json` status mappings

### Claude Code Execution Fails

**Symptoms**: "Execution failed: Claude Code process exited with code 1"

**Diagnosis**:
```bash
# Test Claude execution strategies
node scripts/test-claude-execution.js
```

**Solutions**:
1. **Use fallback**: Agent automatically falls back to simulated execution
2. **Check permissions**: Verify `.claude/settings.local.json`
3. **Check authentication**: Run `claude auth status`

### No Pull Requests Created

**Symptoms**: Agent processes issues but no PRs appear

**Root Causes**:
1. **Execution failed**: Agent only creates PRs after successful execution
2. **Validation failed**: Agent's validation logic didn't detect completion
3. **Git issues**: Uncommitted changes or branch conflicts

**Solutions**:
1. **Check execution logs**: Look in `logs/claude-execution/`
2. **Run integration test**: `node test/integration-test.js`
3. **Manual validation**: Check if work was actually completed

## Testing

### Integration Test
```bash
# Test complete agent flow
node test/integration-test.js

# This tests:
# - Issue detection
# - Claude execution  
# - Validation logic
# - PR creation readiness
```

### Manual End-to-End Test
```bash
# 1. Set issue to ready
gh project item-edit --id [ITEM_ID] --field-id PVTSSF_lAHODJE8Ss4A9RzZzgxBvC4 --project-id PVT_kwHODJE8Ss4A9RzZ --single-select-option-id f75ad846

# 2. Run agent for one cycle
# (Stop after it processes the issue)
npm start

# 3. Check results
git log --oneline -5
gh pr list
```

## Configuration

### Agent Configuration (`.antonova/config.json`)
- **adapter**: "github-projects" (required)
- **github.owner**: Repository owner
- **github.repo**: Repository name  
- **github.projectNumber**: Project board number
- **prioritization.statuses**: Maps internal status to project board values

### Claude Settings (`.claude/settings.local.json`)
- **permissions.allow**: Set to `["*"]` for full agent autonomy
- Required for agent to make file changes

## Monitoring

### Real-time Monitoring
```bash
# Watch agent logs
npm start | tee logs/agent-session.log

# Monitor project board
watch -n 30 'node scripts/debug-project-status.js | grep "Ready issues found"'
```

### Log Files
- `logs/fix-project-status.md` - Project board sync results
- `logs/claude-execution/` - Claude execution attempts
- `logs/test-results.md` - Integration test results
- `logs/debug-project-status.json` - Project board analysis

## Common Workflows

### Daily Operation
1. Check for new issues with "ready" label
2. Run sync script to add them to project board
3. Start agent to process issues
4. Monitor for PR creation
5. Review created PRs

### Issue Stuck in "In Progress"
This happens when agent started processing but failed:

```bash
# Check what status it has
node scripts/debug-project-status.js | grep -A 5 "inProgress"

# Reset to Todo
# (Use manual status management commands above)
```

### Cleaning Up Failed Executions
```bash
# Remove failed execution logs
rm -rf logs/claude-execution/*

# Reset git state if needed
git stash  # Save uncommitted changes
git checkout main
git pull origin main
```

## Advanced Usage

### Priority Management
```bash
# Use priority CLI for manual priority adjustments
npm run priority
```

### Custom Execution
```bash
# Test specific issue execution
node -e "
import { AutonomousAgent } from './src/autonomous-agent.js';
const agent = new AutonomousAgent();
// Test specific issue...
"
```

### Fallback to GitHub Labels Adapter
If GitHub Projects continues to have issues, switch to labels-based approach:

1. Update `.antonova/config.json`: `"adapter": "github-labels"`
2. Issues with "ready" label will be processed directly
3. Status updates use GitHub issue labels instead of project board