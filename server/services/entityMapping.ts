/**
 * Entity Mapping Service
 * 
 * This module maps between database table/entity names and version keys,
 * ensuring consistent entity tracking through the application's WebSocket
 * notification system.
 */
import type { UpdateEntity } from './webSocketServer';

/**
 * Constants for version keys used in the application
 */
export const VERSION_KEYS = {
  PLANNERS: 'monthly_planners',
  PLANNER_SLOTS: 'planner_slots',
  PLANNER_ASSIGNMENTS: 'planner_assignments',
  MUSICIANS: 'musicians',
  VENUES: 'venues',
  EVENT_CATEGORIES: 'event_categories',
  MUSICIAN_PAY_RATES: 'musician_pay_rates',
  AVAILABILITY: 'availability',
  MONTHLY_CONTRACTS: 'monthly_contracts'
};

/**
 * Map a dataVersion key to an entity type
 */
export function getVersionKeyToEntity(versionKey: string): UpdateEntity | null {
  switch (versionKey) {
    case 'monthly_planners':
      return 'planners';
    case 'planner_slots':
      return 'plannerSlots';
    case 'planner_assignments':
      return 'plannerAssignments';
    case 'musicians':
      return 'musicians';
    case 'venues':
      return 'venues';
    case 'event_categories':
      return 'categories';
    case 'musician_pay_rates':
      return 'musicianPayRates';
    case 'availability':
      return 'availability';
    case 'monthly_contracts':
      return 'monthlyContracts';
    default:
      console.warn(`Unknown version key: ${versionKey}`);
      return null;
  }
}

/**
 * Map an entity type to a database table name
 */
export function getEntityToTableName(entity: UpdateEntity): string | null {
  switch (entity) {
    case 'planners':
      return 'monthly_planners';
    case 'plannerSlots':
      return 'planner_slots';
    case 'plannerAssignments':
      return 'planner_assignments';
    case 'musicians':
      return 'musicians';
    case 'venues':
      return 'venues';
    case 'categories':
    case 'eventCategories':
      return 'event_categories';
    case 'musicianPayRates':
      return 'musician_pay_rates';
    case 'availability':
      return 'availability';
    case 'monthlyContracts':
      return 'monthly_contracts';
    case 'all':
      return '*';
    default:
      console.warn(`Unknown entity type: ${entity}`);
      return null;
  }
}

/**
 * Map entity name to its API endpoint
 */
export function getEntityToEndpoint(entity: UpdateEntity): string | null {
  switch (entity) {
    case 'planners':
      return '/api/planners';
    case 'plannerSlots':
      return '/api/planner-slots';
    case 'plannerAssignments':
      return '/api/planner-assignments';
    case 'musicians':
      return '/api/musicians';
    case 'venues':
      return '/api/venues';
    case 'categories':
    case 'eventCategories':
      return '/api/event-categories';
    case 'musicianPayRates':
      return '/api/musician-pay-rates';
    case 'availability':
      return '/api/availability';
    case 'monthlyContracts':
      return '/api/monthly-contracts';
    case 'all':
      return null; // No specific endpoint - means all endpoints
    default:
      console.warn(`Unknown entity type: ${entity}`);
      return null;
  }
}