import { eq, and } from 'drizzle-orm';
import { db } from '../db';
import { EntityStatus, entityStatus } from '../../shared/schema';
import { Json } from 'drizzle-orm/pg-core';

// Define allowed status transitions
const STATUS_TRANSITIONS: Record<string, string[]> = {
  // Contract statuses
  'pending': ['contract-sent', 'cancelled'],
  'contract-sent': ['contract-signed', 'cancelled', 'expired', 'rejected'],
  'contract-signed': ['completed', 'cancelled'],
  'rejected': ['pending', 'contract-sent'],
  'cancelled': ['pending', 'contract-sent'],
  'expired': ['pending', 'contract-sent'],
  
  // Musician event statuses
  'invited': ['accepted', 'rejected', 'cancelled'],
  'accepted': ['contract-sent', 'rejected', 'cancelled'],
  'confirmed': ['cancelled', 'completed', 'no-show'],
  'completed': [],
  'no-show': ['cancelled'],
  
  // Booking statuses
  'booking-created': ['confirmed', 'cancelled'],
  'confirmed': ['completed', 'cancelled'],
  'completed': ['refund-requested', 'disputed'],
  'paid': [],
};

// Entity types
export const ENTITY_TYPES = {
  CONTRACT: 'contract',
  MUSICIAN_EVENT: 'musician_event',
  BOOKING: 'booking',
};

export interface UpdateStatusParams {
  entityType: string;
  entityId: number;
  newStatus: string;
  eventId: number;
  musicianId?: number;
  eventDate?: Date;
  metadata?: Json;
}

export interface StatusUpdateResult {
  success: boolean;
  status: EntityStatus | null;
  error?: string;
  propagatedUpdates?: StatusUpdateResult[];
}

export interface EventStatusMap {
  [dateStr: string]: {
    [musicianId: number]: string;
  };
}

export interface PropagateStatusParams {
  entityType: string;
  entityId: number;
  newStatus: string;
  eventId: number;
  musicianId?: number;
  eventDate?: Date;
  metadata?: Json;
  sourceEntityType: string;
  sourceEntityId: number;
}

class StatusService {
  /**
   * Get status for any entity
   */
  async getStatus(
    entityType: string, 
    entityId: number, 
    eventDate?: Date
  ): Promise<EntityStatus | null> {
    let query = db.select()
      .from(entityStatus)
      .where(and(
        eq(entityStatus.entityType, entityType),
        eq(entityStatus.entityId, entityId)
      ));
    
    if (eventDate) {
      query = query.where(eq(entityStatus.eventDate, eventDate));
    }
    
    const results = await query;
    return results.length > 0 ? results[0] : null;
  }
  
  /**
   * Update status with validation and propagation
   */
  async updateStatus(params: UpdateStatusParams): Promise<StatusUpdateResult> {
    const { entityType, entityId, newStatus, eventId, musicianId, eventDate, metadata } = params;
    
    // Get current status
    const currentStatus = await this.getStatus(entityType, entityId, eventDate);
    
    // Validate status transition
    if (currentStatus && !this.validateStatusTransition(currentStatus.primaryStatus, newStatus)) {
      return {
        success: false,
        status: null,
        error: `Invalid status transition from '${currentStatus.primaryStatus}' to '${newStatus}'`
      };
    }
    
    try {
      let status: EntityStatus;
      
      if (currentStatus) {
        // Update existing status
        const [updated] = await db.update(entityStatus)
          .set({
            primaryStatus: newStatus,
            updatedAt: new Date(),
            metadata
          })
          .where(eq(entityStatus.id, currentStatus.id))
          .returning();
        
        status = updated;
      } else {
        // Create new status
        const [newEntry] = await db.insert(entityStatus)
          .values({
            entityType,
            entityId,
            primaryStatus: newStatus,
            eventId,
            musicianId,
            eventDate,
            metadata,
            statusDate: new Date(),
          })
          .returning();
        
        status = newEntry;
      }
      
      // Propagate status changes to dependent entities
      const propagatedUpdates = await this.propagateStatusChange({
        entityType,
        entityId,
        newStatus,
        eventId, 
        musicianId,
        eventDate,
        metadata,
        sourceEntityType: entityType,
        sourceEntityId: entityId
      });
      
      return {
        success: true,
        status,
        propagatedUpdates
      };
    } catch (error) {
      console.error('Error updating status:', error);
      return {
        success: false,
        status: null,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  /**
   * Get all statuses for an event
   */
  async getEventStatuses(eventId: number): Promise<EventStatusMap> {
    const statuses = await db.select()
      .from(entityStatus)
      .where(eq(entityStatus.eventId, eventId));
    
    const result: EventStatusMap = {};
    
    for (const status of statuses) {
      if (!status.musicianId) continue;
      
      const dateStr = status.eventDate 
        ? status.eventDate.toISOString().split('T')[0] 
        : 'all';
      
      if (!result[dateStr]) {
        result[dateStr] = {};
      }
      
      result[dateStr][status.musicianId] = status.primaryStatus;
    }
    
    return result;
  }
  
  /**
   * Validate if a status transition is allowed
   */
  private validateStatusTransition(currentStatus: string, newStatus: string): boolean {
    // If current status doesn't exist, any new status is valid
    if (!currentStatus) return true;
    
    // If transition rule doesn't exist, assume not allowed
    if (!STATUS_TRANSITIONS[currentStatus]) return false;
    
    // Check if new status is in the allowed transitions list
    return STATUS_TRANSITIONS[currentStatus].includes(newStatus);
  }
  
  /**
   * Propagate status changes to dependent entities
   */
  private async propagateStatusChange(params: PropagateStatusParams): Promise<StatusUpdateResult[]> {
    const { 
      entityType, 
      newStatus, 
      eventId, 
      musicianId, 
      eventDate, 
      sourceEntityType, 
      sourceEntityId
    } = params;
    
    const updates: StatusUpdateResult[] = [];
    
    // Define propagation rules based on entity type and status
    switch (entityType) {
      case ENTITY_TYPES.CONTRACT:
        if (newStatus === 'cancelled' && musicianId) {
          // When contract is cancelled, update musician event status
          const musicianResult = await this.updateStatus({
            entityType: ENTITY_TYPES.MUSICIAN_EVENT,
            entityId: musicianId,
            newStatus: 'cancelled',
            eventId,
            musicianId,
            eventDate,
            metadata: {
              triggeredBy: {
                entityType: sourceEntityType,
                entityId: sourceEntityId,
                status: newStatus
              }
            }
          });
          updates.push(musicianResult);
          
          // Also update related booking if any
          // This would require a lookup to find the booking ID 
          // For now we'll assume it can be derived from eventId + musicianId + date
          // In production, you'd have a proper lookup method
          const bookingId = await this.findBookingId(eventId, musicianId, eventDate);
          if (bookingId) {
            const bookingResult = await this.updateStatus({
              entityType: ENTITY_TYPES.BOOKING,
              entityId: bookingId,
              newStatus: 'cancelled',
              eventId,
              musicianId,
              eventDate,
              metadata: {
                triggeredBy: {
                  entityType: sourceEntityType,
                  entityId: sourceEntityId,
                  status: newStatus
                }
              }
            });
            updates.push(bookingResult);
          }
        }
        break;
        
      case ENTITY_TYPES.MUSICIAN_EVENT:
        if (newStatus === 'accepted' && musicianId) {
          // When musician accepts, automatically create a contract
          // This would be implemented in a real system
          console.log(`Would create contract for musician ${musicianId} in event ${eventId}`);
        }
        break;
        
      // Add other propagation rules as needed
    }
    
    return updates;
  }
  
  /**
   * Helper to find a booking ID
   * In a real implementation, this would query the bookings table
   */
  private async findBookingId(eventId: number, musicianId: number, eventDate?: Date): Promise<number | null> {
    // This is a placeholder - in a real implementation this would query the database
    // For now just returning null as we haven't implemented the lookup
    return null;
  }
}

// Export a singleton instance
export const statusService = new StatusService();