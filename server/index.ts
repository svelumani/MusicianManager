import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { pool } from "./db";

const app = express();

// CRITICAL: Register the direct musician-pay-rates endpoint before ANY middleware
// This ensures it will not be intercepted by Vite or any other middleware
app.get("/api/v2/musician-pay-rates", async (req, res) => {
  try {
    const musicianId = req.query.musicianId ? parseInt(req.query.musicianId as string) : undefined;
    const timestamp = req.query.t; // Cache-busting parameter
    
    log(`[PRE-MIDDLEWARE API] Musician pay rates request: ${musicianId || 'all'} (t=${timestamp})`);
    
    // Explicitly set response headers to ensure JSON
    res.setHeader('Content-Type', 'application/json');
    
    // Count rows in the table for diagnostics
    try {
      const countResult = await pool.query('SELECT COUNT(*) FROM musician_pay_rates');
      log(`Total musician_pay_rates in database: ${countResult.rows[0].count}`);
    } catch (countError) {
      log(`Error counting pay rates: ${countError}`);
    }
    
    // Perform the main query
    const result = await pool.query(`
      SELECT *
      FROM musician_pay_rates
      ${musicianId ? 'WHERE musician_id = $1' : ''}
      LIMIT 200
    `, musicianId ? [musicianId] : []);
    
    log(`[PRE-MIDDLEWARE API] Found ${result.rows.length} pay rates ${musicianId ? `for musician ${musicianId}` : 'total'}`);
    
    // Format the response
    const formattedRates = result.rows.map(row => ({
      id: row.id,
      musicianId: row.musician_id,
      eventCategoryId: row.event_category_id,
      hourlyRate: row.hourly_rate,
      dayRate: row.day_rate,
      eventRate: row.event_rate,
      notes: row.notes
    }));
    
    return res.json(formattedRates);
  } catch (error) {
    log(`[PRE-MIDDLEWARE API] Error: ${error}`);
    res.status(500).json({ 
      error: "Internal server error", 
      message: String(error),
      timestamp: new Date().toISOString()
    });
  }
});

// Direct endpoint for event contracts
app.get("/api/v2/contracts/event/:eventId", async (req, res) => {
  try {
    const eventId = parseInt(req.params.eventId);
    const timestamp = req.query.t; // Cache-busting parameter
    
    log(`[PRE-MIDDLEWARE API] Event contracts request: event ${eventId} (t=${timestamp})`);
    
    // Explicitly set response headers to ensure JSON
    res.setHeader('Content-Type', 'application/json');
    
    // Get all contracts for this event
    const contractsResult = await pool.query(`
      SELECT *
      FROM contract_links
      WHERE event_id = $1
      ORDER BY created_at DESC
    `, [eventId]);
    
    log(`[PRE-MIDDLEWARE API] Found ${contractsResult.rows.length} contracts for event ${eventId}`);
    
    // Format contract responses to camelCase
    const contracts = contractsResult.rows.map(row => ({
      id: row.id,
      bookingId: row.booking_id,
      eventId: row.event_id,
      musicianId: row.musician_id,
      token: row.token,
      expiresAt: row.expires_at,
      status: row.status,
      respondedAt: row.responded_at,
      response: row.response,
      createdAt: row.created_at,
      amount: row.amount,
      eventDate: row.event_date,
      companySignature: row.company_signature,
      musicianSignature: row.musician_signature
    }));
    
    return res.json(contracts);
  } catch (error) {
    log(`[PRE-MIDDLEWARE API] Error in event contracts endpoint: ${error}`);
    res.status(500).json({ 
      error: "Internal server error", 
      message: String(error),
      timestamp: new Date().toISOString()
    });
  }
});

// Direct endpoint for getting a single contract by ID
app.get("/api/v2/contracts/:id", async (req, res) => {
  try {
    const contractId = parseInt(req.params.id);
    const timestamp = req.query.t; // Cache-busting parameter
    
    log(`[PRE-MIDDLEWARE API] Contract request: id ${contractId} (t=${timestamp})`);
    
    // Explicitly set response headers to ensure JSON
    res.setHeader('Content-Type', 'application/json');
    
    // Get the contract by ID
    const contractResult = await pool.query(`
      SELECT *
      FROM contract_links
      WHERE id = $1
    `, [contractId]);
    
    if (contractResult.rows.length === 0) {
      return res.status(404).json({ 
        message: "Contract not found", 
        contractId,
        timestamp: new Date().toISOString()
      });
    }
    
    const contract = contractResult.rows[0];
    
    // Format the response
    const formattedContract = {
      id: contract.id,
      bookingId: contract.booking_id,
      eventId: contract.event_id,
      musicianId: contract.musician_id,
      invitationId: contract.invitation_id,
      token: contract.token,
      expiresAt: contract.expires_at,
      status: contract.status,
      respondedAt: contract.responded_at,
      response: contract.response,
      createdAt: contract.created_at,
      amount: contract.amount,
      eventDate: contract.event_date,
      companySignature: contract.company_signature,
      musicianSignature: contract.musician_signature
    };
    
    return res.json(formattedContract);
  } catch (error) {
    log(`[PRE-MIDDLEWARE API] Error: ${error}`);
    res.status(500).json({ 
      error: "Internal server error", 
      message: String(error),
      timestamp: new Date().toISOString()
    });
  }
});

// Direct endpoint for getting a contract by token
app.get("/api/v2/contracts/token/:token", async (req, res) => {
  try {
    const token = req.params.token;
    const timestamp = req.query.t; // Cache-busting parameter
    
    log(`[PRE-MIDDLEWARE API] Contract request by token: ${token} (t=${timestamp})`);
    
    // Explicitly set response headers to ensure JSON
    res.setHeader('Content-Type', 'application/json');
    
    // Get the contract by token
    const contractResult = await pool.query(`
      SELECT cl.*, e.name as event_name, e.venue_id, m.name as musician_name, m.email, m.profile_image
      FROM contract_links cl
      JOIN events e ON cl.event_id = e.id
      JOIN musicians m ON cl.musician_id = m.id
      WHERE cl.token = $1
    `, [token]);
    
    if (contractResult.rows.length === 0) {
      return res.status(404).json({ 
        message: "Contract not found", 
        token,
        timestamp: new Date().toISOString()
      });
    }
    
    const contractData = contractResult.rows[0];
    
    // Format the response with the expected structure
    const response = {
      contract: {
        id: contractData.id,
        bookingId: contractData.booking_id,
        eventId: contractData.event_id,
        musicianId: contractData.musician_id,
        invitationId: contractData.invitation_id,
        token: contractData.token,
        expiresAt: contractData.expires_at,
        status: contractData.status,
        respondedAt: contractData.responded_at,
        response: contractData.response,
        createdAt: contractData.created_at,
        amount: contractData.amount,
        eventDate: contractData.event_date,
        companySignature: contractData.company_signature,
        musicianSignature: contractData.musician_signature
      },
      event: {
        id: contractData.event_id,
        name: contractData.event_name,
        venueId: contractData.venue_id
      },
      musician: {
        id: contractData.musician_id,
        name: contractData.musician_name,
        email: contractData.email,
        profileImage: contractData.profile_image
      }
    };
    
    return res.json(response);
  } catch (error) {
    log(`[PRE-MIDDLEWARE API] Error: ${error}`);
    res.status(500).json({ 
      error: "Internal server error", 
      message: String(error),
      timestamp: new Date().toISOString()
    });
  }
});

// Direct endpoint for handling contract response by token
app.post("/api/v2/contracts/token/:token/respond", async (req, res) => {
  try {
    const token = req.params.token;
    const { status, response, signature } = req.body;
    
    log(`[PRE-MIDDLEWARE API] Contract response request for token: ${token}, status: ${status}`);
    
    // Check if the contract exists and is valid
    const contractResult = await pool.query(`
      SELECT * FROM contract_links WHERE token = $1
    `, [token]);
    
    if (contractResult.rows.length === 0) {
      return res.status(404).json({ 
        message: "Contract not found", 
        token,
        timestamp: new Date().toISOString()
      });
    }
    
    const contract = contractResult.rows[0];
    
    // Check if contract is expired
    const expiresAt = new Date(contract.expires_at);
    if (new Date() > expiresAt) {
      return res.status(400).json({
        message: "Contract has expired",
        expiresAt: contract.expires_at,
        timestamp: new Date().toISOString()
      });
    }
    
    // Update the contract status
    const now = new Date().toISOString();
    const updateResult = await pool.query(`
      UPDATE contract_links 
      SET status = $1, 
          response = $2, 
          responded_at = $3,
          musician_signature = $4
      WHERE token = $5
      RETURNING *
    `, [status, response, now, signature, token]);
    
    const updatedContract = updateResult.rows[0];
    
    // Format the response
    return res.json({
      message: `Contract ${status === 'accepted' ? 'accepted' : 'declined'} successfully`,
      contract: {
        id: updatedContract.id,
        bookingId: updatedContract.booking_id,
        eventId: updatedContract.event_id,
        musicianId: updatedContract.musician_id,
        token: updatedContract.token,
        status: updatedContract.status,
        respondedAt: updatedContract.responded_at,
        response: updatedContract.response,
        musicianSignature: updatedContract.musician_signature,
        companySignature: updatedContract.company_signature
      }
    });
  } catch (error) {
    log(`[PRE-MIDDLEWARE API] Contract response error: ${error}`);
    res.status(500).json({ 
      error: "Internal server error", 
      message: String(error),
      timestamp: new Date().toISOString()
    });
  }
});

// Direct endpoint for getting contract content by token
app.get("/api/v2/contracts/token/:token/content", async (req, res) => {
  try {
    const token = req.params.token;
    const timestamp = req.query.t; // Cache-busting parameter
    
    log(`[PRE-MIDDLEWARE API] Contract content request by token: ${token} (t=${timestamp})`);
    
    // Get the contract by token
    const contractResult = await pool.query(`
      SELECT cl.*
      FROM contract_links cl
      WHERE cl.token = $1
    `, [token]);
    
    if (contractResult.rows.length === 0) {
      return res.status(404).json({ 
        message: "Contract not found", 
        token,
        timestamp: new Date().toISOString()
      });
    }
    
    const contract = contractResult.rows[0];
    
    // Get event and musician data
    const eventResult = await pool.query(`
      SELECT e.*, v.name as venue_name
      FROM events e
      LEFT JOIN venues v ON e.venue_id = v.id
      WHERE e.id = $1
    `, [contract.event_id]);
    
    const musicianResult = await pool.query(`
      SELECT *
      FROM musicians
      WHERE id = $1
    `, [contract.musician_id]);
    
    if (eventResult.rows.length === 0 || musicianResult.rows.length === 0) {
      return res.status(404).json({ 
        message: "Event or musician data not found", 
        timestamp: new Date().toISOString()
      });
    }
    
    const event = eventResult.rows[0];
    const musician = musicianResult.rows[0];
    
    // Get the default template
    const templateResult = await pool.query(`
      SELECT *
      FROM contract_templates
      WHERE is_default = true
      ORDER BY id DESC
      LIMIT 1
    `);
    
    if (templateResult.rows.length === 0) {
      return res.status(404).json({ 
        message: "No default contract template found", 
        timestamp: new Date().toISOString()
      });
    }
    
    const template = templateResult.rows[0];
    let content = template.content;
    
    // Basic variable replacement
    const replacements = {
      '{{contract_id}}': contract.id.toString(),
      '{{contract_date}}': new Date(contract.created_at).toLocaleDateString(),
      '{{musician_name}}': musician.name,
      '{{event_name}}': event.name,
      '{{event_date}}': contract.event_date ? new Date(contract.event_date).toLocaleDateString() : 'TBD',
      '{{venue_name}}': event.venue_name || 'TBD',
      '{{start_time}}': event.start_time || 'TBD',
      '{{end_time}}': event.end_time || 'TBD',
      '{{amount}}': contract.amount ? `$${parseFloat(contract.amount).toFixed(2)}` : 'TBD',
      '{{company_signature}}': contract.company_signature || 'VAMP Management',
      '{{company_signed_date}}': new Date().toLocaleDateString(),
      '{{musician_signature}}': contract.musician_signature || '',
      '{{signed_date}}': contract.responded_at ? new Date(contract.responded_at).toLocaleDateString() : ''
    };
    
    // Replace all variables in the template
    Object.entries(replacements).forEach(([key, value]) => {
      content = content.replace(new RegExp(key, 'g'), value || '');
    });
    
    return res.json({ content });
  } catch (error) {
    log(`[PRE-MIDDLEWARE API] Contract content error: ${error}`);
    res.status(500).json({ 
      error: "Internal server error", 
      message: String(error),
      timestamp: new Date().toISOString()
    });
  }
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
