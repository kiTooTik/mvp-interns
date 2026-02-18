# Docker Setup for Intern DTR Application

## Overview
This Docker setup allows you to containerize and deploy the Intern DTR application with both the React frontend and Node.js API server.

## Files Created
- `Dockerfile` - Main application (React frontend)
- `Dockerfile.api` - API server (Node.js)
- `docker-compose.yml` - Orchestrates both services
- `.dockerignore` - Files to exclude from Docker build
- `.env.example` - Environment variables template

## Quick Start

### 1. Setup Environment Variables
```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your actual values
nano .env
```

### 2. Build and Run with Docker Compose
```bash
# Build and start all services
docker-compose up --build

# Or run in detached mode
docker-compose up --build -d
```

### 3. Access the Application
- **Frontend**: http://localhost:8080
- **API Server**: http://localhost:3002
- **Health Check**: http://localhost:3002/api/health

## Services

### Frontend Service (app)
- **Port**: 8080
- **Environment**: Production
- **Build**: React app with Vite
- **Command**: `npm run preview`

### API Server Service (api)
- **Port**: 3002
- **Environment**: Production
- **Build**: Node.js server
- **Command**: `node server.cjs`
- **Profile**: Only runs with `--profile api` flag

## Environment Variables

### Required
- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anonymous key
- `SUPABASE_URL` - Supabase URL for API server
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key for API server

### Optional
- `APP_PORT` - Frontend port (default: 8080)
- `API_PORT` - API server port (default: 3002)
- `NODE_ENV` - Environment (default: production)

## Docker Commands

### Development
```bash
# Start only frontend
docker-compose up app --build

# Start only API server
docker-compose --profile api up api --build

# View logs
docker-compose logs -f app
docker-compose logs -f api

# Stop services
docker-compose down

# Rebuild without cache
docker-compose up --build --no-cache
```

### Production
```bash
# Deploy to production
docker-compose -f docker-compose.yml up --build -d

# Scale services
docker-compose up --build -d --scale app=2

# Update running services
docker-compose up --build -d --force-recreate
```

## Troubleshooting

### Common Issues
1. **Port conflicts**: Change ports in docker-compose.yml
2. **Environment errors**: Verify .env file exists and has correct values
3. **Build failures**: Check node_modules volume mounting
4. **Health check failures**: Verify services are running correctly

### Health Checks
```bash
# Check service health
docker-compose ps

# Check individual service health
docker exec app curl -f http://localhost:8080/
docker exec api curl -f http://localhost:3002/api/health
```

### Logs
```bash
# View all logs
docker-compose logs

# Follow logs in real-time
docker-compose logs -f

# View specific service logs
docker-compose logs app
docker-compose logs api
```

## Production Deployment

### Using Docker Compose
```bash
# Production deployment
docker-compose -f docker-compose.yml up --build -d

# With environment file
docker-compose --env-file .env.prod up --build -d
```

### Using Docker Swarm
```bash
# Deploy to swarm
docker stack deploy -c docker-compose.yml intern-dtr
```

### Using Kubernetes
```bash
# Build and push to registry
docker build -t your-registry/intern-dtr:latest .
docker push your-registry/intern-dtr:latest

# Apply Kubernetes manifests
kubectl apply -f k8s/
```

## Security Notes
- Environment variables contain sensitive keys
- Never commit .env files to version control
- Use Docker secrets in production
- Regularly update base images

## Performance Optimization
- Uses multi-stage builds for smaller images
- Node modules mounted as volume for faster rebuilds
- Health checks for monitoring
- Restart policies for reliability

## Support
For issues with Docker setup, check:
1. Docker and Docker Compose versions
2. Available system resources
3. Network connectivity
4. Environment variable configuration
