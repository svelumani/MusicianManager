import { eq, and, asc, desc, count, sql } from 'drizzle-orm';
import { db, pool } from '../db';
import { statusService } from './status';
import { 
  monthlyContracts, 
  monthlyContractMusicians,
  monthlyContractDates,
  monthlyContractStatusHistory,
  type MonthlyContract,
  type MonthlyContractMusician,
  type MonthlyContractDate
} from '@shared/schema';

/**
 * Service to manage monthly contract status including automatic status synchronization
 * between contract level, musician level and date level statuses
 */
class MonthlyContractStatusService {
  /**
   * Initialize a new monthly contract's status
   */
  async initializeContractStatus(contractId: number, userId: number) {
    try {
      // Set initial status to 'draft'
      await statusService.updateEntityStatus(
        'monthly-contract',
        contractId,
        'draft',
        userId,
        'Contract created',
        undefined,
        { action: 'contract-created' }
      );
      
      return true;
    } catch (error) {
      console.error('Error initializing contract status:', error);
      return false;
    }
  }
  
  /**
   * Update a monthly contract's status and record in history
   */
  async updateContractStatus(
    contractId: number, 
    newStatus: string, 
    userId: number, 
    notes?: string
  ) {
    try {
      // Get current status
      const contract = await db
        .select()
        .from(monthlyContracts)
        .where(eq(monthlyContracts.id, contractId))
        .limit(1);
      
      if (!contract || contract.length === 0) {
        throw new Error(`Contract #${contractId} not found`);
      }
      
      const currentStatus = contract[0].status;
      
      // Skip if status hasn't changed
      if (currentStatus === newStatus) {
        return true;
      }
      
      // Record status change in history
      await db.insert(monthlyContractStatusHistory).values({
        contractId,
        previousStatus: currentStatus,
        newStatus,
        changedById: userId,
        notes
      });
      
      // Update contract status
      await db
        .update(monthlyContracts)
        .set({ 
          status: newStatus,
          updatedAt: new Date()
        })
        .where(eq(monthlyContracts.id, contractId));
      
      // Record in entity status
      try {
        await statusService.updateEntityStatus(
          'monthly-contract',
          contractId,
          newStatus,
          userId,
          notes || `Status changed from ${currentStatus} to ${newStatus}`,
          undefined, // eventId - will be handled in the status service
          { previousStatus: currentStatus }
        );
      } catch (error) {
        console.error('Error updating entity status:', error);
        // Continue execution even if the status update fails
        // We've already updated the main record in the database
      }
      
      return true;
    } catch (error) {
      console.error('Error updating contract status:', error);
      return false;
    }
  }
  
  /**
   * Update a musician's status within a monthly contract
   */
  async updateMusicianContractStatus(
    musicianContractId: number,
    newStatus: string,
    userId: number,
    notes?: string
  ) {
    try {
      // Get current musician contract
      const musicianContract = await db
        .select()
        .from(monthlyContractMusicians)
        .where(eq(monthlyContractMusicians.id, musicianContractId))
        .limit(1);
      
      if (!musicianContract || musicianContract.length === 0) {
        throw new Error(`Musician contract #${musicianContractId} not found`);
      }
      
      const { contractId, musicianId, status: currentStatus } = musicianContract[0];
      
      // Skip if status hasn't changed
      if (currentStatus === newStatus) {
        return true;
      }
      
      // Update musician status
      await db
        .update(monthlyContractMusicians)
        .set({ 
          status: newStatus,
          respondedAt: newStatus !== 'pending' ? new Date() : undefined
        })
        .where(eq(monthlyContractMusicians.id, musicianContractId));
      
      // Record in entity status
      try {
        await statusService.updateEntityStatus(
          'monthly-contract-musician',
          musicianContractId,
          newStatus,
          userId,
          notes || `Status changed from ${currentStatus} to ${newStatus}`,
          undefined, // eventId - will be handled in the status service
          { 
            contractId,
            musicianId,
            previousStatus: currentStatus 
          }
        );
      } catch (error) {
        console.error('Error updating entity status for musician contract:', error);
        // Continue execution even if the status update fails
        // We've already updated the main record in the database
      }
      
      // Check if we need to update parent contract status
      await this.syncContractStatus(contractId, userId);
      
      return true;
    } catch (error) {
      console.error('Error updating musician contract status:', error);
      return false;
    }
  }
  
  /**
   * Update a date's status within a monthly contract
   */
  async updateDateStatus(
    dateId: number,
    newStatus: string,
    userId: number,
    notes?: string,
    responseNotes?: string,
    ipAddress?: string,
    signatureData?: any
  ) {
    try {
      // Get current date
      const dateRecord = await db
        .select()
        .from(monthlyContractDates)
        .where(eq(monthlyContractDates.id, dateId))
        .limit(1);
      
      if (!dateRecord || dateRecord.length === 0) {
        throw new Error(`Contract date #${dateId} not found`);
      }
      
      const { musicianContractId, status: currentStatus } = dateRecord[0];
      
      // Skip if status hasn't changed
      if (currentStatus === newStatus) {
        return true;
      }
      
      // Get musician contract
      const musicianContract = await db
        .select()
        .from(monthlyContractMusicians)
        .where(eq(monthlyContractMusicians.id, musicianContractId))
        .limit(1);
      
      if (!musicianContract || musicianContract.length === 0) {
        throw new Error(`Musician contract #${musicianContractId} not found`);
      }
      
      const { contractId, musicianId } = musicianContract[0];
      
      // Update date status
      await db
        .update(monthlyContractDates)
        .set({ 
          status: newStatus,
          responseNotes: responseNotes,
          responseTimestamp: new Date(),
          ipAddress: ipAddress,
          signatureData: signatureData ? signatureData : undefined,
          updatedAt: new Date()
        })
        .where(eq(monthlyContractDates.id, dateId));
      
      // Record in entity status
      try {
        await statusService.updateEntityStatus(
          'monthly-contract-date',
          dateId,
          newStatus,
          userId,
          notes || `Status changed from ${currentStatus} to ${newStatus}`,
          undefined, // eventId - will be handled in the status service
          { 
            contractId,
            musicianId,
            musicianContractId,
            previousStatus: currentStatus,
            responseNotes
          }
        );
      } catch (error) {
        console.error('Error updating entity status for contract date:', error);
        // Continue execution even if the status update fails
        // We've already updated the main record in the database
      }
      
      // Update musician accepted/rejected counts
      await this.updateMusicianResponseCounts(musicianContractId);
      
      // Check if we need to update musician contract status
      await this.syncMusicianContractStatus(musicianContractId, userId);
      
      return true;
    } catch (error) {
      console.error('Error updating date status:', error);
      return false;
    }
  }
  
  /**
   * Update the response counts (accepted/rejected/pending) for a musician contract
   */
  async updateMusicianResponseCounts(musicianContractId: number) {
    try {
      // Get counts of different status types using separate queries since filterWhere isn't available
      const acceptedCount = await db
        .select({ count: count() })
        .from(monthlyContractDates)
        .where(and(
          eq(monthlyContractDates.musicianContractId, musicianContractId),
          eq(monthlyContractDates.status, 'accepted')
        ));
        
      const rejectedCount = await db
        .select({ count: count() })
        .from(monthlyContractDates)
        .where(and(
          eq(monthlyContractDates.musicianContractId, musicianContractId),
          eq(monthlyContractDates.status, 'rejected')
        ));
        
      const pendingCount = await db
        .select({ count: count() })
        .from(monthlyContractDates)
        .where(and(
          eq(monthlyContractDates.musicianContractId, musicianContractId),
          eq(monthlyContractDates.status, 'pending')
        ));
        
      const totalCount = await db
        .select({ count: count() })
        .from(monthlyContractDates)
        .where(eq(monthlyContractDates.musicianContractId, musicianContractId));
        
      const totalFeeQuery = await db
        .select({
          totalFee: sql<number>`COALESCE(SUM(CASE WHEN status = 'accepted' THEN fee ELSE 0 END), 0)`
        })
        .from(monthlyContractDates)
        .where(eq(monthlyContractDates.musicianContractId, musicianContractId));
      
      if (!acceptedCount || !rejectedCount || !pendingCount || !totalCount || !totalFeeQuery || 
          acceptedCount.length === 0 || rejectedCount.length === 0 || pendingCount.length === 0 || 
          totalCount.length === 0 || totalFeeQuery.length === 0) {
        return false;
      }
      
      const accepted = acceptedCount[0].count;
      const rejected = rejectedCount[0].count;
      const pending = pendingCount[0].count;
      const total = totalCount[0].count;
      const totalFee = totalFeeQuery[0].totalFee;
      
      // Update the musician contract with the new counts
      await db
        .update(monthlyContractMusicians)
        .set({ 
          acceptedDates: accepted,
          rejectedDates: rejected,
          pendingDates: pending,
          totalDates: total,
          totalFee: totalFee
        })
        .where(eq(monthlyContractMusicians.id, musicianContractId));
      
      return true;
    } catch (error) {
      console.error('Error updating musician response counts:', error);
      return false;
    }
  }
  
  /**
   * Synchronize a musician contract's status based on its date statuses
   */
  async syncMusicianContractStatus(musicianContractId: number, userId: number) {
    try {
      // Get current counts
      const musicianContract = await db
        .select()
        .from(monthlyContractMusicians)
        .where(eq(monthlyContractMusicians.id, musicianContractId))
        .limit(1);
      
      if (!musicianContract || musicianContract.length === 0) {
        return false;
      }
      
      const { acceptedDates, rejectedDates, pendingDates, totalDates, status: currentStatus } = musicianContract[0];
      
      // Determine new status based on the date counts
      let newStatus = currentStatus;
      
      // Handle null values safely
      const accepted = acceptedDates || 0;
      const rejected = rejectedDates || 0;
      const pending = pendingDates || 0;
      const total = totalDates || 0;
      
      if (total === 0) {
        newStatus = 'pending'; // No dates to respond to
      } else if (accepted === total) {
        newStatus = 'accepted';
      } else if (rejected === total) {
        newStatus = 'rejected';
      } else if (accepted > 0 && rejected > 0) {
        newStatus = 'partially-accepted';
      } else if (rejected > 0) {
        newStatus = 'needs-attention';
      } else {
        newStatus = 'pending';
      }
      
      // Only update if the status has changed
      if (newStatus !== currentStatus) {
        await this.updateMusicianContractStatus(
          musicianContractId, 
          newStatus, 
          userId,
          `Status automatically updated based on date responses (${accepted} accepted, ${rejected} rejected, ${pending} pending)`
        );
        
        // Also update the completedAt timestamp if all dates have been responded to
        if (pending === 0 && total > 0) {
          await db
            .update(monthlyContractMusicians)
            .set({ completedAt: new Date() })
            .where(eq(monthlyContractMusicians.id, musicianContractId));
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error syncing musician contract status:', error);
      return false;
    }
  }
  
  /**
   * Synchronize a contract's status based on its musicians' statuses
   */
  async syncContractStatus(contractId: number, userId: number) {
    try {
      // Get all musician contracts for this contract
      const musicianContracts = await db
        .select()
        .from(monthlyContractMusicians)
        .where(eq(monthlyContractMusicians.contractId, contractId));
      
      if (!musicianContracts || musicianContracts.length === 0) {
        return false;
      }
      
      // Get current contract
      const contract = await db
        .select()
        .from(monthlyContracts)
        .where(eq(monthlyContracts.id, contractId))
        .limit(1);
      
      if (!contract || contract.length === 0) {
        return false;
      }
      
      const currentStatus = contract[0].status;
      
      // Count different statuses
      const pendingCount = musicianContracts.filter(mc => mc.status === 'pending').length;
      const acceptedCount = musicianContracts.filter(mc => mc.status === 'accepted').length;
      const partialCount = musicianContracts.filter(mc => mc.status === 'partially-accepted').length;
      const rejectedCount = musicianContracts.filter(mc => mc.status === 'rejected').length;
      const attentionCount = musicianContracts.filter(mc => mc.status === 'needs-attention').length;
      const totalCount = musicianContracts.length;
      
      // Determine new contract status
      let newStatus = currentStatus;
      
      // Only update status for contracts that have been sent
      if (currentStatus === 'sent' || currentStatus === 'in-progress') {
        if (pendingCount === 0 && totalCount > 0) {
          newStatus = 'completed';
        } else if (pendingCount < totalCount && (acceptedCount > 0 || partialCount > 0 || rejectedCount > 0 || attentionCount > 0)) {
          newStatus = 'in-progress';
        }
      }
      
      // Only update if status has changed
      if (newStatus !== currentStatus) {
        await this.updateContractStatus(
          contractId,
          newStatus,
          userId,
          `Status automatically updated based on musician responses`
        );
      }
      
      return true;
    } catch (error) {
      console.error('Error syncing contract status:', error);
      return false;
    }
  }
  
  /**
   * Generate a summary of all date responses for a contract
   */
  async getContractResponseSummary(contractId: number) {
    try {
      // Get the contract
      const contract = await db
        .select()
        .from(monthlyContracts)
        .where(eq(monthlyContracts.id, contractId))
        .limit(1);
      
      if (!contract || contract.length === 0) {
        throw new Error(`Contract #${contractId} not found`);
      }
      
      // Get all musician contracts
      const musicianContracts = await db
        .select()
        .from(monthlyContractMusicians)
        .where(eq(monthlyContractMusicians.contractId, contractId));
      
      // Get overall stats
      const totalMusicians = musicianContracts.length;
      const respondedMusicians = musicianContracts.filter(mc => mc.status !== 'pending').length;
      const acceptedMusicians = musicianContracts.filter(mc => mc.status === 'accepted').length;
      const partialMusicians = musicianContracts.filter(mc => mc.status === 'partially-accepted').length;
      const rejectedMusicians = musicianContracts.filter(mc => mc.status === 'rejected').length;
      const needsAttentionMusicians = musicianContracts.filter(mc => mc.status === 'needs-attention').length;
      
      // Get accepted dates count
      const acceptedDatesQuery = await db
        .select({ count: count() })
        .from(monthlyContractDates)
        .innerJoin(
          monthlyContractMusicians, 
          eq(monthlyContractDates.musicianContractId, monthlyContractMusicians.id)
        )
        .where(and(
          eq(monthlyContractMusicians.contractId, contractId),
          eq(monthlyContractDates.status, 'accepted')
        ));
        
      // Get rejected dates count
      const rejectedDatesQuery = await db
        .select({ count: count() })
        .from(monthlyContractDates)
        .innerJoin(
          monthlyContractMusicians, 
          eq(monthlyContractDates.musicianContractId, monthlyContractMusicians.id)
        )
        .where(and(
          eq(monthlyContractMusicians.contractId, contractId),
          eq(monthlyContractDates.status, 'rejected')
        ));
        
      // Get pending dates count
      const pendingDatesQuery = await db
        .select({ count: count() })
        .from(monthlyContractDates)
        .innerJoin(
          monthlyContractMusicians, 
          eq(monthlyContractDates.musicianContractId, monthlyContractMusicians.id)
        )
        .where(and(
          eq(monthlyContractMusicians.contractId, contractId),
          eq(monthlyContractDates.status, 'pending')
        ));
        
      // Get total dates count
      const totalDatesQuery = await db
        .select({ count: count() })
        .from(monthlyContractDates)
        .innerJoin(
          monthlyContractMusicians, 
          eq(monthlyContractDates.musicianContractId, monthlyContractMusicians.id)
        )
        .where(eq(monthlyContractMusicians.contractId, contractId));
        
      // Get total fee
      const totalFeeQuery = await db
        .select({
          totalFee: sql<number>`COALESCE(SUM(CASE WHEN ${monthlyContractDates.status} = 'accepted' THEN ${monthlyContractDates.fee} ELSE 0 END), 0)`,
        })
        .from(monthlyContractDates)
        .innerJoin(
          monthlyContractMusicians, 
          eq(monthlyContractDates.musicianContractId, monthlyContractMusicians.id)
        )
        .where(eq(monthlyContractMusicians.contractId, contractId));
      
      const acceptedDates = acceptedDatesQuery[0].count;
      const rejectedDates = rejectedDatesQuery[0].count;
      const pendingDates = pendingDatesQuery[0].count;
      const totalDates = totalDatesQuery[0].count;
      const totalFee = totalFeeQuery[0].totalFee;
      
      // Create the summary object
      return {
        contractId,
        contractStatus: contract[0].status,
        statusCounts: {
          totalMusicians,
          respondedMusicians,
          acceptedMusicians,
          partialMusicians,
          rejectedMusicians,
          needsAttentionMusicians,
          responseRate: totalMusicians > 0 ? (respondedMusicians / totalMusicians) * 100 : 0,
        },
        dateStatistics: {
          acceptedDates,
          rejectedDates,
          pendingDates,
          totalDates,
          totalFee,
          rejectionRate: totalDates > 0 ? (rejectedDates / totalDates) * 100 : 0,
        }
      };
    } catch (error) {
      console.error('Error getting contract response summary:', error);
      throw error;
    }
  }
}

export const monthlyContractStatusService = new MonthlyContractStatusService();