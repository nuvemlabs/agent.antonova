# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is "Agent Antonova" - a fully autonomous development agent that continuously processes GitHub issues without human intervention. The agent runs in an infinite loop, automatically selecting, implementing, and submitting pull requests for issues based on priority.

## Architecture

### Core Components

- **AutonomousAgent** (`src/autonomous-agent.js`): Main execution loop that runs indefinitely. Manages the complete lifecycle from issue selection to PR creation.
- **IssueEngine** (`src/issue-engine.js`): Adapter-based issue management system that auto-detects the adapter from `.antonova/config.json`
- **Adapters** (`src/adapters/`): Plugin architecture supporting multiple issue tracking systems:
  - `GitHubProjectsAdapter`: GraphQL-based GitHub Projects v2 integration
  - `GitHubLabelsAdapter`: Traditional label-based prioritization
  - Base `IssueAdapter` class for extensibility

### Priority System

The agent uses a sophisticated scoring algorithm: **(Impact × Urgency × 10) ÷ Effort + Manual Adjustment**

- **Impact**: Critical (40), High (30), Medium (20), Low (10)
- **Urgency**: Immediate (4), Soon (3), Normal (2), Eventually (1)  
- **Effort**: XS (1), S (2), M (3), L (5), XL (8)
- **Manual Adjustment**: -100 to +100 via priority CLI tool

## Common Commands

```bash
# Start the autonomous agent (runs indefinitely)
npm start

# Development mode with debugging
npm run dev

# Setup GitHub labels (first time only)
npm run setup

# Setup GitHub Projects board
npm run setup-project

# Manage issue priorities manually
npm run priority

# Container management (Makefile)
make start          # Start SSH-enabled container
make ssh            # SSH into container (password: claudedev)
make stop           # Stop container
make status         # Check container status

# Inside container - reinitialize network restrictions
sudo /usr/local/bin/init-firewall.sh

# GitHub authentication and permissions
gh auth login                                    # Initial authentication
gh auth refresh -s repo,read:org               # For github-labels adapter
gh auth refresh -s project,read:project        # For github-projects adapter
```

## Development Workflow

The agent follows this continuous cycle:

1. Query GitHub for highest priority "ready" issue
2. Parse issue structure (Goal, Acceptance Criteria, Technical Specs)
3. Update issue status to "in-progress"
4. Execute work autonomously using Claude Code SDK (`permissionMode: 'acceptAll'`)
5. Validate completion against acceptance criteria
6. Create pull request with comprehensive documentation
7. Update issue status to "review"
8. Loop immediately to next issue

## Issue Format

Issues must follow this structure for optimal agent processing:

```markdown
## Goal
Clear description of what needs to be accomplished.

## Acceptance Criteria
- [ ] Specific, testable requirements
- [ ] That the agent can validate
- [ ] When implementation is complete

## Technical Specs
Detailed technical requirements and implementation guidance.
```

## Configuration

### Repository Configuration (`.antonova/config.json`)

- **adapter**: "github-projects" or "github-labels"
- **github**: Repository owner, name, and project number
- **prioritization**: Status mappings, priority formulas, and scoring parameters

### Environment Variables

Key configurations in `.env`:
- `GITHUB_OWNER` / `GITHUB_REPO`: Repository details
- `LOOP_INTERVAL`: Time between issue checks (default: 30000ms)
- `MAX_TURNS`: Claude Code SDK max turns per issue (default: 15)
- `PERMISSION_MODE`: Always set to "acceptAll" for full autonomy

## Key Implementation Details

1. **Error Recovery**: The agent includes comprehensive error handling to continue operation through failures
2. **State Persistence**: Execution history is tracked in memory for debugging
3. **Graceful Shutdown**: Handles SIGINT/SIGTERM to complete current work before stopping
4. **Network Security**: Devcontainer includes firewall restrictions allowing only essential domains
5. **Adapter Detection**: Automatically loads the correct adapter based on config.json

## Testing & Validation

- No automated tests currently - manual testing is the primary method
- Test by creating issues with proper format and "ready" label
- Monitor real-time console output for execution progress
- Check GitHub for automatic PR creation and status updates

## GitHub Token Requirements

The agent requires specific GitHub token permissions depending on the adapter:

### GitHub Labels Adapter (default)
- `repo` - Full repository access for reading/writing issues and labels
- `read:org` - Read organization membership (if repository is in an organization)

### GitHub Projects Adapter
- `project` - Full project access for GitHub Projects v2
- `read:project` - Read project data and fields
- `repo` - Repository access for issues

### Fine-grained Token Limitation (Current Issue)
- **Problem**: Fine-grained Personal Access Tokens cannot access GitHub Projects v2 GraphQL API
- **Status**: Known GitHub limitation as of 2025 - no project permissions available for fine-grained tokens
- **Current Solution**: Agent detects fine-grained tokens and provides manual update instructions
- **Behavior**: Issues are processed normally, but Status field updates require manual project board interaction

### Common Issues
- **"Resource not accessible by personal access token"**: Token lacks required permissions
- **Solution**: Run `gh auth refresh -s repo,read:org` (for labels) or `gh auth refresh -s project,read:project` (for projects)
- **Alternative**: Create a new token at https://github.com/settings/tokens with required scopes
- **Fine-grained Token Projects**: Agent provides manual instructions for updating project board Status field

## Security Considerations

- Runs with full `acceptAll` permissions - ensure repository access is properly restricted
- Network-restricted devcontainer environment for additional security
- No secrets or API keys should be committed to the repository
- Agent commits include signature: "Generated with Claude Code"