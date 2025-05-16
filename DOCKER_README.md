# Docker Setup for Musician Management Platform

This document explains how to use Docker with the Musician Management Platform.

## Setup Options

### Option 1: Run with Docker PostgreSQL (Recommended for New Users)

This option runs both the application and PostgreSQL in Docker containers:

```bash
# Start the application and database
docker-compose up --build

# If you want to run in detached mode
docker-compose up --build -d
```

### Option 2: Connect to Existing PostgreSQL

If you already have PostgreSQL running on your machine:

```bash
# Start just the application container, connecting to your local PostgreSQL
docker-compose -f docker-compose.no-db.yml up --build
```

This connects to PostgreSQL running on your host machine using `host.docker.internal`.

## Database Migrations

### Running Migrations with Docker

After starting the containers, you can run migrations in one of these ways:

#### Option 1: Use the Migration Script

```bash
# Run the migration script (easiest)
./scripts/docker-migration.sh
```

#### Option 2: Run Migration Manually

```bash
# Start PostgreSQL first if not already running
docker-compose up -d postgres

# Run migrations
docker-compose --profile migration run db-migration
```

#### Option 3: Run Migrations from Inside the Container

```bash
# Get the container ID
docker ps

# Connect to the container
docker exec -it <container_id> /bin/sh

# Run migrations inside the container
npm run db:push
```

## Environment Variables

The Docker setup uses environment variables from the Docker Compose files. You can override them by:

1. Creating a `.env` file in the project root (use `.env.example` as a template)
2. Passing them directly: `DATABASE_URL=custom_url docker-compose up`

## Accessing PostgreSQL

When using the Docker PostgreSQL database:

- From your host machine: `localhost:5433` (port 5433)
- From Docker containers: `postgres:5432` (port 5432)
- Username: postgres
- Password: postgres
- Database: musician_management

## Production Deployment

For production deployment:

```bash
# Deploy to production
docker-compose -f docker-compose.prod.yml up --build -d
```

## Troubleshooting

- **Port conflicts**: If you see "address already in use" errors, your local PostgreSQL might be using port 5432. Use the `docker-compose.no-db.yml` configuration instead.
- **Connection issues**: Ensure your database is properly initialized and migrations have been run.
- **Volume permissions**: If you encounter permission issues, you might need to run Docker commands with sudo (on Linux).