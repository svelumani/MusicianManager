#!/bin/bash

# This script runs database migrations inside Docker

echo "Running database migrations in Docker..."

# First make sure the database is up and ready
docker-compose up -d postgres

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL to be ready..."
sleep 5

# Run the migration using the db-migration service
docker-compose --profile migration run db-migration

echo "Migration completed!"