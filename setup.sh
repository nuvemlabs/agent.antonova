#!/bin/bash
set -e

echo "🚀 Antonova Development Environment Setup"
echo "========================================"

# Check if make is available
if ! command -v make &> /dev/null; then
    echo "❌ Make is not installed. Please install make first."
    exit 1
fi

# Check if docker is available
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

echo "✅ Prerequisites check passed"
echo ""

# Show available make targets
echo "📋 Available Make targets:"
make help

echo ""
echo "🎯 Quick Start Options:"
echo ""
echo "Option 1 - Basic setup:"
echo "  make start     # Start container"
echo "  make ssh       # SSH into container (password: claudedev)"
echo ""
echo "Option 2 - Setup with SSH keys (recommended):"
echo "  make setup     # Complete setup with SSH keys"
echo "  make ssh-key   # SSH with key authentication"
echo ""
echo "Option 3 - Development mode:"
echo "  make dev       # Start and show connection info"
echo ""

read -p "Would you like to start the container now? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🔧 Starting Antonova development container..."
    make start
    echo ""
    echo "🎉 Container started successfully!"
    echo "💡 Use 'make ssh' to connect (password: claudedev)"
    echo "💡 Use 'make help' to see all available commands"
else
    echo "✋ Setup complete. Use 'make help' to see available commands."
fi

echo ""
echo "📚 For more information, check:"
echo "  - README-SSH.md for SSH container details"
echo "  - CLAUDE.md for project documentation"
echo "  - Makefile for all available commands"