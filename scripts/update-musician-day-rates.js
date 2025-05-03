/**
 * Script to update existing musician pay rates with day rates
 * This fixes any entries where day rates are missing
 */
import { db } from '../server/db.js';
import { musicianPayRates, eventCategories } from '../shared/schema.js';
import { eq } from 'drizzle-orm';

// Pay rate ranges by event type (in dollars)
const DAY_RATE_RANGES = {
  'Wedding': { min: 500, max: 1200 },
  'Corporate Event': { min: 550, max: 1400 },
  'Birthday Party': { min: 450, max: 900 },
  'Concert': { min: 600, max: 1500 },
  'Religious Service': { min: 400, max: 800 },
  'Private Party': { min: 500, max: 1000 },
  'Charity Event': { min: 350, max: 800 },
  'Festival': { min: 550, max: 1200 },
  'Funeral': { min: 450, max: 900 },
  'Exhibition': { min: 450, max: 950 },
  'Other': { min: 400, max: 900 }
};

// Default ranges for any category not listed above
const DEFAULT_RANGES = { min: 450, max: 950 };

// Helper function to generate a random number between min and max
function getRandomRate(min, max) {
  // Round to nearest 5
  return Math.round((Math.random() * (max - min) + min) / 5) * 5;
}

// Helper function to calculate day rate based on hourly rate
function calculateDayRate(hourlyRate, eventType) {
  // Get range for this event type
  const ranges = DAY_RATE_RANGES[eventType] || DEFAULT_RANGES;
  
  // Calculate a day rate based on hourly rate (approximately 8 hours, but with a discount)
  const calculatedDayRate = hourlyRate * 7.5;
  
  // Ensure it falls within reasonable ranges
  let finalDayRate = Math.max(ranges.min, Math.min(calculatedDayRate, ranges.max));
  
  // Round to nearest 5
  return Math.round(finalDayRate / 5) * 5;
}

async function updateDayRates() {
  try {
    console.log('Starting to update missing day rates...');
    
    // Get all pay rates
    const allRates = await db.select().from(musicianPayRates);
    console.log(`Found ${allRates.length} pay rate entries`);
    
    // Count how many entries need updating
    const missingDayRates = allRates.filter(rate => !rate.dayRate);
    console.log(`Found ${missingDayRates.length} entries with missing day rates`);
    
    // Track statistics
    let updatedCount = 0;
    
    // Update each entry
    for (const rate of missingDayRates) {
      // Get the event category title
      const categoryResult = await db.select()
        .from(eventCategories)
        .where(eq(eventCategories.id, rate.eventCategoryId))
        .limit(1);
      
      const categoryTitle = categoryResult[0]?.title || 'Other';
      
      // Calculate or generate day rate
      let dayRate;
      if (rate.hourlyRate) {
        // Calculate based on hourly rate
        dayRate = calculateDayRate(rate.hourlyRate, categoryTitle);
      } else {
        // Generate a random day rate
        const ranges = DAY_RATE_RANGES[categoryTitle] || DEFAULT_RANGES;
        dayRate = getRandomRate(ranges.min, ranges.max);
      }
      
      // Update the database
      await db.update(musicianPayRates)
        .set({ dayRate })
        .where(eq(musicianPayRates.id, rate.id));
      
      console.log(`Updated pay rate ID ${rate.id} with day rate: $${dayRate}`);
      updatedCount++;
    }
    
    console.log('=== Day Rate Update Complete ===');
    console.log(`Updated ${updatedCount} pay rate entries`);
    console.log('==============================');
    
  } catch (error) {
    console.error('Error updating day rates:', error);
  } finally {
    // Close the database connection
    process.exit(0);
  }
}

// Run the function
updateDayRates();