/**
 * Script to update existing events with default payment model
 * This ensures backward compatibility with events created before payment model was added
 */

const { db } = require('../server/db');
const { events } = require('../shared/schema');
const { eq } = require('drizzle-orm');

async function updatePaymentModel() {
  try {
    console.log('Starting update of existing events with default payment model');

    // First get all events without a payment model
    const eventsToUpdate = await db.select().from(events).where(eq(events.paymentModel, null));
    console.log(`Found ${eventsToUpdate.length} events without payment model`);

    // Update all events with default payment model 'daily'
    const updatePromises = eventsToUpdate.map(event => {
      console.log(`Setting payment model for event #${event.id} (${event.name}) to 'daily'`);
      return db.update(events)
        .set({ paymentModel: 'daily' })
        .where(eq(events.id, event.id));
    });

    await Promise.all(updatePromises);

    console.log('Successfully updated all events with default payment model');
    process.exit(0);
  } catch (error) {
    console.error('Error updating events with payment model:', error);
    process.exit(1);
  }
}

updatePaymentModel();