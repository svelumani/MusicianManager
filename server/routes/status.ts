import express from 'express';
import { z } from 'zod';
import { isAuthenticated } from '../auth';
import { statusService, ENTITY_TYPES } from '../services/status';

const router = express.Router();

// Status update schema for validation
const statusUpdateSchema = z.object({
  entityType: z.string().min(1),
  entityId: z.number().int().positive(),
  newStatus: z.string().min(1),
  eventId: z.number().int().positive(),
  musicianId: z.number().int().positive().optional(),
  eventDate: z.string().optional().transform(val => val ? new Date(val) : undefined),
  metadata: z.any().optional()
});

// Get the current status for an entity
router.get('/:entityType/:entityId', async (req, res) => {
  try {
    const { entityType, entityId } = req.params;
    const eventDate = req.query.eventDate ? new Date(req.query.eventDate as string) : undefined;
    
    const status = await statusService.getStatus(
      entityType,
      parseInt(entityId),
      eventDate
    );
    
    if (!status) {
      return res.status(404).json({ 
        message: `No status found for ${entityType} with ID ${entityId}` 
      });
    }
    
    res.json(status);
  } catch (error) {
    console.error('Error getting status:', error);
    res.status(500).json({ 
      message: 'Error retrieving status',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Get all statuses for an event
router.get('/event/:eventId', async (req, res) => {
  try {
    const eventId = parseInt(req.params.eventId);
    
    if (isNaN(eventId)) {
      return res.status(400).json({ message: 'Invalid event ID format' });
    }
    
    const statuses = await statusService.getEventStatuses(eventId);
    res.json(statuses);
  } catch (error) {
    console.error('Error getting event statuses:', error);
    res.status(500).json({ 
      message: 'Error retrieving event statuses',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Get all statuses for a musician in an event
router.get('/event/:eventId/musician/:musicianId', async (req, res) => {
  try {
    const eventId = parseInt(req.params.eventId);
    const musicianId = parseInt(req.params.musicianId);
    const entityType = req.query.entityType as string | undefined;
    
    if (isNaN(eventId) || isNaN(musicianId)) {
      return res.status(400).json({ message: 'Invalid ID format' });
    }
    
    const statuses = await statusService.getMusicianEventStatuses(
      eventId,
      musicianId,
      entityType
    );
    
    res.json(statuses);
  } catch (error) {
    console.error('Error getting musician event statuses:', error);
    res.status(500).json({ 
      message: 'Error retrieving musician event statuses',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Update a status (authenticated)
router.post('/update', isAuthenticated, async (req, res) => {
  try {
    const validatedData = statusUpdateSchema.parse(req.body);
    
    const result = await statusService.updateStatus(validatedData);
    
    if (!result.success) {
      return res.status(400).json({ 
        message: 'Failed to update status',
        error: result.error
      });
    }
    
    res.json({ 
      message: 'Status updated successfully', 
      data: result.data 
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: 'Invalid input data',
        errors: error.errors
      });
    }
    
    console.error('Error updating status:', error);
    res.status(500).json({ 
      message: 'Error updating status',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Helper endpoints for common operations

// Cancel a contract
router.post('/contract/:contractId/cancel', isAuthenticated, async (req, res) => {
  try {
    const contractId = parseInt(req.params.contractId);
    const { eventId, musicianId, eventDate, reason } = req.body;
    
    if (isNaN(contractId) || isNaN(eventId) || (musicianId && isNaN(musicianId))) {
      return res.status(400).json({ message: 'Invalid ID format' });
    }
    
    const parsedEventDate = eventDate ? new Date(eventDate) : undefined;
    
    const result = await statusService.updateStatus({
      entityType: ENTITY_TYPES.CONTRACT,
      entityId: contractId,
      newStatus: 'cancelled',
      eventId,
      musicianId,
      eventDate: parsedEventDate,
      metadata: {
        reason: reason || 'User initiated cancellation',
        cancelledBy: (req.user as any)?.id || null,
        cancelledAt: new Date()
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
      data: result.data
    });
  } catch (error) {
    console.error('Error cancelling contract:', error);
    res.status(500).json({
      message: 'Error cancelling contract',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Mark contract as signed
router.post('/contract/:contractId/sign', async (req, res) => {
  try {
    const contractId = parseInt(req.params.contractId);
    const { eventId, musicianId, eventDate, signature } = req.body;
    
    if (isNaN(contractId) || isNaN(eventId) || isNaN(musicianId)) {
      return res.status(400).json({ message: 'Invalid ID format' });
    }
    
    if (!signature) {
      return res.status(400).json({ message: 'Signature is required' });
    }
    
    const parsedEventDate = eventDate ? new Date(eventDate) : undefined;
    
    const result = await statusService.updateStatus({
      entityType: ENTITY_TYPES.CONTRACT,
      entityId: contractId,
      newStatus: 'signed',
      eventId,
      musicianId,
      eventDate: parsedEventDate,
      metadata: {
        signature,
        signedAt: new Date(),
        ipAddress: req.ip
      }
    });
    
    if (!result.success) {
      return res.status(400).json({
        message: 'Failed to mark contract as signed',
        error: result.error
      });
    }
    
    res.json({
      message: 'Contract signed successfully',
      data: result.data
    });
  } catch (error) {
    console.error('Error signing contract:', error);
    res.status(500).json({
      message: 'Error signing contract',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;