import express, { Response } from 'express';
import { z } from 'zod';
import { db } from '../db';
import { 
  monthlyContracts,
  monthlyContractMusicians,
  monthlyContractDates,
  musicians,
  type MonthlyContractDate
} from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { monthlyContractStatusService } from '../services/monthlyContractStatus';
import { isAuthenticated, AuthenticatedRequest } from '../auth';

const router = express.Router();

// Define schema for date response
const dateResponseSchema = z.object({
  dateId: z.number(),
  status: z.enum(['accepted', 'rejected']),
  responseNotes: z.string().optional(),
  signature: z.string().optional(),
});

// Get response page data for a specific musician contract
router.get('/token/:token', async (req, res) => {
  try {
    const { token } = req.params;
    
    // Find the musician contract with this token
    const [musicianContract] = await db
      .select()
      .from(monthlyContractMusicians)
      .where(eq(monthlyContractMusicians.token, token));
    
    if (!musicianContract) {
      return res.status(404).json({ message: 'Contract not found' });
    }
    
    // Get the musician info
    const [musician] = await db
      .select()
      .from(musicians)
      .where(eq(musicians.id, musicianContract.musicianId));
    
    if (!musician) {
      return res.status(404).json({ message: 'Musician not found' });
    }
    
    // Get the contract
    const [contract] = await db
      .select()
      .from(monthlyContracts)
      .where(eq(monthlyContracts.id, musicianContract.contractId));
    
    if (!contract) {
      return res.status(404).json({ message: 'Contract not found' });
    }
    
    // Get the dates for this musician
    const dates = await db
      .select()
      .from(monthlyContractDates)
      .where(eq(monthlyContractDates.musicianContractId, musicianContract.id))
      .orderBy(monthlyContractDates.date);
    
    // Transform the response
    return res.json({
      contract: {
        id: contract.id,
        name: contract.name,
        month: contract.month,
        year: contract.year,
        status: contract.status
      },
      musician: {
        id: musician.id,
        name: musician.name,
        email: musician.email
      },
      musicianContract: {
        id: musicianContract.id,
        status: musicianContract.status,
        sentAt: musicianContract.sentAt,
        respondedAt: musicianContract.respondedAt,
        completedAt: musicianContract.completedAt,
        totalDates: musicianContract.totalDates,
        acceptedDates: musicianContract.acceptedDates,
        rejectedDates: musicianContract.rejectedDates,
        pendingDates: musicianContract.pendingDates,
        totalFee: musicianContract.totalFee
      },
      dates: dates.map(date => ({
        id: date.id,
        date: date.date,
        status: date.status,
        fee: date.fee,
        notes: date.notes,
        responseNotes: date.responseNotes,
        venueName: date.venueName,
        startTime: date.startTime,
        endTime: date.endTime,
        responseTimestamp: date.responseTimestamp
      }))
    });
  } catch (error) {
    console.error('Error getting contract response page:', error);
    return res.status(500).json({ message: 'Failed to get contract response page data' });
  }
});

// Process a batch of date responses from a musician
router.post('/token/:token/batch', async (req, res) => {
  try {
    const { token } = req.params;
    const { responses, signature, overallNotes } = req.body;
    
    // Validate responses format
    if (!Array.isArray(responses)) {
      return res.status(400).json({ message: 'Responses must be an array' });
    }
    
    // Find the musician contract with this token
    const [musicianContract] = await db
      .select()
      .from(monthlyContractMusicians)
      .where(eq(monthlyContractMusicians.token, token));
    
    if (!musicianContract) {
      return res.status(404).json({ message: 'Contract not found' });
    }
    
    // Get the musician info for activity tracking
    const [musician] = await db
      .select()
      .from(musicians)
      .where(eq(musicians.id, musicianContract.musicianId));
    
    if (!musician) {
      return res.status(404).json({ message: 'Musician not found' });
    }
    
    // Extract client IP address
    const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress || null;
    
    // Process each date response
    const results = [];
    let hasErrors = false;
    
    for (const response of responses) {
      try {
        const validatedResponse = dateResponseSchema.parse(response);
        
        // Verify that this date belongs to the musician contract
        const [date] = await db
          .select()
          .from(monthlyContractDates)
          .where(
            and(
              eq(monthlyContractDates.id, validatedResponse.dateId),
              eq(monthlyContractDates.musicianContractId, musicianContract.id)
            )
          );
        
        if (!date) {
          results.push({
            dateId: validatedResponse.dateId,
            success: false,
            message: 'Date not found or not associated with this contract'
          });
          hasErrors = true;
          continue;
        }
        
        // Update the date status
        const success = await monthlyContractStatusService.updateDateStatus(
          validatedResponse.dateId,
          validatedResponse.status,
          0, // 0 for system or musician responses
          `Response from ${musician.name}`,
          validatedResponse.responseNotes || overallNotes || '',
          String(ipAddress),
          signature ? { signature, timestamp: new Date() } : undefined
        );
        
        if (success) {
          results.push({
            dateId: validatedResponse.dateId,
            date: date.date,
            success: true,
            message: `Successfully updated status to ${validatedResponse.status}`
          });
        } else {
          results.push({
            dateId: validatedResponse.dateId,
            success: false,
            message: 'Failed to update date status'
          });
          hasErrors = true;
        }
      } catch (error) {
        console.error('Error processing date response:', error);
        results.push({
          dateId: response.dateId || 'unknown',
          success: false,
          message: error instanceof Error ? error.message : 'Invalid response format'
        });
        hasErrors = true;
      }
    }
    
    // Update musician signature if provided
    if (signature && !hasErrors) {
      await db
        .update(monthlyContractMusicians)
        .set({ 
          musicianSignature: signature,
          ipAddress: String(ipAddress),
          musicianNotes: overallNotes || null
        })
        .where(eq(monthlyContractMusicians.id, musicianContract.id));
    }
    
    // Get the updated status summary
    try {
      const summary = await monthlyContractStatusService.getContractResponseSummary(
        musicianContract.contractId
      );
      
      return res.json({
        success: !hasErrors,
        message: hasErrors 
          ? 'Some responses failed to process' 
          : 'All responses processed successfully',
        results,
        summary
      });
    } catch (summaryError) {
      console.error('Error generating summary:', summaryError);
      return res.status(200).json({
        success: !hasErrors,
        message: hasErrors 
          ? 'Some responses failed to process' 
          : 'All responses processed successfully',
        results
      });
    }
  } catch (error) {
    console.error('Error processing batch responses:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to process responses',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Process a single date response from a musician
router.post('/token/:token/dates/:dateId', async (req, res) => {
  try {
    const { token, dateId } = req.params;
    const { status, responseNotes, signature } = req.body;
    
    // Validate required fields
    if (!status || !['accepted', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Valid status is required (accepted or rejected)' });
    }
    
    // Find the musician contract with this token
    const [musicianContract] = await db
      .select()
      .from(monthlyContractMusicians)
      .where(eq(monthlyContractMusicians.token, token));
    
    if (!musicianContract) {
      return res.status(404).json({ message: 'Contract not found' });
    }
    
    // Get the musician info for activity tracking
    const [musician] = await db
      .select()
      .from(musicians)
      .where(eq(musicians.id, musicianContract.musicianId));
    
    if (!musician) {
      return res.status(404).json({ message: 'Musician not found' });
    }
    
    // Verify that this date belongs to the musician contract
    const [date] = await db
      .select()
      .from(monthlyContractDates)
      .where(
        and(
          eq(monthlyContractDates.id, parseInt(dateId)),
          eq(monthlyContractDates.musicianContractId, musicianContract.id)
        )
      );
    
    if (!date) {
      return res.status(404).json({ 
        message: 'Date not found or not associated with this contract' 
      });
    }
    
    // Extract client IP address
    const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress || null;
    
    // Update the date status
    const success = await monthlyContractStatusService.updateDateStatus(
      parseInt(dateId),
      status,
      0, // 0 for system or musician responses
      `Response from ${musician.name}`,
      responseNotes || '',
      String(ipAddress),
      signature ? { signature, timestamp: new Date() } : undefined
    );
    
    if (!success) {
      return res.status(500).json({ message: 'Failed to update date status' });
    }
    
    // Update musician signature if provided
    if (signature) {
      await db
        .update(monthlyContractMusicians)
        .set({ 
          musicianSignature: signature,
          ipAddress: String(ipAddress)
        })
        .where(eq(monthlyContractMusicians.id, musicianContract.id));
    }
    
    // Return the updated date
    const [updatedDate] = await db
      .select()
      .from(monthlyContractDates)
      .where(eq(monthlyContractDates.id, parseInt(dateId)));
    
    return res.json({
      success: true,
      message: `Successfully updated status to ${status}`,
      date: updatedDate
    });
  } catch (error) {
    console.error('Error processing date response:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to process response',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Admin routes for contract management

// Get a summary of responses for a contract
router.get('/:contractId/summary', isAuthenticated, async (req: AuthenticatedRequest, res) => {
  try {
    const { contractId } = req.params;
    
    const summary = await monthlyContractStatusService.getContractResponseSummary(
      parseInt(contractId)
    );
    
    return res.json(summary);
  } catch (error) {
    console.error('Error getting contract response summary:', error);
    return res.status(500).json({ 
      message: 'Failed to get contract response summary',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Update the status of a monthly contract musician
router.put('/musicians/:musicianContractId/status', isAuthenticated, async (req: AuthenticatedRequest, res) => {
  try {
    const { musicianContractId } = req.params;
    const { status, notes } = req.body;
    
    if (!status || !['pending', 'accepted', 'partially-accepted', 'rejected', 'needs-attention'].includes(status)) {
      return res.status(400).json({ message: 'Valid status is required' });
    }
    
    const success = await monthlyContractStatusService.updateMusicianContractStatus(
      parseInt(musicianContractId),
      status,
      req.user?.id || 1, // Use authenticated user ID or default to admin
      notes
    );
    
    if (!success) {
      return res.status(500).json({ 
        message: 'Failed to update musician contract status' 
      });
    }
    
    // Get the updated musician contract
    const [musicianContract] = await db
      .select()
      .from(monthlyContractMusicians)
      .where(eq(monthlyContractMusicians.id, parseInt(musicianContractId)));
    
    return res.json({
      success: true,
      message: `Successfully updated status to ${status}`,
      musicianContract
    });
  } catch (error) {
    console.error('Error updating musician contract status:', error);
    return res.status(500).json({ 
      message: 'Failed to update musician contract status',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Update the status of a monthly contract
router.put('/:contractId/status', isAuthenticated, async (req: AuthenticatedRequest, res) => {
  try {
    const { contractId } = req.params;
    const { status, notes } = req.body;
    
    if (!status || !['draft', 'sent', 'in-progress', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({ message: 'Valid status is required' });
    }
    
    const success = await monthlyContractStatusService.updateContractStatus(
      parseInt(contractId),
      status,
      req.user?.id || 1, // Use authenticated user ID or default to admin
      notes
    );
    
    if (!success) {
      return res.status(500).json({ message: 'Failed to update contract status' });
    }
    
    // Get the updated contract
    const [contract] = await db
      .select()
      .from(monthlyContracts)
      .where(eq(monthlyContracts.id, parseInt(contractId)));
    
    return res.json({
      success: true,
      message: `Successfully updated status to ${status}`,
      contract
    });
  } catch (error) {
    console.error('Error updating contract status:', error);
    return res.status(500).json({ 
      message: 'Failed to update contract status',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;