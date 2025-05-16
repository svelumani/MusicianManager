/**
 * Database adapter that switches between Neon serverless and regular PostgreSQL client
 * based on the environment
 */
import { Pool as NeonPool, neonConfig } from '@neondatabase/serverless';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-serverless';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import ws from "ws";
import * as schema from "@shared/schema";

// Use dynamic import for pg to work around ESM/CJS compatibility issues
let PgPool;

// Configure Neon for WebSocket support
neonConfig.webSocketConstructor = ws;

// Ensure we have a database URL
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Always use Neon serverless client for simplicity and compatibility
// This works both in Docker and non-Docker environments
console.log("Using Neon serverless PostgreSQL client");
const pool = new NeonPool({ connectionString: process.env.DATABASE_URL });
const db = drizzleNeon(pool, { schema });

export { pool, db };