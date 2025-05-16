#!/bin/bash

# Script to set up the database when running in Docker environment
echo "Setting up database for Docker environment..."

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL to be ready..."
until pg_isready -h $PGHOST -p $PGPORT -U $PGUSER; do
  echo "PostgreSQL is unavailable - sleeping"
  sleep 1
done

echo "PostgreSQL is up - executing database setup"

# Run Drizzle migration to set up schema
echo "Running database migration..."
npm run db:push

echo "Database setup complete!"