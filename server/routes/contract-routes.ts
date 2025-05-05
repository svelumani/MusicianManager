import { Router } from 'express';
import { db } from '../db';
import { eq, and, desc, sql } from 'drizzle-orm';
import { 
  monthlyContracts, 
  monthlyContractMusicians, 
  monthlyContractDates,
  monthlyContractStatusHistory,
  musicians,
  contractTemplates,
  plannerAssignments,
  plannerSlots,
  venues,
} from '../../shared/schema';
import { randomUUID } from 'crypto';
import { format } from 'date-fns';
import { sendContractEmail, sendContractResponseNotification } from '../services/emailService';
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
        // Use the sendContractResponseNotification function from our emailService
        await sendContractResponseNotification(
          contract,
          musician,
          action === 'sign' ? 'accept' : 'reject',
          comments || undefined
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

// Get contracts by planner ID
contractRouter.get('/planner/:plannerId', isAuthenticated, async (req, res) => {
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
    
    // For each contract, get the count of musicians and dates
    const contractsWithDetails = await Promise.all(
      contracts.map(async (contract) => {
        // Count musicians
        const [{ count: musicianCount }] = await db
          .select({ count: db.count() })
          .from(monthlyContractMusicians)
          .where(eq(monthlyContractMusicians.contractId, contract.id));
        
        // Count dates across all musicians for this contract
        const dateCountResult = await db
          .select({ count: db.count() })
          .from(monthlyContractDates)
          .leftJoin(
            monthlyContractMusicians,
            eq(monthlyContractDates.musicianContractId, monthlyContractMusicians.id)
          )
          .where(eq(monthlyContractMusicians.contractId, contract.id));
        
        const dateCount = dateCountResult.length > 0 ? Number(dateCountResult[0].count) : 0;
        
        return {
          ...contract,
          musicianCount: Number(musicianCount) || 0,
          dateCount: dateCount || 0,
        };
      })
    );
    
    return res.status(200).json(contractsWithDetails);
    
  } catch (error) {
    console.error('Error fetching contracts by planner:', error);
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

    if (!plannerId || !month || !year) {
      return res.status(400).json({ message: 'Missing required fields: plannerId, month, year' });
    }

    if (!assignmentIds || !Array.isArray(assignmentIds) || assignmentIds.length === 0) {
      return res.status(400).json({ message: 'No assignments selected for contract generation' });
    }

    console.log('Generating contract with data:', { plannerId, month, year, musicianId, assignmentIds });
    
    // Check if a default template exists
    const [defaultTemplate] = await db
      .select()
      .from(contractTemplates)
      .where(eq(contractTemplates.isDefault, true));
    
    const templateId = defaultTemplate ? defaultTemplate.id : 1; // Fallback to ID 1
    
    // Create a new monthly contract
    const [contract] = await db
      .insert(monthlyContracts)
      .values({
        plannerId: Number(plannerId),
        month: Number(month),
        year: Number(year),
        templateId: templateId,
        status: 'draft',
        name: `Contract for ${month}/${year}`,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    
    if (!contract) {
      return res.status(500).json({ message: 'Failed to create contract' });
    }
    
    console.log('Created monthly contract:', contract);
    
    // Group assignments by musician
    const assignmentsByMusician = {};
    
    // Fetch all requested assignments
    const assignments = await db
      .select()
      .from(plannerAssignments)
      .where(sql`id IN (${assignmentIds.join(', ')})`);
    
    console.log('Found assignments:', assignments);
    
    // Group them by musician ID
    for (const assignment of assignments) {
      if (!assignmentsByMusician[assignment.musicianId]) {
        assignmentsByMusician[assignment.musicianId] = [];
      }
      assignmentsByMusician[assignment.musicianId].push(assignment);
    }
    
    console.log('Assignments grouped by musician:', assignmentsByMusician);
    
    // For each musician, create a musician contract and add dates
    const createdContracts = [];
    for (const [musicianIdStr, musicianAssignments] of Object.entries(assignmentsByMusician)) {
      const musicianId = Number(musicianIdStr);
      
      // Get musician details
      const [musician] = await db
        .select()
        .from(musicians)
        .where(eq(musicians.id, musicianId));
      
      if (!musician) {
        console.error(`Musician with ID ${musicianId} not found`);
        continue;
      }
      
      // Calculate total fee across all assignments
      const totalFee = musicianAssignments.reduce((sum, a) => sum + (a.actualFee || a.fee || 0), 0);
      
      // Create a unique token for this musician's contract
      const token = randomUUID();
      
      // Create a monthly contract musician record
      const [musicianContract] = await db
        .insert(monthlyContractMusicians)
        .values({
          contractId: contract.id,
          musicianId: musicianId,
          status: 'pending',
          totalFee: totalFee,
          token: token,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();
      
      if (!musicianContract) {
        console.error(`Failed to create musician contract for ${musician.name}`);
        continue;
      }
      
      console.log(`Created musician contract for ${musician.name}:`, musicianContract);
      
      // Now add each assignment date to the contract
      for (const assignment of musicianAssignments) {
        // Get the slot for this assignment
        const [slot] = await db
          .select()
          .from(plannerSlots)
          .where(eq(plannerSlots.id, assignment.slotId));
        
        if (!slot) {
          console.error(`Slot ${assignment.slotId} not found for assignment ${assignment.id}`);
          continue;
        }
        
        // Get venue details if applicable
        let venueName = "Venue not specified";
        if (slot.venueId) {
          const [venue] = await db
            .select()
            .from(venues)
            .where(eq(venues.id, slot.venueId));
          
          if (venue) {
            venueName = venue.name;
          }
        }
        
        // Create a contract date
        const [contractDate] = await db
          .insert(monthlyContractDates)
          .values({
            musicianContractId: musicianContract.id,
            date: slot.date,
            status: 'pending',
            fee: assignment.actualFee || assignment.fee || 0,
            notes: slot.description || '',
            venueId: slot.venueId || null,
            venueName: venueName,
            startTime: slot.startTime || '',
            endTime: slot.endTime || '',
            createdAt: new Date(),
            updatedAt: new Date()
          })
          .returning();
        
        console.log(`Added date ${slot.date} to contract:`, contractDate);
        
        // Update the assignment to point to this contract
        // Using "contract generated" status instead of "pending" for clarity
        await db
          .update(plannerAssignments)
          .set({
            contractId: contract.id,
            contractStatus: 'contract generated'
          })
          .where(eq(plannerAssignments.id, assignment.id));
      }
      
      createdContracts.push({
        musicianId: musicianId,
        musicianName: musician.name,
        contractId: contract.id,
        assignments: musicianAssignments.length
      });
    }
    
    return res.json({
      success: true,
      message: 'Contracts generated successfully',
      contractId: contract.id,
      musicians: createdContracts
    });
  } catch (error) {
    console.error('Error generating contracts:', error);
    return res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
});

// Send contracts to musicians
contractRouter.post('/:id/send', isAuthenticated, async (req, res) => {
  try {
    const contractId = parseInt(req.params.id);
    
    // Get the contract
    const [contract] = await db
      .select()
      .from(monthlyContracts)
      .where(eq(monthlyContracts.id, contractId));
    
    if (!contract) {
      return res.status(404).json({ message: "Contract not found" });
    }
    
    // Get all musicians in this contract
    const musicianContracts = await db
      .select()
      .from(monthlyContractMusicians)
      .where(eq(monthlyContractMusicians.contractId, contractId));
    
    if (musicianContracts.length === 0) {
      return res.status(400).json({ message: "No musicians found in this contract" });
    }
    
    // Track successes and failures
    const results = {
      sent: 0,
      failed: 0,
      details: []
    };
    
    // Send an email to each musician
    for (const cm of musicianContracts) {
      try {
        // Skip if already sent
        if (cm.status !== 'pending') {
          results.details.push({
            musicianId: cm.musicianId,
            status: 'skipped',
            message: `Contract already in status: ${cm.status}`
          });
          continue;
        }
        
        // Get musician details
        const [musician] = await db
          .select()
          .from(musicians)
          .where(eq(musicians.id, cm.musicianId));
        
        if (!musician) {
          results.failed++;
          results.details.push({
            musicianId: cm.musicianId,
            status: 'failed',
            message: 'Musician not found'
          });
          continue;
        }
        
        // Get dates for this musician's contract
        const dates = await db
          .select()
          .from(monthlyContractDates)
          .where(eq(monthlyContractDates.musicianContractId, cm.id));
        
        if (dates.length === 0) {
          results.failed++;
          results.details.push({
            musicianId: cm.musicianId,
            status: 'failed',
            message: 'No dates found for this musician contract'
          });
          continue;
        }
        
        // Format dates and get venue information
        const formattedDates = await Promise.all(dates.map(async (date) => {
          // Get venue if available
          let venueName = date.venueName || 'Venue not specified';
          if (date.venueId) {
            const [venue] = await db
              .select()
              .from(venues)
              .where(eq(venues.id, date.venueId));
            
            if (venue) {
              venueName = venue.name;
            }
          }
          
          return {
            assignment: {
              id: date.id,
              actualFee: date.fee,
            },
            slot: {
              date: date.date,
              startTime: date.startTime || '',
              endTime: date.endTime || '',
              description: date.notes || '',
            },
            venueName,
          };
        }));
        
        // Create response URL with token
        const responseUrl = `${process.env.HOST_URL || 'http://localhost:5000'}/contracts/respond/${contract.id}?token=${cm.token}`;
        
        // Check if SendGrid is configured, otherwise mock the email
        let emailSuccess = false;
        if (!process.env.SENDGRID_API_KEY) {
          // Mock email sending - log it and track activity
          console.log(`[MOCK EMAIL] Would have sent contract email to ${musician.name} <${musician.email}> for contract ${contract.id}`);
          
          // If we have an activities table, log the mock email
          try {
            await db.execute(sql`
              INSERT INTO activities (
                action, entity_type, entity_id, timestamp, user_id, details
              ) VALUES (
                ${`Email would have been sent to ${musician.name}`},
                ${'monthlyContract'},
                ${contractId},
                ${new Date()},
                ${req.user?.id || 1},
                ${JSON.stringify({
                  type: "contract_email",
                  recipient: musician.email,
                  subject: `Contract for ${contract.month}/${contract.year}`,
                  mockSent: true,
                  contractId: contractId
                })}
              )
            `);
          } catch (logError) {
            console.error("Error logging mock email activity:", logError);
            // Continue anyway - activity logging is not critical
          }
          
          emailSuccess = true; // Consider it "sent" for workflow purposes
        } else {
          // Attempt to send real email
          emailSuccess = await sendContractEmail({
            musician,
            contract,
            assignments: formattedDates, 
            responseUrl
          });
        }
        
        if (emailSuccess) {
          // Update contract status to "sent"
          await db
            .update(monthlyContractMusicians)
            .set({
              status: 'sent',
              sentAt: new Date(),
            })
            .where(eq(monthlyContractMusicians.id, cm.id));
          
          results.sent++;
          results.details.push({
            musicianId: cm.musicianId,
            status: 'sent',
            message: process.env.SENDGRID_API_KEY 
              ? 'Contract email sent successfully'
              : 'Contract email mocked (SendGrid not configured)'
          });
        } else {
          results.failed++;
          results.details.push({
            musicianId: cm.musicianId,
            status: 'failed',
            message: 'Failed to send contract email'
          });
        }
      } catch (error) {
        results.failed++;
        results.details.push({
          musicianId: cm.musicianId,
          status: 'failed',
          message: error instanceof Error ? error.message : String(error)
        });
      }
    }
    
    // Update the main contract status if any were sent
    if (results.sent > 0) {
      await db
        .update(monthlyContracts)
        .set({
          status: 'sent',
          updatedAt: new Date()
        })
        .where(eq(monthlyContracts.id, contractId));
    }
    
    // Return the results
    return res.json({
      success: true,
      sent: results.sent,
      failed: results.failed,
      details: results.details
    });
    
  } catch (error) {
    console.error("Error sending contract emails:", error);
    return res.status(500).json({ 
      message: "Server error sending contract emails",
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Get contract musician details by contract ID
contractRouter.get('/:id/musicians', isAuthenticated, async (req, res) => {
  try {
    const contractId = parseInt(req.params.id);
    
    // Get all musician contracts for this contract ID
    const musicianContracts = await db
      .select()
      .from(monthlyContractMusicians)
      .where(eq(monthlyContractMusicians.contractId, contractId));
    
    if (musicianContracts.length === 0) {
      return res.json([]);
    }
    
    // Get musician details and format the response
    const results = await Promise.all(
      musicianContracts.map(async (mc) => {
        // Get musician details
        const [musician] = await db
          .select()
          .from(musicians)
          .where(eq(musicians.id, mc.musicianId));
        
        // Get dates for this musician contract
        const dates = await db
          .select()
          .from(monthlyContractDates)
          .where(eq(monthlyContractDates.musicianContractId, mc.id));
        
        // Calculate stats
        const pendingDates = dates.filter(d => d.status === 'pending').length;
        const acceptedDates = dates.filter(d => d.status === 'signed' || d.status === 'accepted').length;
        const rejectedDates = dates.filter(d => d.status === 'rejected' || d.status === 'declined').length;
        
        return {
          id: mc.id,
          contractId: mc.contractId,
          musicianId: mc.musicianId,
          musicianName: musician ? musician.name : 'Unknown',
          status: mc.status,
          totalFee: mc.totalFee,
          sentAt: mc.sentAt,
          respondedAt: mc.respondedAt,
          completedAt: mc.completedAt,
          createdAt: mc.createdAt,
          updatedAt: mc.updatedAt,
          totalDates: dates.length,
          pendingDates,
          acceptedDates,
          rejectedDates,
        };
      })
    );
    
    return res.json(results);
    
  } catch (error) {
    console.error('Error fetching contract musicians:', error);
    return res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
});

// Get specific contract details by ID
contractRouter.get('/:id', isAuthenticated, async (req, res) => {
  try {
    const contractId = parseInt(req.params.id);
    
    // Get the contract
    const [contract] = await db
      .select()
      .from(monthlyContracts)
      .where(eq(monthlyContracts.id, contractId));
    
    if (!contract) {
      return res.status(404).json({ message: 'Contract not found' });
    }
    
    // Count musicians
    const [{ count: musicianCount }] = await db
      .select({ count: db.count() })
      .from(monthlyContractMusicians)
      .where(eq(monthlyContractMusicians.contractId, contractId));
    
    // Count dates across all musicians for this contract
    const dateCountResult = await db
      .select({ count: db.count() })
      .from(monthlyContractDates)
      .leftJoin(
        monthlyContractMusicians,
        eq(monthlyContractDates.musicianContractId, monthlyContractMusicians.id)
      )
      .where(eq(monthlyContractMusicians.contractId, contractId));
    
    const dateCount = dateCountResult.length > 0 ? Number(dateCountResult[0].count) : 0;
    
    // Return contract with additional details
    return res.json({
      ...contract,
      musicianCount: Number(musicianCount) || 0,
      dateCount: dateCount || 0,
    });
    
  } catch (error) {
    console.error('Error fetching contract details:', error);
    return res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
});

export default contractRouter;