/**
 * Script to migrate existing contract status data from contractLinks to entityStatus
 * 
 * This script will:
 * 1. Query all existing contract links
 * 2. For each contract, add a corresponding entry in the entityStatus table if one doesn't exist
 * 3. Log the migration progress
 */

import { db } from '../server/db';
import { contractLinks, entityStatus } from '../shared/schema';
import { eq, and, isNull } from 'drizzle-orm';

// Entity types constant (keep in sync with status service)
const ENTITY_TYPES = {
  CONTRACT: 'contract',
  MUSICIAN: 'musician',
  EVENT: 'event',
  BOOKING: 'booking',
  INVITATION: 'invitation'
};

// Map contractLinks status values to entityStatus primary status values
const statusMap = {
  'pending': 'pending',
  'sent': 'contract-sent',
  'contract-sent': 'contract-sent',
  'accepted': 'contract-signed',
  'contract-signed': 'contract-signed',
  'rejected': 'rejected',
  'cancelled': 'cancelled'
};

async function migrateContractStatus() {
  try {
    console.log('Starting contract status migration...');
    
    // Get all contract links
    const contracts = await db.select().from(contractLinks);
    console.log(`Found ${contracts.length} contracts to process`);
    
    // Process each contract
    for (const contract of contracts) {
      try {
        // Check if an entityStatus entry already exists for this contract
        const [existingStatus] = await db.select()
          .from(entityStatus)
          .where(and(
            eq(entityStatus.entityType, ENTITY_TYPES.CONTRACT),
            eq(entityStatus.entityId, contract.id)
          ));
        
        if (existingStatus) {
          console.log(`Status already exists for contract ${contract.id}, skipping`);
          continue;
        }
        
        // Map original status to primary status
        const primaryStatus = statusMap[contract.status] || contract.status;
        
        // Create metadata from contract fields
        const metadata = {
          bookingId: contract.bookingId,
          amount: contract.amount,
          invitationId: contract.invitationId,
          responseAt: contract.respondedAt?.toISOString(),
          response: contract.response,
          companySignature: contract.companySignature,
          musicianSignature: contract.musicianSignature
        };
        
        // Insert the status into entityStatus table
        const [newStatus] = await db.insert(entityStatus)
          .values({
            entityType: ENTITY_TYPES.CONTRACT,
            entityId: contract.id,
            primaryStatus,
            statusDate: contract.updatedAt || contract.createdAt,
            eventId: contract.eventId,
            musicianId: contract.musicianId,
            eventDate: contract.eventDate,
            createdAt: contract.createdAt,
            createdBy: 'system-migration',
            metadata
          })
          .returning();
        
        console.log(`Migrated contract ${contract.id} status: ${contract.status} → ${primaryStatus}`);
        
        // If status is contract-signed or rejected, also create a corresponding musician status
        if (primaryStatus === 'contract-signed' || primaryStatus === 'rejected') {
          // Check if musician status already exists
          const [existingMusicianStatus] = await db.select()
            .from(entityStatus)
            .where(and(
              eq(entityStatus.entityType, ENTITY_TYPES.MUSICIAN),
              eq(entityStatus.entityId, contract.musicianId),
              eq(entityStatus.eventId, contract.eventId),
              eq(entityStatus.eventDate, contract.eventDate || null)
            ));
          
          if (!existingMusicianStatus) {
            // Create musician status
            const musicianStatus = primaryStatus === 'contract-signed' ? 'confirmed' : 'unavailable';
            const musicianCustomStatus = primaryStatus;
            
            await db.insert(entityStatus)
              .values({
                entityType: ENTITY_TYPES.MUSICIAN,
                entityId: contract.musicianId,
                primaryStatus: musicianStatus,
                customStatus: musicianCustomStatus,
                statusDate: contract.updatedAt || contract.createdAt,
                eventId: contract.eventId,
                eventDate: contract.eventDate,
                createdAt: contract.createdAt,
                createdBy: 'system-migration',
                metadata: {
                  contractId: contract.id,
                  bookingId: contract.bookingId,
                  invitationId: contract.invitationId,
                  amount: contract.amount
                }
              })
              .returning();
            
            console.log(`Created musician ${contract.musicianId} status: ${musicianStatus} (custom: ${musicianCustomStatus})`);
          }
        }
      } catch (contractError) {
        console.error(`Error processing contract ${contract.id}:`, contractError);
      }
    }
    
    console.log('Contract status migration completed successfully!');
  } catch (error) {
    console.error('Contract status migration failed:', error);
  } finally {
    // Close the database connection
    await db.end();
  }
}

// Run the migration
migrateContractStatus();