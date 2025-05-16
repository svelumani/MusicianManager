#!/bin/sh
set -e

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL to be ready..."
until nc -z $PGHOST $PGPORT; do
  echo "PostgreSQL is unavailable - sleeping"
  sleep 1
done
echo "PostgreSQL is up - continuing"

# Set up the database schema
echo "Setting up database schema..."
npm run db:push

# Run the application
echo "Starting application..."
exec "$@"