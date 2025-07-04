# Agent Antonova 🤖

> **Autonomous Claude Code agent with continuous development lifecycle**

Agent Antonova is a fully autonomous development agent that continuously processes GitHub issues without human intervention. It demonstrates the power of Claude Code SDK for building self-managing development workflows.

## 🎯 Core Concept

The agent runs in an **infinite loop** that:

1. 🔍 **Queries GitHub** for the highest priority "ready" issue
2. 📋 **Parses issue** (goals, acceptance criteria, technical specs)
3. 📱 **Notifies boss** via SMS: "🚀 Starting issue #X"
4. 🌿 **Creates feature branch** automatically
5. ⚡ **Works autonomously** until acceptance criteria are met
6. ✅ **Validates completion** against acceptance criteria
7. 🔄 **Commits & creates PR** with full documentation
8. 📱 **Notifies boss** via SMS: "✅ PR ready: [link]"
9. 🔁 **Loops immediately** to next issue

**The agent never stops working** - it's designed for continuous autonomous development.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- GitHub CLI authenticated with `nuvemlabs` access
- Claude Code CLI configured

### Installation

```bash
# Clone the repository
git clone https://github.com/nuvemlabs/agent.antonova.git
cd agent.antonova

# Install dependencies
npm install

# Setup labels (first time only)
npm run setup
```

### Run the Agent

```bash
# Start the autonomous agent
npm start

# The agent will run continuously until stopped with Ctrl+C
```

## 🏗️ Architecture

### Core Components

- **🎯 IssueEngine** (`src/issue-engine.js`) - GitHub issue querying and prioritization
- **🤖 AutonomousAgent** (`src/autonomous-agent.js`) - Main execution loop and Claude Code integration
- **📱 SMS Integration** (planned) - Boss notifications and command receiving
- **📊 Dashboard** (planned) - Real-time monitoring and interaction

### Execution Flow

```
┌─────────────────┐
│  Start Agent    │
└─────────┬───────┘
          │
          ▼
┌─────────────────┐     ┌──────────────────┐
│ Query Ready     │────▶│ No Issues?       │
│ Issues          │     │ Wait & Retry     │
└─────────┬───────┘     └──────────────────┘
          │
          ▼
┌─────────────────┐
│ Parse Highest   │
│ Priority Issue  │
└─────────┬───────┘
          │
          ▼
┌─────────────────┐
│ Update Status   │
│ to "in-progress"│
└─────────┬───────┘
          │
          ▼
┌─────────────────┐
│ Execute with    │
│ Claude Code SDK │
│ (acceptAll)     │
└─────────┬───────┘
          │
          ▼
┌─────────────────┐
│ Validate        │
│ Completion      │
└─────────┬───────┘
          │
          ▼
┌─────────────────┐
│ Create PR &     │
│ Update Status   │
└─────────┬───────┘
          │
          ▼
┌─────────────────┐
│ Brief Pause     │
│ Then Loop       │
└─────────────────┘
```

## 📋 Issue Management

### Labels System

The agent uses a comprehensive labeling system:

#### Priority Labels
- `priority-critical` - Must be done immediately
- `priority-high` - Should be done soon  
- `priority-medium` - Normal workflow
- `priority-low` - Can wait

#### Status Labels
- `ready` - Ready to be worked on
- `in-progress` - Currently being worked on
- `blocked` - Blocked by dependencies
- `review` - In review or testing

#### Type Labels
- `feature` - New feature or request
- `enhancement` - Enhancement to existing functionality
- `bug` - Something isn't working
- `refactor` - Code refactoring
- `infrastructure` - Infrastructure and DevOps

#### Component Labels
- `core` - Core agent functionality
- `sms` - SMS integration component
- `dashboard` - HTML dashboard component
- `github-integration` - GitHub API integration
- `devcontainer` - Development container setup

### Issue Format

Issues should follow this structure for optimal agent processing:

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

## 🛠️ Development

### Running in Development

```bash
# Run with debugging
npm run dev

# Check agent status
curl http://localhost:3000/status

# View logs
tail -f logs/agent.log
```

### DevContainer Support

The project includes a comprehensive devcontainer setup:

```bash
# Using Make (recommended)
make start          # Start SSH-enabled container
make ssh            # SSH into container
make stop           # Stop container

# Manual Docker commands
docker-compose -f devcontainer/docker-compose.ssh.yml up -d
ssh -p 2222 node@localhost  # Password: claudedev
```

### Testing the Agent

1. **Create a test issue** with the `ready` label
2. **Start the agent** with `npm start`
3. **Watch the console** for real-time progress
4. **Check GitHub** for automatic PR creation

## 🔧 Configuration

### Environment Variables

Create a `.env` file:

```bash
# GitHub Configuration
GITHUB_OWNER=nuvemlabs
GITHUB_REPO=agent.antonova

# Agent Configuration
LOOP_INTERVAL=30000          # 30 seconds between cycles
MAX_TURNS=15                 # Claude Code max turns per issue
PERMISSION_MODE=acceptAll    # Full autonomy

# SMS Configuration (planned)
SMS_SERVICE=textbelt
SMS_BOSS_NUMBER=+1234567890

# Dashboard Configuration (planned)
DASHBOARD_PORT=3000
ENABLE_WEBSOCKETS=true
```

### Agent Behavior

The agent is designed to be **completely autonomous**:

- ✅ **No user prompts** - runs without human intervention
- ✅ **Full permissions** - uses `acceptAll` mode for maximum autonomy
- ✅ **Error recovery** - gracefully handles failures and continues
- ✅ **State persistence** - recovers from crashes and restarts
- ✅ **Continuous operation** - never stops working

## 📊 Monitoring

### Console Output

The agent provides real-time console output showing:

- 🔍 Issue searching and selection
- ⚡ Execution progress with dots
- ✅ Completion status and validation
- 📝 PR creation and status updates

### Planned Features

- 📊 **Web Dashboard** - Real-time monitoring interface
- 📱 **SMS Notifications** - Boss updates and alerts
- 📈 **Performance Metrics** - Execution statistics
- 🔍 **Log Viewer** - Searchable execution logs

## 🚨 Safety & Control

### Emergency Controls

```bash
# Graceful shutdown
Ctrl+C  # or kill -SIGINT <pid>

# Force stop
kill -SIGKILL <pid>

# Stop via SMS (planned)
SMS: "STOP AGENT"
```

### Safety Features

- **Graceful shutdown** - Completes current work before stopping
- **Error boundaries** - Isolated failures don't crash the agent
- **Rate limiting** - Respects GitHub API limits
- **State validation** - Prevents corrupted state execution

## 🗺️ Roadmap

### Phase 1: Core Infrastructure ✅
- [x] Autonomous execution loop
- [x] GitHub issue query engine
- [x] Issue parser and validator
- [x] Claude Code SDK integration
- [x] Git workflow automation

### Phase 2: Communication Layer 🚧
- [ ] SMS integration setup
- [ ] Boss notification system
- [ ] SMS command parser
- [ ] Alert escalation system

### Phase 3: Monitoring Dashboard 📋
- [ ] HTML dashboard server
- [ ] Real-time WebSocket connection
- [ ] Execution timeline view
- [ ] Boss comment system

### Phase 4: Advanced Features 🔮
- [ ] Performance optimization
- [ ] Advanced validation
- [ ] Multi-repo support
- [ ] Team collaboration features

## 🤝 Contributing

Agent Antonova is designed to **contribute to itself**! The agent will:

1. Pick up issues from the GitHub project
2. Implement features autonomously  
3. Create PRs for review
4. Continuously improve its own codebase

To contribute manually:

1. Create issues with proper labels
2. Follow the issue format guidelines
3. Let the agent work, or contribute traditional PRs
4. Review agent-generated PRs

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 🔗 Links

- **Repository**: https://github.com/nuvemlabs/agent.antonova
- **Issues**: https://github.com/nuvemlabs/agent.antonova/issues
- **Project Board**: https://github.com/orgs/nuvemlabs/projects/X
- **Claude Code**: https://claude.ai/code

---

**Agent Antonova - Because software should write itself** 🤖✨