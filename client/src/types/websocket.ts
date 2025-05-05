/**
 * WebSocket Types
 * 
 * This file contains type definitions for WebSocket messages
 * and entities used in the real-time data synchronization system.
 */

export type UpdateEntity = 
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
  | 'all';

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