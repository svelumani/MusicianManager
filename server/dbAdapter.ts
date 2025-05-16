/**
 * Database adapter that switches between Neon serverless and regular PostgreSQL client
 * based on the environment
 */
import { Pool as PgPool } from 'pg';
import { Pool as NeonPool, neonConfig } from '@neondatabase/serverless';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-serverless';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import ws from "ws";
import * as schema from "@shared/schema";

// Configure Neon for WebSocket support
neonConfig.webSocketConstructor = ws;

// Check if we're running in Docker
const isDocker = process.env.IS_DOCKER === 'true';

// Ensure we have a database URL
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Determine which client to use based on environment
let pool;
let db;

if (isDocker) {
  console.log("Using standard PostgreSQL client for Docker environment");
  pool = new PgPool({ connectionString: process.env.DATABASE_URL });
  db = drizzlePg(pool, { schema });
} else {
  console.log("Using Neon serverless PostgreSQL client");
  pool = new NeonPool({ connectionString: process.env.DATABASE_URL });
  db = drizzleNeon(pool, { schema });
}

export { pool, db };