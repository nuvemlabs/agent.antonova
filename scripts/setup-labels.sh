#!/bin/bash
# Setup comprehensive label system for Agent Antonova

echo "🏷️  Creating labels for Agent Antonova repository..."

# Priority labels
gh label create "priority-critical" --color "B60205" --description "Critical priority - must be done immediately" -R nuvemlabs/agent.antonova
gh label create "priority-high" --color "D73A4A" --description "High priority - should be done soon" -R nuvemlabs/agent.antonova
gh label create "priority-medium" --color "FBCA04" --description "Medium priority - normal workflow" -R nuvemlabs/agent.antonova
gh label create "priority-low" --color "0E8A16" --description "Low priority - can wait" -R nuvemlabs/agent.antonova

# Status labels
gh label create "ready" --color "0366D6" --description "Ready to be worked on" -R nuvemlabs/agent.antonova
gh label create "in-progress" --color "D4C5F9" --description "Currently being worked on" -R nuvemlabs/agent.antonova
gh label create "blocked" --color "E4E669" --description "Blocked by dependencies or issues" -R nuvemlabs/agent.antonova
gh label create "review" --color "5319E7" --description "In review or testing" -R nuvemlabs/agent.antonova

# Type labels
gh label create "feature" --color "A2EEEF" --description "New feature or request" -R nuvemlabs/agent.antonova
gh label create "enhancement" --color "84B6EB" --description "Enhancement to existing functionality" -R nuvemlabs/agent.antonova
gh label create "bug" --color "D73A4A" --description "Something isn't working" -R nuvemlabs/agent.antonova
gh label create "refactor" --color "FCE94F" --description "Code refactoring" -R nuvemlabs/agent.antonova
gh label create "infrastructure" --color "BFD4F2" --description "Infrastructure and DevOps" -R nuvemlabs/agent.antonova

# Component labels
gh label create "core" --color "1D76DB" --description "Core agent functionality" -R nuvemlabs/agent.antonova
gh label create "sms" --color "0075CA" --description "SMS integration component" -R nuvemlabs/agent.antonova
gh label create "dashboard" --color "006B75" --description "HTML dashboard component" -R nuvemlabs/agent.antonova
gh label create "github-integration" --color "24292E" --description "GitHub API integration" -R nuvemlabs/agent.antonova
gh label create "devcontainer" --color "2188FF" --description "Development container setup" -R nuvemlabs/agent.antonova

echo "✅ Labels created successfully!"