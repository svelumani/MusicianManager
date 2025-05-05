/**
 * WebSocket Types
 * 
 * This file contains type definitions for WebSocket messages
 * and entities used in the real-time data synchronization system.
 */

// Client-side entity names (camelCase)
export type ClientEntityName = 
  | 'planners'
  | 'plannerSlots'
  | 'plannerAssignments'
  | 'musicians'
  | 'venues'
  | 'categories'
  | 'eventCategories'
  | 'musicianPayRates'
  | 'availability'
  | 'monthlyContracts'
  | 'monthlyPlanners'
  | 'monthlyInvoices'
  | 'all';

// Server-side entity names (snake_case)
export type ServerEntityName = 
  | 'monthly_planners'
  | 'planner_data'
  | 'planner_slots'
  | 'planners_slots'
  | 'planner_assignments'
  | 'planners_assignments'
  | 'monthly_contracts'
  | 'monthly_data'
  | 'event_categories'
  | 'musician_pay_rates'
  | 'musicians'
  | 'venues'
  | 'categories'
  | 'availability'
  | 'monthly_invoices'
  | 'all';

// Combined type that accepts either client or server entity names
export type UpdateEntity = ClientEntityName | ServerEntityName;

export type NotificationType = 
  | 'data-update' 
  | 'refresh-required' 
  | 'system-message';

export interface UpdateMessage {
  type: NotificationType;
  entity?: UpdateEntity;
  message?: string;
  timestamp: number;
}