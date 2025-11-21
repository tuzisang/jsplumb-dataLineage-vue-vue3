@echo off
REM Data Lineage One-Click Deployment Script for Windows
REM This script automates the Docker deployment process

echo ========================================
echo Data Lineage Visualization Tool
echo One-Click Docker Deployment
echo ========================================

REM Check if Docker is installed
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Docker is not installed or not in PATH.
    echo Please install Docker Desktop from https://www.docker.com/products/docker-desktop
    pause
    exit /b 1
)

REM Check if docker-compose is available
docker-compose --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: docker-compose is not available.
    echo Docker Desktop should include docker-compose by default.
    pause
    exit /b 1
)

echo Checking Docker daemon status...
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Docker daemon is not running.
    echo Please start Docker Desktop and wait for it to be ready.
    pause
    exit /b 1
)

echo.
echo Building and starting services...
echo This may take a few minutes on first run.

REM Build and start services in detached mode
docker-compose up --build -d

if %errorlevel% neq 0 (
    echo ERROR: Failed to start services.
    echo Check the error messages above for details.
    pause
    exit /b 1
)

echo.
echo ========================================
echo Deployment completed successfully!
echo ========================================
echo.
echo Services are now running:
echo - Frontend: http://localhost:8620
echo - Backend API: http://localhost:5000
echo.
echo To stop the services, run: docker-compose down
echo To view logs, run: docker-compose logs -f
echo.
pause