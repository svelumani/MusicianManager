import { Router } from 'express';
import { db } from '../db';
import { eq, and, desc } from 'drizzle-orm';
import { 
  monthlyContracts, 
  monthlyContractMusicians, 
  monthlyContractDates,
  monthlyContractStatusHistory,
  musicians,
  contractTemplates,
} from '../../shared/schema';
import { randomUUID } from 'crypto';
import { format } from 'date-fns';
import emailService from '../services/emailService';
import { isAuthenticated } from '../auth';

const contractRouter = Router();

// Get contract by token (for contract response page)
contractRouter.get('/view-by-token', async (req, res) => {
  try {
    const { token, id } = req.query;

    if (!token || !id) {
      return res.status(400).json({ 
        message: 'Missing token or contract ID' 
      });
    }

    // Find the musician contract by token
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
        message: 'Contract not found or token is invalid' 
      });
    }

    // Get the main contract
    const [contract] = await db
      .select()
      .from(monthlyContracts)
      .where(eq(monthlyContracts.id, musicianContract.contractId));

    if (!contract) {
      return res.status(404).json({ 
        message: 'Contract not found' 
      });
    }

    // Get musician details
    const [musician] = await db
      .select()
      .from(musicians)
      .where(eq(musicians.id, musicianContract.musicianId));

    if (!musician) {
      return res.status(404).json({ 
        message: 'Musician not found' 
      });
    }

    // Get contract dates
    const dates = await db
      .select()
      .from(monthlyContractDates)
      .where(
        eq(monthlyContractDates.musicianContractId, musicianContract.id)
      );

    // Format dates for display
    const formattedDates = dates.map(date => ({
      id: date.id,
      date: format(new Date(date.date), 'MMMM d, yyyy'),
      venue: date.venueName || 'Not specified',
      startTime: date.startTime || 'Not specified',
      fee: date.fee || 0,
      status: date.status || 'pending'
    }));

    // Get template information for terms and conditions if available
    let termsAndConditions = "Standard terms and conditions apply.";
    try {
      if (contract.templateId) {
        const [template] = await db
          .select()
          .from(contractTemplates)
          .where(eq(contractTemplates.id, contract.templateId));
        
        if (template && template.content) {
          termsAndConditions = template.content;
        }
      }
    } catch (templateError) {
      console.error("Error fetching contract template:", templateError);
      // Continue with default terms
    }

    // Return formatted contract data
    return res.json({
      id: contract.id,
      musicianId: musician.id,
      musicianName: musician.name,
      month: format(new Date(contract.year, contract.month - 1), 'MMMM'),
      year: contract.year,
      totalAmount: musicianContract.totalFee,
      status: musicianContract.status,
      dates: formattedDates,
      termsAndConditions: termsAndConditions,
      sentAt: musicianContract.sentAt,
      respondedAt: musicianContract.respondedAt,
      completedAt: musicianContract.completedAt,
    });
  } catch (error) {
    console.error('Error retrieving contract by token:', error);
    return res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
});

// Respond to a contract (sign or reject)
contractRouter.post('/respond', async (req, res) => {
  try {
    const { token, contractId, action, comments } = req.body;

    if (!token || !contractId || !action) {
      return res.status(400).json({ 
        message: 'Missing required fields' 
      });
    }

    if (action !== 'sign' && action !== 'reject') {
      return res.status(400).json({ 
        message: 'Invalid action' 
      });
    }

    // Find the musician contract by token
    const [musicianContract] = await db
      .select()
      .from(monthlyContractMusicians)
      .where(
        and(
          eq(monthlyContractMusicians.token, token),
          eq(monthlyContractMusicians.contractId, Number(contractId))
        )
      );

    if (!musicianContract) {
      return res.status(404).json({ 
        message: 'Contract not found or token is invalid' 
      });
    }

    // Check if contract can be responded to
    if (musicianContract.status !== 'pending' && musicianContract.status !== 'sent') {
      return res.status(400).json({ 
        message: 'Contract has already been responded to' 
      });
    }

    // Get musician details
    const [musician] = await db
      .select()
      .from(musicians)
      .where(eq(musicians.id, musicianContract.musicianId));

    if (!musician) {
      return res.status(404).json({ 
        message: 'Musician not found' 
      });
    }

    // Get the admin contract
    const [contract] = await db
      .select()
      .from(monthlyContracts)
      .where(eq(monthlyContracts.id, musicianContract.contractId));

    // Update the contract status
    const newStatus = action === 'sign' ? 'signed' : 'rejected';
    const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
    const now = new Date();

    // Update the musician contract
    await db
      .update(monthlyContractMusicians)
      .set({
        status: newStatus,
        musicianNotes: comments || null,
        respondedAt: musicianContract.respondedAt || now, // Only set if not already set
        completedAt: now,
        ipAddress,
        rejectionReason: action === 'reject' ? comments || null : null,
      })
      .where(eq(monthlyContractMusicians.id, musicianContract.id));

    // Add status history entry
    await db
      .insert(monthlyContractStatusHistory)
      .values({
        contractId: Number(contractId),
        musicianId: musicianContract.musicianId,
        previousStatus: musicianContract.status,
        newStatus: newStatus,
        changedAt: now,
        notes: comments || null,
      });

    // Send notification email to admin if configured
    try {
      if (contract && process.env.SENDGRID_API_KEY && process.env.ADMIN_EMAIL) {
        await emailService.sendContractStatusUpdateEmail(
          process.env.ADMIN_EMAIL,
          musician.name,
          Number(contractId),
          action === 'sign' ? 'signed' : 'rejected',
          comments
        );
      }
    } catch (emailError) {
      console.error('Failed to send admin notification email:', emailError);
      // Continue anyway - this is not critical
    }

    // Return success with action
    return res.json({
      success: true,
      action,
      message: `Contract ${action === 'sign' ? 'signed' : 'rejected'} successfully`,
    });
  } catch (error) {
    console.error('Error responding to contract:', error);
    return res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
});

// Generate contracts for musicians in a planner
contractRouter.post('/generate', isAuthenticated, async (req, res) => {
  try {
    const { plannerId, month, year, musicianId, assignmentIds } = req.body;

    if (!plannerId && !assignmentIds) {
      return res.status(400).json({ message: 'Missing plannerId or assignmentIds' });
    }

    // Will implement actual contract generation logic here in phase 2
    // For now, return success message
    return res.json({
      success: true,
      message: 'Contract generation initiated',
      musicianId,
      plannerId,
      month,
      year,
      assignmentIds
    });
  } catch (error) {
    console.error('Error generating contracts:', error);
    return res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
});

export default contractRouter;