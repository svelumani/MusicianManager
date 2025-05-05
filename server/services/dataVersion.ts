/**
 * Data Version Service
 * 
 * This service manages versioning of data to ensure clients always have the latest data.
 * It provides a way to increment versions when data changes and get current versions.
 */
import { db } from "../db";
import { dataVersions } from "@shared/schema";
import { eq } from "drizzle-orm";

// Define standard version keys for different data types
export const VERSION_KEYS = {
  PLANNER: "planner_data",
  PLANNER_ASSIGNMENTS: "planner_assignments",
  PLANNER_SLOTS: "planner_slots",
  MUSICIANS: "musicians",
  VENUES: "venues",
  CATEGORIES: "categories",
  EVENTS: "events",
  MONTHLY_CONTRACTS: "monthly_contracts",
  MONTHLY: "monthly_data",
  MONTHLY_INVOICES: "monthly_invoices",
  // Add more as needed
};

/**
 * Gets the current version for a data type
 * @param key The version key to get
 */
export async function getVersion(key: string): Promise<number> {
  try {
    const result = await db.select()
      .from(dataVersions)
      .where(eq(dataVersions.name, key));
    
    // If version exists, return it
    if (result.length > 0) {
      return result[0].version;
    }
    
    // Otherwise, create a new version
    const newVersion = await db.insert(dataVersions)
      .values({ name: key, version: 1 })
      .returning();
    
    return newVersion[0].version;
  } catch (error) {
    console.error(`Error getting version for ${key}:`, error);
    return 1; // Default to version 1
  }
}

/**
 * Increments the version for a data type
 * @param key The version key to increment
 */
export async function incrementVersion(key: string): Promise<number> {
  try {
    // First, get the current version
    const currentVersion = await getVersion(key);
    
    // Update the version
    const result = await db.update(dataVersions)
      .set({ 
        version: currentVersion + 1,
        lastUpdated: new Date()
      })
      .where(eq(dataVersions.name, key))
      .returning();
    
    console.log(`✅ Incremented ${key} version to ${result[0].version}`);
    
    return result[0].version;
  } catch (error) {
    console.error(`Error incrementing version for ${key}:`, error);
    return -1; // Error value
  }
}

/**
 * Gets all versions for client-side synchronization
 */
export async function getAllVersions(): Promise<Record<string, number>> {
  try {
    const allVersions = await db.select()
      .from(dataVersions);
    
    // Convert to a key-value object
    const versionMap: Record<string, number> = {};
    
    allVersions.forEach((v: {name: string, version: number}) => {
      versionMap[v.name] = v.version;
    });
    
    return versionMap;
  } catch (error) {
    console.error("Error getting all versions:", error);
    return {}; // Empty object on error
  }
}