/**
 * Database connection that switches between Docker and non-Docker environments
 */

// For simplicity, we'll use Neon in development and require the Docker image to pass DATABASE_URL
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Configure Neon for WebSocket support
neonConfig.webSocketConstructor = ws;

// Ensure we have a database URL
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Use Neon serverless PostgreSQL client
console.log("Using Neon serverless PostgreSQL client");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

export { pool, db };