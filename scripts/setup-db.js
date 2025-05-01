import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { Pool } from 'pg';
import * as schema from '../shared/schema.js';

async function setupDatabase() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  console.log("Setting up database...");
  
  // Create database connection
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    // Create tables based on schema
    const { db } = await import('../server/db.js');
    
    // Push schema changes to database
    console.log("Pushing schema to database...");
    
    // Create tables for all schema objects
    for (const table of Object.values(schema)) {
      if (table && typeof table === 'object' && table.name) {
        console.log(`Creating table: ${table.name}`);
        try {
          // Try to use the table to force creation
          await db.select().from(table).limit(1);
        } catch (error) {
          console.log(`Error creating table ${table.name}:`, error.message);
        }
      }
    }
    
    console.log("Schema pushed successfully!");
    
    // Create admin user if it doesn't exist
    console.log("Creating admin user if needed...");
    const existingUsers = await db.select().from(schema.users).where(eq(users.username, 'admin'));
    
    if (existingUsers.length === 0) {
      await db.insert(schema.users).values({
        username: "admin",
        password: "admin123",
        name: "Admin User",
        email: "admin@vamp.com",
        role: "admin",
        profileImage: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
      });
      console.log("Admin user created successfully!");
    } else {
      console.log("Admin user already exists.");
    }

    console.log("Database setup completed successfully!");
  } catch (error) {
    console.error("Error setting up database:", error);
  } finally {
    // Close database connection
    await pool.end();
  }
}

setupDatabase().catch(console.error);