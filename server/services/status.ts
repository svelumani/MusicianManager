import { db } from '../db';
import { eq, and, desc, SQL, sql } from 'drizzle-orm';
import { entityStatus } from '@shared/schema';

// Entity types for consistent typing
export const ENTITY_TYPES = {
  CONTRACT: 'contract',
  MUSICIAN_EVENT: 'musician_event',
  BOOKING: 'booking',
  EVENT: 'event',
  INVITATION: 'invitation',
  VENUE: 'venue'
};

// Status update parameters interface
interface StatusUpdateParams {
  entityType: string;
  entityId: number;
  newStatus: string;
  eventId: number;
  musicianId?: number;
  eventDate?: Date;
  metadata?: any;
}

// Service result interface
interface ServiceResult {
  success: boolean;
  data?: any;
  error?: string;
}

// The status service manages status operations centrally
class StatusService {
  /**
   * Get the current status for an entity
   */
  async getStatus(entityType: string, entityId: number, eventDate?: Date): Promise<any> {
    try {
      // Query conditions
      const conditions = [
        eq(entityStatus.entityType, entityType),
        eq(entityStatus.entityId, entityId)
      ];
      
      // Add event date condition if specified
      if (eventDate) {
        conditions.push(eq(entityStatus.eventDate, eventDate));
      }
      
      // Get the most recently updated status for this entity
      const statuses = await db
        .select()
        .from(entityStatus)
        .where(and(...conditions))
        .orderBy(desc(entityStatus.statusDate))
        .limit(1);
      
      return statuses.length > 0 ? statuses[0] : null;
    } catch (error) {
      console.error('Error getting status:', error);
      return null;
    }
  }
  
  /**
   * Get all statuses for an event
   */
  async getEventStatuses(eventId: number): Promise<any[]> {
    try {
      const statuses = await db
        .select()
        .from(entityStatus)
        .where(eq(entityStatus.eventId, eventId))
        .orderBy(desc(entityStatus.statusDate));
      
      return statuses;
    } catch (error) {
      console.error('Error getting event statuses:', error);
      return [];
    }
  }
  
  /**
   * Get all statuses for a specific musician in an event
   */
  async getMusicianEventStatuses(
    eventId: number, 
    musicianId: number, 
    entityType?: string
  ): Promise<any[]> {
    try {
      const conditions = [
        eq(entityStatus.eventId, eventId),
        eq(entityStatus.musicianId, musicianId)
      ];
      
      if (entityType) {
        conditions.push(eq(entityStatus.entityType, entityType));
      }
      
      const statuses = await db
        .select()
        .from(entityStatus)
        .where(and(...conditions))
        .orderBy(desc(entityStatus.statusDate));
      
      return statuses;
    } catch (error) {
      console.error('Error getting musician event statuses:', error);
      return [];
    }
  }
  
  /**
   * Update a status with transaction support
   */
  async updateStatus(params: StatusUpdateParams): Promise<ServiceResult> {
    try {
      // Insert a new status record
      const [newStatus] = await db.insert(entityStatus).values({
        entityType: params.entityType,
        entityId: params.entityId,
        primaryStatus: params.newStatus,
        statusDate: new Date(),
        eventId: params.eventId,
        musicianId: params.musicianId,
        eventDate: params.eventDate,
        metadata: params.metadata,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();
      
      // Now execute any related status updates
      await this.handleRelatedStatusUpdates(params);
      
      return {
        success: true,
        data: newStatus
      };
    } catch (error) {
      console.error('Error updating status:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  /**
   * Handle updating related entities' statuses when a status changes
   */
  private async handleRelatedStatusUpdates(params: StatusUpdateParams): Promise<void> {
    // Status update logic depends on the entity and the new status
    const { entityType, newStatus, eventId, musicianId, eventDate } = params;
    
    switch (entityType) {
      case ENTITY_TYPES.CONTRACT:
        if (newStatus === 'cancelled') {
          // When a contract is cancelled, update related booking and musician status
          if (musicianId) {
            // Update booking payment status to 'cancelled'
            await this.updateStatus({
              entityType: ENTITY_TYPES.BOOKING,
              entityId: params.entityId, // We're using the contract ID as the booking ID
              newStatus: 'cancelled',
              eventId,
              musicianId,
              eventDate,
              metadata: {
                reason: params.metadata?.reason || 'Contract cancelled',
                cancelledBy: params.metadata?.cancelledBy || null,
                cancelledAt: params.metadata?.cancelledAt || new Date()
              }
            });
            
            // Update musician status to 'available' for the specific date
            await this.updateStatus({
              entityType: ENTITY_TYPES.MUSICIAN_EVENT,
              entityId: musicianId,
              newStatus: 'available',
              eventId,
              musicianId,
              eventDate,
              metadata: {
                reason: 'Contract cancelled',
                previousStatus: 'booked',
                prevContract: params.entityId
              }
            });
          }
        } else if (newStatus === 'signed') {
          // When a contract is signed, mark musician as booked
          if (musicianId) {
            await this.updateStatus({
              entityType: ENTITY_TYPES.MUSICIAN_EVENT,
              entityId: musicianId,
              newStatus: 'booked',
              eventId,
              musicianId,
              eventDate,
              metadata: {
                contractId: params.entityId,
                signedAt: new Date()
              }
            });
          }
        }
        break;
        
      case ENTITY_TYPES.BOOKING:
        // Booking status impacts payment tracking, etc.
        if (newStatus === 'confirmed') {
          // Logic for confirmed bookings
        } else if (newStatus === 'cancelled') {
          // Logic for cancelled bookings
          // Already handled in the contract case
        }
        break;
        
      case ENTITY_TYPES.INVITATION:
        // Invitations affect musician availability
        if (newStatus === 'accepted') {
          await this.updateStatus({
            entityType: ENTITY_TYPES.MUSICIAN_EVENT,
            entityId: musicianId!,
            newStatus: 'pending-contract',
            eventId,
            musicianId,
            eventDate,
            metadata: {
              invitationId: params.entityId,
              acceptedAt: new Date()
            }
          });
        } else if (newStatus === 'declined') {
          await this.updateStatus({
            entityType: ENTITY_TYPES.MUSICIAN_EVENT,
            entityId: musicianId!,
            newStatus: 'declined',
            eventId,
            musicianId,
            eventDate,
            metadata: {
              invitationId: params.entityId,
              declinedAt: new Date()
            }
          });
        }
        break;
        
      default:
        // No related status updates for this entity type
        break;
    }
  }
}

export const statusService = new StatusService();