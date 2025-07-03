# SSH-Enabled Development Container

This directory contains configurations for running the Antonova development environment as a long-running container with SSH access.

## Quick Start

### Using Docker Compose (Recommended)

```bash
# Start the container
docker-compose -f docker-compose.ssh.yml up -d

# SSH into the container
ssh -p 2222 node@localhost
# Password: claudedev

# Stop the container
docker-compose -f docker-compose.ssh.yml down
```

### Using Docker directly

```bash
# Build the image
docker build -f Dockerfile.ssh -t antonova-ssh .

# Run the container
docker run -d \
  --name antonova-ssh-dev \
  --cap-add=NET_ADMIN \
  --cap-add=NET_RAW \
  -p 2222:22 \
  -v "$(pwd)/../:/workspace" \
  antonova-ssh

# SSH into the container
ssh -p 2222 node@localhost
# Password: claudedev
```

## Default Credentials

- **Username**: `node`
- **Password**: `claudedev`
- **Root password**: `claudedev`

⚠️ **Security Warning**: Change these default passwords in production environments!

## SSH Key Setup (Recommended)

For better security, set up SSH key authentication:

```bash
# Generate SSH key if you don't have one
ssh-keygen -t rsa -b 4096 -f ~/.ssh/antonova_key

# Copy your public key to the container
ssh-copy-id -i ~/.ssh/antonova_key.pub -p 2222 node@localhost

# SSH with key authentication
ssh -i ~/.ssh/antonova_key -p 2222 node@localhost
```

## Container Features

- **Node.js 20** with npm and global packages
- **Claude Code CLI** pre-installed
- **Zsh with Oh My Zsh** and powerline10k theme
- **Git, GitHub CLI, and development tools**
- **Network firewall** with restricted internet access
- **Persistent volumes** for bash history and Claude config
- **SSH server** for remote access

## Available Commands

```bash
# Inside the container
claude --help                    # Claude Code CLI
npm start                        # Run the Antonova app
sudo /usr/local/bin/init-firewall.sh  # Reinitialize firewall
sudo service ssh restart         # Restart SSH service
```

## Network Security

The container runs with a restrictive firewall that only allows:
- GitHub (api.github.com, registry.npmjs.org)
- Anthropic API (api.anthropic.com)
- Monitoring services (sentry.io, statsig.com)
- Local host network access
- SSH access (port 22)

## Troubleshooting

### Cannot SSH into container
```bash
# Check if container is running
docker ps

# Check SSH service status
docker exec antonova-ssh-dev sudo service ssh status

# View container logs
docker logs antonova-ssh-dev
```

### Firewall issues
```bash
# SSH into container and check firewall
ssh -p 2222 node@localhost
sudo iptables -L
sudo ipset list allowed-domains
```

### Reset container
```bash
# Stop and remove container
docker-compose -f docker-compose.ssh.yml down
docker-compose -f docker-compose.ssh.yml up -d
```