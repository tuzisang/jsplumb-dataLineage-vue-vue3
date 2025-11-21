# Docker Deployment Guide

This document provides detailed instructions for deploying the Data Lineage Visualization Tool using Docker.

## Prerequisites

- [Docker Engine](https://docs.docker.com/engine/install/) 20.10+
- [Docker Compose](https://docs.docker.com/compose/install/) 1.29+

## Quick Start

### One-Click Deployment

The easiest way to deploy is using the provided startup scripts:

**Windows:**
```cmd
.\deploy.bat
```

**Linux/Mac:**
```bash
chmod +x deploy.sh  # Run once to make executable
./deploy.sh
```

### Manual Deployment

If you prefer manual control:

```bash
# Build and start services
docker-compose up --build -d

# Access the application
# Frontend: http://localhost:8620
# Backend API: http://localhost:5000
```

## Configuration

### Environment Variables

The deployment can be customized using environment variables in the `.env` file:

| Variable | Default | Description |
|----------|---------|-------------|
| `FRONTEND_PORT` | `8620` | Host port for frontend service |
| `BACKEND_PORT` | `5000` | Host port for backend service |
| `FLASK_ENV` | `production` | Flask environment mode |

Example `.env` file:
```env
FRONTEND_PORT=8080
BACKEND_PORT=8081
FLASK_ENV=production
```

### Service Architecture

The deployment consists of two services:

1. **Frontend Service**
   - Built from Node.js 22 Alpine base image
   - Serves static files via Nginx
   - Exposes port 80 internally, mapped to host port via `FRONTEND_PORT`
   - Restart policy: `unless-stopped`

2. **Backend Service**
   - Built from Python 3.12 Slim base image
   - Runs Flask application with Gunicorn-compatible setup
   - Exposes port 5000 internally, mapped to host port via `BACKEND_PORT`
   - Includes volume mount for live code updates during development
   - Restart policy: `unless-stopped`

Both services are connected via a dedicated Docker network (`datalineage-network`) for secure internal communication.

## Development vs Production

### Development Mode
- Backend service has volume mount (`./api:/app`) for live code updates
- Flask runs in debug mode when `FLASK_ENV=development`
- Easy to modify code without rebuilding containers

### Production Mode
- No volume mounts for better security
- Flask runs in production mode
- Optimized for performance and stability

## Common Commands

| Command | Description |
|---------|-------------|
| `docker-compose up --build -d` | Build and start services in background |
| `docker-compose down` | Stop and remove containers |
| `docker-compose logs -f` | View real-time logs |
| `docker-compose ps` | Check service status |
| `docker-compose restart` | Restart all services |

## Troubleshooting

### Port Conflicts
If ports 8620 or 5000 are already in use:
1. Edit the `.env` file to change the ports
2. Run `docker-compose down` to stop existing services
3. Run `./deploy.sh` (or `.\deploy.bat`) again

### Permission Issues (Linux/Mac)
If you encounter permission errors:
```bash
# Make scripts executable
chmod +x deploy.sh

# Add your user to docker group (if needed)
sudo usermod -aG docker $USER
# Then log out and back in
```

### Build Failures
If the build fails due to missing dependencies:
1. Ensure you have internet connectivity
2. Check that Docker has sufficient resources (memory, disk space)
3. Try building manually: `docker-compose build --no-cache`

## Security Considerations

- Backend service runs as non-root user (`app`)
- No sensitive data is stored in containers by default
- For production deployments, consider:
  - Using HTTPS with reverse proxy
  - Implementing proper authentication
  - Regular security updates

## Performance Optimization

For large-scale deployments:
- Increase Docker memory allocation
- Consider using Docker Swarm or Kubernetes for orchestration
- Implement caching layers for frequently accessed data

## Updating the Application

To update to a new version:
1. Pull the latest code
2. Run `docker-compose down` to stop current services
3. Run `./deploy.sh` (or `.\deploy.bat`) to rebuild and restart