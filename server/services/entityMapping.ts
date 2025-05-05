/**
 * Entity Mapping Service
 * 
 * Provides mappings between different entity naming schemes
 * used across the application to ensure consistency.
 */

// Define entity types for WebSocket updates
export type UpdateEntity = 
  | 'planners'
  | 'plannerSlots'
  | 'plannerAssignments'
  | 'musicians'
  | 'venues'
  | 'categories'
  | 'musicianPayRates'
  | 'eventCategories'
  | 'availability'
  | 'monthlyContracts'
  | 'all';

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

// Map VERSION_KEYS to UpdateEntity types
export const versionKeyToEntity: Record<string, UpdateEntity> = {
  [VERSION_KEYS.PLANNER]: 'planners',
  [VERSION_KEYS.PLANNER_SLOTS]: 'plannerSlots',
  [VERSION_KEYS.PLANNER_ASSIGNMENTS]: 'plannerAssignments',
  [VERSION_KEYS.MUSICIANS]: 'musicians',
  [VERSION_KEYS.VENUES]: 'venues',
  [VERSION_KEYS.CATEGORIES]: 'categories',
  [VERSION_KEYS.MONTHLY_CONTRACTS]: 'monthlyContracts',
  // Add more mappings as needed
};