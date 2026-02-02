# Docker Setup for Matrimonial Application

This guide explains how to run the matrimonial application using Docker.

## Prerequisites

- Docker Desktop (Windows/Mac) or Docker Engine (Linux)
- Docker Compose

## Quick Start

1. **Build and start all services:**
```bash
npm run docker:build
npm run docker:up
```

2. **Run database migrations:**
```bash
npm run docker:db:migrate
```

3. **View logs:**
```bash
npm run docker:logs
```

4. **Stop services:**
```bash
npm run docker:down
```

## Services Overview

The docker-compose setup includes:

- **PostgreSQL** (port 5432) - Main database
- **Redis** (port 6379) - Cache and session storage  
- **Backend** (port 3000) - Node.js Express application

## Environment Variables

The application uses the following environment variables (configured in docker-compose.yml):

- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `JWT_SECRET` - Secret for JWT token signing
- `JWT_REFRESH_SECRET` - Secret for refresh token signing

## Health Checks

All services include health checks:
- PostgreSQL: `pg_isready`
- Redis: `redis-cli ping`
- Backend: HTTP GET to `/health` endpoint

## Data Persistence

Data is persisted in Docker volumes:
- `postgres_data` - PostgreSQL data
- `redis_data` - Redis data

## Development vs Production

The setup uses production configuration by default. For development, you can modify the environment variables in `docker-compose.yml`.

## Troubleshooting

1. **Check if all services are running:**
```bash
docker-compose ps
```

2. **View specific service logs:**
```bash
docker-compose logs backend
docker-compose logs postgres
docker-compose logs redis
```

3. **Access database directly:**
```bash
docker-compose exec postgres psql -U postgres -d matrimonial_db
```

4. **Access Redis CLI:**
```bash
docker-compose exec redis redis-cli
```

5. **Rebuild services:**
```bash
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

## API Testing

Once services are running, the API will be available at:
- **Base URL:** `http://localhost:3000`
- **Health Check:** `http://localhost:3000/health`
- **API Docs:** Refer to the main README for API endpoints

## Postman Collection

A complete Postman collection is available in the repository for testing all APIs.