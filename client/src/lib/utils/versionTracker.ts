/**
 * Version Tracker System
 * 
 * This module provides a more reliable way to track data freshness than HTTP caching.
 * It uses localStorage to store version hashes that are compared on data loads
 * to determine if fresh data is needed.
 */

// Define entity types that need version tracking
export type VersionedEntity = 
  | 'planners'
  | 'plannerSlots'
  | 'plannerAssignments'
  | 'monthlyContracts'
  | 'musicians'
  | 'venues'
  | 'categories';

// Storage key for the local version cache
const VERSION_STORAGE_KEY = 'vamp_data_versions';

/**
 * Get the current stored version hash for an entity
 */
export function getStoredVersion(entity: VersionedEntity): string {
  try {
    const versions = getVersions();
    return versions[entity] || '';
  } catch (e) {
    console.error('Error getting stored version:', e);
    return '';
  }
}

/**
 * Update the stored version hash for an entity
 */
export function updateStoredVersion(entity: VersionedEntity, version: string): void {
  try {
    const versions = getVersions();
    versions[entity] = version;
    localStorage.setItem(VERSION_STORAGE_KEY, JSON.stringify(versions));
    console.log(`✅ Updated stored version for ${entity}: ${version}`);
  } catch (e) {
    console.error('Error updating stored version:', e);
  }
}

/**
 * Check if stored version matches the provided version
 * @returns true if versions match (data is fresh), false if they don't match (data needs refresh)
 */
export function isDataFresh(entity: VersionedEntity, currentVersion: string): boolean {
  const storedVersion = getStoredVersion(entity);
  const isFresh = storedVersion === currentVersion;
  
  if (!isFresh) {
    console.log(`⚠️ Data is stale for ${entity}. Stored: ${storedVersion}, Current: ${currentVersion}`);
  }
  
  return isFresh;
}

/**
 * Generate a version hash from data
 * This creates a unique hash based on the content of the data
 */
export function generateVersionHash(data: any): string {
  // Simple implementation: use a combination of the data length and timestamp
  // For production, you might want a more sophisticated hash function
  if (!data) return '';
  
  try {
    // Create a hash from array length and a random ID from the first few items
    if (Array.isArray(data)) {
      const timestamp = Date.now();
      const length = data.length;
      const sampleData = data.slice(0, 3).map(item => item.id || item.name || '').join('');
      return `${length}_${sampleData}_${timestamp}`;
    }
    
    // Create a hash from object ID and timestamp
    if (typeof data === 'object') {
      const timestamp = Date.now();
      const id = data.id || '';
      const updatedAt = data.updatedAt || '';
      return `${id}_${updatedAt}_${timestamp}`;
    }
    
    // Fallback
    return `${String(data).length}_${Date.now()}`;
  } catch (e) {
    console.error('Error generating version hash:', e);
    return `${Date.now()}`;
  }
}

/**
 * Get all versions from localStorage
 */
function getVersions(): Record<string, string> {
  try {
    const storedVersions = localStorage.getItem(VERSION_STORAGE_KEY);
    return storedVersions ? JSON.parse(storedVersions) : {};
  } catch (e) {
    console.error('Error parsing stored versions:', e);
    return {};
  }
}

/**
 * Clear all stored versions (use when logging out)
 */
export function clearStoredVersions(): void {
  try {
    localStorage.removeItem(VERSION_STORAGE_KEY);
    console.log('Cleared all stored versions');
  } catch (e) {
    console.error('Error clearing stored versions:', e);
  }
}

/**
 * Force refresh for a specific entity
 */
export function forceRefreshEntity(entity: VersionedEntity): void {
  try {
    // Change the stored version to force a refresh next time
    updateStoredVersion(entity, `force_refresh_${Date.now()}`);
    console.log(`🔄 Forced refresh for ${entity}`);
  } catch (e) {
    console.error('Error forcing refresh:', e);
  }
}