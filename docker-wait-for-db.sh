#!/bin/sh
# Simple script to wait for database before starting the application

set -e

# Function to check if PostgreSQL is ready
check_postgres() {
  pg_isready -h "$PGHOST" -p "$PGPORT" -U "$PGUSER"
  return $?
}

# Only wait for database if we have connection info
if [ -n "$PGHOST" ] && [ -n "$PGUSER" ]; then
  echo "Waiting for PostgreSQL to be ready..."
  
  # Try up to 30 times (60 seconds total)
  for i in $(seq 1 30); do
    if check_postgres; then
      echo "PostgreSQL is ready!"
      break
    fi
    
    echo "PostgreSQL not ready yet (attempt $i/30) - waiting 2 seconds..."
    sleep 2
    
    # Exit with error if we've tried 30 times
    if [ "$i" -eq 30 ]; then
      echo "ERROR: Could not connect to PostgreSQL after 30 attempts"
      exit 1
    fi
  done
  
  # Run database migrations if requested
  if [ "$RUN_MIGRATIONS" = "true" ]; then
    echo "Running database migrations..."
    npm run db:push
  fi
fi

echo "Starting application..."
exec "$@"