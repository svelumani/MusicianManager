import { Router } from 'express';
import { db } from '../db';
import { eq, and, desc, sql } from 'drizzle-orm';
import { 
  monthlyContracts, 
  monthlyContractMusicians, 
  monthlyContractDates,
  musicians,
} from '../../shared/schema';
import { isAuthenticated } from '../auth';

const plannerContractsMusicianRouter = Router();

// Get all musicians in all contracts for a planner
plannerContractsMusicianRouter.get('/planner/:plannerId/musicians', isAuthenticated, async (req, res) => {
  try {
    const { plannerId } = req.params;
    
    if (!plannerId) {
      return res.status(400).json({ message: 'Missing planner ID' });
    }
    
    // Get all contracts for this planner
    const contracts = await db
      .select()
      .from(monthlyContracts)
      .where(eq(monthlyContracts.plannerId, Number(plannerId)))
      .orderBy(desc(monthlyContracts.createdAt));
    
    if (contracts.length === 0) {
      return res.status(200).json([]);
    }
    
    // Get all musician contracts for these contracts
    const musicianContracts = [];
    for (const contract of contracts) {
      const contractMusicians = await db
        .select()
        .from(monthlyContractMusicians)
        .where(eq(monthlyContractMusicians.contractId, contract.id));
      
      // For each musician contract, get the musician details
      for (const mcm of contractMusicians) {
        const [musician] = await db
          .select()
          .from(musicians)
          .where(eq(musicians.id, mcm.musicianId));
        
        musicianContracts.push({
          ...mcm,
          musicianName: musician ? musician.name : 'Unknown Musician',
          contractName: contract.name || `Contract #${contract.id}`
        });
      }
    }
    
    return res.status(200).json(musicianContracts);
    
  } catch (error) {
    console.error('Error fetching planner contract musicians:', error);
    return res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
});

export default plannerContractsMusicianRouter;