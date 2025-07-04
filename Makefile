# Antonova Development Environment Makefile

# Variables
COMPOSE_FILE := devcontainer/docker-compose.ssh.yml
SSH_PORT := 2222
SSH_USER := node
SSH_HOST := localhost
SSH_KEY := ~/.ssh/antonova_key

# Default target
.PHONY: help
help:
	@echo "Antonova Development Environment"
	@echo "================================"
	@echo ""
	@echo "Container Management:"
	@echo "  start          - Start the SSH-enabled development container"
	@echo "  stop           - Stop the development container"
	@echo "  restart        - Restart the development container"
	@echo "  status         - Show container status"
	@echo "  logs           - Show container logs"
	@echo "  clean          - Stop and remove container and volumes"
	@echo ""
	@echo "SSH Access:"
	@echo "  ssh            - SSH into the container with password auth"
	@echo "  ssh-keygen     - Generate SSH key for the container"
	@echo "  ssh-copy-id    - Copy SSH public key to container"
	@echo "  ssh-key        - SSH into container using key authentication"
	@echo ""
	@echo "Development:"
	@echo "  build          - Build the container image"
	@echo "  rebuild        - Rebuild container from scratch"
	@echo "  shell          - Open shell in running container"
	@echo "  run            - Run the Antonova application inside container"
	@echo ""
	@echo "Maintenance:"
	@echo "  firewall       - Reinitialize firewall in container"
	@echo "  ssh-restart    - Restart SSH service in container"

# Container Management
.PHONY: start
start:
	@echo "Starting Antonova development container..."
	docker-compose -f $(COMPOSE_FILE) up -d
	@echo "Container started. SSH access available on port $(SSH_PORT)"
	@echo "Use 'make ssh' to connect"

.PHONY: stop
stop:
	@echo "Stopping Antonova development container..."
	docker-compose -f $(COMPOSE_FILE) down

.PHONY: restart
restart: stop start

.PHONY: status
status:
	@echo "Container Status:"
	docker-compose -f $(COMPOSE_FILE) ps
	@echo ""
	@echo "SSH Service Status:"
	@docker-compose -f $(COMPOSE_FILE) exec antonova-ssh sudo service ssh status || echo "Container not running"

.PHONY: logs
logs:
	docker-compose -f $(COMPOSE_FILE) logs -f

.PHONY: clean
clean:
	@echo "Stopping and removing container and volumes..."
	docker-compose -f $(COMPOSE_FILE) down -v
	@echo "Cleanup complete"

# SSH Access
.PHONY: ssh
ssh:
	@echo "Connecting to container via SSH..."
	@echo "Password: claudedev"
	ssh -p $(SSH_PORT) $(SSH_USER)@$(SSH_HOST)

.PHONY: ssh-keygen
ssh-keygen:
	@echo "Generating SSH key pair for Antonova container..."
	@if [ ! -f $(SSH_KEY) ]; then \
		ssh-keygen -t rsa -b 4096 -f $(SSH_KEY) -C "antonova-dev"; \
		echo "SSH key generated: $(SSH_KEY)"; \
	else \
		echo "SSH key already exists: $(SSH_KEY)"; \
	fi

.PHONY: ssh-copy-id
ssh-copy-id: ssh-keygen
	@echo "Copying SSH public key to container..."
	@echo "Password: claudedev"
	ssh-copy-id -i $(SSH_KEY).pub -p $(SSH_PORT) $(SSH_USER)@$(SSH_HOST)

.PHONY: ssh-key
ssh-key:
	@echo "Connecting to container via SSH key..."
	@if [ ! -f $(SSH_KEY) ]; then \
		echo "SSH key not found. Run 'make ssh-copy-id' first."; \
		exit 1; \
	fi
	ssh -i $(SSH_KEY) -p $(SSH_PORT) $(SSH_USER)@$(SSH_HOST)

# Development
.PHONY: build
build:
	@echo "Building Antonova development container..."
	docker-compose -f $(COMPOSE_FILE) build

.PHONY: rebuild
rebuild:
	@echo "Rebuilding Antonova development container from scratch..."
	docker-compose -f $(COMPOSE_FILE) build --no-cache

.PHONY: shell
shell:
	@echo "Opening shell in running container..."
	docker-compose -f $(COMPOSE_FILE) exec antonova-ssh zsh

.PHONY: run
run:
	@echo "Running Antonova application..."
	docker-compose -f $(COMPOSE_FILE) exec antonova-ssh npm start

# Maintenance
.PHONY: firewall
firewall:
	@echo "Reinitializing firewall in container..."
	docker-compose -f $(COMPOSE_FILE) exec antonova-ssh sudo /usr/local/bin/init-firewall.sh

.PHONY: ssh-restart
ssh-restart:
	@echo "Restarting SSH service in container..."
	docker-compose -f $(COMPOSE_FILE) exec antonova-ssh sudo service ssh restart

# Advanced targets
.PHONY: setup
setup: build start ssh-copy-id
	@echo "Complete setup finished!"
	@echo "Use 'make ssh-key' to connect with key authentication"

.PHONY: dev
dev: start
	@echo "Development environment ready!"
	@echo "Container: Running"
	@echo "SSH: Available on port $(SSH_PORT)"
	@echo "Use 'make ssh' to connect"

# Docker info
.PHONY: info
info:
	@echo "Antonova Development Environment Info"
	@echo "====================================="
	@echo "Container Name: antonova-ssh-dev"
	@echo "SSH Port: $(SSH_PORT)"
	@echo "SSH User: $(SSH_USER)"
	@echo "SSH Host: $(SSH_HOST)"
	@echo "SSH Key: $(SSH_KEY)"
	@echo "Compose File: $(COMPOSE_FILE)"
	@echo ""
	@echo "Quick Start:"
	@echo "1. make start    # Start container"
	@echo "2. make ssh      # SSH into container"
	@echo "3. make stop     # Stop container"