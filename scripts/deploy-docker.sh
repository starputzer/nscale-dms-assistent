#!/bin/bash

# Docker Deployment Script for nScale DMS Assistant
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENV_FILE="${PROJECT_ROOT}/.env.production"
DOCKER_IMAGE="nscale-assist"
DOCKER_TAG="${1:-latest}"

echo -e "${GREEN}nScale DMS Assistant - Docker Deployment${NC}"
echo "========================================="

# Check if running as root (not recommended)
if [[ $EUID -eq 0 ]]; then
   echo -e "${YELLOW}Warning: Running as root is not recommended.${NC}"
fi

# Check prerequisites
echo -e "\n${GREEN}Checking prerequisites...${NC}"

if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker is not installed.${NC}"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}Error: Docker Compose is not installed.${NC}"
    exit 1
fi

# Check for production environment file
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${YELLOW}Warning: .env.production not found.${NC}"
    echo "Creating from template..."
    cp "${PROJECT_ROOT}/.env.production.example" "$ENV_FILE"
    echo -e "${RED}Please edit .env.production with your production values before continuing.${NC}"
    exit 1
fi

# Validate environment variables
echo -e "\n${GREEN}Validating environment variables...${NC}"
source "$ENV_FILE"

if [[ "$SECRET_KEY" == "your-secret-key-min-32-chars-long" ]]; then
    echo -e "${RED}Error: SECRET_KEY has not been changed from default.${NC}"
    exit 1
fi

if [[ "$JWT_SECRET_KEY" == "your-jwt-secret-key-min-32-chars" ]]; then
    echo -e "${RED}Error: JWT_SECRET_KEY has not been changed from default.${NC}"
    exit 1
fi

# Build Docker image
echo -e "\n${GREEN}Building Docker image...${NC}"
cd "$PROJECT_ROOT"

docker build -t "${DOCKER_IMAGE}:${DOCKER_TAG}" .

if [ $? -ne 0 ]; then
    echo -e "${RED}Error: Docker build failed.${NC}"
    exit 1
fi

echo -e "${GREEN}Docker image built successfully: ${DOCKER_IMAGE}:${DOCKER_TAG}${NC}"

# Run database migrations
echo -e "\n${GREEN}Running database migrations...${NC}"
docker-compose run --rm app python -m alembic upgrade head || echo "No migrations to run"

# Start services
echo -e "\n${GREEN}Starting services...${NC}"
docker-compose up -d

# Wait for services to be healthy
echo -e "\n${GREEN}Waiting for services to be healthy...${NC}"
sleep 10

# Check service health
docker-compose ps

# Show logs
echo -e "\n${GREEN}Recent logs:${NC}"
docker-compose logs --tail=20

# Final checks
echo -e "\n${GREEN}Performing final checks...${NC}"

# Check if app is responding
if curl -f -s http://localhost:80/health > /dev/null; then
    echo -e "${GREEN}✓ Application is responding on port 80${NC}"
else
    echo -e "${RED}✗ Application is not responding on port 80${NC}"
fi

if curl -f -s http://localhost:8080/health > /dev/null; then
    echo -e "${GREEN}✓ API is responding on port 8080${NC}"
else
    echo -e "${RED}✗ API is not responding on port 8080${NC}"
fi

echo -e "\n${GREEN}Deployment complete!${NC}"
echo "Access the application at: http://localhost"
echo "View logs: docker-compose logs -f"
echo "Stop services: docker-compose down"