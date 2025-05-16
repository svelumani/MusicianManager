/**
 * Database adapter specifically for Docker environments
 * Uses the regular pg client instead of Neon serverless
 */
import postgres from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

// Ensure we have a database URL
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

console.log("Using standard PostgreSQL client for Docker environment");
const pool = new postgres.Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool, { schema });

export { pool, db };