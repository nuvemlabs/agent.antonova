# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is the "antonova" project - a Node.js application that demonstrates the integration of the Claude Code SDK for programmatic interactions with Claude Code functionality. The project includes a secure devcontainer environment with network restrictions and implements a plan-then-execute workflow pattern.

## Architecture

- **Node.js Application**: Uses ES modules with the Claude Code SDK
- **Devcontainer Setup**: Secure containerized development environment with network firewall
- **SSH-Enabled Container**: Long-running container option with SSH server for remote access
- **Plan-Execute Pattern**: Two-phase workflow where Claude first plans, then executes with user approval
- **Interactive CLI**: Command-line interface for user interaction and approval workflows

## Common Commands

```bash
# Install dependencies
npm install

# Run the plan-execute tool
npm start
# or
node index.js

# View installed packages
npm list

# Quick setup (first time)
./setup.sh

# Development container commands (using Makefile - recommended)
make start                   # Start SSH-enabled container
make ssh                     # SSH into container (password: claudedev)
make stop                    # Stop container
make ssh-copy-id             # Setup SSH key authentication
make ssh-key                 # SSH with key authentication

# Manual Docker commands (alternative)
# Build and run the devcontainer (interactive)
docker build -t antonova-dev devcontainer/
docker run -it --cap-add=NET_ADMIN --cap-add=NET_RAW antonova-dev

# SSH-enabled container (runs indefinitely)
docker-compose -f devcontainer/docker-compose.ssh.yml up -d
ssh -p 2222 node@localhost  # Password: claudedev

# Inside devcontainer - firewall management
sudo /usr/local/bin/init-firewall.sh
```

## Dependencies

- `@anthropic-ai/claude-code` - Official Claude Code SDK for programmatic access

## Code Structure

The application demonstrates Claude Code SDK usage patterns:
- **ES Module Setup**: Uses `"type": "module"` in package.json for ES module support
- **Query Function**: Uses the `query()` function with configurable options (maxTurns, permissionMode)
- **Message Streaming**: Iterates through streaming responses to collect assistant messages
- **Response Extraction**: Extracts text content from assistant messages for display
- **Two-Phase Workflow**: Separate functions for planning and execution phases

### Core Functions

- `getPlanFromClaude()`: Requests a plan using `permissionMode: 'plan'` and `maxTurns: 1`
- `executeWithClaude()`: Executes the approved plan using `permissionMode: 'acceptEdits'` and `maxTurns: 10`
- `getUserInput()`: Handles command-line user interaction with readline interface
- `main()`: Orchestrates the complete plan-approve-execute workflow

## Devcontainer Security

The devcontainer implements network restrictions through iptables firewall:
- **Allowed Domains**: GitHub, npm registry, Anthropic API, Sentry, Statsig
- **IP Resolution**: Dynamic resolution and aggregation of allowed IP ranges
- **Verification**: Automated testing to ensure firewall rules work correctly
- **Host Network**: Local development network access maintained

## Key Features Demonstrated

1. **Plan-Then-Execute Pattern**: Claude first generates a plan, user approves, then execution begins
2. **Permission Modes**: Different Claude Code SDK permission modes for planning vs execution
3. **Interactive CLI**: Real-time user interaction and approval workflows
4. **Network Security**: Restricted container environment with firewall controls
5. **Message Processing**: Extracting and displaying assistant responses with progress indicators

## Development Notes

- The project uses ES modules (import/export syntax)
- Requires `"type": "module"` in package.json for proper import support
- Assistant responses are extracted from message.message.content array
- Planning phase uses `maxTurns: 1` to get a single comprehensive plan
- Execution phase uses `maxTurns: 10` to allow for complex multi-step operations
- Devcontainer requires `NET_ADMIN` and `NET_RAW` capabilities for firewall management