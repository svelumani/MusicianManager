/**
 * Script to add approximate rates for all categories to all musicians
 * 
 * This script will:
 * 1. Get all musicians in the system
 * 2. Get all event categories
 * 3. For each musician and category combination, generate reasonable pay rates
 * 4. Insert the pay rates into the database
 */
import { db } from '../server/db.js';
import { musicians, musicianPayRates, eventCategories } from '../shared/schema.js';
import { eq } from 'drizzle-orm';

// Pay rate ranges by category (in dollars)
const PAY_RATE_RANGES = {
  'Wedding': { hourlyMin: 80, hourlyMax: 150, dailyMin: 500, dailyMax: 1200, eventMin: 600, eventMax: 1500 },
  'Corporate Event': { hourlyMin: 90, hourlyMax: 180, dailyMin: 550, dailyMax: 1400, eventMin: 650, eventMax: 1600 },
  'Birthday Party': { hourlyMin: 70, hourlyMax: 120, dailyMin: 450, dailyMax: 900, eventMin: 500, eventMax: 1000 },
  'Concert': { hourlyMin: 100, hourlyMax: 200, dailyMin: 600, dailyMax: 1500, eventMin: 700, eventMax: 1800 },
  'Religious Service': { hourlyMin: 60, hourlyMax: 100, dailyMin: 400, dailyMax: 800, eventMin: 450, eventMax: 900 },
  'Private Party': { hourlyMin: 75, hourlyMax: 130, dailyMin: 500, dailyMax: 1000, eventMin: 550, eventMax: 1200 },
  'Charity Event': { hourlyMin: 60, hourlyMax: 110, dailyMin: 350, dailyMax: 800, eventMin: 400, eventMax: 900 },
  'Festival': { hourlyMin: 90, hourlyMax: 180, dailyMin: 550, dailyMax: 1200, eventMin: 650, eventMax: 1400 },
  'Funeral': { hourlyMin: 80, hourlyMax: 140, dailyMin: 450, dailyMax: 900, eventMin: 500, eventMax: 1000 },
  'Exhibition': { hourlyMin: 70, hourlyMax: 130, dailyMin: 450, dailyMax: 950, eventMin: 500, eventMax: 1100 },
  'Other': { hourlyMin: 60, hourlyMax: 120, dailyMin: 400, dailyMax: 900, eventMin: 450, eventMax: 1000 }
};

// Default ranges for any category not listed above
const DEFAULT_RANGES = { hourlyMin: 70, hourlyMax: 130, dailyMin: 450, dailyMax: 950, eventMin: 500, eventMax: 1100 };

// Helper function to generate a random number between min and max
function getRandomRate(min, max) {
  // Round to nearest 5
  return Math.round((Math.random() * (max - min) + min) / 5) * 5;
}

// Helper function to add variation based on musician experience or skill level
function adjustRateForExperience(baseRate, experienceLevel) {
  // Experience level 1-10
  const adjustmentFactor = 0.8 + (experienceLevel * 0.04); // 0.8 to 1.2 adjustment
  return Math.round(baseRate * adjustmentFactor / 5) * 5;
}

async function addMusicianPayRates() {
  try {
    console.log('Starting to add musician pay rates...');
    
    // Get all musicians
    const allMusicians = await db.select().from(musicians);
    console.log(`Found ${allMusicians.length} musicians`);
    
    // Get all event categories
    const allCategories = await db.select().from(eventCategories);
    console.log(`Found ${allCategories.length} event categories`);
    
    // Track statistics
    let totalRatesAdded = 0;
    let musiciansProcessed = 0;
    
    // Process each musician
    for (const musician of allMusicians) {
      console.log(`Processing musician: ${musician.name}`);
      
      // Clear existing pay rates for this musician to avoid duplicates
      const existingRates = await db.select().from(musicianPayRates)
        .where(eq(musicianPayRates.musicianId, musician.id));
      
      if (existingRates.length > 0) {
        console.log(`Musician ${musician.name} already has ${existingRates.length} pay rates. Skipping...`);
        musiciansProcessed++;
        continue;
      }
      
      // Generate a random experience level for the musician (1-10)
      const experienceLevel = Math.floor(Math.random() * 10) + 1;
      
      // For each event category, create a pay rate entry
      for (const category of allCategories) {
        // Get rate ranges for this category, or use defaults
        const ranges = PAY_RATE_RANGES[category.title] || DEFAULT_RANGES;
        
        // Generate random rates within the ranges
        const hourlyRate = getRandomRate(ranges.hourlyMin, ranges.hourlyMax);
        const dailyRate = getRandomRate(ranges.dailyMin, ranges.dailyMax);
        const eventRate = getRandomRate(ranges.eventMin, ranges.eventMax);
        
        // Adjust based on experience
        const adjustedHourlyRate = adjustRateForExperience(hourlyRate, experienceLevel);
        const adjustedDailyRate = adjustRateForExperience(dailyRate, experienceLevel);
        const adjustedEventRate = adjustRateForExperience(eventRate, experienceLevel);
        
        // Ensure all rates are properly set
        const payRateData = {
          musicianId: musician.id,
          eventCategoryId: category.id,
          hourlyRate: adjustedHourlyRate,
          dayRate: adjustedDailyRate, // Correct field name is dayRate, not dailyRate
          eventRate: adjustedEventRate,
          notes: `Auto-generated based on average rates for ${category.title}`
        };
        
        // Debug log to verify values
        console.log(`Inserting rates for ${musician.name} - ${category.title}`, 
          { hourly: payRateData.hourlyRate, daily: payRateData.dayRate, event: payRateData.eventRate });
        
        // Insert into database
        await db.insert(musicianPayRates).values(payRateData);
        
        console.log(`Added pay rate for ${musician.name} - ${category.title}: $${adjustedHourlyRate}/hr, $${adjustedDailyRate}/day, $${adjustedEventRate}/event`);
        totalRatesAdded++;
      }
      
      musiciansProcessed++;
      console.log(`Completed processing musician ${musiciansProcessed}/${allMusicians.length}`);
    }
    
    console.log('=== Pay Rate Generation Complete ===');
    console.log(`Processed ${musiciansProcessed} musicians`);
    console.log(`Added ${totalRatesAdded} pay rate entries`);
    console.log('===================================');
    
  } catch (error) {
    console.error('Error adding musician pay rates:', error);
  } finally {
    // Close the database connection
    process.exit(0);
  }
}

// Run the function
addMusicianPayRates();