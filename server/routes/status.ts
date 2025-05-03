import express from 'express';
import { z } from 'zod';
import { statusService } from '../services/status';
import { isAuthenticated } from '../auth';

const router = express.Router();

// Make sure all routes require authentication
router.use(isAuthenticated);

/**
 * Get status for an entity
 * GET /api/status?entityType=X&entityId=Y&eventId=Z&musicianId=M&eventDate=D
 */
router.get('/', async (req, res) => {
  try {
    const { entityType, entityId, eventId, musicianId, eventDate } = req.query;
    
    if (!entityType || !entityId) {
      return res.status(400).json({ 
        message: 'Missing required parameters: entityType and entityId are required' 
      });
    }
    
    const status = await statusService.getEntityStatus(
      String(entityType),
      Number(entityId),
      eventId ? Number(eventId) : undefined,
      musicianId ? Number(musicianId) : undefined,
      eventDate ? new Date(String(eventDate)) : undefined
    );
    
    if (!status) {
      return res.status(404).json({
        message: `No status found for ${entityType} #${entityId}`
      });
    }
    
    return res.json(status);
  } catch (error) {
    console.error('Error getting entity status:', error);
    return res.status(500).json({ 
      message: 'Failed to get entity status',
      details: error.message
    });
  }
});

/**
 * Get status history for an entity
 * GET /api/status/history?entityType=X&entityId=Y&eventId=Z
 */
router.get('/history', async (req, res) => {
  try {
    const { entityType, entityId, eventId, limit } = req.query;
    
    if (!entityType || !entityId) {
      return res.status(400).json({ 
        message: 'Missing required parameters: entityType and entityId are required' 
      });
    }
    
    const history = await statusService.getEntityStatusHistory(
      String(entityType),
      Number(entityId),
      eventId ? Number(eventId) : undefined,
      limit ? Number(limit) : undefined
    );
    
    return res.json(history);
  } catch (error) {
    console.error('Error getting entity status history:', error);
    return res.status(500).json({ 
      message: 'Failed to get entity status history',
      details: error.message
    });
  }
});

/**
 * Get status configuration for an entity type
 * GET /api/status/config?entityType=X
 */
router.get('/config', (req, res) => {
  try {
    const { entityType } = req.query;
    
    if (!entityType) {
      return res.status(400).json({ 
        message: 'Missing required parameter: entityType' 
      });
    }
    
    const config = statusService.getStatusConfig(String(entityType));
    return res.json(config);
  } catch (error) {
    console.error('Error getting status configuration:', error);
    return res.status(500).json({ 
      message: 'Failed to get status configuration',
      details: error.message
    });
  }
});

/**
 * Update entity status
 * POST /api/status
 */
router.post('/', async (req, res) => {
  try {
    // Define validation schema with all possible status parameters
    const updateStatusSchema = z.object({
      entityType: z.string(),
      entityId: z.number(),
      status: z.string(),
      eventId: z.number().optional(),
      details: z.string().optional(),
      metadata: z.any().optional(),
      customStatus: z.string().optional(),
      musicianId: z.number().optional(),
      eventDate: z.string().optional() // Accept ISO date string
    });
    
    // Validate request body
    const validationResult = updateStatusSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({
        message: 'Invalid request body',
        details: validationResult.error.format()
      });
    }
    
    const { 
      entityType, 
      entityId, 
      status, 
      eventId, 
      details, 
      metadata, 
      customStatus, 
      musicianId, 
      eventDate 
    } = validationResult.data;
    
    // Get user ID from session
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    // Convert eventDate string to Date object if provided
    const parsedEventDate = eventDate ? new Date(eventDate) : undefined;
    
    // Update status with all available parameters
    const updatedStatus = await statusService.updateEntityStatus(
      entityType,
      entityId,
      status,
      userId,
      details,
      eventId,
      metadata,
      customStatus,
      musicianId,
      parsedEventDate
    );
    
    return res.json(updatedStatus);
  } catch (error) {
    console.error('Error updating entity status:', error);
    return res.status(500).json({ 
      message: 'Failed to update entity status',
      details: error.message
    });
  }
});

export default router;