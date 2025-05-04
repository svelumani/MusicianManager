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
      await statusService.updateEntityStatus(
        'monthly-contract',
        contractId,
        newStatus,
        userId,
        notes || `Status changed from ${currentStatus} to ${newStatus}`,
        undefined,
        { previousStatus: currentStatus }
      );
      
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
      await statusService.updateEntityStatus(
        'monthly-contract-musician',
        musicianContractId,
        newStatus,
        userId,
        notes || `Status changed from ${currentStatus} to ${newStatus}`,
        undefined,
        { 
          contractId,
          musicianId,
          previousStatus: currentStatus 
        }
      );
      
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
      await statusService.updateEntityStatus(
        'monthly-contract-date',
        dateId,
        newStatus,
        userId,
        notes || `Status changed from ${currentStatus} to ${newStatus}`,
        undefined,
        { 
          contractId,
          musicianId,
          musicianContractId,
          previousStatus: currentStatus,
          responseNotes
        }
      );
      
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
      // Get counts of different status types
      const countQuery = await db
        .select({
          accepted: count(monthlyContractDates.id).filterWhere(eq(monthlyContractDates.status, 'accepted')),
          rejected: count(monthlyContractDates.id).filterWhere(eq(monthlyContractDates.status, 'rejected')),
          pending: count(monthlyContractDates.id).filterWhere(eq(monthlyContractDates.status, 'pending')),
          total: count(monthlyContractDates.id),
          totalFee: sql<number>`COALESCE(SUM(CASE WHEN ${monthlyContractDates.status} = 'accepted' THEN ${monthlyContractDates.fee} ELSE 0 END), 0)`,
        })
        .from(monthlyContractDates)
        .where(eq(monthlyContractDates.musicianContractId, musicianContractId));
      
      if (!countQuery || countQuery.length === 0) {
        return false;
      }
      
      const { accepted, rejected, pending, total, totalFee } = countQuery[0];
      
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
      
      if (acceptedDates === totalDates) {
        newStatus = 'accepted';
      } else if (rejectedDates === totalDates) {
        newStatus = 'rejected';
      } else if (acceptedDates > 0 && rejectedDates > 0) {
        newStatus = 'partially-accepted';
      } else if (rejectedDates > 0) {
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
          `Status automatically updated based on date responses (${acceptedDates} accepted, ${rejectedDates} rejected, ${pendingDates} pending)`
        );
        
        // Also update the completedAt timestamp if all dates have been responded to
        if (pendingDates === 0 && totalDates > 0) {
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
      
      // Get date counts by status
      const dateCountsQuery = await db
        .select({
          acceptedDates: count(monthlyContractDates.id).filterWhere(eq(monthlyContractDates.status, 'accepted')),
          rejectedDates: count(monthlyContractDates.id).filterWhere(eq(monthlyContractDates.status, 'rejected')),
          pendingDates: count(monthlyContractDates.id).filterWhere(eq(monthlyContractDates.status, 'pending')),
          totalDates: count(monthlyContractDates.id),
          totalFee: sql<number>`COALESCE(SUM(CASE WHEN ${monthlyContractDates.status} = 'accepted' THEN ${monthlyContractDates.fee} ELSE 0 END), 0)`,
        })
        .from(monthlyContractDates)
        .innerJoin(
          monthlyContractMusicians, 
          eq(monthlyContractDates.musicianContractId, monthlyContractMusicians.id)
        )
        .where(eq(monthlyContractMusicians.contractId, contractId));
      
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
        dateStatistics: dateCountsQuery.length > 0 ? {
          acceptedDates: dateCountsQuery[0].acceptedDates,
          rejectedDates: dateCountsQuery[0].rejectedDates,
          pendingDates: dateCountsQuery[0].pendingDates,
          totalDates: dateCountsQuery[0].totalDates,
          totalFee: dateCountsQuery[0].totalFee,
          rejectionRate: dateCountsQuery[0].totalDates > 0 
            ? (dateCountsQuery[0].rejectedDates / dateCountsQuery[0].totalDates) * 100 
            : 0,
        } : null
      };
    } catch (error) {
      console.error('Error getting contract response summary:', error);
      throw error;
    }
  }
}

export const monthlyContractStatusService = new MonthlyContractStatusService();