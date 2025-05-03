/**
 * Script to update musician and events schema
 * This adds the category_ids and musician_category_ids columns to the tables
 */

import { db } from '../server/db.js';
import { sql } from 'drizzle-orm';

async function updateSchema() {
  console.log('Starting schema update...');

  try {
    // Add category_ids to musicians table
    console.log('Adding category_ids column to musicians table...');
    await db.execute(sql`
      ALTER TABLE musicians
      ADD COLUMN IF NOT EXISTS category_ids INTEGER[] DEFAULT '{}'::INTEGER[];
    `);

    // Add musician_category_ids to events table
    console.log('Adding musician_category_ids column to events table...');
    await db.execute(sql`
      ALTER TABLE events
      ADD COLUMN IF NOT EXISTS musician_category_ids INTEGER[] DEFAULT '{}'::INTEGER[];
    `);

    // Populate category_ids for existing musicians based on categoryId
    console.log('Populating category_ids for existing musicians...');
    await db.execute(sql`
      UPDATE musicians
      SET category_ids = ARRAY[category_id]
      WHERE category_ids IS NULL OR category_ids = '{}'::INTEGER[];
    `);

    // Populate musician_category_ids for existing events based on typeId
    console.log('Populating musician_category_ids for existing events...');
    await db.execute(sql`
      UPDATE events e
      SET musician_category_ids = (
        SELECT ARRAY_AGG(DISTINCT m.category_id)
        FROM musicians m
        WHERE m.id IN (
          SELECT musician_id 
          FROM bookings 
          WHERE event_id = e.id
        )
      )
      WHERE musician_category_ids IS NULL OR musician_category_ids = '{}'::INTEGER[];
    `);

    console.log('Schema update completed successfully.');
  } catch (error) {
    console.error('Error updating schema:', error);
    throw error;
  }
}

// Run the update
updateSchema()
  .then(() => {
    console.log('Schema update completed. Exiting...');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Schema update failed:', error);
    process.exit(1);
  });