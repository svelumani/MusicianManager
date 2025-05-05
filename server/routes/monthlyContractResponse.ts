import { Router } from 'express';
import { db } from '../db';
import { eq, and } from 'drizzle-orm';
import { 
  monthlyContracts, 
  monthlyContractMusicians, 
  monthlyContractDates,
  musicians,
  plannerAssignments,
} from '../../shared/schema';
import { monthlyContractStatusService } from '../services/monthlyContractStatus';
import { sendContractResponseNotification } from '../services/emailService';

/**
 * Handle musician responses to contracts (from email links)
 * Public route - no authentication required as it's accessed from email links
 */
const router = Router();

// Get contract details by token
router.get('/details', async (req, res) => {
  try {
    const { token, id } = req.query;
    
    if (!token || !id) {
      return res.status(400).json({ 
        error: 'Missing token or contract ID' 
      });
    }
    
    // Find the musician contract with this token
    const [musicianContract] = await db
      .select()
      .from(monthlyContractMusicians)
      .where(
        and(
          eq(monthlyContractMusicians.token, String(token)),
          eq(monthlyContractMusicians.contractId, Number(id))
        )
      );
    
    if (!musicianContract) {
      return res.status(404).json({ 
        error: 'Contract not found or token is invalid' 
      });
    }
    
    // Check if contract can be responded to
    if (musicianContract.status !== 'pending' && musicianContract.status !== 'sent') {
      return res.status(400).json({ 
        error: 'Contract has already been responded to',
        status: musicianContract.status
      });
    }
    
    // Get parent contract
    const [contract] = await db
      .select()
      .from(monthlyContracts)
      .where(eq(monthlyContracts.id, musicianContract.contractId));
    
    if (!contract) {
      return res.status(404).json({ 
        error: 'Parent contract not found' 
      });
    }
    
    // Get musician info
    const [musician] = await db
      .select()
      .from(musicians)
      .where(eq(musicians.id, musicianContract.musicianId));
    
    if (!musician) {
      return res.status(404).json({ 
        error: 'Musician not found' 
      });
    }
    
    // Get assigned dates
    const dates = await db
      .select()
      .from(monthlyContractDates)
      .where(eq(monthlyContractDates.musicianContractId, musicianContract.id));
    
    // Get venue details for each date
    const formattedDates = [];
    for (const date of dates) {
      if (date.assignmentId) {
        const [assignment] = await db
          .select()
          .from(plannerAssignments)
          .where(eq(plannerAssignments.id, date.assignmentId));
        
        if (assignment) {
          formattedDates.push({
            id: date.id,
            date: date.date,
            venueName: date.venueName || 'Unknown venue',
            fee: date.fee || 0,
            startTime: date.startTime || '',
            endTime: date.endTime || '',
            assignmentId: date.assignmentId,
          });
        }
      }
    }
    
    return res.json({
      contract: {
        id: contract.id,
        month: contract.month,
        year: contract.year,
        status: musicianContract.status,
        sentAt: musicianContract.sentAt,
        notes: contract.notes,
      },
      musician: {
        id: musician.id,
        name: musician.name,
        email: musician.email,
      },
      dates: formattedDates,
      totalFee: musicianContract.totalFee,
      token: musicianContract.token,
    });
  }
  catch (error) {
    console.error('Error getting contract details:', error);
    return res.status(500).json({ 
      error: 'Server error'
    });
  }
});

// Handle musician response to contract (accept/reject)
router.post('/respond', async (req, res) => {
  try {
    const { token, contractId, action, notes } = req.body;
    
    if (!token || !contractId || !action) {
      return res.status(400).json({ 
        error: 'Missing required fields' 
      });
    }
    
    if (action !== 'accept' && action !== 'reject') {
      return res.status(400).json({ 
        error: 'Invalid action, must be "accept" or "reject"' 
      });
    }
    
    // Find the musician contract by token
    const [musicianContract] = await db
      .select()
      .from(monthlyContractMusicians)
      .where(
        and(
          eq(monthlyContractMusicians.token, String(token)),
          eq(monthlyContractMusicians.contractId, Number(contractId))
        )
      );
    
    if (!musicianContract) {
      return res.status(404).json({ 
        error: 'Contract not found or token is invalid' 
      });
    }
    
    // Check if contract can be responded to
    if (musicianContract.status !== 'pending' && musicianContract.status !== 'sent') {
      return res.status(400).json({ 
        error: 'Contract has already been responded to' 
      });
    }
    
    // Get the musician
    const [musician] = await db
      .select()
      .from(musicians)
      .where(eq(musicians.id, musicianContract.musicianId));
    
    if (!musician) {
      return res.status(404).json({ 
        error: 'Musician not found' 
      });
    }
    
    // Get the contract
    const [contract] = await db
      .select()
      .from(monthlyContracts)
      .where(eq(monthlyContracts.id, musicianContract.contractId));
    
    if (!contract) {
      return res.status(404).json({ 
        error: 'Contract not found' 
      });
    }
    
    // Update status based on action
    const newStatus = action === 'accept' ? 'signed' : 'rejected';
    const now = new Date();
    
    // Record IP address and user agent for audit
    const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    
    // Update the musician contract
    await db
      .update(monthlyContractMusicians)
      .set({
        status: newStatus,
        musicianNotes: notes || null,
        respondedAt: now,
        completedAt: now,
        ipAddress,
        userAgent,
        rejectionReason: action === 'reject' ? notes || null : null,
      })
      .where(eq(monthlyContractMusicians.id, musicianContract.id));
    
    // Update all associated assignments
    await monthlyContractStatusService.updateMusicianContractStatus(
      musicianContract.id,
      newStatus,
      {
        updateAssignments: true,
        updateDates: true,
        updateParentContract: true,
      }
    );
    
    // Send notification email to admin
    if (process.env.SENDGRID_API_KEY && process.env.ADMIN_EMAIL) {
      await sendContractResponseNotification(
        contract,
        musician,
        action === 'accept' ? 'accept' : 'reject',
        notes || undefined
      );
    }
    
    return res.json({
      success: true,
      action,
      message: action === 'accept' 
        ? 'Thank you! Contract accepted successfully.'
        : 'Contract declined. Thank you for your response.',
    });
  }
  catch (error) {
    console.error('Error responding to contract:', error);
    return res.status(500).json({ 
      error: 'Server error'
    });
  }
});

export default router;