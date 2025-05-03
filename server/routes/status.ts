import { Router } from 'express';
import { z } from 'zod';
import { isAuthenticated } from '../auth';
import { statusService, ENTITY_TYPES } from '../services/status';

const statusRouter = Router();

// Schema for status update requests
const updateStatusSchema = z.object({
  entityType: z.string(),
  entityId: z.number().int().positive(),
  newStatus: z.string(),
  eventId: z.number().int().positive(),
  musicianId: z.number().int().positive().optional(),
  eventDate: z.string().optional().transform(val => val ? new Date(val) : undefined),
  metadata: z.any().optional()
});

// Schema for status query requests
const getStatusSchema = z.object({
  entityType: z.string(),
  entityId: z.number().int().positive(),
  eventDate: z.string().optional().transform(val => val ? new Date(val) : undefined)
});

// Get status for entity
statusRouter.get('/', isAuthenticated, async (req, res) => {
  try {
    const query = getStatusSchema.safeParse({
      entityType: req.query.entityType,
      entityId: parseInt(req.query.entityId as string),
      eventDate: req.query.eventDate
    });

    if (!query.success) {
      return res.status(400).json({ 
        message: 'Invalid query parameters', 
        errors: query.error.errors 
      });
    }

    const { entityType, entityId, eventDate } = query.data;
    const status = await statusService.getStatus(entityType, entityId, eventDate);

    if (!status) {
      return res.status(404).json({ message: 'Status not found' });
    }

    res.json(status);
  } catch (error) {
    console.error('Error getting status:', error);
    res.status(500).json({ 
      message: 'Error getting status', 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
});

// Get all statuses for an event
statusRouter.get('/event/:eventId', isAuthenticated, async (req, res) => {
  try {
    const eventId = parseInt(req.params.eventId);
    if (isNaN(eventId)) {
      return res.status(400).json({ message: 'Invalid event ID' });
    }

    const statuses = await statusService.getEventStatuses(eventId);
    res.json(statuses);
  } catch (error) {
    console.error('Error getting event statuses:', error);
    res.status(500).json({ 
      message: 'Error getting event statuses', 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
});

// Update status
statusRouter.post('/update', isAuthenticated, async (req, res) => {
  try {
    const validatedData = updateStatusSchema.safeParse(req.body);
    
    if (!validatedData.success) {
      return res.status(400).json({ 
        message: 'Invalid request data', 
        errors: validatedData.error.errors 
      });
    }
    
    const result = await statusService.updateStatus(validatedData.data);
    
    if (!result.success) {
      return res.status(400).json({ 
        message: 'Failed to update status', 
        error: result.error 
      });
    }
    
    res.json(result);
  } catch (error) {
    console.error('Error updating status:', error);
    res.status(500).json({ 
      message: 'Error updating status', 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
});

// Batch update statuses
statusRouter.post('/batch-update', isAuthenticated, async (req, res) => {
  try {
    const batchSchema = z.array(updateStatusSchema);
    const validatedData = batchSchema.safeParse(req.body);
    
    if (!validatedData.success) {
      return res.status(400).json({ 
        message: 'Invalid batch request data', 
        errors: validatedData.error.errors 
      });
    }
    
    const results = await Promise.all(
      validatedData.data.map(params => statusService.updateStatus(params))
    );
    
    res.json({
      success: results.every(r => r.success),
      results
    });
  } catch (error) {
    console.error('Error batch updating statuses:', error);
    res.status(500).json({ 
      message: 'Error batch updating statuses', 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
});

// Helper endpoint to cancel contracts
statusRouter.post('/contracts/:contractId/cancel', isAuthenticated, async (req, res) => {
  try {
    const contractId = parseInt(req.params.contractId);
    if (isNaN(contractId)) {
      return res.status(400).json({ message: 'Invalid contract ID' });
    }
    
    // Get contract details (normally we'd query the database)
    // For demo we're using placeholder values - these would come from a DB lookup
    const contractDetails = req.body.contractDetails || {
      eventId: req.body.eventId,
      musicianId: req.body.musicianId,
      eventDate: req.body.eventDate ? new Date(req.body.eventDate) : undefined
    };
    
    if (!contractDetails.eventId) {
      return res.status(400).json({ message: 'Missing required contract details: eventId' });
    }
    
    const result = await statusService.updateStatus({
      entityType: ENTITY_TYPES.CONTRACT,
      entityId: contractId,
      newStatus: 'cancelled',
      eventId: contractDetails.eventId,
      musicianId: contractDetails.musicianId,
      eventDate: contractDetails.eventDate,
      metadata: {
        cancelledBy: (req.user as any)?.id || null,
        cancelledAt: new Date(),
        reason: req.body.reason || 'User initiated cancellation'
      }
    });
    
    if (!result.success) {
      return res.status(400).json({ 
        message: 'Failed to cancel contract', 
        error: result.error 
      });
    }
    
    res.json({
      message: 'Contract cancelled successfully',
      result
    });
  } catch (error) {
    console.error('Error cancelling contract:', error);
    res.status(500).json({ 
      message: 'Error cancelling contract', 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
});

export default statusRouter;