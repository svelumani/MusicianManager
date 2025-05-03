import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function addColumnsToInvitations() {
  console.log("Adding date and updatedAt columns to invitations table...");
  
  try {
    // Check if date column exists
    const dateColumnExists = await db.execute(sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'invitations'
      AND column_name = 'date'
    `);
    
    // Check if updatedAt column exists
    const updatedAtColumnExists = await db.execute(sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'invitations'
      AND column_name = 'updated_at'
    `);
    
    // Add date column if it doesn't exist
    if (dateColumnExists.rows.length === 0) {
      console.log("Adding date column to invitations table...");
      await db.execute(sql`
        ALTER TABLE invitations
        ADD COLUMN date TIMESTAMP
      `);
      console.log("Date column added successfully.");
    } else {
      console.log("Date column already exists.");
    }
    
    // Add updatedAt column if it doesn't exist
    if (updatedAtColumnExists.rows.length === 0) {
      console.log("Adding updated_at column to invitations table...");
      await db.execute(sql`
        ALTER TABLE invitations
        ADD COLUMN updated_at TIMESTAMP
      `);
      console.log("Updated_at column added successfully.");
    } else {
      console.log("Updated_at column already exists.");
    }
    
    console.log("Schema update completed successfully.");
  } catch (error) {
    console.error("Error updating schema:", error);
  } finally {
    process.exit(0);
  }
}

addColumnsToInvitations();