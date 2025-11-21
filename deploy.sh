#!/bin/bash
# Data Lineage One-Click Deployment Script for Linux/Mac
# This script automates the Docker deployment process

echo "========================================"
echo "Data Lineage Visualization Tool"
echo "One-Click Docker Deployment"
echo "========================================"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "ERROR: Docker is not installed or not in PATH."
    echo "Please install Docker from https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    echo "ERROR: docker-compose is not available."
    echo "Please install Docker Compose from https://docs.docker.com/compose/install/"
    exit 1
fi

echo "Checking Docker daemon status..."
if ! docker info &> /dev/null; then
    echo "ERROR: Docker daemon is not running."
    echo "Please start Docker and wait for it to be ready."
    exit 1
fi

echo ""
echo "Building and starting services..."
echo "This may take a few minutes on first run."

# Build and start services in detached mode
if ! docker-compose up --build -d; then
    echo "ERROR: Failed to start services."
    echo "Check the error messages above for details."
    exit 1
fi

echo ""
echo "========================================"
echo "Deployment completed successfully!"
echo "========================================"
echo ""
echo "Services are now running:"
echo "- Frontend: http://localhost:8620"
echo "- Backend API: http://localhost:5000"
echo ""
echo "To stop the services, run: docker-compose down"
echo "To view logs, run: docker-compose logs -f"
echo ""