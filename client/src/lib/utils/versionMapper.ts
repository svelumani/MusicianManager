/**
 * Version Key Mapper
 * 
 * This utility provides a simple mapping between server-side version keys
 * and client-side entity names to ensure consistent data versioning.
 */

// Map from server keys to client entity types
export const SERVER_TO_CLIENT_KEYS: Record<string, string> = {
  // Server keys as they appear in API responses
  'monthly_planners': 'monthlyPlanners',
  'planner_data': 'monthlyPlanners',
  'planner_slots': 'plannerSlots',
  'planners_slots': 'plannerSlots',
  'planner_assignments': 'plannerAssignments',
  'planners_assignments': 'plannerAssignments',
  'monthly_contracts': 'monthlyContracts',
  'monthly_data': 'monthlyContracts',
  'musicians': 'musicians',
  'venues': 'venues',
  'categories': 'categories',
  'event_categories': 'eventCategories'
};

// Map from client entity types to server keys
export const CLIENT_TO_SERVER_KEYS: Record<string, string> = {
  // Client entity types
  'monthlyPlanners': 'monthly_planners',
  'plannerSlots': 'planner_slots',
  'plannerAssignments': 'planner_assignments',
  'monthlyContracts': 'monthly_contracts',
  'musicians': 'musicians',
  'venues': 'venues',
  'categories': 'categories',
  'eventCategories': 'event_categories'
};

/**
 * Map server version response to client entities
 * 
 * Takes server version response (like {"monthly_planners": 12}) and
 * maps keys to client entity names (like {"monthlyPlanners": 12})
 */
export function mapServerVersionsToClient(serverVersions: Record<string, number>): Record<string, number> {
  const clientVersions: Record<string, number> = {};
  
  // For each key in server response
  Object.entries(serverVersions).forEach(([serverKey, versionNumber]) => {
    // If we have a mapping for this server key
    const clientKey = SERVER_TO_CLIENT_KEYS[serverKey];
    if (clientKey) {
      // Use the mapped client key
      clientVersions[clientKey] = versionNumber;
    } else {
      // If no mapping exists, keep the original key
      clientVersions[serverKey] = versionNumber;
    }
  });
  
  return clientVersions;
}

/**
 * Get server version key for a client entity
 * 
 * Takes a client entity name (like "monthlyPlanners") and
 * returns the corresponding server key (like "monthly_planners")
 */
export function getServerKeyForEntity(clientEntity: string): string {
  return CLIENT_TO_SERVER_KEYS[clientEntity] || clientEntity;
}