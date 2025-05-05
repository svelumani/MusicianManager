import { db } from '../db';
import { eq, and } from 'drizzle-orm';
import { 
  monthlyContracts, 
  monthlyContractMusicians, 
  monthlyContractDates,
  plannerAssignments
} from '../../shared/schema';

/**
 * Service to handle monthly contract status synchronization
 * 
 * This ensures that when a contract status changes, all related entities
 * (contract musician entries, contract dates, and planner assignments)
 * are synchronized to have the same status.
 */
export class MonthlyContractStatusService {
  /**
   * Updates the status of a contract and all related entities
   */
  async updateContractStatus(
    contractId: number,
    newStatus: string,
    options: {
      updateAssignments?: boolean;
      updateMusicianContracts?: boolean;
      updateDates?: boolean;
    } = {}
  ): Promise<boolean> {
    try {
      const defaultOptions = {
        updateAssignments: true,
        updateMusicianContracts: true,
        updateDates: true,
      };
      
      const opts = { ...defaultOptions, ...options };
      const now = new Date();
      
      // Update the main contract
      await db
        .update(monthlyContracts)
        .set({
          status: newStatus,
          updatedAt: now
        })
        .where(eq(monthlyContracts.id, contractId));
      
      // Update musician contracts if needed
      if (opts.updateMusicianContracts) {
        await db
          .update(monthlyContractMusicians)
          .set({
            status: newStatus,
            updatedAt: now
          })
          .where(eq(monthlyContractMusicians.contractId, contractId));
      }
      
      // Update contract dates if needed
      if (opts.updateDates) {
        // First, get all musician contract IDs for this contract
        const musicianContracts = await db
          .select({ id: monthlyContractMusicians.id })
          .from(monthlyContractMusicians)
          .where(eq(monthlyContractMusicians.contractId, contractId));
        
        for (const mc of musicianContracts) {
          await db
            .update(monthlyContractDates)
            .set({
              status: newStatus,
              updatedAt: now
            })
            .where(eq(monthlyContractDates.musicianContractId, mc.id));
        }
      }
      
      // Update associated planner assignments if needed
      if (opts.updateAssignments) {
        await db
          .update(plannerAssignments)
          .set({
            contractStatus: newStatus
          })
          .where(eq(plannerAssignments.contractId, contractId));
      }
      
      return true;
    } catch (error) {
      console.error(`Error updating contract status: ${error}`);
      return false;
    }
  }
  
  /**
   * Updates the status of a specific musician's contract and related entities
   */
  async updateMusicianContractStatus(
    musicianContractId: number,
    newStatus: string,
    options: {
      updateAssignments?: boolean;
      updateParentContract?: boolean;
      updateDates?: boolean;
    } = {}
  ): Promise<boolean> {
    try {
      const defaultOptions = {
        updateAssignments: true,
        updateParentContract: false, // Don't update parent by default
        updateDates: true,
      };
      
      const opts = { ...defaultOptions, ...options };
      const now = new Date();
      
      // Get the musician contract first to know the parent contract ID
      const [musicianContract] = await db
        .select()
        .from(monthlyContractMusicians)
        .where(eq(monthlyContractMusicians.id, musicianContractId));
      
      if (!musicianContract) {
        console.error(`Musician contract not found: ${musicianContractId}`);
        return false;
      }
      
      // Update the musician contract
      await db
        .update(monthlyContractMusicians)
        .set({
          status: newStatus,
          updatedAt: now
        })
        .where(eq(monthlyContractMusicians.id, musicianContractId));
      
      // Update contract dates if needed
      if (opts.updateDates) {
        await db
          .update(monthlyContractDates)
          .set({
            status: newStatus,
            updatedAt: now
          })
          .where(eq(monthlyContractDates.musicianContractId, musicianContractId));
      }
      
      // Update associated planner assignments if needed
      if (opts.updateAssignments) {
        // Get all dates associated with this musician contract
        const dates = await db
          .select()
          .from(monthlyContractDates)
          .where(eq(monthlyContractDates.musicianContractId, musicianContractId));
        
        // Get the assignment IDs associated with these dates
        for (const date of dates) {
          if (date.assignmentId) {
            await db
              .update(plannerAssignments)
              .set({
                contractStatus: newStatus
              })
              .where(eq(plannerAssignments.id, date.assignmentId));
          }
        }
      }
      
      // Update parent contract if needed
      if (opts.updateParentContract) {
        await db
          .update(monthlyContracts)
          .set({
            status: newStatus,
            updatedAt: now
          })
          .where(eq(monthlyContracts.id, musicianContract.contractId));
      }
      
      return true;
    } catch (error) {
      console.error(`Error updating musician contract status: ${error}`);
      return false;
    }
  }
  
  /**
   * Checks if all musician contracts in a contract have the same status
   * and updates the parent contract status if needed
   */
  async synchronizeContractStatus(contractId: number): Promise<boolean> {
    try {
      // Get all musician contracts for this contract
      const musicianContracts = await db
        .select()
        .from(monthlyContractMusicians)
        .where(eq(monthlyContractMusicians.contractId, contractId));
      
      if (musicianContracts.length === 0) {
        console.warn(`No musician contracts found for contract ID: ${contractId}`);
        return false;
      }
      
      // Check if all have the same status
      const statuses = new Set(musicianContracts.map(mc => mc.status));
      
      if (statuses.size === 1) {
        // All statuses are the same, update parent contract
        const status = musicianContracts[0].status;
        await db
          .update(monthlyContracts)
          .set({
            status,
            updatedAt: new Date()
          })
          .where(eq(monthlyContracts.id, contractId));
        
        return true;
      } else if (statuses.size > 1) {
        // Mixed statuses, set parent contract to 'mixed'
        await db
          .update(monthlyContracts)
          .set({
            status: 'mixed',
            updatedAt: new Date()
          })
          .where(eq(monthlyContracts.id, contractId));
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error(`Error synchronizing contract status: ${error}`);
      return false;
    }
  }
}

// Export a singleton instance
export const monthlyContractStatusService = new MonthlyContractStatusService();