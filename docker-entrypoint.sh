#!/bin/sh
set -e

# Only try to connect to PostgreSQL if we have a database URL
if [ -n "$DATABASE_URL" ] || [ -n "$PGHOST" ]; then
  # Wait for PostgreSQL to be ready
  echo "Waiting for PostgreSQL to be ready..."
  
  # Try with netcat first
  if command -v nc > /dev/null; then
    until nc -z ${PGHOST:-postgres} ${PGPORT:-5432}; do
      echo "PostgreSQL is unavailable - sleeping"
      sleep 2
    done
  # Fallback to pg_isready if netcat is not available
  elif command -v pg_isready > /dev/null; then
    until pg_isready -h ${PGHOST:-postgres} -p ${PGPORT:-5432} -U ${PGUSER:-postgres}; do
      echo "PostgreSQL is unavailable - sleeping"
      sleep 2
    done
  else
    echo "WARNING: Neither netcat nor pg_isready are available. Skipping database connection check."
    sleep 5
  fi
  
  echo "PostgreSQL is up - continuing"

  # Set up the database schema
  echo "Setting up database schema..."
  npm run db:push || echo "WARNING: Failed to push database schema. Continuing anyway."
fi

# Run the application
echo "Starting application..."
exec "$@"