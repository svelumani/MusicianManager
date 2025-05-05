/**
 * Version Tracking Utility
 * 
 * This utility helps track data versions on the client-side to ensure
 * the UI always displays the most up-to-date information, regardless
 * of browser caching behavior.
 */

// Define the types of entities we can track versions for
export type VersionedEntity = 
  | 'planners'
  | 'plannerSlots'
  | 'plannerAssignments'
  | 'monthlyContracts'
  | 'musicians'
  | 'venues'
  | 'categories'
  | 'musicianPayRates'
  | 'eventCategories'
  | 'availability';

const VERSION_STORAGE_KEY = 'data_versions';

/**
 * Get the current stored version hash for an entity
 */
export function getStoredVersion(entity: VersionedEntity): string {
  const versions = getVersions();
  return versions[entity] || '';
}

/**
 * Update the stored version hash for an entity
 */
export function updateStoredVersion(entity: VersionedEntity, version: string): void {
  const versions = getVersions();
  versions[entity] = version;
  localStorage.setItem(VERSION_STORAGE_KEY, JSON.stringify(versions));
}

/**
 * Check if stored version matches the provided version
 * @returns true if versions match (data is fresh), false if they don't match (data needs refresh)
 */
export function isDataFresh(entity: VersionedEntity, currentVersion: string): boolean {
  const storedVersion = getStoredVersion(entity);
  return storedVersion === currentVersion;
}

/**
 * Generate a version hash from data
 * This creates a unique hash based on the content of the data
 */
export function generateVersionHash(data: any): string {
  if (!data) return '';
  
  try {
    // For arrays, sort by ID if possible and stringify
    if (Array.isArray(data)) {
      // Try to sort by id to ensure consistent hashing
      const sortedData = [...data].sort((a, b) => {
        if (a.id && b.id) return a.id - b.id;
        return 0;
      });
      
      // Count items and include that in the hash
      const itemCount = data.length;
      
      // Get the most recent updatedAt value if it exists
      let latestUpdate = '';
      data.forEach((item) => {
        if (item.updatedAt && item.updatedAt > latestUpdate) {
          latestUpdate = item.updatedAt;
        }
      });
      
      // Create a simple hash from the stringified data and additional metadata
      return `${itemCount}_${latestUpdate}_${hashString(JSON.stringify(sortedData))}`;
    }
    
    // For objects, stringify and hash
    return hashString(JSON.stringify(data));
  } catch (error) {
    console.error('Error generating version hash:', error);
    // If anything goes wrong, return a unique timestamp-based hash
    return `error_${Date.now()}`;
  }
}

/**
 * Get all versions from localStorage
 */
function getVersions(): Record<string, string> {
  try {
    const stored = localStorage.getItem(VERSION_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (e) {
    console.error('Error parsing stored versions:', e);
    return {};
  }
}

/**
 * Simple string hashing function
 */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16);
}

/**
 * Clear all stored versions (use when logging out)
 */
export function clearStoredVersions(): void {
  localStorage.removeItem(VERSION_STORAGE_KEY);
}

/**
 * Force refresh for a specific entity
 */
export function forceRefreshEntity(entity: VersionedEntity): void {
  updateStoredVersion(entity, `force_${Date.now()}`);
}