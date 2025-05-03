import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import express from "express";
import * as z from "zod";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { format } from "date-fns";
import { getSettings, saveSettings, getEmailSettings, saveEmailSettings } from "./services/settings";
import { sendMusicianAssignmentEmail, initializeSendGrid } from "./services/email";
import sgMail from '@sendgrid/mail';
import crypto from 'crypto';
import pgSession from 'connect-pg-simple';
import { pool } from './db';
import { 
  insertUserSchema, 
  insertVenueSchema, 
  insertCategorySchema,
  insertMusicianCategorySchema,
  insertVenueCategorySchema,
  insertEventCategorySchema,
  insertMusicianSchema,
  insertMusicianPayRateSchema,
  insertAvailabilitySchema,
  insertEventSchema,
  insertBookingSchema,
  insertPaymentSchema,
  insertCollectionSchema,
  insertExpenseSchema,
  insertMonthlyPlannerSchema,
  insertPlannerSlotSchema,
  insertPlannerAssignmentSchema,
  insertMonthlyInvoiceSchema,
  insertEmailTemplateSchema,
  insertMusicianTypeSchema,
  insertAvailabilityShareLinkSchema,
  insertContractLinkSchema,
  insertInvitationSchema,
  type Musician
} from "@shared/schema";

const PgSession = pgSession(session);

export async function registerRoutes(app: Express): Promise<Server> {
  // Configure session middleware
  app.use(
    session({
      secret: "vamp-musician-management-secret",
      resave: false,
      saveUninitialized: false,
      cookie: { secure: process.env.NODE_ENV === "production" },
      store: new PgSession({
        pool: pool,
        createTableIfMissing: true,
        tableName: 'session' // default
      })
    })
  );

  // Initialize Passport
  app.use(passport.initialize());
  app.use(passport.session());

  // Configure Passport local strategy
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user) {
          return done(null, false, { message: "Incorrect username" });
        }
        
        // In a real app, you would hash and compare passwords
        if (user.password !== password) {
          return done(null, false, { message: "Incorrect password" });
        }
        
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    })
  );

  // Serialize user to session
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  // Deserialize user from session
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  // Auth middleware to check if user is authenticated
  const isAuthenticated = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (req.isAuthenticated()) {
      return next();
    }
    res.status(401).json({ message: "Unauthorized" });
  };

  // Create an API router
  const apiRouter = express.Router();

  // Authentication routes
  apiRouter.post("/auth/login", (req, res, next) => {
    console.log("Login attempt:", req.body);
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) {
        console.error("Auth error:", err);
        return next(err);
      }
      if (!user) {
        console.log("Auth failed:", info);
        return res.status(401).json({ message: info?.message || "Authentication failed" });
      }
      
      req.login(user, (err) => {
        if (err) {
          console.error("Login error:", err);
          return next(err);
        }
        console.log("Login successful for:", user.username);
        return res.json({ user });
      });
    })(req, res, next);
  });

  apiRouter.post("/auth/logout", (req, res) => {
    req.logout(() => {
      res.json({ success: true });
    });
  });

  apiRouter.get("/auth/user", (req, res) => {
    if (req.isAuthenticated()) {
      res.json({ user: req.user });
    } else {
      res.status(401).json({ message: "Not authenticated" });
    }
  });
  
  // Registration route (will be protected in production)
  apiRouter.post("/auth/register", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const existingUser = await storage.getUserByUsername(userData.username);
      
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }
      
      const user = await storage.createUser(userData);
      res.status(201).json({ user });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid user data", errors: error.errors });
      }
      console.error(error);
      res.status(500).json({ message: "Error creating user" });
    }
  });
  
  // Admin creation route (FOR DEVELOPMENT ONLY)
  apiRouter.post("/auth/setup-admin", async (req, res) => {
    try {
      // Check if admin already exists
      const existingAdmin = await storage.getUserByUsername("admin");
      if (existingAdmin) {
        return res.json({ message: "Admin user already exists", user: existingAdmin });
      }
      
      // Create admin user
      const adminUser = await storage.createUser({
        username: "admin",
        password: "admin123",
        name: "Admin User",
        email: "admin@vamp.com",
        role: "admin",
        profileImage: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
      });
      
      res.status(201).json({ message: "Admin user created successfully", user: adminUser });
    } catch (error) {
      console.error("Error creating admin:", error);
      res.status(500).json({ message: "Error creating admin user" });
    }
  });

  // Dashboard routes
  apiRouter.get("/dashboard/metrics", isAuthenticated, async (req, res) => {
    try {
      const metrics = await storage.getDashboardMetrics();
      res.json(metrics);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error fetching dashboard metrics" });
    }
  });

  apiRouter.get("/dashboard/activities", isAuthenticated, async (req, res) => {
    try {
      const activities = await storage.getActivities(10);
      res.json(activities);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error fetching activities" });
    }
  });

  apiRouter.get("/dashboard/upcoming-events", isAuthenticated, async (req, res) => {
    try {
      const events = await storage.getUpcomingEvents(5);
      res.json(events);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error fetching upcoming events" });
    }
  });

  // Venue routes
  apiRouter.get("/venues", isAuthenticated, async (req, res) => {
    try {
      const venues = await storage.getVenues();
      res.json(venues);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error fetching venues" });
    }
  });

  apiRouter.get("/venues/:id", isAuthenticated, async (req, res) => {
    try {
      const venue = await storage.getVenue(parseInt(req.params.id));
      if (!venue) {
        return res.status(404).json({ message: "Venue not found" });
      }
      res.json(venue);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error fetching venue" });
    }
  });

  apiRouter.post("/venues", isAuthenticated, async (req, res) => {
    try {
      const venueData = insertVenueSchema.parse(req.body);
      const venue = await storage.createVenue(venueData);
      res.status(201).json(venue);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid venue data", errors: error.errors });
      }
      console.error(error);
      res.status(500).json({ message: "Error creating venue" });
    }
  });

  apiRouter.put("/venues/:id", isAuthenticated, async (req, res) => {
    try {
      const venueData = insertVenueSchema.partial().parse(req.body);
      const venue = await storage.updateVenue(parseInt(req.params.id), venueData);
      if (!venue) {
        return res.status(404).json({ message: "Venue not found" });
      }
      res.json(venue);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid venue data", errors: error.errors });
      }
      console.error(error);
      res.status(500).json({ message: "Error updating venue" });
    }
  });

  apiRouter.delete("/venues/:id", isAuthenticated, async (req, res) => {
    try {
      const result = await storage.deleteVenue(parseInt(req.params.id));
      if (!result) {
        return res.status(404).json({ message: "Venue not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error deleting venue" });
    }
  });
  
  apiRouter.get("/venues/:id/events", isAuthenticated, async (req, res) => {
    try {
      const venueId = parseInt(req.params.id);
      // Check if venue exists first
      const venue = await storage.getVenue(venueId);
      if (!venue) {
        return res.status(404).json({ message: "Venue not found" });
      }
      
      const events = await storage.getVenueEvents(venueId);
      res.json(events);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error fetching venue events" });
    }
  });

  // Legacy Category routes
  apiRouter.get("/categories", isAuthenticated, async (req, res) => {
    try {
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error fetching categories" });
    }
  });

  apiRouter.get("/categories/:id", isAuthenticated, async (req, res) => {
    try {
      const category = await storage.getCategory(parseInt(req.params.id));
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }
      res.json(category);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error fetching category" });
    }
  });

  apiRouter.post("/categories", isAuthenticated, async (req, res) => {
    try {
      const categoryData = insertCategorySchema.parse(req.body);
      const category = await storage.createCategory(categoryData);
      res.status(201).json(category);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid category data", errors: error.errors });
      }
      console.error(error);
      res.status(500).json({ message: "Error creating category" });
    }
  });

  apiRouter.put("/categories/:id", isAuthenticated, async (req, res) => {
    try {
      const categoryData = insertCategorySchema.partial().parse(req.body);
      const category = await storage.updateCategory(parseInt(req.params.id), categoryData);
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }
      res.json(category);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid category data", errors: error.errors });
      }
      console.error(error);
      res.status(500).json({ message: "Error updating category" });
    }
  });

  apiRouter.delete("/categories/:id", isAuthenticated, async (req, res) => {
    try {
      const result = await storage.deleteCategory(parseInt(req.params.id));
      if (!result) {
        return res.status(404).json({ message: "Category not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error deleting category" });
    }
  });
  
  // Musician Category routes
  apiRouter.get("/musician-categories", isAuthenticated, async (req, res) => {
    try {
      const categories = await storage.getMusicianCategories();
      res.json(categories);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error fetching musician categories" });
    }
  });

  apiRouter.get("/musician-categories/:id", isAuthenticated, async (req, res) => {
    try {
      const category = await storage.getMusicianCategory(parseInt(req.params.id));
      if (!category) {
        return res.status(404).json({ message: "Musician category not found" });
      }
      res.json(category);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error fetching musician category" });
    }
  });

  apiRouter.post("/musician-categories", isAuthenticated, async (req, res) => {
    try {
      const categoryData = insertMusicianCategorySchema.parse(req.body);
      const category = await storage.createMusicianCategory(categoryData);
      res.status(201).json(category);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid musician category data", errors: error.errors });
      }
      console.error(error);
      res.status(500).json({ message: "Error creating musician category" });
    }
  });

  apiRouter.put("/musician-categories/:id", isAuthenticated, async (req, res) => {
    try {
      const categoryData = insertMusicianCategorySchema.partial().parse(req.body);
      const category = await storage.updateMusicianCategory(parseInt(req.params.id), categoryData);
      if (!category) {
        return res.status(404).json({ message: "Musician category not found" });
      }
      res.json(category);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid musician category data", errors: error.errors });
      }
      console.error(error);
      res.status(500).json({ message: "Error updating musician category" });
    }
  });

  apiRouter.delete("/musician-categories/:id", isAuthenticated, async (req, res) => {
    try {
      const result = await storage.deleteMusicianCategory(parseInt(req.params.id));
      if (!result) {
        return res.status(404).json({ message: "Musician category not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error deleting musician category" });
    }
  });
  
  // Venue Category routes
  apiRouter.get("/venue-categories", isAuthenticated, async (req, res) => {
    try {
      const categories = await storage.getVenueCategories();
      res.json(categories);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error fetching venue categories" });
    }
  });

  apiRouter.get("/venue-categories/:id", isAuthenticated, async (req, res) => {
    try {
      const category = await storage.getVenueCategory(parseInt(req.params.id));
      if (!category) {
        return res.status(404).json({ message: "Venue category not found" });
      }
      res.json(category);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error fetching venue category" });
    }
  });

  apiRouter.post("/venue-categories", isAuthenticated, async (req, res) => {
    try {
      const categoryData = insertVenueCategorySchema.parse(req.body);
      const category = await storage.createVenueCategory(categoryData);
      res.status(201).json(category);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid venue category data", errors: error.errors });
      }
      console.error(error);
      res.status(500).json({ message: "Error creating venue category" });
    }
  });

  apiRouter.put("/venue-categories/:id", isAuthenticated, async (req, res) => {
    try {
      const categoryData = insertVenueCategorySchema.partial().parse(req.body);
      const category = await storage.updateVenueCategory(parseInt(req.params.id), categoryData);
      if (!category) {
        return res.status(404).json({ message: "Venue category not found" });
      }
      res.json(category);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid venue category data", errors: error.errors });
      }
      console.error(error);
      res.status(500).json({ message: "Error updating venue category" });
    }
  });

  apiRouter.delete("/venue-categories/:id", isAuthenticated, async (req, res) => {
    try {
      const result = await storage.deleteVenueCategory(parseInt(req.params.id));
      if (!result) {
        return res.status(404).json({ message: "Venue category not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error deleting venue category" });
    }
  });
  
  // Event Category routes
  apiRouter.get("/event-categories", isAuthenticated, async (req, res) => {
    try {
      const categories = await storage.getEventCategories();
      res.json(categories);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error fetching event categories" });
    }
  });

  apiRouter.get("/event-categories/:id", isAuthenticated, async (req, res) => {
    try {
      const category = await storage.getEventCategory(parseInt(req.params.id));
      if (!category) {
        return res.status(404).json({ message: "Event category not found" });
      }
      res.json(category);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error fetching event category" });
    }
  });

  apiRouter.post("/event-categories", isAuthenticated, async (req, res) => {
    try {
      const categoryData = insertEventCategorySchema.parse(req.body);
      const category = await storage.createEventCategory(categoryData);
      res.status(201).json(category);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid event category data", errors: error.errors });
      }
      console.error(error);
      res.status(500).json({ message: "Error creating event category" });
    }
  });

  apiRouter.put("/event-categories/:id", isAuthenticated, async (req, res) => {
    try {
      const categoryData = insertEventCategorySchema.partial().parse(req.body);
      const category = await storage.updateEventCategory(parseInt(req.params.id), categoryData);
      if (!category) {
        return res.status(404).json({ message: "Event category not found" });
      }
      res.json(category);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid event category data", errors: error.errors });
      }
      console.error(error);
      res.status(500).json({ message: "Error updating event category" });
    }
  });

  apiRouter.delete("/event-categories/:id", isAuthenticated, async (req, res) => {
    try {
      const result = await storage.deleteEventCategory(parseInt(req.params.id));
      if (!result) {
        return res.status(404).json({ message: "Event category not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error deleting event category" });
    }
  });
  
  // Musician Type routes
  apiRouter.get("/musician-types", isAuthenticated, async (req, res) => {
    try {
      const types = await storage.getMusicianTypes();
      res.json(types);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error fetching musician types" });
    }
  });

  apiRouter.get("/musician-types/:id", isAuthenticated, async (req, res) => {
    try {
      const type = await storage.getMusicianType(parseInt(req.params.id));
      if (!type) {
        return res.status(404).json({ message: "Musician type not found" });
      }
      res.json(type);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error fetching musician type" });
    }
  });

  apiRouter.post("/musician-types", isAuthenticated, async (req, res) => {
    try {
      const typeData = insertMusicianTypeSchema.parse(req.body);
      const type = await storage.createMusicianType(typeData);
      res.status(201).json(type);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid musician type data", errors: error.errors });
      }
      console.error(error);
      res.status(500).json({ message: "Error creating musician type" });
    }
  });

  apiRouter.put("/musician-types/:id", isAuthenticated, async (req, res) => {
    try {
      const typeData = insertMusicianTypeSchema.partial().parse(req.body);
      const type = await storage.updateMusicianType(parseInt(req.params.id), typeData);
      if (!type) {
        return res.status(404).json({ message: "Musician type not found" });
      }
      res.json(type);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid musician type data", errors: error.errors });
      }
      console.error(error);
      res.status(500).json({ message: "Error updating musician type" });
    }
  });

  apiRouter.delete("/musician-types/:id", isAuthenticated, async (req, res) => {
    try {
      const result = await storage.deleteMusicianType(parseInt(req.params.id));
      if (!result) {
        return res.status(404).json({ message: "Musician type not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error deleting musician type" });
    }
  });

  // Musician routes
  apiRouter.get("/musicians", isAuthenticated, async (req, res) => {
    try {
      // Parse query parameters for filtering available musicians by date
      const { date, dates } = req.query;
      
      // If dates parameter is provided, fetch musicians available for all given dates
      if (dates) {
        const dateArray = Array.isArray(dates) ? dates : [dates];
        
        // Get musicians available for each date
        const availableMusiciansPromises = dateArray.map(async (dateStr) => {
          const dateObj = new Date(dateStr as string);
          return await storage.getAvailableMusiciansForDate(dateObj);
        });
        
        const availableMusiciansArrays = await Promise.all(availableMusiciansPromises);
        
        // Find musicians available for all requested dates (intersection)
        const musiciansByAllDates = availableMusiciansArrays.reduce((result, musicians, index) => {
          if (index === 0) return musicians;
          return result.filter(m1 => musicians.some(m2 => m2.id === m1.id));
        }, [] as Musician[]);
        
        return res.json(musiciansByAllDates);
      }
      
      // If a single date parameter is provided
      if (date) {
        const dateObj = new Date(date as string);
        const availableMusicians = await storage.getAvailableMusiciansForDate(dateObj);
        return res.json(availableMusicians);
      }
      
      // Otherwise, fetch all musicians
      const musicians = await storage.getMusicians();
      res.json(musicians);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error fetching musicians" });
    }
  });

  apiRouter.get("/musicians/available-by-categories", isAuthenticated, async (req, res) => {
    try {
      const { date, categoryIds } = req.query;
      
      if (!date) {
        return res.status(400).json({ message: "Date parameter is required" });
      }
      
      const dateObj = new Date(date as string);
      
      // Enhanced handling of category IDs to support multiple formats
      // 1. As a comma-separated string: categoryIds=1,2,3
      // 2. As an array of strings: categoryIds[]=1&categoryIds[]=2&categoryIds[]=3
      // 3. As a single value: categoryIds=1
      let parsedCategoryIds: number[] = [];
      
      if (categoryIds) {
        if (Array.isArray(categoryIds)) {
          // Handle array format: categoryIds[]=1&categoryIds[]=2
          parsedCategoryIds = categoryIds.map(id => parseInt(id as string));
        } else if (typeof categoryIds === 'string' && categoryIds.includes(',')) {
          // Handle comma-separated string: categoryIds=1,2,3
          parsedCategoryIds = categoryIds.split(',').map(id => parseInt(id.trim()));
        } else {
          // Handle single value: categoryIds=1
          parsedCategoryIds = [parseInt(categoryIds as string)];
        }
      }
      
      console.log(`Finding musicians available on ${dateObj.toISOString()} for categories:`, parsedCategoryIds);
      
      const musicians = await storage.getAvailableMusiciansForDateAndCategories(dateObj, parsedCategoryIds);
      res.json(musicians);
    } catch (error) {
      console.error("Error fetching available musicians by categories:", error);
      res.status(500).json({ message: "Error fetching available musicians" });
    }
  });
  
  apiRouter.get("/musicians/:id", isAuthenticated, async (req, res) => {
    try {
      const musician = await storage.getMusician(parseInt(req.params.id));
      if (!musician) {
        return res.status(404).json({ message: "Musician not found" });
      }
      res.json(musician);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error fetching musician" });
    }
  });

  apiRouter.post("/musicians", isAuthenticated, async (req, res) => {
    try {
      const musicianData = insertMusicianSchema.parse(req.body);
      const musician = await storage.createMusician(musicianData);
      res.status(201).json(musician);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid musician data", errors: error.errors });
      }
      console.error(error);
      res.status(500).json({ message: "Error creating musician" });
    }
  });

  apiRouter.put("/musicians/:id", isAuthenticated, async (req, res) => {
    try {
      const musicianData = insertMusicianSchema.partial().parse(req.body);
      const musician = await storage.updateMusician(parseInt(req.params.id), musicianData);
      if (!musician) {
        return res.status(404).json({ message: "Musician not found" });
      }
      res.json(musician);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid musician data", errors: error.errors });
      }
      console.error(error);
      res.status(500).json({ message: "Error updating musician" });
    }
  });

  apiRouter.delete("/musicians/:id", isAuthenticated, async (req, res) => {
    try {
      const result = await storage.deleteMusician(parseInt(req.params.id));
      if (!result) {
        return res.status(404).json({ message: "Musician not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error deleting musician" });
    }
  });

  // Availability routes
  apiRouter.get("/availability/:musicianId/:month", isAuthenticated, async (req, res) => {
    try {
      const { musicianId, month } = req.params;
      const availability = await storage.getAvailability(parseInt(musicianId), month);
      res.json(availability);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error fetching availability" });
    }
  });
  
  // Get musician availability calendar by month and year
  apiRouter.get("/musicians/:musicianId/availability-calendar/:month/:year", isAuthenticated, async (req, res) => {
    try {
      const { musicianId, month, year } = req.params;
      const monthInt = parseInt(month);
      const yearInt = parseInt(year);
      
      // Format as YYYY-MM for storage lookup
      const monthStr = `${yearInt}-${monthInt.toString().padStart(2, '0')}`;
      
      // Get availability data
      const availability = await storage.getAvailability(parseInt(musicianId), monthStr);
      
      // Get bookings data
      const bookings = await storage.getBookingsByMusicianAndMonth(parseInt(musicianId), monthInt, yearInt);
      
      // Return combined data
      res.json({
        month: monthInt,
        year: yearInt,
        availability,
        bookings
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error fetching musician availability calendar" });
    }
  });
  
  // Update musician availability
  apiRouter.post("/musicians/:musicianId/availability", isAuthenticated, async (req, res) => {
    try {
      const { musicianId } = req.params;
      const { date, isAvailable } = req.body;
      
      if (!date) {
        return res.status(400).json({ message: "Date is required" });
      }
      
      if (typeof isAvailable !== 'boolean') {
        return res.status(400).json({ message: "isAvailable must be a boolean" });
      }
      
      // Parse date and extract month/year
      const dateObj = new Date(date);
      const month = dateObj.getMonth() + 1; // 0-based to 1-based
      const year = dateObj.getFullYear();
      const monthStr = `${year}-${month.toString().padStart(2, '0')}`;
      
      // Create or update availability
      const availability = await storage.updateAvailabilityForDate(
        parseInt(musicianId), 
        date,
        isAvailable,
        monthStr,
        year
      );
      
      res.json(availability);
    } catch (error) {
      console.error("Error updating musician availability:", error);
      res.status(500).json({ message: "Error updating musician availability" });
    }
  });
  
  // Generate shareable availability link token
  apiRouter.post("/musicians/:musicianId/availability-share", isAuthenticated, async (req, res) => {
    try {
      const { musicianId } = req.params;
      const { expiryDays = 30 } = req.body;
      
      // Get the musician to ensure they exist
      const musician = await storage.getMusician(parseInt(musicianId));
      if (!musician) {
        return res.status(404).json({ message: "Musician not found" });
      }
      
      // Generate a unique token
      const token = crypto.randomBytes(32).toString('hex');
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + expiryDays);
      
      // Store the token - make sure expiresAt is a proper Date object and not a string
      const shareLink = await storage.createAvailabilityShareLink({
        musicianId: parseInt(musicianId),
        token,
        expiresAt: expiryDate
      });
      
      res.json({
        id: shareLink.id,
        shareLink: `${req.protocol}://${req.get('host')}/availability/${token}`,
        expiryDate: shareLink.expiresAt, // Changed to match frontend expectation
        createdAt: shareLink.createdAt
      });
    } catch (error) {
      console.error("Error generating availability share link:", error);
      res.status(500).json({ message: "Error generating availability share link" });
    }
  });
  
  // Get all availability share links for a musician
  apiRouter.get("/musicians/:musicianId/availability-share", isAuthenticated, async (req, res) => {
    try {
      const { musicianId } = req.params;
      
      // Check if musician exists
      const musician = await storage.getMusician(parseInt(musicianId));
      if (!musician) {
        return res.status(404).json({ message: "Musician not found" });
      }
      
      // Get all share links
      const shareLinks = await storage.getAvailabilityShareLinks(parseInt(musicianId));
      
      // Format share links with proper URLs
      const formattedLinks = shareLinks.map(link => ({
        id: link.id,
        shareLink: `${req.protocol}://${req.get('host')}/availability/${link.token}`,
        expiryDate: link.expiresAt, // Changed to match frontend expectation
        createdAt: link.createdAt,
        isExpired: link.expiresAt ? new Date() > new Date(link.expiresAt) : false
      }));
      
      res.json(formattedLinks);
    } catch (error) {
      console.error("Error fetching availability share links:", error);
      res.status(500).json({ message: "Error fetching availability share links" });
    }
  });
  
  // Delete an availability share link
  apiRouter.delete("/musicians/:musicianId/availability-share/:linkId", isAuthenticated, async (req, res) => {
    try {
      const { musicianId, linkId } = req.params;
      
      // Get the share link
      const shareLink = await storage.getAvailabilityShareLink(parseInt(linkId));
      if (!shareLink) {
        return res.status(404).json({ message: "Share link not found" });
      }
      
      // Check if the share link belongs to the musician
      if (shareLink.musicianId !== parseInt(musicianId)) {
        return res.status(403).json({ message: "Unauthorized access to share link" });
      }
      
      // Delete the share link
      const result = await storage.deleteAvailabilityShareLink(parseInt(linkId));
      if (!result) {
        return res.status(500).json({ message: "Failed to delete share link" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting availability share link:", error);
      res.status(500).json({ message: "Error deleting availability share link" });
    }
  });
  
  // Public endpoint to access shared availability
  apiRouter.get("/public/availability/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const { month, year } = req.query;
      
      // Get the share link
      const shareLink = await storage.getAvailabilityShareLinkByToken(token);
      if (!shareLink) {
        return res.status(404).json({ message: "Share link not found or expired" });
      }
      
      // Check if the link has expired
      if (shareLink.expiresAt && new Date() > new Date(shareLink.expiresAt)) {
        return res.status(401).json({ message: "Share link has expired" });
      }
      
      // Get the musician
      const musician = await storage.getMusician(shareLink.musicianId);
      if (!musician) {
        return res.status(404).json({ message: "Musician not found" });
      }
      
      // Get musician's availability for requested month/year
      const monthInt = parseInt(month as string);
      const yearInt = parseInt(year as string);
      const monthStr = `${yearInt}-${monthInt.toString().padStart(2, '0')}`;
      
      const availability = await storage.getAvailability(shareLink.musicianId, monthStr);
      const bookings = await storage.getBookingsByMusicianAndMonth(shareLink.musicianId, monthInt, yearInt);
      
      res.json({
        musician: {
          id: musician.id,
          name: musician.name,
          profileImage: musician.profileImage
        },
        calendar: {
          month: monthInt,
          year: yearInt,
          availability,
          bookings
        }
      });
    } catch (error) {
      console.error("Error accessing shared availability:", error);
      res.status(500).json({ message: "Error accessing shared availability" });
    }
  });
  
  // Public endpoint to update availability via share link
  apiRouter.post("/public/availability/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const { dates, isAvailable } = req.body;
      
      // Validate input
      if (!dates || !Array.isArray(dates) || dates.length === 0) {
        return res.status(400).json({ message: "Dates array is required" });
      }
      
      if (typeof isAvailable !== 'boolean') {
        return res.status(400).json({ message: "isAvailable must be a boolean" });
      }
      
      // Get the share link
      const shareLink = await storage.getAvailabilityShareLinkByToken(token);
      if (!shareLink) {
        return res.status(404).json({ message: "Share link not found" });
      }
      
      // Check if the link has expired
      if (shareLink.expiresAt && new Date() > new Date(shareLink.expiresAt)) {
        return res.status(401).json({ message: "Share link has expired" });
      }
      
      // Process each date
      const results = [];
      for (const dateStr of dates) {
        // Only allow updating future dates
        const dateObj = new Date(dateStr);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (dateObj < today) {
          continue; // Skip past dates
        }
        
        // Extract month/year
        const month = dateObj.getMonth() + 1; // 0-based to 1-based
        const year = dateObj.getFullYear();
        const monthStr = `${year}-${month.toString().padStart(2, '0')}`;
        
        // Update availability
        const availability = await storage.updateAvailabilityForDate(
          shareLink.musicianId,
          dateStr,
          isAvailable,
          monthStr,
          year
        );
        
        results.push(availability);
      }
      
      res.json({
        success: true,
        updatedDates: results.length,
        musicianId: shareLink.musicianId
      });
    } catch (error) {
      console.error("Error updating availability via share link:", error);
      res.status(500).json({ message: "Error updating availability" });
    }
  });

  apiRouter.post("/availability", isAuthenticated, async (req, res) => {
    try {
      const availabilityData = insertAvailabilitySchema.parse(req.body);
      const availability = await storage.createAvailability(availabilityData);
      res.status(201).json(availability);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid availability data", errors: error.errors });
      }
      console.error(error);
      res.status(500).json({ message: "Error creating availability" });
    }
  });

  apiRouter.get("/available-musicians", isAuthenticated, async (req, res) => {
    try {
      const { date, categoryIds } = req.query;
      
      if (!date) {
        return res.status(400).json({ message: "Date parameter is required" });
      }
      
      const parsedDate = new Date(date as string);
      
      // Enhanced handling of category IDs to support multiple formats
      // 1. As a comma-separated string: categoryIds=1,2,3
      // 2. As an array of strings: categoryIds[]=1&categoryIds[]=2&categoryIds[]=3
      // 3. As a single value: categoryIds=1
      let parsedCategoryIds: number[] | undefined;
      
      if (categoryIds) {
        if (Array.isArray(categoryIds)) {
          // Handle array format: categoryIds[]=1&categoryIds[]=2
          parsedCategoryIds = categoryIds.map(id => parseInt(id as string));
        } else if (typeof categoryIds === 'string' && categoryIds.includes(',')) {
          // Handle comma-separated string: categoryIds=1,2,3
          parsedCategoryIds = categoryIds.split(',').map(id => parseInt(id.trim()));
        } else {
          // Handle single value: categoryIds=1
          parsedCategoryIds = [parseInt(categoryIds as string)];
        }
      }
      
      console.log(`Finding musicians available on ${parsedDate.toISOString()} with categories:`, parsedCategoryIds);
      
      const musicians = await storage.getAvailableMusiciansForDate(parsedDate, parsedCategoryIds);
      res.json(musicians);
    } catch (error) {
      console.error("Error fetching available musicians:", error);
      res.status(500).json({ message: "Error fetching available musicians" });
    }
  });

  // Event routes
  apiRouter.get("/events", isAuthenticated, async (req, res) => {
    try {
      const events = await storage.getEvents();
      res.json(events);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error fetching events" });
    }
  });

  apiRouter.get("/events/:id", isAuthenticated, async (req, res) => {
    try {
      const eventId = parseInt(req.params.id);
      const event = await storage.getEvent(eventId);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      // Fetch musician assignments for this event
      const musicianAssignments = await storage.getEventMusicianAssignments(eventId);
      console.log("Fetched musician assignments for event:", eventId, musicianAssignments);
      
      // Fetch musician statuses for this event
      const musicianStatuses = await storage.getEventMusicianStatuses(eventId);
      
      // Include assignments and statuses with the event data
      const eventWithData = {
        ...event,
        musicianAssignments,
        musicianStatuses
      };
      
      console.log("Returning event data with assignments:", JSON.stringify(eventWithData.musicianAssignments));
      res.json(eventWithData);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error fetching event" });
    }
  });
  
  // Update musician status in an event
  apiRouter.post("/events/:id/musician-status", isAuthenticated, async (req, res) => {
    try {
      const eventId = parseInt(req.params.id);
      const { musicianId, status, dateStr } = req.body;
      
      if (!musicianId || !status) {
        return res.status(400).json({ message: "Missing required fields: musicianId and status" });
      }
      
      const event = await storage.getEvent(eventId);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      // IMPORTANT: We always need a specific date for status updates
      // If no date was provided, we can't proceed
      if (!dateStr) {
        return res.status(400).json({ message: "Missing required field: dateStr (date is required for status updates)" });
      }
      
      console.log(`Updating status for event ${eventId}, musician ${musicianId}, date ${dateStr} to ${status}`);
      
      // Always update for a specific date only
      const updateResult = await storage.updateMusicianEventStatusForDate(eventId, musicianId, status, dateStr);
      if (!updateResult) {
        return res.status(404).json({ message: "Musician not found in this event on the specified date" });
      }
      
      // If the status is 'accepted' or 'contract-sent', create a contract (if one doesn't already exist)
      if (status === 'accepted' || status === 'contract-sent') {
        try {
          // Get the musician data
          const musician = await storage.getMusician(musicianId);
          if (!musician) {
            console.error(`Error: Musician with ID ${musicianId} not found`);
          } else {
            // First, check if there's already an active contract for this musician/event/date combination
            // Parse the date string to a Date object if provided
            const eventDate = dateStr ? new Date(dateStr) : undefined;
            
            // Get contracts specific to this date if provided
            const existingContracts = await storage.getContractLinksByEventAndDate(eventId, eventDate)
              .then(contracts => contracts.filter(c => 
                c.musicianId === musicianId && 
                ['pending', 'accepted', 'contract-sent'].includes(c.status)
              ));
            
            // Only create a new contract if there are no active contracts
            if (!existingContracts || existingContracts.length === 0) {
              console.log(`No active contracts found for musician ${musicianId} in event ${eventId}. Creating new contract.`);
              
              // Find latest booking for this musician and event
              const bookings = await storage.getBookingsByEventAndMusician(eventId, musicianId);
              let bookingId = 0;
              let invitationId = 0;
              
              if (bookings && bookings.length > 0) {
                bookingId = bookings[0].id;
                // If booking exists, it should have an invitation ID
                invitationId = bookings[0].invitationId;
              }
              
              // If we don't have an invitation ID from booking, try to find one
              if (invitationId === 0) {
                // Get invitations for this musician and event
                const invitations = await storage.getInvitationsByEventAndMusician(eventId, musicianId);
                if (invitations && invitations.length > 0) {
                  invitationId = invitations[0].id;
                } else {
                  console.error(`No invitation found for musician ${musicianId} in event ${eventId}`);
                  return; // Can't proceed without an invitation ID
                }
              }
              
              // Generate a unique token for the contract
              const token = crypto.randomBytes(32).toString('hex');
              
              // Calculate expiry date (7 days from now)
              const expiresAt = new Date();
              expiresAt.setDate(expiresAt.getDate() + 7);
              
              // Get the musician's pay rate for this event
              let contractAmount = 0;
              
              // Check for existing contracts for this musician/event/date
              // If there's already a contract with a valid amount, use that amount
              const existingContractsWithAmount = existingContracts.filter(c => c.amount && c.amount > 0);
              if (existingContractsWithAmount.length > 0) {
                contractAmount = existingContractsWithAmount[0].amount || 0;
                console.log(`Using existing contract amount: ${contractAmount} from contract ID ${existingContractsWithAmount[0].id}`);
              }
              
              // If no amount from existing contracts, check if we have a booking with payment amount
              else if (bookings && bookings.length > 0 && bookings[0].paymentAmount) {
                contractAmount = bookings[0].paymentAmount;
                console.log(`Using booking payment amount: ${contractAmount} from booking ID ${bookings[0].id}`);
              }
              
              // If no amount from booking, try to find the musician's pay rate for this event type
              if (contractAmount === 0) {
                try {
                  const event = await storage.getEvent(eventId);
                  
                  if (event) {
                    // Get musician's pay rates
                    const payRates = await storage.getMusicianPayRatesByMusician(musicianId);
                    
                    if (payRates && payRates.length > 0) {
                      // First try to find exact match by category ID
                      let matchingRate = event.categoryIds ? 
                        payRates.find(rate => rate.eventCategoryId === event.categoryIds) : undefined;
                      
                      // Fall back to event type match if no category match
                      if (!matchingRate) {
                        matchingRate = payRates.find(rate => rate.eventType === event.eventType);
                      }
                      
                      // If still no match, just use the first pay rate
                      if (!matchingRate && payRates.length > 0) {
                        matchingRate = payRates[0];
                        console.log(`No exact match for pay rate, using default rate for musician ${musicianId}`);
                      }
                      
                      if (matchingRate) {
                        // Use day rate if we have one, or hourly rate * 8 hours as a fallback
                        contractAmount = matchingRate.dayRate || (matchingRate.hourlyRate * 8);
                        console.log(`Using musician pay rate: ${contractAmount} for event ${eventId}, from rate ID ${matchingRate.id}`);
                      }
                    }
                  }
                } catch (err) {
                  console.error('Error fetching pay rate:', err);
                }
              }
              
              // Set a default amount if we couldn't find a proper rate
              if (contractAmount === 0) {
                contractAmount = 100; // Default fallback amount
                console.log(`Using default amount of $100 for contract as no rate was found`);
              }
              
              // Create a contract link
              // IMPORTANT: When creating a contract, make sure the date is included
              // This will ensure the contract is tied to a specific date
              if (!dateStr) {
                console.error(`Error: dateStr is missing when creating contract for musician ${musicianId} in event ${eventId}`);
                return; // Can't create a contract without a date
              }
              
              const contractData = {
                bookingId,
                eventId,
                musicianId,
                invitationId, // Add the invitation ID
                token,
                expiresAt,
                status: status === 'contract-sent' ? 'contract-sent' : 'pending', // Use 'contract-sent' status directly if that's the current status
                eventDate: new Date(dateStr), // Always include a specific date for the contract
                amount: contractAmount > 0 ? contractAmount : null // Add the contract amount
              };
              
              // Create the contract link
              const contract = await storage.createContractLink(contractData);
              console.log(`Created contract with ID ${contract.id} for musician ${musicianId}`);
              
              // After creating the contract, update the status to "contract-sent" instead of keeping it as "accepted"
              if (status === 'accepted') {
                await storage.updateMusicianEventStatusForDate(eventId, musicianId, 'contract-sent', dateStr || '');
              }
            } else {
              console.log(`Active contract already exists for musician ${musicianId} in event ${eventId}. ID: ${existingContracts[0].id}`);
              
              // Ensure the status is correctly set to "contract-sent" regardless
              if (status === 'accepted') {
                await storage.updateMusicianEventStatusForDate(eventId, musicianId, 'contract-sent', dateStr || '');
              }
            }
          }
        } catch (contractError) {
          console.error("Error handling contract:", contractError);
          // Don't fail the request if contract handling fails
        }
      }
      
      const updatedStatuses = await storage.getEventMusicianStatuses(eventId);
      res.json({ success: true, statuses: updatedStatuses });
    } catch (error) {
      console.error("Error updating musician status:", error);
      res.status(500).json({ message: "Error updating musician status" });
    }
  });

  apiRouter.post("/events", isAuthenticated, async (req, res) => {
    try {
      console.log("Creating event with data:", req.body);
      
      // Process eventDates to handle array of ISO strings
      if (req.body.eventDates && Array.isArray(req.body.eventDates)) {
        // Keep it as is - we'll let the schema validation handle the type conversion
      }
      
      // For multi-day events, set startDate and endDate from the first and last eventDate
      if (req.body.eventDates && Array.isArray(req.body.eventDates) && req.body.eventDates.length > 0) {
        // Sort dates to ensure we get the right start and end dates
        const sortedDates = [...req.body.eventDates].sort();
        req.body.startDate = new Date(sortedDates[0]);
        req.body.endDate = new Date(sortedDates[sortedDates.length - 1]);
      }
      
      // Set eventType to a default value if it doesn't exist
      if (!req.body.eventType) {
        req.body.eventType = "standard";
      }
      
      // Parse the incoming data with our enhanced schema
      const eventData = insertEventSchema.parse(req.body);
      
      // Store the musician assignments separately since they're not part of the database schema
      const musicianAssignments = eventData.musicianAssignments;
      const musicianTypeIds = eventData.musicianTypeIds;
      const musicianIds = eventData.musicianIds;
      
      // Remove extended properties before storing in database
      delete eventData.musicianAssignments;
      delete eventData.musicianTypeIds;
      delete eventData.musicianIds;
      
      // Create the event with the musician assignments
      const eventWithAssignments = {
        ...eventData,
        musicianAssignments
      };
      
      const event = await storage.createEvent(eventWithAssignments);
      
      // If we have musician assignments, process them (this would create invitations or other records)
      if (musicianAssignments && Object.keys(musicianAssignments).length > 0) {
        // In a full implementation, you would create invitation records here
        console.log("Musician assignments for event:", musicianAssignments);
        
        // For now, just log the assignments and return success
        // TODO: Implement actual invitations based on assignments
      }
      
      // For debugging: log the successful event creation
      console.log("Successfully created event:", event);
      
      res.status(201).json(event);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Validation error:", error.errors);
        return res.status(400).json({ message: "Invalid event data", errors: error.errors });
      }
      console.error("Error creating event:", error);
      res.status(500).json({ message: "Error creating event" });
    }
  });

  apiRouter.put("/events/:id", isAuthenticated, async (req, res) => {
    try {
      const eventId = parseInt(req.params.id);
      
      // Get existing musician statuses before updating event
      const existingStatuses = await storage.getEventMusicianStatuses(eventId);
      
      const eventData = insertEventSchema.partial().parse(req.body);
      
      // Get the musician assignments from the request
      const musicianAssignments = eventData.musicianAssignments;
      
      // Update the event
      const event = await storage.updateEvent(eventId, eventData);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      // If we have updated assignments and statuses, ensure we don't lose existing statuses
      if (musicianAssignments && existingStatuses) {
        console.log("Processing musician assignments update for event", eventId, musicianAssignments);
        
        // For each date in the assignments
        for (const [dateStr, musicianIds] of Object.entries(musicianAssignments)) {
          // For each musician that has been assigned
          for (const musicianId of musicianIds as number[]) {
            // Check if this musician already has a status for this date
            const statusKey = 'all'; // Most status updates use 'all' as the key
            const existingStatus = existingStatuses[statusKey]?.[musicianId];
            
            // If there was a previous status, ensure it's preserved
            if (existingStatus && ['contract-sent', 'contract-signed'].includes(existingStatus)) {
              // Preserve the existing status
              await storage.updateMusicianEventStatusForDate(eventId, musicianId, existingStatus, dateStr);
              console.log(`Preserved status "${existingStatus}" for musician ${musicianId} on date ${dateStr}`);
            }
          }
        }
      }
      
      res.json(event);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid event data", errors: error.errors });
      }
      console.error(error);
      res.status(500).json({ message: "Error updating event" });
    }
  });

  apiRouter.delete("/events/:id", isAuthenticated, async (req, res) => {
    try {
      const result = await storage.deleteEvent(parseInt(req.params.id));
      if (!result) {
        return res.status(404).json({ message: "Event not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error deleting event" });
    }
  });

  // Invitation routes
  apiRouter.get("/invitations", isAuthenticated, async (req, res) => {
    try {
      const eventId = req.query.eventId ? parseInt(req.query.eventId as string) : undefined;
      const musicianId = req.query.musicianId ? parseInt(req.query.musicianId as string) : undefined;
      const invitations = await storage.getInvitations(eventId, musicianId);
      res.json(invitations);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error fetching invitations" });
    }
  });

  apiRouter.get("/invitations/:id", isAuthenticated, async (req, res) => {
    try {
      const invitation = await storage.getInvitation(parseInt(req.params.id));
      if (!invitation) {
        return res.status(404).json({ message: "Invitation not found" });
      }
      res.json(invitation);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error fetching invitation" });
    }
  });

  apiRouter.post("/invitations", isAuthenticated, async (req, res) => {
    try {
      const invitationData = insertInvitationSchema.parse(req.body);
      const invitation = await storage.createInvitation(invitationData);
      res.status(201).json(invitation);
      
      // Could add email sending functionality here
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid invitation data", errors: error.errors });
      }
      console.error(error);
      res.status(500).json({ message: "Error creating invitation" });
    }
  });

  apiRouter.put("/invitations/:id", isAuthenticated, async (req, res) => {
    try {
      const invitationData = insertInvitationSchema.partial().parse(req.body);
      const invitation = await storage.updateInvitation(parseInt(req.params.id), invitationData);
      if (!invitation) {
        return res.status(404).json({ message: "Invitation not found" });
      }
      res.json(invitation);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid invitation data", errors: error.errors });
      }
      console.error(error);
      res.status(500).json({ message: "Error updating invitation" });
    }
  });

  apiRouter.get("/events/:eventId/musicians/:musicianId/invitations", isAuthenticated, async (req, res) => {
    try {
      const eventId = parseInt(req.params.eventId);
      const musicianId = parseInt(req.params.musicianId);
      
      const invitations = await storage.getInvitationsByEventAndMusician(eventId, musicianId);
      res.json(invitations);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error fetching invitations" });
    }
  });

  // Public route for musician to respond to invitation (no auth required)
  apiRouter.post("/invitations/:id/respond", async (req, res) => {
    try {
      const invitationId = parseInt(req.params.id);
      const invitation = await storage.getInvitation(invitationId);
      
      if (!invitation) {
        return res.status(404).json({ message: "Invitation not found" });
      }
      
      const { response, message } = req.body;
      if (!response || !['accept', 'decline'].includes(response)) {
        return res.status(400).json({ message: "Invalid response - must be 'accept' or 'decline'" });
      }
      
      const status = response === 'accept' ? 'accepted' : 'declined';
      const updatedInvitation = await storage.updateInvitation(invitationId, {
        status,
        respondedAt: new Date(),
        responseMessage: message || null
      });
      
      // If accepted, update the musician event status
      if (status === 'accepted') {
        await storage.updateMusicianEventStatus(invitation.eventId, invitation.musicianId, 'accepted');
      }
      
      res.json(updatedInvitation);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error responding to invitation" });
    }
  });

  // Booking routes
  apiRouter.get("/bookings", isAuthenticated, async (req, res) => {
    try {
      const { eventId } = req.query;
      const bookings = eventId 
        ? await storage.getBookings(parseInt(eventId as string))
        : await storage.getBookings();
      res.json(bookings);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error fetching bookings" });
    }
  });
  
  // Get musician bookings by month
  apiRouter.get("/musicians/:musicianId/bookings/:month/:year", isAuthenticated, async (req, res) => {
    try {
      const { musicianId, month, year } = req.params;
      const bookings = await storage.getBookingsByMusicianAndMonth(
        parseInt(musicianId),
        parseInt(month),
        parseInt(year)
      );
      res.json(bookings);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error fetching musician bookings by month" });
    }
  });
  
  // Get all musician events with contract and invitation status
  apiRouter.get("/musicians/:musicianId/events", isAuthenticated, async (req, res) => {
    try {
      const { musicianId } = req.params;
      const { status, timeframe } = req.query;
      
      const events = await storage.getMusicianEvents(
        parseInt(musicianId),
        status as string | undefined,
        timeframe as string | undefined
      );
      
      res.json(events);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error fetching musician events" });
    }
  });
  
  // Get musician event dates in a specific month
  apiRouter.get("/musicians/:musicianId/event-dates/:month/:year", isAuthenticated, async (req, res) => {
    try {
      const { musicianId, month, year } = req.params;
      
      const eventDates = await storage.getMusicianEventDatesInMonth(
        parseInt(musicianId),
        parseInt(month),
        parseInt(year)
      );
      
      res.json(eventDates);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error fetching musician event dates" });
    }
  });

  apiRouter.get("/bookings/:id", isAuthenticated, async (req, res) => {
    try {
      const booking = await storage.getBooking(parseInt(req.params.id));
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      res.json(booking);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error fetching booking" });
    }
  });

  apiRouter.post("/bookings", isAuthenticated, async (req, res) => {
    try {
      const bookingData = insertBookingSchema.parse(req.body);
      const booking = await storage.createBooking(bookingData);
      res.status(201).json(booking);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid booking data", errors: error.errors });
      }
      console.error(error);
      res.status(500).json({ message: "Error creating booking" });
    }
  });

  apiRouter.put("/bookings/:id", isAuthenticated, async (req, res) => {
    try {
      const bookingData = insertBookingSchema.partial().parse(req.body);
      const booking = await storage.updateBooking(parseInt(req.params.id), bookingData);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      res.json(booking);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid booking data", errors: error.errors });
      }
      console.error(error);
      res.status(500).json({ message: "Error updating booking" });
    }
  });

  apiRouter.delete("/bookings/:id", isAuthenticated, async (req, res) => {
    try {
      const result = await storage.deleteBooking(parseInt(req.params.id));
      if (!result) {
        return res.status(404).json({ message: "Booking not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error deleting booking" });
    }
  });

  // Payment routes
  apiRouter.get("/payments", isAuthenticated, async (req, res) => {
    try {
      const { bookingId } = req.query;
      const payments = bookingId 
        ? await storage.getPayments(parseInt(bookingId as string))
        : await storage.getPayments();
      res.json(payments);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error fetching payments" });
    }
  });

  apiRouter.post("/payments", isAuthenticated, async (req, res) => {
    try {
      const paymentData = insertPaymentSchema.parse(req.body);
      const payment = await storage.createPayment(paymentData);
      res.status(201).json(payment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid payment data", errors: error.errors });
      }
      console.error(error);
      res.status(500).json({ message: "Error creating payment" });
    }
  });

  // Collection routes
  apiRouter.get("/collections", isAuthenticated, async (req, res) => {
    try {
      const { eventId } = req.query;
      const collections = eventId 
        ? await storage.getCollections(parseInt(eventId as string))
        : await storage.getCollections();
      res.json(collections);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error fetching collections" });
    }
  });

  apiRouter.post("/collections", isAuthenticated, async (req, res) => {
    try {
      const collectionData = insertCollectionSchema.parse(req.body);
      const collection = await storage.createCollection(collectionData);
      res.status(201).json(collection);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid collection data", errors: error.errors });
      }
      console.error(error);
      res.status(500).json({ message: "Error creating collection" });
    }
  });

  // Expense routes
  apiRouter.get("/expenses", isAuthenticated, async (req, res) => {
    try {
      const { eventId } = req.query;
      const expenses = eventId 
        ? await storage.getExpenses(parseInt(eventId as string))
        : await storage.getExpenses();
      res.json(expenses);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error fetching expenses" });
    }
  });

  apiRouter.post("/expenses", isAuthenticated, async (req, res) => {
    try {
      const expenseData = insertExpenseSchema.parse(req.body);
      const expense = await storage.createExpense(expenseData);
      res.status(201).json(expense);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid expense data", errors: error.errors });
      }
      console.error(error);
      res.status(500).json({ message: "Error creating expense" });
    }
  });

  // Profitability route
  apiRouter.get("/event-profitability/:id", isAuthenticated, async (req, res) => {
    try {
      const profitability = await storage.getEventProfitability(parseInt(req.params.id));
      res.json(profitability);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error calculating event profitability" });
    }
  });

  // WhatsApp notification endpoint - mock for demo
  apiRouter.post("/notify/whatsapp", isAuthenticated, (req, res) => {
    const { to, message } = req.body;
    
    if (!to || !message) {
      return res.status(400).json({ message: "Both 'to' and 'message' fields are required" });
    }
    
    // In a real app, this would integrate with the WhatsApp Business API
    console.log(`[WhatsApp Mock] Sending to ${to}: ${message}`);
    
    res.json({
      success: true,
      messageSent: true,
      to,
      timestamp: new Date()
    });
  });

  // Monthly Planner routes
  apiRouter.get("/planners", isAuthenticated, async (req, res) => {
    try {
      const planners = await storage.getMonthlyPlanners();
      res.json(planners);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error fetching planners" });
    }
  });

  apiRouter.get("/planners/:id", isAuthenticated, async (req, res) => {
    try {
      const planner = await storage.getMonthlyPlanner(parseInt(req.params.id));
      if (!planner) {
        return res.status(404).json({ message: "Planner not found" });
      }
      res.json(planner);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error fetching planner" });
    }
  });

  apiRouter.get("/planners/month/:month/year/:year", isAuthenticated, async (req, res) => {
    try {
      const { month, year } = req.params;
      const planner = await storage.getMonthlyPlannerByMonth(parseInt(month), parseInt(year));
      if (!planner) {
        return res.status(404).json({ message: "Planner not found for specified month/year" });
      }
      res.json(planner);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error fetching planner by month/year" });
    }
  });

  apiRouter.post("/planners", isAuthenticated, async (req, res) => {
    try {
      console.log("Creating planner with data:", req.body);
      
      // Set default values for required fields if they're missing
      const plannerData = {
        ...req.body,
        status: req.body.status || "draft",
        description: req.body.description || null
      };
      
      // Log the data after defaults are applied
      console.log("Modified planner data:", plannerData);
      
      // Validate with schema
      try {
        const validatedData = insertMonthlyPlannerSchema.parse(plannerData);
        console.log("Validated planner data:", validatedData);
        
        const planner = await storage.createMonthlyPlanner(validatedData);
        console.log("Created planner:", planner);
        
        res.status(201).json(planner);
      } catch (zodError) {
        console.error("Schema validation error:", zodError);
        return res.status(400).json({ 
          message: "Invalid planner data", 
          errors: zodError instanceof z.ZodError ? zodError.errors : "Unknown validation error" 
        });
      }
    } catch (error) {
      console.error("Server error creating planner:", error);
      res.status(500).json({ message: "Error creating planner" });
    }
  });

  apiRouter.put("/planners/:id", isAuthenticated, async (req, res) => {
    try {
      const plannerData = insertMonthlyPlannerSchema.partial().parse(req.body);
      const planner = await storage.updateMonthlyPlanner(parseInt(req.params.id), plannerData);
      if (!planner) {
        return res.status(404).json({ message: "Planner not found" });
      }
      res.json(planner);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid planner data", errors: error.errors });
      }
      console.error(error);
      res.status(500).json({ message: "Error updating planner" });
    }
  });

  apiRouter.delete("/planners/:id", isAuthenticated, async (req, res) => {
    try {
      const result = await storage.deleteMonthlyPlanner(parseInt(req.params.id));
      if (!result) {
        return res.status(404).json({ message: "Planner not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error deleting planner" });
    }
  });

  // Planner Slots routes
  apiRouter.get("/planner-slots", isAuthenticated, async (req, res) => {
    try {
      const plannerId = req.query.plannerId ? parseInt(req.query.plannerId as string) : undefined;
      const slots = await storage.getPlannerSlots(plannerId);
      res.json(slots);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error fetching planner slots" });
    }
  });

  apiRouter.get("/planner-slots/:id", isAuthenticated, async (req, res) => {
    try {
      const slot = await storage.getPlannerSlot(parseInt(req.params.id));
      if (!slot) {
        return res.status(404).json({ message: "Planner slot not found" });
      }
      res.json(slot);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error fetching planner slot" });
    }
  });

  apiRouter.get("/planner-slots/date/:date", isAuthenticated, async (req, res) => {
    try {
      const date = new Date(req.params.date);
      const slots = await storage.getPlannerSlotsByDate(date);
      res.json(slots);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error fetching planner slots by date" });
    }
  });

  apiRouter.post("/planner-slots", isAuthenticated, async (req, res) => {
    try {
      console.log("Creating planner slot with data:", req.body);
      
      // Ensure date is properly handled
      const slotData = {
        ...req.body,
        // If date is already a Date object, use it, otherwise try to parse it
        date: req.body.date instanceof Date ? 
          req.body.date : 
          (typeof req.body.date === 'string' ? 
            new Date(req.body.date) : 
            req.body.date)
      };
      
      console.log("Modified slot data:", slotData);
      
      // Validate with schema
      const validatedData = insertPlannerSlotSchema.parse(slotData);
      console.log("Validated slot data:", validatedData);
      
      const slot = await storage.createPlannerSlot(validatedData);
      console.log("Created slot:", slot);
      
      res.status(201).json(slot);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Zod validation error:", error.errors);
        return res.status(400).json({ message: "Invalid slot data", errors: error.errors });
      }
      console.error("Error creating planner slot:", error);
      res.status(500).json({ message: "Error creating planner slot" });
    }
  });

  apiRouter.put("/planner-slots/:id", isAuthenticated, async (req, res) => {
    try {
      console.log("Updating planner slot with data:", req.body);
      
      // Ensure date is properly handled, same as in the POST endpoint
      const slotData = {
        ...req.body,
        // If date is provided, ensure it's properly converted
        ...(req.body.date && {
          date: req.body.date instanceof Date ? 
            req.body.date : 
            (typeof req.body.date === 'string' ? 
              new Date(req.body.date) : 
              req.body.date)
        })
      };
      
      console.log("Modified update slot data:", slotData);
      
      // Allow partial updates with the schema
      const validatedData = insertPlannerSlotSchema.partial().parse(slotData);
      console.log("Validated update slot data:", validatedData);
      
      const slot = await storage.updatePlannerSlot(parseInt(req.params.id), validatedData);
      if (!slot) {
        return res.status(404).json({ message: "Planner slot not found" });
      }
      
      console.log("Updated slot:", slot);
      res.json(slot);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Zod validation error:", error.errors);
        return res.status(400).json({ message: "Invalid slot data", errors: error.errors });
      }
      console.error("Error updating planner slot:", error);
      res.status(500).json({ message: "Error updating planner slot" });
    }
  });

  apiRouter.delete("/planner-slots/:id", isAuthenticated, async (req, res) => {
    try {
      const result = await storage.deletePlannerSlot(parseInt(req.params.id));
      if (!result) {
        return res.status(404).json({ message: "Planner slot not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error deleting planner slot" });
    }
  });

  // Planner Assignments routes
  apiRouter.get("/planner-assignments", isAuthenticated, async (req, res) => {
    try {
      const slotId = req.query.slotId ? parseInt(req.query.slotId as string) : undefined;
      const musicianId = req.query.musicianId ? parseInt(req.query.musicianId as string) : undefined;
      const assignments = await storage.getPlannerAssignments(slotId, musicianId);
      res.json(assignments);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error fetching planner assignments" });
    }
  });

  apiRouter.get("/planner-assignments/:id", isAuthenticated, async (req, res) => {
    try {
      const assignment = await storage.getPlannerAssignment(parseInt(req.params.id));
      if (!assignment) {
        return res.status(404).json({ message: "Assignment not found" });
      }
      res.json(assignment);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error fetching assignment" });
    }
  });

  apiRouter.post("/planner-assignments", isAuthenticated, async (req, res) => {
    try {
      const assignmentData = insertPlannerAssignmentSchema.parse(req.body);
      const assignment = await storage.createPlannerAssignment(assignmentData);
      res.status(201).json(assignment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid assignment data", errors: error.errors });
      }
      console.error(error);
      res.status(500).json({ message: "Error creating assignment" });
    }
  });

  apiRouter.put("/planner-assignments/:id", isAuthenticated, async (req, res) => {
    try {
      const assignmentData = insertPlannerAssignmentSchema.partial().parse(req.body);
      const assignment = await storage.updatePlannerAssignment(parseInt(req.params.id), assignmentData);
      if (!assignment) {
        return res.status(404).json({ message: "Assignment not found" });
      }
      res.json(assignment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid assignment data", errors: error.errors });
      }
      console.error(error);
      res.status(500).json({ message: "Error updating assignment" });
    }
  });

  apiRouter.delete("/planner-assignments/:id", isAuthenticated, async (req, res) => {
    try {
      const result = await storage.deletePlannerAssignment(parseInt(req.params.id));
      if (!result) {
        return res.status(404).json({ message: "Assignment not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error deleting assignment" });
    }
  });

  apiRouter.post("/planner-assignments/:id/mark-attendance", isAuthenticated, async (req, res) => {
    try {
      const { status, notes } = req.body;
      if (!status) {
        return res.status(400).json({ message: "Status is required" });
      }
      
      const userId = (req.user as any).id;
      const assignment = await storage.markAttendance(parseInt(req.params.id), status, userId, notes);
      
      if (!assignment) {
        return res.status(404).json({ message: "Assignment not found" });
      }
      
      res.json(assignment);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error marking attendance" });
    }
  });

  // Monthly Invoice routes
  apiRouter.get("/monthly-invoices", isAuthenticated, async (req, res) => {
    try {
      const plannerId = req.query.plannerId ? parseInt(req.query.plannerId as string) : undefined;
      const musicianId = req.query.musicianId ? parseInt(req.query.musicianId as string) : undefined;
      const invoices = await storage.getMonthlyInvoices(plannerId, musicianId);
      res.json(invoices);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error fetching invoices" });
    }
  });

  apiRouter.get("/monthly-invoices/:id", isAuthenticated, async (req, res) => {
    try {
      const invoice = await storage.getMonthlyInvoice(parseInt(req.params.id));
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      res.json(invoice);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error fetching invoice" });
    }
  });

  apiRouter.post("/monthly-invoices", isAuthenticated, async (req, res) => {
    try {
      const invoiceData = insertMonthlyInvoiceSchema.parse(req.body);
      const invoice = await storage.createMonthlyInvoice(invoiceData);
      res.status(201).json(invoice);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid invoice data", errors: error.errors });
      }
      console.error(error);
      res.status(500).json({ message: "Error creating invoice" });
    }
  });

  apiRouter.put("/monthly-invoices/:id", isAuthenticated, async (req, res) => {
    try {
      const invoiceData = insertMonthlyInvoiceSchema.partial().parse(req.body);
      const invoice = await storage.updateMonthlyInvoice(parseInt(req.params.id), invoiceData);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      res.json(invoice);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid invoice data", errors: error.errors });
      }
      console.error(error);
      res.status(500).json({ message: "Error updating invoice" });
    }
  });

  apiRouter.delete("/monthly-invoices/:id", isAuthenticated, async (req, res) => {
    try {
      const result = await storage.deleteMonthlyInvoice(parseInt(req.params.id));
      if (!result) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error deleting invoice" });
    }
  });

  apiRouter.post("/planners/:id/generate-invoices", isAuthenticated, async (req, res) => {
    try {
      const invoices = await storage.generateMonthlyInvoices(parseInt(req.params.id));
      res.status(201).json(invoices);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error generating invoices", error: (error as Error).message });
    }
  });
  
  // Get assignments grouped by musician for a planner
  apiRouter.get("/planner-assignments/by-musician", isAuthenticated, async (req, res) => {
    try {
      const plannerId = req.query.plannerId ? parseInt(req.query.plannerId as string) : undefined;
      
      if (!plannerId) {
        return res.status(400).json({ message: "plannerId is required" });
      }
      
      // Get all slots for the planner
      const slots = await storage.getPlannerSlots(plannerId);
      
      if (!slots || slots.length === 0) {
        return res.json({});
      }
      
      // Get all assignments for these slots
      const slotIds = slots.map(slot => slot.id);
      const assignments = [];
      
      for (const slotId of slotIds) {
        const slotAssignments = await storage.getPlannerAssignments(slotId);
        assignments.push(...slotAssignments);
      }
      
      if (assignments.length === 0) {
        return res.json({});
      }
      
      // Group by musician ID
      const musicianMap: Record<number, any> = {};
      
      for (const assignment of assignments) {
        const slot = slots.find(s => s.id === assignment.slotId);
        if (!slot) continue;
        
        const musician = await storage.getMusician(assignment.musicianId);
        if (!musician) continue;
        
        const venue = await storage.getVenue(slot.venueId);
        
        if (!musicianMap[musician.id]) {
          musicianMap[musician.id] = {
            musicianId: musician.id,
            musicianName: musician.name,
            assignments: [],
            totalFee: 0
          };
        }
        
        const assignmentDetails = {
          id: assignment.id,
          date: slot.date,
          venueName: venue ? venue.name : 'Unknown Venue',
          venueId: slot.venueId,
          fee: assignment.actualFee || musician.payRate,
          startTime: slot.startTime,
          endTime: slot.endTime,
          status: assignment.status
        };
        
        musicianMap[musician.id].assignments.push(assignmentDetails);
        musicianMap[musician.id].totalFee += assignmentDetails.fee || 0;
      }
      
      res.json(musicianMap);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error fetching assignments by musician" });
    }
  });
  
  // Finalize a planner and optionally send emails
  apiRouter.post("/planners/:id/finalize", isAuthenticated, async (req, res) => {
    try {
      const plannerId = parseInt(req.params.id);
      const { sendEmails, emailMessage } = req.body;
      
      // Update planner status to finalized
      const planner = await storage.updateMonthlyPlanner(plannerId, { status: "finalized" });
      
      if (!planner) {
        return res.status(404).json({ message: "Planner not found" });
      }
      
      // If sendEmails is true, send emails to musicians
      if (sendEmails) {
        // Import the email service dynamically to avoid issues if SendGrid isn't configured
        const { isSendGridConfigured, sendMusicianAssignmentEmail } = await import('./services/email');
        
        if (!isSendGridConfigured()) {
          console.warn("SendGrid API key not configured. Emails will not be sent.");
          
          // Check if SENDGRID_API_KEY is available
          if (!process.env.SENDGRID_API_KEY) {
            return res.status(400).json({ 
              success: false, 
              message: "SendGrid API key not configured. Please set the SENDGRID_API_KEY environment variable.",
              planner
            });
          }
        }
        
        // Get all musicians with assignments using the same logic as /by-musician endpoint
        const slots = await storage.getPlannerSlots(plannerId);
        
        if (slots && slots.length > 0) {
          // Get all assignments for these slots
          const slotIds = slots.map(slot => slot.id);
          const assignments = [];
          
          for (const slotId of slotIds) {
            const slotAssignments = await storage.getPlannerAssignments(slotId);
            assignments.push(...slotAssignments);
          }
          
          if (assignments.length > 0) {
            // Group by musician ID
            const musicianMap: Record<number, any> = {};
            
            for (const assignment of assignments) {
              const slot = slots.find(s => s.id === assignment.slotId);
              if (!slot) continue;
              
              const musician = await storage.getMusician(assignment.musicianId);
              if (!musician) continue;
              
              const venue = await storage.getVenue(slot.venueId);
              
              if (!musicianMap[musician.id]) {
                musicianMap[musician.id] = {
                  musicianId: musician.id,
                  musicianName: musician.name,
                  musicianEmail: musician.email,
                  assignments: [],
                  totalFee: 0
                };
              }
              
              const assignmentDetails = {
                id: assignment.id,
                date: format(new Date(slot.date), 'MMM d, yyyy'),
                venueName: venue ? venue.name : 'Unknown Venue',
                venueId: slot.venueId,
                fee: assignment.actualFee || musician.payRate,
                startTime: slot.startTime,
                endTime: slot.endTime,
                status: assignment.status
              };
              
              musicianMap[musician.id].assignments.push(assignmentDetails);
              musicianMap[musician.id].totalFee += assignmentDetails.fee || 0;
            }
            
            // Send email to each musician
            const emailPromises = Object.values(musicianMap).map(async (musicianData: any) => {
              if (!musicianData.musicianEmail) return null;
              
              return sendMusicianAssignmentEmail(
                musicianData.musicianEmail,
                musicianData.musicianName,
                format(new Date(planner.month), 'MMMM yyyy'),
                musicianData.assignments,
                emailMessage
              );
            });
            
            await Promise.all(emailPromises);
          }
        }
      }
      
      // Create activity log entry
      await storage.createActivity({
        userId: (req.user as any).id,
        action: "finalize_planner",
        entityType: "planner",
        entityId: plannerId,
        details: { description: `Finalized monthly planner: ${planner.name}` },
        timestamp: new Date()
      });
      
      res.json({ success: true, planner });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error finalizing planner" });
    }
  });

  apiRouter.post("/monthly-invoices/:id/finalize", isAuthenticated, async (req, res) => {
    try {
      const invoice = await storage.finalizeMonthlyInvoice(parseInt(req.params.id));
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      res.json(invoice);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error finalizing invoice" });
    }
  });

  apiRouter.post("/monthly-invoices/:id/mark-paid", isAuthenticated, async (req, res) => {
    try {
      const { notes } = req.body;
      const invoice = await storage.markMonthlyInvoiceAsPaid(parseInt(req.params.id), notes);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      res.json(invoice);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error marking invoice as paid" });
    }
  });

  // Settings routes
  apiRouter.get("/settings/:type", isAuthenticated, async (req, res) => {
    try {
      const { type } = req.params;
      const settings = await getSettings(type);
      if (settings === null) {
        return res.json({});
      }
      res.json(settings);
    } catch (error) {
      console.error("Error fetching settings:", error);
      res.status(500).json({ message: "Error fetching settings" });
    }
  });

  apiRouter.put("/settings/:type", isAuthenticated, async (req, res) => {
    try {
      const { type } = req.params;
      const settings = await saveSettings(type, req.body);
      res.json(settings);
    } catch (error) {
      console.error("Error saving settings:", error);
      res.status(500).json({ message: "Error saving settings" });
    }
  });

  // Email settings specific routes
  apiRouter.get("/settings/email/config", isAuthenticated, async (req, res) => {
    try {
      const settings = await getEmailSettings() as any;
      if (settings === null) {
        return res.json({
          enabled: false,
          from: '',
          replyTo: '',
          apiKey: ''
        });
      }
      
      // Don't return the actual API key value, just whether it exists
      const response = {
        ...settings,
        apiKey: settings && settings.apiKey ? '••••••••••••••••••••••' : ''
      };
      
      res.json(response);
    } catch (error) {
      console.error("Error fetching email settings:", error);
      res.status(500).json({ message: "Error fetching email settings" });
    }
  });

  apiRouter.put("/settings/email/config", isAuthenticated, async (req, res) => {
    try {
      const { enabled, from, replyTo, apiKey } = req.body;
      
      // Get existing settings to preserve API key if not changing
      const existingSettings = await getEmailSettings() as any || {};
      const newSettings = {
        enabled: enabled === true,
        from: from || '',
        replyTo: replyTo || '',
        // Only update API key if provided, otherwise keep existing
        apiKey: apiKey || existingSettings.apiKey || ''
      };
      
      const settings = await saveEmailSettings(newSettings) as any;
      
      // Don't return the actual API key value in the response
      const response = {
        ...((settings?.data as any) || {}),
        apiKey: settings?.data?.apiKey ? '••••••••••••••••••••••' : ''
      };
      
      res.json(response);
    } catch (error) {
      console.error("Error saving email settings:", error);
      res.status(500).json({ message: "Error saving email settings" });
    }
  });
  
  // Send test email route
  apiRouter.post("/settings/email/test", isAuthenticated, async (req, res) => {
    try {
      const { to, subject, content } = req.body;
      
      if (!to || !subject || !content) {
        return res.status(400).json({ 
          success: false, 
          message: "Email address, subject, and content are required" 
        });
      }
      
      // Check if email settings are configured
      const emailSettings = await getEmailSettings() as any;
      if (!emailSettings?.data?.enabled || !emailSettings?.data?.apiKey || !emailSettings?.data?.from) {
        return res.status(400).json({
          success: false,
          message: "Email is not properly configured. Please configure email settings first."
        });
      }
      
      // Initialize SendGrid
      initializeSendGrid(emailSettings.data.apiKey);
      
      // Option 1: Send simple email
      if (req.query.simple === 'true') {
        // Prepare email message
        const msg: {
          to: string;
          from: string;
          subject: string;
          text: string;
          html: string;
          replyTo?: string;
        } = {
          to,
          from: emailSettings.data.from,
          subject,
          text: content,
          html: content.replace(/\n/g, '<br>')
        };
        
        // Add reply-to if configured
        if (emailSettings.data.replyTo) {
          msg.replyTo = emailSettings.data.replyTo;
        }
        
        // Send email
        await sgMail.send(msg);
        
        res.json({ 
          success: true, 
          message: "Simple test email sent successfully" 
        });
      } else {
        // Option 2: Send sample performance schedule email
        const result = await sendMusicianAssignmentEmail(
          to,
          "Test Recipient",
          [
            {
              date: "May 15, 2025",
              venue: "Test Venue",
              startTime: "7:00 PM",
              endTime: "10:00 PM",
              fee: 150
            }
          ]
        );
        
        if (result) {
          res.json({ success: true, message: "Test schedule email sent successfully" });
        } else {
          res.status(500).json({ success: false, message: "Failed to send test email" });
        }
      }
    } catch (error) {
      console.error("Error sending test email:", error);
      res.status(500).json({ success: false, message: "Error sending test email" });
    }
  });

  // Email template routes
  apiRouter.get("/email-templates", isAuthenticated, async (req, res) => {
    try {
      const templates = await storage.getEmailTemplates();
      res.json(templates);
    } catch (error) {
      console.error("Error fetching email templates:", error);
      res.status(500).json({ message: "Error fetching email templates" });
    }
  });

  apiRouter.get("/email-templates/:id", isAuthenticated, async (req, res) => {
    try {
      const template = await storage.getEmailTemplate(parseInt(req.params.id));
      if (!template) {
        return res.status(404).json({ message: "Email template not found" });
      }
      res.json(template);
    } catch (error) {
      console.error("Error fetching email template:", error);
      res.status(500).json({ message: "Error fetching email template" });
    }
  });

  apiRouter.post("/email-templates", isAuthenticated, async (req, res) => {
    try {
      console.log("Creating email template:", req.body);
      const templateData = insertEmailTemplateSchema.parse(req.body);
      const template = await storage.createEmailTemplate(templateData);
      res.status(201).json(template);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Validation error:", error.errors);
        return res.status(400).json({ message: "Invalid email template data", errors: error.errors });
      }
      console.error("Error creating email template:", error);
      res.status(500).json({ message: "Error creating email template" });
    }
  });

  apiRouter.put("/email-templates/:id", isAuthenticated, async (req, res) => {
    try {
      console.log("Updating email template:", req.params.id, req.body);
      const templateData = insertEmailTemplateSchema.partial().parse(req.body);
      const template = await storage.updateEmailTemplate(parseInt(req.params.id), templateData);
      if (!template) {
        return res.status(404).json({ message: "Email template not found" });
      }
      res.json(template);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Validation error:", error.errors);
        return res.status(400).json({ message: "Invalid email template data", errors: error.errors });
      }
      console.error("Error updating email template:", error);
      res.status(500).json({ message: "Error updating email template" });
    }
  });

  apiRouter.delete("/email-templates/:id", isAuthenticated, async (req, res) => {
    try {
      console.log("Deleting email template:", req.params.id);
      // Don't allow deleting default templates
      const template = await storage.getEmailTemplate(parseInt(req.params.id));
      if (!template) {
        return res.status(404).json({ message: "Email template not found" });
      }
      
      if (template.isDefault) {
        return res.status(403).json({ message: "Cannot delete default email template" });
      }
      
      const result = await storage.deleteEmailTemplate(parseInt(req.params.id));
      if (!result) {
        return res.status(404).json({ message: "Email template not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting email template:", error);
      res.status(500).json({ message: "Error deleting email template" });
    }
  });

  // Musician Type routes
  apiRouter.get("/musician-types", isAuthenticated, async (req, res) => {
    try {
      const types = await storage.getMusicianTypes();
      res.json(types);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error fetching musician types" });
    }
  });

  apiRouter.get("/musician-types/:id", isAuthenticated, async (req, res) => {
    try {
      const type = await storage.getMusicianType(parseInt(req.params.id));
      if (!type) {
        return res.status(404).json({ message: "Musician type not found" });
      }
      res.json(type);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error fetching musician type" });
    }
  });

  apiRouter.get("/musician-types/:id/categories", isAuthenticated, async (req, res) => {
    try {
      const categories = await storage.getMusicianTypeCategories(parseInt(req.params.id));
      res.json(categories);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error fetching musician type categories" });
    }
  });

  apiRouter.post("/musician-types", isAuthenticated, async (req, res) => {
    try {
      const typeData = insertMusicianTypeSchema.parse(req.body);
      const type = await storage.createMusicianType(typeData);
      
      // Associate with categories if provided
      if (req.body.categoryIds && Array.isArray(req.body.categoryIds)) {
        for (const categoryId of req.body.categoryIds) {
          await storage.associateMusicianTypeWithCategory(type.id, categoryId);
        }
      }
      
      res.status(201).json(type);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid musician type data", errors: error.errors });
      }
      console.error(error);
      res.status(500).json({ message: "Error creating musician type" });
    }
  });

  apiRouter.put("/musician-types/:id", isAuthenticated, async (req, res) => {
    try {
      const typeId = parseInt(req.params.id);
      const typeData = insertMusicianTypeSchema.partial().parse(req.body);
      const type = await storage.updateMusicianType(typeId, typeData);
      
      if (!type) {
        return res.status(404).json({ message: "Musician type not found" });
      }
      
      // Update category associations if provided
      if (req.body.categoryIds && Array.isArray(req.body.categoryIds)) {
        // Get current categories
        const currentCategories = await storage.getMusicianTypeCategories(typeId);
        const currentCategoryIds = currentCategories.map(c => c.id);
        
        // Remove old associations
        for (const categoryId of currentCategoryIds) {
          if (!req.body.categoryIds.includes(categoryId)) {
            await storage.removeMusicianTypeCategory(typeId, categoryId);
          }
        }
        
        // Add new associations
        for (const categoryId of req.body.categoryIds) {
          if (!currentCategoryIds.includes(categoryId)) {
            await storage.associateMusicianTypeWithCategory(typeId, categoryId);
          }
        }
      }
      
      res.json(type);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid musician type data", errors: error.errors });
      }
      console.error(error);
      res.status(500).json({ message: "Error updating musician type" });
    }
  });

  apiRouter.delete("/musician-types/:id", isAuthenticated, async (req, res) => {
    try {
      const result = await storage.deleteMusicianType(parseInt(req.params.id));
      if (!result) {
        return res.status(404).json({ message: "Musician type not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error deleting musician type" });
    }
  });

  // Performance Ratings
  apiRouter.get("/performance-ratings", isAuthenticated, async (req, res) => {
    try {
      const { musicianId, bookingId, plannerAssignmentId } = req.query;
      
      const ratings = await storage.getPerformanceRatings(
        musicianId ? parseInt(musicianId as string) : undefined,
        bookingId ? parseInt(bookingId as string) : undefined,
        plannerAssignmentId ? parseInt(plannerAssignmentId as string) : undefined
      );
      
      res.json(ratings);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error fetching performance ratings" });
    }
  });
  
  apiRouter.get("/performance-ratings/:id", isAuthenticated, async (req, res) => {
    try {
      const rating = await storage.getPerformanceRating(parseInt(req.params.id));
      if (!rating) {
        return res.status(404).json({ message: "Rating not found" });
      }
      res.json(rating);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error fetching performance rating" });
    }
  });
  
  apiRouter.post("/performance-ratings", isAuthenticated, async (req, res) => {
    try {
      const rating = await storage.createPerformanceRating(req.body);
      res.status(201).json(rating);
    } catch (error) {
      console.error(error);
      res.status(400).json({ message: "Failed to create rating", error: error.message });
    }
  });
  
  apiRouter.put("/performance-ratings/:id", isAuthenticated, async (req, res) => {
    try {
      const updatedRating = await storage.updatePerformanceRating(parseInt(req.params.id), req.body);
      if (!updatedRating) {
        return res.status(404).json({ message: "Rating not found" });
      }
      res.json(updatedRating);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error updating performance rating" });
    }
  });
  
  apiRouter.delete("/performance-ratings/:id", isAuthenticated, async (req, res) => {
    try {
      const success = await storage.deletePerformanceRating(parseInt(req.params.id));
      if (!success) {
        return res.status(404).json({ message: "Rating not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error deleting performance rating" });
    }
  });
  
  // Performance Metrics
  apiRouter.get("/performance-metrics/:musicianId", isAuthenticated, async (req, res) => {
    try {
      const metrics = await storage.getPerformanceMetrics(parseInt(req.params.musicianId));
      if (metrics) {
        res.json(metrics);
      } else {
        res.status(404).json({ message: "Metrics not found" });
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error fetching performance metrics" });
    }
  });
  
  apiRouter.post("/performance-metrics/:musicianId/recalculate", isAuthenticated, async (req, res) => {
    try {
      const metrics = await storage.updateMusicianRatingMetrics(parseInt(req.params.musicianId));
      if (metrics) {
        res.json(metrics);
      } else {
        res.status(404).json({ message: "Failed to calculate metrics" });
      }
    } catch (error) {
      console.error(error);
      res.status(400).json({ message: "Failed to update metrics", error: error.message });
    }
  });
  
  // Musician Average Ratings
  apiRouter.get("/musicians/:id/average-ratings", isAuthenticated, async (req, res) => {
    try {
      const averages = await storage.getMusicianAverageRatings(parseInt(req.params.id));
      res.json(averages);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error fetching average ratings" });
    }
  });
  
  // Musician Pay Rates
  apiRouter.get("/musician-pay-rates", isAuthenticated, async (req, res) => {
    try {
      const musicianId = req.query.musicianId ? parseInt(req.query.musicianId as string) : undefined;
      const payRates = musicianId 
        ? await storage.getMusicianPayRatesByMusicianId(musicianId)
        : await storage.getMusicianPayRates();
      res.json(payRates);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error fetching musician pay rates" });
    }
  });

  apiRouter.get("/musician-pay-rates/:id", isAuthenticated, async (req, res) => {
    try {
      const payRate = await storage.getMusicianPayRate(parseInt(req.params.id));
      if (!payRate) {
        return res.status(404).json({ message: "Musician pay rate not found" });
      }
      res.json(payRate);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error fetching musician pay rate" });
    }
  });

  apiRouter.post("/musician-pay-rates", isAuthenticated, async (req, res) => {
    try {
      const payRateData = insertMusicianPayRateSchema.parse(req.body);
      const payRate = await storage.createMusicianPayRate(payRateData);
      res.status(201).json(payRate);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid musician pay rate data", errors: error.errors });
      }
      console.error(error);
      res.status(500).json({ message: "Error creating musician pay rate" });
    }
  });

  apiRouter.put("/musician-pay-rates/:id", isAuthenticated, async (req, res) => {
    try {
      const payRateData = insertMusicianPayRateSchema.partial().parse(req.body);
      const payRate = await storage.updateMusicianPayRate(parseInt(req.params.id), payRateData);
      if (!payRate) {
        return res.status(404).json({ message: "Musician pay rate not found" });
      }
      res.json(payRate);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid musician pay rate data", errors: error.errors });
      }
      console.error(error);
      res.status(500).json({ message: "Error updating musician pay rate" });
    }
  });

  apiRouter.delete("/musician-pay-rates/:id", isAuthenticated, async (req, res) => {
    try {
      const result = await storage.deleteMusicianPayRate(parseInt(req.params.id));
      if (!result) {
        return res.status(404).json({ message: "Musician pay rate not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error deleting musician pay rate" });
    }
  });

  // Skill Tags
  apiRouter.get("/skill-tags", isAuthenticated, async (req, res) => {
    try {
      const tags = await storage.getSkillTags();
      res.json(tags);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error fetching skill tags" });
    }
  });
  
  apiRouter.get("/skill-tags/:id", isAuthenticated, async (req, res) => {
    try {
      const tag = await storage.getSkillTag(parseInt(req.params.id));
      if (!tag) {
        return res.status(404).json({ message: "Skill tag not found" });
      }
      res.json(tag);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error fetching skill tag" });
    }
  });
  
  apiRouter.post("/skill-tags", isAuthenticated, async (req, res) => {
    try {
      const tag = await storage.createSkillTag(req.body);
      res.status(201).json(tag);
    } catch (error) {
      console.error(error);
      res.status(400).json({ message: "Failed to create skill tag", error: error.message });
    }
  });
  
  apiRouter.put("/skill-tags/:id", isAuthenticated, async (req, res) => {
    try {
      const updatedTag = await storage.updateSkillTag(parseInt(req.params.id), req.body);
      if (!updatedTag) {
        return res.status(404).json({ message: "Skill tag not found" });
      }
      res.json(updatedTag);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error updating skill tag" });
    }
  });
  
  apiRouter.delete("/skill-tags/:id", isAuthenticated, async (req, res) => {
    try {
      const success = await storage.deleteSkillTag(parseInt(req.params.id));
      if (!success) {
        return res.status(404).json({ message: "Skill tag not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error deleting skill tag" });
    }
  });
  
  // Musician Skill Tags
  apiRouter.get("/musicians/:id/skill-tags", isAuthenticated, async (req, res) => {
    try {
      const tags = await storage.getMusicianSkillTags(parseInt(req.params.id));
      res.json(tags);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error fetching musician skill tags" });
    }
  });
  
  apiRouter.post("/musicians/:id/skill-tags", isAuthenticated, async (req, res) => {
    try {
      const musicianId = parseInt(req.params.id);
      const skillTag = await storage.createMusicianSkillTag({
        musicianId,
        skillTagId: req.body.skillTagId,
        endorsementCount: 0
      });
      res.status(201).json(skillTag);
    } catch (error) {
      console.error(error);
      res.status(400).json({ message: "Failed to add skill tag", error: error.message });
    }
  });
  
  apiRouter.delete("/musicians/:musicianId/skill-tags/:id", isAuthenticated, async (req, res) => {
    try {
      const success = await storage.deleteMusicianSkillTag(parseInt(req.params.id));
      if (!success) {
        return res.status(404).json({ message: "Musician skill tag not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error deleting musician skill tag" });
    }
  });
  
  apiRouter.post("/musicians/:musicianId/skill-tags/:skillTagId/endorse", isAuthenticated, async (req, res) => {
    try {
      const updatedTag = await storage.endorseSkill(
        parseInt(req.params.musicianId),
        parseInt(req.params.skillTagId)
      );
      
      if (!updatedTag) {
        return res.status(404).json({ message: "Skill tag not found" });
      }
      res.json(updatedTag);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error endorsing skill" });
    }
  });
  
  // Improvement Plans
  apiRouter.get("/improvement-plans", isAuthenticated, async (req, res) => {
    try {
      const { musicianId } = req.query;
      
      const plans = await storage.getImprovementPlans(
        musicianId ? parseInt(musicianId as string) : undefined
      );
      
      res.json(plans);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error fetching improvement plans" });
    }
  });
  
  apiRouter.get("/improvement-plans/:id", isAuthenticated, async (req, res) => {
    try {
      const plan = await storage.getImprovementPlan(parseInt(req.params.id));
      if (!plan) {
        return res.status(404).json({ message: "Improvement plan not found" });
      }
      res.json(plan);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error fetching improvement plan" });
    }
  });
  
  apiRouter.post("/improvement-plans", isAuthenticated, async (req, res) => {
    try {
      const plan = await storage.createImprovementPlan(req.body);
      res.status(201).json(plan);
    } catch (error) {
      console.error(error);
      res.status(400).json({ message: "Failed to create improvement plan", error: error.message });
    }
  });
  
  apiRouter.put("/improvement-plans/:id", isAuthenticated, async (req, res) => {
    try {
      const updatedPlan = await storage.updateImprovementPlan(parseInt(req.params.id), req.body);
      if (!updatedPlan) {
        return res.status(404).json({ message: "Improvement plan not found" });
      }
      res.json(updatedPlan);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error updating improvement plan" });
    }
  });
  
  apiRouter.delete("/improvement-plans/:id", isAuthenticated, async (req, res) => {
    try {
      const success = await storage.deleteImprovementPlan(parseInt(req.params.id));
      if (!success) {
        return res.status(404).json({ message: "Improvement plan not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error deleting improvement plan" });
    }
  });
  
  // Improvement Actions
  apiRouter.get("/improvement-plans/:planId/actions", isAuthenticated, async (req, res) => {
    try {
      const actions = await storage.getImprovementActions(parseInt(req.params.planId));
      res.json(actions);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error fetching improvement actions" });
    }
  });
  
  apiRouter.get("/improvement-actions/:id", isAuthenticated, async (req, res) => {
    try {
      const action = await storage.getImprovementAction(parseInt(req.params.id));
      if (!action) {
        return res.status(404).json({ message: "Improvement action not found" });
      }
      res.json(action);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error fetching improvement action" });
    }
  });
  
  apiRouter.post("/improvement-plans/:planId/actions", isAuthenticated, async (req, res) => {
    try {
      const planId = parseInt(req.params.planId);
      const action = await storage.createImprovementAction({
        ...req.body,
        planId
      });
      res.status(201).json(action);
    } catch (error) {
      console.error(error);
      res.status(400).json({ message: "Failed to create improvement action", error: error.message });
    }
  });
  
  apiRouter.put("/improvement-actions/:id", isAuthenticated, async (req, res) => {
    try {
      const updatedAction = await storage.updateImprovementAction(parseInt(req.params.id), req.body);
      if (!updatedAction) {
        return res.status(404).json({ message: "Improvement action not found" });
      }
      res.json(updatedAction);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error updating improvement action" });
    }
  });
  
  apiRouter.delete("/improvement-actions/:id", isAuthenticated, async (req, res) => {
    try {
      const success = await storage.deleteImprovementAction(parseInt(req.params.id));
      if (!success) {
        return res.status(404).json({ message: "Improvement action not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error deleting improvement action" });
    }
  });
  
  apiRouter.post("/improvement-actions/:id/complete", isAuthenticated, async (req, res) => {
    try {
      const { feedback } = req.body;
      const completedAction = await storage.completeImprovementAction(
        parseInt(req.params.id),
        feedback
      );
      
      if (!completedAction) {
        return res.status(404).json({ message: "Improvement action not found" });
      }
      res.json(completedAction);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error completing improvement action" });
    }
  });

  // Contract Link routes
  apiRouter.get("/contracts", isAuthenticated, async (req, res) => {
    try {
      // Get filter parameters
      const eventId = req.query.eventId ? parseInt(req.query.eventId as string) : undefined;
      const musicianId = req.query.musicianId ? parseInt(req.query.musicianId as string) : undefined;
      const status = req.query.status ? req.query.status as string : undefined;
      
      // Build filters object for more flexible filtering
      const filters: { eventId?: number; musicianId?: number; status?: string | string[] } = {};
      if (eventId && !isNaN(eventId)) filters.eventId = eventId;
      if (musicianId && !isNaN(musicianId)) filters.musicianId = musicianId;
      if (status) filters.status = status;
      
      // If no status filter is provided, only show contracts that have been sent or processed
      // (not pending ones that haven't been actually released to musicians)
      if (!status) {
        // Show only contracts that have been sent or have received a response
        filters.status = ['contract-sent', 'contract-signed', 'accepted', 'rejected', 'cancelled'];
      }
      
      // Get contracts with filters
      let contracts = await storage.getContractLinks(filters);
      
      // Additional validation to only show contracts for musicians actually assigned to events
      // This fixes the issue of random musicians showing up in contracts
      const validatedContracts = [];
      for (const contract of contracts) {
        // Only include contracts where the musician is actually assigned to the event
        const event = await storage.getEvent(contract.eventId);
        if (event && event.musicianAssignments) {
          // Check if the musician is in any of the event dates
          let musicianAssigned = false;
          
          // Go through each date in the event
          for (const [dateStr, musicianIds] of Object.entries(event.musicianAssignments)) {
            if ((musicianIds as number[]).includes(contract.musicianId)) {
              musicianAssigned = true;
              break;
            }
          }
          
          if (musicianAssigned) {
            validatedContracts.push(contract);
          } else {
            console.log(`Filtering out contract ${contract.id} for musician ${contract.musicianId} who is not assigned to event ${contract.eventId}`);
          }
        } else {
          // If we can't validate, include the contract to avoid errors
          validatedContracts.push(contract);
        }
      }
      
      contracts = validatedContracts;
      
      // For each contract, check if there's a more recent status in the event musician statuses
      const updatedContracts = await Promise.all(contracts.map(async (contract) => {
        // If we have both event and musician IDs
        if (contract.eventId && contract.musicianId) {
          // Get the event to check its musician statuses
          const event = await storage.getEvent(contract.eventId);
          if (event && event.musicianStatuses) {
            // Check if this musician has a status in the event
            // We need to look at the specific date for the contract, not the global 'all' status
            let musicianStatus;
            
            if (contract.eventDate) {
              // Convert date to YYYY-MM-DD format
              const dateStr = new Date(contract.eventDate).toISOString().split('T')[0];
              
              // First check date-specific status
              if (event.musicianStatuses[dateStr] && event.musicianStatuses[dateStr][contract.musicianId]) {
                musicianStatus = event.musicianStatuses[dateStr][contract.musicianId];
                console.log(`Found date-specific status for contract ${contract.id} on date ${dateStr}: ${musicianStatus}`);
              } 
              // Only fall back to global status if no date-specific status exists
              else if (event.musicianStatuses.all && event.musicianStatuses.all[contract.musicianId]) {
                musicianStatus = event.musicianStatuses.all[contract.musicianId];
                console.log(`Using global status for contract ${contract.id}: ${musicianStatus}`);
              }
            } else {
              // If no date on contract, use global status
              const allStatuses = event.musicianStatuses.all || {};
              musicianStatus = allStatuses[contract.musicianId];
              console.log(`No date on contract ${contract.id}, using global status: ${musicianStatus}`);
            }
            
            // If the event has a status for this musician that's different from the contract's status
            if (musicianStatus && musicianStatus !== contract.status) {
              // Only synchronize status if the event status is a valid contract status
              const validContractStatuses = ['pending', 'contract-sent', 'contract-signed', 'accepted', 'rejected', 'cancelled'];
              
              if (validContractStatuses.includes(musicianStatus)) {
                console.log(`Updating contract ${contract.id} status from ${contract.status} to ${musicianStatus}`);
                
                // Update the contract status
                const updatedContract = await storage.updateContractLink(contract.id, {
                  status: musicianStatus
                });
                
                return updatedContract || contract;
              } else {
                console.log(`Skipping status update for contract ${contract.id} because event status "${musicianStatus}" is not a valid contract status`);
              }
            }
          }
        }
        return contract;
      }));
      
      res.json(updatedContracts);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error fetching contracts" });
    }
  });

  apiRouter.get("/contracts/:id", isAuthenticated, async (req, res) => {
    try {
      const contract = await storage.getContractLink(parseInt(req.params.id));
      if (!contract) {
        return res.status(404).json({ message: "Contract not found" });
      }
      res.json(contract);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error fetching contract" });
    }
  });

  apiRouter.get("/contracts/event/:eventId", isAuthenticated, async (req, res) => {
    try {
      const contracts = await storage.getContractLinksByEvent(parseInt(req.params.eventId));
      res.json(contracts);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error fetching contracts for event" });
    }
  });

  apiRouter.get("/contracts/musician/:musicianId", isAuthenticated, async (req, res) => {
    try {
      const contracts = await storage.getContractLinksByMusician(parseInt(req.params.musicianId));
      res.json(contracts);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error fetching contracts for musician" });
    }
  });
  
  // Endpoint to resend a contract
  apiRouter.post("/contracts/:id/resend", isAuthenticated, async (req, res) => {
    try {
      const contractId = parseInt(req.params.id);
      const contract = await storage.getContractLink(contractId);
      
      if (!contract) {
        return res.status(404).json({ message: "Contract not found" });
      }
      
      // Update the contract with extended expiry date and reset status if expired
      const updatedContract = await storage.updateContractLink(contractId, {
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // New 7-day expiry
        status: contract.status === 'expired' ? 'pending' : contract.status,
        updatedAt: new Date()
      });
      
      // TODO: In a production app, send actual email here
      
      res.json({ message: "Contract resent successfully", contract: updatedContract });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error resending contract" });
    }
  });
  
  // Endpoint to cancel a contract
  apiRouter.post("/contracts/:id/cancel", isAuthenticated, async (req, res) => {
    try {
      const contractId = parseInt(req.params.id);
      const contract = await storage.getContractLink(contractId);
      
      if (!contract) {
        return res.status(404).json({ message: "Contract not found" });
      }
      
      // Update the contract status to cancelled
      const updatedContract = await storage.updateContractLink(contractId, {
        status: 'cancelled',
        updatedAt: new Date()
      });
      
      // If there's a booking associated with this contract, update it
      if (contract.bookingId) {
        await storage.updateBooking(contract.bookingId, {
          status: 'cancelled'
        });
      }
      
      // Update musician status in event
      if (contract.eventId && contract.musicianId && contract.eventDate) {
        // Convert eventDate to YYYY-MM-DD string format for the status map
        const dateStr = new Date(contract.eventDate).toISOString().split('T')[0];
        
        // Update the musician's status for this event and date
        await storage.updateMusicianEventStatus(
          contract.eventId,
          contract.musicianId,
          dateStr,
          'cancelled'
        );
      }
      
      res.json({ message: "Contract cancelled successfully", contract: updatedContract });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error cancelling contract" });
    }
  });

  apiRouter.get("/contracts/token/:token", async (req, res) => {
    try {
      const contract = await storage.getContractLinkByToken(req.params.token);
      if (!contract) {
        return res.status(404).json({ message: "Contract not found or expired" });
      }

      // Check if contract has already been responded to
      if (contract.respondedAt) {
        return res.status(400).json({ 
          message: "This contract has already been responded to", 
          status: contract.status,
          respondedAt: contract.respondedAt 
        });
      }

      // Check if contract is expired
      if (new Date() > new Date(contract.expiresAt)) {
        return res.status(400).json({ message: "This contract link has expired" });
      }
      
      // Get event and musician details for the contract view
      const event = await storage.getEvent(contract.eventId);
      const musician = await storage.getMusician(contract.musicianId);
      
      res.json({
        contract,
        event,
        musician
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error fetching contract" });
    }
  });

  apiRouter.post("/contracts", isAuthenticated, async (req, res) => {
    try {
      // Generate a unique token for the contract link
      const token = crypto.randomBytes(32).toString('hex');
      
      // Set default expiry date to 7 days from now if not provided
      const expiresAt = req.body.expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      
      // Validate that the contract has an event date - this is required for proper status tracking per date
      if (!req.body.eventDate) {
        return res.status(400).json({ 
          message: "Event date is required when creating a contract to properly track status changes" 
        });
      }
      
      // Ensure event exists
      if (req.body.eventId) {
        const event = await storage.getEvent(req.body.eventId);
        if (!event) {
          return res.status(404).json({ message: "Event not found" });
        }
        
        // Validate that the event date is one of the actual event dates
        if (event.eventDates && event.eventDates.length > 0) {
          const eventDateStr = new Date(req.body.eventDate).toISOString().split('T')[0];
          const matchingDate = event.eventDates.find(date => 
            new Date(date).toISOString().split('T')[0] === eventDateStr
          );
          
          if (!matchingDate) {
            return res.status(400).json({ 
              message: "The provided event date does not match any of the event's scheduled dates" 
            });
          }
        }
      }
      
      const contractData = insertContractLinkSchema.parse({
        ...req.body,
        token,
        expiresAt,
        status: 'pending'
      });
      
      // Create the contract with date-specific information
      const contract = await storage.createContractLink(contractData);
      res.status(201).json(contract);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid contract data", errors: error.errors });
      }
      console.error(error);
      res.status(500).json({ message: "Error creating contract" });
    }
  });

  apiRouter.put("/contracts/:id", isAuthenticated, async (req, res) => {
    try {
      const contractData = insertContractLinkSchema.partial().parse(req.body);
      const contract = await storage.updateContractLink(parseInt(req.params.id), contractData);
      if (!contract) {
        return res.status(404).json({ message: "Contract not found" });
      }
      res.json(contract);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid contract data", errors: error.errors });
      }
      console.error(error);
      res.status(500).json({ message: "Error updating contract" });
    }
  });

  apiRouter.post("/contracts/token/:token/respond", async (req, res) => {
    try {
      const { status, response, signature } = req.body;
      
      if (!status || !['accepted', 'rejected'].includes(status)) {
        return res.status(400).json({ message: "Invalid status value. Must be 'accepted' or 'rejected'" });
      }
      
      // If accepting the contract, signature is required
      if (status === 'accepted' && !signature) {
        return res.status(400).json({ message: "Signature is required to accept the contract" });
      }
      
      const contract = await storage.updateContractLinkStatus(req.params.token, status, response, signature);
      
      if (!contract) {
        return res.status(404).json({ message: "Contract not found or expired" });
      }
      
      // Get additional information
      const musician = await storage.getMusician(contract.musicianId);
      const event = await storage.getEvent(contract.eventId);
      
      // If the contract was accepted, update related records and send notification
      // Note: After normalized in storage, 'accepted' becomes 'contract-signed'
      if (status === 'accepted' || contract.status === 'contract-signed') {
        // Update the invitation status to accepted if it exists
        if (contract.invitationId) {
          const invitation = await storage.getInvitation(contract.invitationId);
          if (invitation) {
            await storage.updateInvitation(invitation.id, {
              status: 'confirmed',
              respondedAt: new Date()
            });
          }
        }
        
        // Create a booking or update existing booking with contract signed status
        if (contract.bookingId) {
          await storage.updateBooking(contract.bookingId, {
            contractSigned: true,
            contractSignedAt: new Date(),
            status: 'confirmed'
          });
          
          // Update the musician's status in the event to "contract-signed" ONLY for the specific date
          if (contract.eventId && contract.musicianId && contract.eventDate) {
            // Use the specific date from the contract
            const eventDateStr = contract.eventDate.toISOString();
            await storage.updateMusicianEventStatusForDate(
              contract.eventId, 
              contract.musicianId,
              "contract-signed",
              eventDateStr
            );
          }
          
          // Log that we would send an email notification in a real system
          console.log(`Contract signed notification would be sent to ${musician?.email} for event: ${event?.name}`);
          console.log(`Contract details: 
            - Event: ${event?.name}
            - Date: ${contract.eventDate ? new Date(contract.eventDate).toLocaleDateString() : 'Multiple dates'}
            - Signatures: 
              - Company: ${contract.companySignature || 'VAMP Management'}
              - Musician: ${contract.musicianSignature || musician?.name}
            - Amount: $${contract.amount || 0}
          `);
        } else {
          // Create new booking if one doesn't exist yet
          const booking = await storage.createBooking({
            eventId: contract.eventId,
            musicianId: contract.musicianId,
            invitationId: contract.invitationId || 0,
            contractSent: true,
            contractSentAt: contract.createdAt,
            contractSigned: true,
            contractSignedAt: new Date(),
            status: 'confirmed',
            amount: contract.amount,
            advancePayment: null,
            balancePayment: null,
            paymentStatus: 'pending',
            notes: null,
            contractDetails: {
              contractId: contract.id,
              eventDate: contract.eventDate,
              agreedAmount: contract.amount
            }
          });
          
          // Update the contract with the booking ID
          await storage.updateContractLink(contract.id, {
            bookingId: booking.id
          });
          
          // Update the musician's status in the event to "contract-signed" ONLY for the specific date
          if (contract.eventId && contract.musicianId && contract.eventDate) {
            // Use the specific date from the contract
            const eventDateStr = contract.eventDate.toISOString();
            await storage.updateMusicianEventStatusForDate(
              contract.eventId, 
              contract.musicianId,
              "contract-signed",
              eventDateStr
            );
          }
        }
      } else if (status === 'rejected') {
        // Update the invitation status to rejected if it exists
        if (contract.invitationId) {
          const invitation = await storage.getInvitation(contract.invitationId);
          if (invitation) {
            await storage.updateInvitation(invitation.id, {
              status: 'rejected',
              respondedAt: new Date(),
              responseMessage: response || 'Contract declined'
            });
          }
        }
        
        // Update booking status if it exists
        if (contract.bookingId) {
          await storage.updateBooking(contract.bookingId, {
            status: 'cancelled',
            notes: response || 'Contract declined'
          });
        }
      }
      
      res.json({ success: true, contract });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error responding to contract" });
    }
  });

  // Contract Template routes
  apiRouter.get("/contract-templates", isAuthenticated, async (req, res) => {
    try {
      const templates = await storage.getContractTemplates();
      res.json(templates);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error fetching contract templates" });
    }
  });

  apiRouter.get("/contract-templates/default", isAuthenticated, async (req, res) => {
    try {
      const template = await storage.getDefaultContractTemplate();
      if (!template) {
        return res.status(404).json({ message: "No default template found" });
      }
      res.json(template);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error fetching default contract template" });
    }
  });

  apiRouter.get("/contract-templates/:id", isAuthenticated, async (req, res) => {
    try {
      const template = await storage.getContractTemplate(parseInt(req.params.id));
      if (!template) {
        return res.status(404).json({ message: "Contract template not found" });
      }
      res.json(template);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error fetching contract template" });
    }
  });

  apiRouter.post("/contract-templates", isAuthenticated, async (req, res) => {
    try {
      // Make sure insertContractTemplateSchema is imported from @shared/schema
      const templateData = {
        ...req.body,
        createdBy: (req.user as any).id // Cast to any to access id
      };
      const template = await storage.createContractTemplate(templateData);
      res.status(201).json(template);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid contract template data", errors: error.errors });
      }
      console.error(error);
      res.status(500).json({ message: "Error creating contract template" });
    }
  });

  apiRouter.put("/contract-templates/:id", isAuthenticated, async (req, res) => {
    try {
      const templateData = {
        ...req.body,
        createdBy: (req.user as any).id // Cast to any to access id
      };
      const template = await storage.updateContractTemplate(parseInt(req.params.id), templateData);
      if (!template) {
        return res.status(404).json({ message: "Contract template not found" });
      }
      res.json(template);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid contract template data", errors: error.errors });
      }
      console.error(error);
      res.status(500).json({ message: "Error updating contract template" });
    }
  });

  apiRouter.delete("/contract-templates/:id", isAuthenticated, async (req, res) => {
    try {
      const result = await storage.deleteContractTemplate(parseInt(req.params.id));
      if (!result) {
        return res.status(404).json({ message: "Contract template not found or cannot be deleted" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error deleting contract template" });
    }
  });

  apiRouter.post("/contract-templates/:id/set-default", isAuthenticated, async (req, res) => {
    try {
      const result = await storage.setDefaultContractTemplate(parseInt(req.params.id));
      if (!result) {
        return res.status(404).json({ message: "Contract template not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error setting default contract template" });
    }
  });

  // Test endpoint for multi-category filtering
  apiRouter.get("/test/multi-category-musician-filter", isAuthenticated, async (req, res) => {
    try {
      const currentDate = new Date("2025-05-10");
      
      // Test cases with different category combinations
      const tests = [
        { name: "No categories", categoryIds: [] },
        { name: "Single category - Pianist (9)", categoryIds: [9] },
        { name: "Single category - Vocalist (10)", categoryIds: [10] },
        { name: "Multiple categories - Pianist and Vocalist (9, 10)", categoryIds: [9, 10] },
        { name: "Multiple categories - Guitarist, Drummer, and Bassist (12, 13, 11)", categoryIds: [12, 13, 11] }
      ];
      
      // Run all tests
      const results = {};
      for (const test of tests) {
        const musicians = await storage.getAvailableMusiciansForDateAndCategories(currentDate, test.categoryIds);
        results[test.name] = {
          categoryIds: test.categoryIds,
          count: musicians.length,
          musicians: musicians.map(m => ({ id: m.id, name: m.name, categoryId: m.categoryId }))
        };
      }
      
      res.json({
        testDate: currentDate.toISOString(),
        testResults: results
      });
    } catch (error) {
      console.error("Error testing multi-category filtering:", error);
      res.status(500).json({ message: "Error testing multi-category filtering" });
    }
  });

  // Mount the API router
  app.use("/api", apiRouter);

  const httpServer = createServer(app);

  return httpServer;
}
