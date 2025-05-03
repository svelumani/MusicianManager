import { eq, and, desc, sql } from 'drizzle-orm';
import { db } from '../db';
import { activities, entityStatus } from '@shared/schema';
import { json } from 'drizzle-orm/pg-core';

// Define entity types as constants for consistent use throughout the application
export const ENTITY_TYPES = {
  MUSICIAN: 'musician',
  EVENT: 'event',
  CONTRACT: 'contract',
  BOOKING: 'booking',
  INVITATION: 'invitation',
  VENUE: 'venue',
  PAYMENT: 'payment',
  COLLECTION: 'collection'
};

/**
 * Service for managing entity statuses
 */
export class StatusService {
  /**
   * Get the current status for an entity
   */
  async getEntityStatus(entityType: string, entityId: number, eventId?: number, musicianId?: number, eventDate?: Date) {
    try {
      // Base query with required conditions
      let conditions = [
        eq(entityStatus.entityType, entityType),
        eq(entityStatus.entityId, entityId)
      ];
      
      // Add optional conditions if parameters are provided
      if (eventId) {
        conditions.push(eq(entityStatus.eventId, eventId));
      } else {
        conditions.push(sql`${entityStatus.eventId} IS NULL`);
      }
      
      // Add musician condition if provided
      if (musicianId) {
        conditions.push(eq(entityStatus.musicianId, musicianId));
      }
      
      // Add event date condition if provided
      if (eventDate) {
        conditions.push(eq(entityStatus.eventDate, eventDate));
      }
      
      // Build the query with all conditions
      const query = and(...conditions);
      
      // Select specific fields and add appropriate aliases for frontend compatibility
      const [status] = await db
        .select({
          id: entityStatus.id,
          entityType: entityStatus.entityType,
          entityId: entityStatus.entityId,
          status: entityStatus.primaryStatus, // Use primaryStatus field but alias as status
          customStatus: entityStatus.customStatus,
          eventId: entityStatus.eventId,
          musicianId: entityStatus.musicianId,
          eventDate: entityStatus.eventDate,
          statusDate: entityStatus.statusDate,
          metadata: entityStatus.metadata,
          createdAt: entityStatus.createdAt,
          updatedAt: entityStatus.updatedAt
        })
        .from(entityStatus)
        .where(query)
        .orderBy(desc(entityStatus.updatedAt))
        .limit(1);
      
      return status;
    } catch (error) {
      console.error('Error getting entity status:', error);
      throw new Error(`Failed to get status for ${entityType} #${entityId}: ${error.message}`);
    }
  }

  /**
   * Get status history for an entity
   */
  async getEntityStatusHistory(entityType: string, entityId: number, eventId?: number, limit: number = 50) {
    try {
      const query = eventId 
        ? and(
            eq(entityStatus.entityType, entityType),
            eq(entityStatus.entityId, entityId),
            eq(entityStatus.eventId, eventId)
          )
        : and(
            eq(entityStatus.entityType, entityType),
            eq(entityStatus.entityId, entityId)
          );
      
      const statusHistory = await db
        .select({
          id: entityStatus.id,
          status: entityStatus.primaryStatus, // Updated to use primaryStatus
          customStatus: entityStatus.customStatus, // Added customStatus
          timestamp: entityStatus.createdAt,
          statusDate: entityStatus.statusDate, // Added statusDate
          eventId: entityStatus.eventId,
          musicianId: entityStatus.musicianId, // Added musicianId
          eventDate: entityStatus.eventDate, // Added eventDate
          metadata: entityStatus.metadata // Added metadata
        })
        .from(entityStatus)
        .where(query)
        .orderBy(desc(entityStatus.createdAt))
        .limit(limit);
      
      return statusHistory;
    } catch (error) {
      console.error('Error getting entity status history:', error);
      throw new Error(`Failed to get status history for ${entityType} #${entityId}: ${error.message}`);
    }
  }

  /**
   * Update an entity's status
   */
  async updateEntityStatus(
    entityType: string, 
    entityId: number, 
    status: string, 
    userId: number,
    details?: string,
    eventId?: number,
    metadata?: Json,
    customStatus?: string,
    musicianId?: number,
    eventDate?: Date
  ) {
    try {
      // Create new status entry with the correct field names based on database schema
      const [statusEntry] = await db
        .insert(entityStatus)
        .values({
          entityType,
          entityId,
          primaryStatus: status, // Use primaryStatus for the main status value
          customStatus: customStatus || null, // Optional custom status 
          eventId: eventId || null,
          musicianId: musicianId || null,
          eventDate: eventDate || null,
          statusDate: new Date(), // Current date when this status is effective
          metadata: metadata || null
        })
        .returning();
      
      // Log activity
      await db.insert(activities).values({
        userId,
        action: 'update_status',
        entityType,
        entityId,
        timestamp: new Date(), // Required field
        details: `Updated ${entityType} status to ${status}${details ? ': ' + details : ''}`
      });
      
      return statusEntry;
    } catch (error) {
      console.error('Error updating entity status:', error);
      throw new Error(`Failed to update status for ${entityType} #${entityId}: ${error.message}`);
    }
  }

  /**
   * Get status configuration for an entity type
   */
  getStatusConfig(entityType: string) {
    // Default configuration
    const defaultConfig = {
      entityType: 'default',
      statuses: [
        {
          value: 'pending',
          label: 'Pending',
          description: 'Waiting for action',
          colorType: 'warning',
          colorClass: 'border-amber-500 text-amber-700'
        },
        {
          value: 'confirmed',
          label: 'Confirmed',
          description: 'Item has been confirmed',
          colorType: 'success',
          colorClass: 'border-green-500 text-green-700'
        },
        {
          value: 'cancelled',
          label: 'Cancelled',
          description: 'Item has been cancelled',
          colorType: 'error',
          colorClass: 'border-red-500 text-red-700'
        }
      ]
    };
    
    // Entity-specific configurations
    const configs: Record<string, any> = {
      'default': defaultConfig,
      
      'contract': {
        entityType: 'contract',
        statuses: [
          {
            value: 'draft',
            label: 'Draft',
            description: 'Contract is in draft state',
            colorType: 'secondary',
            colorClass: 'border-gray-500 text-gray-700'
          },
          {
            value: 'pending',
            label: 'Pending',
            description: 'Contract is waiting for confirmation',
            colorType: 'warning',
            colorClass: 'border-amber-500 text-amber-700'
          },
          {
            value: 'contract-sent',
            label: 'Contract Sent',
            description: 'Contract has been sent to the musician',
            colorType: 'info',
            colorClass: 'border-blue-500 text-blue-700'
          },
          {
            value: 'contract-signed',
            label: 'Contract Signed',
            description: 'Contract has been signed by the musician',
            colorType: 'success',
            colorClass: 'border-emerald-500 text-emerald-700'
          },
          {
            value: 'confirmed',
            label: 'Confirmed',
            description: 'Contract has been confirmed',
            colorType: 'success',
            colorClass: 'border-green-600 text-green-800'
          },
          {
            value: 'rejected',
            label: 'Rejected',
            description: 'Contract has been rejected by the musician',
            colorType: 'error',
            colorClass: 'border-red-500 text-red-700'
          },
          {
            value: 'cancelled',
            label: 'Cancelled',
            description: 'Contract has been cancelled',
            colorType: 'error',
            colorClass: 'border-red-600 text-red-800'
          }
        ]
      },
      
      'musician': {
        entityType: 'musician',
        statuses: [
          {
            value: 'invited',
            label: 'Invited',
            description: 'Musician has been invited',
            colorType: 'secondary',
            colorClass: 'border-gray-500 text-gray-700'
          },
          {
            value: 'pending',
            label: 'Pending',
            description: 'Waiting for musician response',
            colorType: 'warning',
            colorClass: 'border-amber-500 text-amber-700'
          },
          {
            value: 'accepted',
            label: 'Accepted',
            description: 'Musician has accepted the invitation',
            colorType: 'info',
            colorClass: 'border-blue-500 text-blue-700'
          },
          {
            value: 'contract-sent',
            label: 'Contract Sent',
            description: 'Contract has been sent to the musician',
            colorType: 'info',
            colorClass: 'border-indigo-500 text-indigo-700'
          },
          {
            value: 'contract-signed',
            label: 'Contract Signed',
            description: 'Contract has been signed by the musician',
            colorType: 'success',
            colorClass: 'border-emerald-500 text-emerald-700'
          },
          {
            value: 'confirmed',
            label: 'Confirmed',
            description: 'Musician has been confirmed for the event',
            colorType: 'success',
            colorClass: 'border-green-600 text-green-800'
          },
          {
            value: 'rejected',
            label: 'Rejected',
            description: 'Musician has rejected the invitation',
            colorType: 'error',
            colorClass: 'border-red-500 text-red-700'
          },
          {
            value: 'cancelled',
            label: 'Cancelled',
            description: 'Musician booking has been cancelled',
            colorType: 'error',
            colorClass: 'border-red-600 text-red-800'
          },
          {
            value: 'not-available',
            label: 'Not Available',
            description: 'Musician is not available',
            colorType: 'error',
            colorClass: 'border-red-400 text-red-600'
          }
        ]
      },
      
      'event': {
        entityType: 'event',
        statuses: [
          {
            value: 'draft',
            label: 'Draft',
            description: 'Event is in draft state',
            colorType: 'secondary',
            colorClass: 'border-gray-500 text-gray-700'
          },
          {
            value: 'pending',
            label: 'Pending',
            description: 'Event is pending confirmation',
            colorType: 'warning',
            colorClass: 'border-amber-500 text-amber-700'
          },
          {
            value: 'confirmed',
            label: 'Confirmed',
            description: 'Event has been confirmed',
            colorType: 'success',
            colorClass: 'border-green-600 text-green-800'
          },
          {
            value: 'in-progress',
            label: 'In Progress',
            description: 'Event is currently in progress',
            colorType: 'info',
            colorClass: 'border-purple-500 text-purple-700'
          },
          {
            value: 'completed',
            label: 'Completed',
            description: 'Event has been completed',
            colorType: 'success',
            colorClass: 'border-green-500 text-green-700'
          },
          {
            value: 'cancelled',
            label: 'Cancelled',
            description: 'Event has been cancelled',
            colorType: 'error',
            colorClass: 'border-red-600 text-red-800'
          }
        ]
      }
    };
    
    return configs[entityType] || defaultConfig;
  }
}

export const statusService = new StatusService();