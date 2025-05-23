import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import express from "express";
import * as z from "zod";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { format, parseISO, isValid } from "date-fns";
import { getSettings, saveSettings, getEmailSettings, saveEmailSettings } from "./services/settings";
import { sendMusicianAssignmentEmail, initializeSendGrid, isSendGridConfigured } from "./services/email";
import sgMail from '@sendgrid/mail';
import crypto from 'crypto';
import contractResponseRouter from './routes/monthlyContractResponse';

// Utility function to generate a random token
function generateRandomToken(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}
import pgSession from 'connect-pg-simple';
import { pool, db } from './db';
import { isAuthenticated } from './auth';
import { and, eq, sql } from "drizzle-orm";
import { availability, plannerSlots, plannerAssignments, monthlyContractMusicians } from "@shared/schema";
import statusRouter from './routes/status';
import monthlyContractResponseRouter from './routes/monthlyContractResponse';
import contractRouter from './routes/contract-routes';
import plannerContractsMusicianRouter from './routes/planner-contracts-musicians';
import setupMonthlyContractRoutes from './routes/monthly-contract-routes';
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
  insertMonthlyContractSchema,
  insertMonthlyContractMusicianSchema,
  insertMonthlyContractDateSchema,
  monthlyContractMusicians,
  plannerAssignments,
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
  
  // Get all musicians' availability for a month for planner
  apiRouter.get("/availability", isAuthenticated, async (req, res) => {
    try {
      const { year, month } = req.query;
      
      if (!year || !month) {
        return res.status(400).json({ message: "Year and month are required" });
      }
      
      // Get all musicians
      const musicians = await storage.getMusicians();
      
      // Format the month string as expected by the availability function
      const monthStr = `${year}-${month.toString().padStart(2, '0')}`;
      
      // Get availability for each musician and format for frontend use
      const availabilityPromises = musicians.map(async (musician) => {
        const musicianAvailability = await storage.getAvailability(musician.id, monthStr);
        
        // Filter to only include available dates
        const availableDates = musicianAvailability
          .filter(a => a.isAvailable)
          .map(a => a.date);
        
        return {
          musicianId: musician.id,
          dates: availableDates
        };
      });
      
      const availabilityData = await Promise.all(availabilityPromises);
      res.json(availabilityData);
    } catch (error) {
      console.error("Error fetching monthly availability:", error);
      res.status(500).json({ message: "Error fetching musicians availability" });
    }
  });
  
  // Get available musicians for a specific date and category
  apiRouter.get("/available-musicians", isAuthenticated, async (req, res) => {
    try {
      const { date, categoryIds } = req.query;
      
      if (!date) {
        return res.status(400).json({ message: "Date parameter is required" });
      }
      
      // Convert date string to Date object
      const dateObj = new Date(date as string);
      
      if (!isValid(dateObj)) {
        return res.status(400).json({ message: "Invalid date format" });
      }
      
      // Parse category IDs if provided
      let categoryIdsArray: number[] | undefined;
      if (categoryIds) {
        if (Array.isArray(categoryIds)) {
          categoryIdsArray = categoryIds.map(id => parseInt(id as string)).filter(id => !isNaN(id));
        } else {
          const parsedId = parseInt(categoryIds as string);
          categoryIdsArray = !isNaN(parsedId) ? [parsedId] : [];
        }
      }
      
      // Get available musicians with optional category filtering
      const availableMusicians = await storage.getAvailableMusiciansForDate(
        dateObj,
        categoryIdsArray || []
      );
      
      res.json(availableMusicians);
    } catch (error) {
      console.error("Error fetching available musicians:", error);
      res.status(500).json({ message: "Failed to fetch available musicians" });
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
                    const payRates = await storage.getMusicianPayRatesByMusicianId(musicianId);
                    
                    if (payRates && payRates.length > 0) {
                      // First try to find exact match by category ID
                      let matchingRate = undefined;
                      
                      // First check for the new eventCategoryId field
                      if (event.eventCategoryId) {
                        matchingRate = payRates.find(rate => 
                          rate.eventCategoryId === event.eventCategoryId
                        );
                        if (matchingRate) {
                          console.log(`Found exact match for event category ID ${event.eventCategoryId}`);
                        }
                      }
                      
                      // Fallback to the old categoryIds array if no match found and it exists
                      if (!matchingRate && event.categoryIds && Array.isArray(event.categoryIds)) {
                        matchingRate = payRates.find(rate => 
                          rate.eventCategoryId && event.categoryIds.includes(rate.eventCategoryId)
                        );
                        if (matchingRate) {
                          console.log(`Found match using legacy categoryIds array`);
                        }
                      }
                      
                      // Remove fallback to event type match as it's not needed and causing issues
                      // The pay rates are already specific to a musician, we'll just use the first one if no category match
                      
                      // If still no match, just use the first pay rate
                      if (!matchingRate && payRates.length > 0) {
                        matchingRate = payRates[0];
                        console.log(`No exact match for pay rate, using default rate for musician ${musicianId}`);
                      }
                      
                      if (matchingRate) {
                        // Use the payment model from the event to determine which rate to use
                        // Default to day rate if payment model isn't specified
                        const paymentModel = event.paymentModel || 'daily';
                        
                        if (paymentModel === 'hourly' && matchingRate.hourlyRate) {
                          // For hourly payment model, use the hourly rate * specified hours
                          // Get hours from event.hoursCount, defaulting to 8 if not specified
                          const hoursCount = event.hoursCount || 8;
                          contractAmount = matchingRate.hourlyRate * hoursCount;
                          console.log(`Using hourly rate: $${matchingRate.hourlyRate} * ${hoursCount} hours = $${contractAmount} for musician ${musicianId} (model: ${paymentModel})`);
                        }
                        else if (paymentModel === 'daily' && matchingRate.dayRate) {
                          // For daily payment model, use the day rate * specified days (if applicable)
                          const daysCount = event.daysCount || 1;
                          contractAmount = matchingRate.dayRate * daysCount;
                          console.log(`Using day rate: $${matchingRate.dayRate} * ${daysCount} days = $${contractAmount} for musician ${musicianId} (model: ${paymentModel})`);
                        }
                        else if (paymentModel === 'event' && matchingRate.eventRate) {
                          // For event payment model, use the event rate
                          contractAmount = matchingRate.eventRate;
                          console.log(`Using event rate: $${contractAmount} for musician ${musicianId} (model: ${paymentModel})`);
                        }
                        else {
                          // If the specific rate for the chosen payment model isn't available, try to use available rates in order: day rate, hourly rate, event rate
                          if (matchingRate.dayRate) {
                            contractAmount = matchingRate.dayRate;
                            console.log(`Using day rate: $${contractAmount} for musician ${musicianId} as fallback (requested model: ${paymentModel})`);
                          } else if (matchingRate.hourlyRate) {
                            // Get hours from event.hoursCount, defaulting to 8 if not specified
                            const hoursCount = event.hoursCount || 8;
                            contractAmount = matchingRate.hourlyRate * hoursCount;
                            console.log(`Using hourly rate: $${matchingRate.hourlyRate} * ${hoursCount} hours = $${contractAmount} for musician ${musicianId} as fallback (requested model: ${paymentModel})`);
                          } else if (matchingRate.eventRate) {
                            contractAmount = matchingRate.eventRate;
                            console.log(`Using event rate: $${contractAmount} for musician ${musicianId} as fallback (requested model: ${paymentModel})`);
                          }
                        }
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
              
              const now = new Date();
              const contractData = {
                bookingId,
                eventId,
                musicianId,
                invitationId, // Add the invitation ID
                token,
                expiresAt,
                status: status === 'contract-sent' ? 'contract-sent' : 'pending', // Use 'contract-sent' status directly if that's the current status
                eventDate: new Date(dateStr), // Always include a specific date for the contract
                amount: contractAmount > 0 ? contractAmount : null, // Add the contract amount
                companySignature: "VAMP Management", // Automatically sign with company name
                companySignedAt: now // Include timestamp of when contract was created
              };
              
              // Create the contract link
              const contract = await storage.createContractLink(contractData);
              console.log(`Created contract with ID ${contract.id} for musician ${musicianId}`);
              
              // Generate and store the contract content immediately
              try {
                await generateAndStoreContractContent(contract.id);
                console.log(`Stored rendered contract content for contract ID ${contract.id}`);
              } catch (e) {
                console.error(`Failed to store contract content for contract ID ${contract.id}:`, e);
              }
              
              // After creating the contract, update the status to "contract-sent" instead of keeping it as "accepted"
              if (status === 'accepted') {
                // Update musician status
                await storage.updateMusicianEventStatusForDate(eventId, musicianId, 'contract-sent', dateStr || '');
                
                // Also update contract status to match
                await storage.updateContractLink(contract.id, { status: 'contract-sent' });
                
                // Update centralized status for both entities if the service is available
                try {
                  const { statusService, ENTITY_TYPES } = await import('./services/status');
                  
                  // Update contract status in the centralized system
                  await statusService.updateEntityStatus(
                    ENTITY_TYPES.CONTRACT,
                    contract.id,
                    'contract-sent',
                    0, // No specific user ID for automated actions
                    `Contract automatically sent as musician was accepted`,
                    eventId
                  );
                  
                  // We don't need to update musician status in centralized system as that's handled elsewhere
                } catch (statusError) {
                  console.error("Error updating status in centralized system:", statusError);
                  // Don't fail if this part fails
                }
              }
            } else {
              console.log(`Active contract already exists for musician ${musicianId} in event ${eventId}. ID: ${existingContracts[0].id}`);
              
              // Ensure the status is correctly set to "contract-sent" regardless
              if (status === 'accepted') {
                // Update musician status
                await storage.updateMusicianEventStatusForDate(eventId, musicianId, 'contract-sent', dateStr || '');
                
                // Also update contract status to match if it's not already set
                const existingContract = existingContracts[0];
                if (existingContract && existingContract.status !== 'contract-sent') {
                  await storage.updateContractLink(existingContract.id, { status: 'contract-sent' });
                  
                  // Update centralized status for contract if the service is available
                  try {
                    const { statusService, ENTITY_TYPES } = await import('./services/status');
                    
                    // Update contract status in the centralized system
                    await statusService.updateEntityStatus(
                      ENTITY_TYPES.CONTRACT,
                      existingContract.id,
                      'contract-sent',
                      0, // No specific user ID for automated actions
                      `Contract status synchronized with musician status`,
                      eventId
                    );
                  } catch (statusError) {
                    console.error("Error updating status in centralized system:", statusError);
                    // Don't fail if this part fails
                  }
                }
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

  // NEW ENDPOINT: Get planner musicians with assignments
  apiRouter.get("/planner-musicians/:plannerId", isAuthenticated, async (req, res) => {
    try {
      console.log("\n===== GET PLANNER MUSICIANS =====");
      const { plannerId } = req.params;
      const plannerIdInt = parseInt(plannerId);
      
      if (isNaN(plannerIdInt)) {
        console.error(`[planner-musicians] Invalid planner ID: ${plannerId}`);
        return res.json({ 
          success: false, 
          error: "InvalidPlannerID",
          message: "Invalid planner ID provided" 
        });
      }
      
      // 1. Get the planner
      const planner = await storage.getMonthlyPlanner(plannerIdInt);
      if (!planner) {
        console.error(`[planner-musicians] Planner not found: ${plannerId}`);
        return res.json({ 
          success: false, 
          error: "PlannerNotFound",
          message: "Planner not found" 
        });
      }
      
      // 2. Get all slots for this planner
      const slots = await storage.getPlannerSlots(plannerIdInt);
      if (!slots || slots.length === 0) {
        console.warn(`[planner-musicians] No slots found for planner: ${plannerId}`);
        return res.json({ 
          success: false, 
          error: "NoSlotsFound",
          message: "No slots found for this planner" 
        });
      }
      
      console.log(`[planner-musicians] Found ${slots.length} slots for planner ${plannerId}`);
      
      // 3. Build a map of all musicians with their assignments
      const musicianMap = {};
      const processedSlots = [];
      
      // First, get all the assignments for each slot
      for (const slot of slots) {
        try {
          // Get venue info
          let venueName = "Unknown Venue";
          if (slot.venueId) {
            try {
              const venue = await storage.getVenue(slot.venueId);
              if (venue) venueName = venue.name;
            } catch (venueErr) {
              console.error(`[planner-musicians] Error fetching venue ${slot.venueId}:`, venueErr);
            }
          }
          
          // Get assignments for this slot
          const assignments = await storage.getPlannerAssignments(slot.slotId || slot.id);
          
          if (assignments && assignments.length > 0) {
            processedSlots.push({
              slotId: slot.id,
              date: slot.date,
              venueId: slot.venueId,
              venueName,
              startTime: slot.startTime || "19:00",
              endTime: slot.endTime || "21:00",
              assignments
            });
            
            // Process each assignment
            for (const assignment of assignments) {
              const musicianId = assignment.musicianId;
              
              // Skip if no musician ID
              if (!musicianId) continue;
              
              // Create entry for this musician if it doesn't exist
              if (!musicianMap[musicianId]) {
                musicianMap[musicianId] = {
                  musicianId,
                  assignments: [],
                  totalFee: 0
                };
              }
              
              // Calculate fee for this assignment
              let fee = assignment.actualFee || 0;
              
              if (!fee && slot.categoryIds && slot.categoryIds.length > 0) {
                // Try to find a pay rate for this musician and category
                try {
                  const rates = await storage.getMusicianPayRatesByMusicianId(musicianId);
                  const category = slot.categoryIds[0];
                  
                  if (rates && rates.length > 0) {
                    const matchingRate = rates.find(r => r.eventCategoryId === category);
                    
                    if (matchingRate && matchingRate.hourlyRate) {
                      // Default to 2 hours if not specified
                      const duration = slot.duration || 2;
                      fee = matchingRate.hourlyRate * duration;
                    } else {
                      // Fallback to default rate
                      fee = 150;
                    }
                  } else {
                    fee = 150; // Default fallback
                  }
                } catch (err) {
                  console.error(`[planner-musicians] Error calculating fee:`, err);
                  fee = 150; // Default fallback
                }
              } else if (!fee) {
                fee = 150; // Default fallback if no category
              }
              
              // Add this assignment to the musician's list
              musicianMap[musicianId].assignments.push({
                id: assignment.id,
                slotId: slot.id,
                date: format(new Date(slot.date), 'MMM d, yyyy'),
                venueName,
                venueId: slot.venueId,
                startTime: slot.startTime || "19:00",
                endTime: slot.endTime || "21:00",
                fee,
                status: assignment.status || "pending"
              });
              
              // Add to total fee
              musicianMap[musicianId].totalFee += fee;
            }
          }
        } catch (slotError) {
          console.error(`[planner-musicians] Error processing slot ${slot.id}:`, slotError);
          // Continue with the next slot
        }
      }
      
      // 4. Add musician details to each entry
      const musicians = Object.keys(musicianMap);
      
      console.log(`[planner-musicians] Found ${musicians.length} musicians with assignments`);
      
      for (const musicianId of musicians) {
        try {
          const musician = await storage.getMusician(parseInt(musicianId));
          if (musician) {
            musicianMap[musicianId].musicianName = musician.name;
            musicianMap[musicianId].email = musician.email;
            musicianMap[musicianId].phone = musician.phone;
          } else {
            musicianMap[musicianId].musicianName = "Unknown Musician";
          }
        } catch (musicianError) {
          console.error(`[planner-musicians] Error fetching musician ${musicianId}:`, musicianError);
          musicianMap[musicianId].musicianName = "Unknown Musician";
        }
      }
      
      // 5. Return all musicians with assignments
      return res.json({
        success: true,
        planner,
        musicians: musicianMap,
        totalMusicians: musicians.length,
        totalSlots: slots.length,
        processedSlots: processedSlots.length
      });
      
    } catch (error) {
      console.error("[planner-musicians] Error:", error);
      return res.json({ 
        success: false, 
        error: "ServerError",
        message: "An error occurred while fetching musician data for this planner" 
      });
    }
  });
  
  // NEW ENDPOINT: Send planner contracts to musicians
  apiRouter.post("/planner-contracts/:plannerId", isAuthenticated, async (req, res) => {
    try {
      console.log("\n\n======== STARTING SEND PLANNER CONTRACTS ========");
      
      // 1. Extract and validate parameters
      const plannerId = parseInt(req.params.plannerId);
      if (isNaN(plannerId) || plannerId <= 0) {
        console.error(`[planner-contracts] Invalid planner ID: ${req.params.plannerId}`);
        return res.status(200).json({ 
          success: false, 
          error: "InvalidPlannerID",
          message: "The planner ID provided is not valid."
        });
      }
      
      const { 
        emailMessage, 
        contractTemplateId, 
        emailTemplateId,
        musicians = [] // Array of musician IDs to include
      } = req.body;
      
      // 2. Validate required fields
      if (!contractTemplateId) {
        return res.status(200).json({ 
          success: false, 
          error: "MissingContractTemplate",
          message: "Contract template ID is required." 
        });
      }
      
      if (!emailTemplateId) {
        return res.status(200).json({ 
          success: false, 
          error: "MissingEmailTemplate",
          message: "Email template ID is required." 
        });
      }
      
      if (!emailMessage || emailMessage.trim() === '') {
        return res.status(200).json({ 
          success: false, 
          error: "MissingEmailMessage",
          message: "Email message is required." 
        });
      }
      
      if (!musicians || !Array.isArray(musicians) || musicians.length === 0) {
        return res.status(200).json({ 
          success: false, 
          error: "NoMusiciansSelected",
          message: "No musicians were selected to receive contracts." 
        });
      }
      
      // 3. Check if SendGrid is configured
      // We'll store this in the response but not block the process
      const sendGridConfigured = await isSendGridConfigured();
      
      // 4. Get planner data
      const planner = await storage.getMonthlyPlanner(plannerId);
      if (!planner) {
        return res.status(200).json({ 
          success: false, 
          error: "PlannerNotFound",
          message: "The monthly planner could not be found."
        });
      }
      
      // 5. Validate contract template exists
      const contractTemplate = await storage.getContractTemplate(parseInt(contractTemplateId));
      if (!contractTemplate) {
        return res.status(200).json({ 
          success: false, 
          error: "ContractTemplateNotFound",
          message: "The selected contract template could not be found." 
        });
      }
      
      // 6. Validate email template exists
      const emailTemplate = await storage.getEmailTemplate(parseInt(emailTemplateId));
      if (!emailTemplate) {
        return res.status(200).json({ 
          success: false, 
          error: "EmailTemplateNotFound",
          message: "The selected email template could not be found." 
        });
      }
      
      // 7. Get slots for this planner
      const slots = await storage.getPlannerSlots(plannerId);
      if (!slots || slots.length === 0) {
        return res.status(200).json({
          success: false,
          error: "NoSlots",
          message: "No slots found for this planner."
        });
      }
      
      // 8. Process each selected musician
      const results = {
        success: true,
        totalMusicians: musicians.length,
        sent: 0,
        failed: 0,
        skipped: 0,
        emailEnabled: sendGridConfigured, // Flag to indicate if email sending was possible
        emailsActuallySent: false, // Will be set to true if at least one email is successfully sent
        details: []
      };
      
      // Format month name and year for the contract
      const plannerDate = new Date(planner.year, planner.month - 1, 1);
      const formattedMonth = plannerDate.toLocaleString('default', { month: 'long', year: 'numeric' });
      
      // Process each musician
      for (const musicianId of musicians) {
        try {
          // Validate musician exists
          const musician = await storage.getMusician(parseInt(musicianId));
          if (!musician) {
            results.skipped++;
            results.details.push({
              musicianId,
              status: "skipped",
              reason: "Musician not found"
            });
            continue;
          }
          
          // Validate musician has email
          if (!musician.email) {
            results.skipped++;
            results.details.push({
              musicianId,
              musicianName: musician.name,
              status: "skipped",
              reason: "No email address"
            });
            continue;
          }
          
          // Get musician's assignments for this planner
          const assignments = [];
          let totalFee = 0;
          
          for (const slot of slots) {
            const slotAssignments = await storage.getPlannerAssignments(slot.id);
            const musicianAssignments = slotAssignments.filter(a => a.musicianId === parseInt(musicianId));
            
            for (const assignment of musicianAssignments) {
              // Get venue info
              let venueName = "Unknown Venue";
              if (slot.venueId) {
                try {
                  const venue = await storage.getVenue(slot.venueId);
                  if (venue) venueName = venue.name;
                } catch (err) {
                  console.error(`[planner-contracts] Error fetching venue ${slot.venueId}:`, err);
                }
              }
              
              // Calculate fee
              let fee = assignment.actualFee || 0;
              if (!fee) {
                try {
                  const rates = await storage.getMusicianPayRatesByMusicianId(parseInt(musicianId));
                  const category = slot.categoryIds && slot.categoryIds.length > 0 ? slot.categoryIds[0] : null;
                  const matchingRate = rates.find(r => r.eventCategoryId === category);
                  
                  if (matchingRate && matchingRate.hourlyRate) {
                    // Default to 2 hours if not specified
                    const duration = 2; 
                    fee = matchingRate.hourlyRate * duration;
                  } else {
                    fee = 150; // Default fallback
                  }
                } catch (err) {
                  console.error(`[planner-contracts] Error calculating fee:`, err);
                  fee = 150; // Default fallback
                }
              }
              
              // Add to assignments list
              assignments.push({
                id: assignment.id,
                date: format(new Date(slot.date), 'MMM d, yyyy'),
                venueName: venueName,
                venueId: slot.venueId,
                fee: fee,
                startTime: slot.startTime,
                endTime: slot.endTime,
                status: assignment.status || "pending"
              });
              
              totalFee += fee;
            }
          }
          
          // Skip if no assignments
          if (assignments.length === 0) {
            results.skipped++;
            results.details.push({
              musicianId,
              musicianName: musician.name,
              status: "skipped",
              reason: "No assignments found"
            });
            continue;
          }
          
          // Create a monthly contract
          const contract = await storage.createMonthlyContract({
            plannerId: plannerId,
            month: planner.month,
            year: planner.year,
            name: `${formattedMonth} - ${musician.name}`,
            templateId: parseInt(contractTemplateId),
            status: "draft"
          });
          
          if (!contract) {
            results.failed++;
            results.details.push({
              musicianId,
              musicianName: musician.name,
              status: "failed",
              reason: "Failed to create contract"
            });
            continue;
          }
          
          // Create contract invitations for the musician
          // For monthly contracts, we'll use a special system event (ID: 99999)
          // This is a placeholder event created specifically for monthly contracts
          
          // Get current timestamp for tracking
          const now = new Date();
          let invitation = null; // Initialize to avoid undefined issues
          
          try {
            // Force-convert all fields to their expected types to avoid type mismatches
            // Ensure all required fields are explicitly provided with correct types
            const invitationData = {
              // Use a dynamic event ID based on the month and year
              // Format: 999YYYYMM (e.g., 99920250 for May 2025)
              // This ensures unique event IDs for each month while still being recognizable as system events
              eventId: 999 * 1000000 + planner.year * 100 + planner.month,
              musicianId: parseInt(musicianId),
              invitedAt: now,
              email: musician.email || "missing@example.com", // Fallback value
              messageSubject: `Contract for ${formattedMonth}`,
              messageBody: emailMessage || `Please review your schedule for ${formattedMonth}`,
              status: "invited",
              // Optional fields with explicit null or default values
              respondedAt: null,
              responseMessage: null,
              reminders: 0,
              lastReminderAt: null,
              updatedAt: now
            };
            
            // Log the data being sent to the database
            console.log(`[DEBUG] Creating invitation with data for musician ${musicianId}:`, invitationData);
            
            // Execute the database call
            invitation = await storage.createInvitation(invitationData);
            console.log(`[DEBUG] Created invitation ID ${invitation.id} successfully`);
          
            // Try to send the email only if SendGrid is configured
            // This function will internally check configuration and return false without throwing
            // if SendGrid isn't properly set up
            const emailSent = await sendMusicianAssignmentEmail(
              musician.email,
              musician.name,
              formattedMonth,
              assignments,
              emailMessage,
              emailTemplateId
            );
            
            if (emailSent) {
              console.log(`[planner-contracts] Email successfully sent to ${musician.name} (ID: ${musicianId})`);
              // Mark that at least one email was sent successfully
              results.emailsActuallySent = true;
            } else {
              console.log(`[planner-contracts] Email could not be sent to ${musician.name} (ID: ${musicianId}) - SendGrid not configured`);
            }
            
            // Update contract and invitation status - still mark as sent even if email wasn't sent
            await storage.updateMonthlyContract(contract.id, { status: "sent" });
            
            results.sent++;
            results.details.push({
              musicianId,
              musicianName: musician.name,
              status: "sent",
              contractId: contract.id,
              invitationId: invitation.id,
              assignmentCount: assignments.length,
              totalFee: totalFee
            });
          } catch (processingError) {
            console.error(`[planner-contracts] Error processing musician ${musicianId}:`, processingError);
            
            results.failed++;
            // Add detailed error information to the results
            results.details.push({
              musicianId,
              musicianName: musician.name,
              status: "failed",
              reason: invitation ? "Email sending failed" : "Failed to create invitation",
              error: processingError.message,
              ...(invitation ? { invitationId: invitation.id } : {}),
              ...(contract ? { contractId: contract.id } : {})
            });
          }
        } catch (musicianError) {
          console.error(`[planner-contracts] Error processing musician ${musicianId}:`, musicianError);
          
          results.failed++;
          results.details.push({
            musicianId,
            status: "failed",
            reason: "Processing error",
            error: musicianError.message
          });
        }
      }
      
      // 9. Update planner status to finalized
      await storage.updateMonthlyPlanner(plannerId, { status: "finalized" });
      
      // 10. Create activity log entry
      await storage.createActivity({
        userId: (req.user as any).id,
        action: "finalize_planner_and_send_contracts",
        entityType: "planner",
        entityId: plannerId,
        details: { 
          description: `Finalized monthly planner: ${planner.name}`,
          sentCount: results.sent,
          failedCount: results.failed,
          skippedCount: results.skipped
        },
        timestamp: new Date()
      });
      
      // Return detailed results
      return res.status(200).json(results);
      
    } catch (error) {
      console.error("[planner-contracts] Unexpected error:", error);
      return res.status(200).json({
        success: false,
        error: "ServerError",
        message: "An unexpected error occurred while sending contracts."
      });
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
      
      const slotId = parseInt(req.params.id);
      if (isNaN(slotId)) {
        return res.status(400).json({ message: "Invalid slot ID" });
      }
      
      // Get the original slot to check if times have changed
      const originalSlot = await storage.getPlannerSlot(slotId);
      if (!originalSlot) {
        return res.status(404).json({ message: "Planner slot not found" });
      }
      
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
      
      // Check if start or end time has changed
      const timeHasChanged = (
        (validatedData.startTime && validatedData.startTime !== originalSlot.startTime) ||
        (validatedData.endTime && validatedData.endTime !== originalSlot.endTime)
      );
      
      // Update the slot
      const slot = await storage.updatePlannerSlot(slotId, validatedData);
      if (!slot) {
        return res.status(404).json({ message: "Failed to update planner slot" });
      }
      
      // If the times have changed, recalculate the fees for all assignments
      if (timeHasChanged) {
        // Get all assignments for this slot
        const assignments = await storage.getPlannerAssignments(slotId);
        console.log(`Time has changed for slot ${slotId}. Updating fees for ${assignments.length} assignments...`);
        
        for (const assignment of assignments) {
          // Only recalculate fees for assignments without a manual override
          if (!assignment.actualFee || assignment.actualFee <= 0) {
            try {
              // Calculate hours based on start and end times
              let hours = 2; // Default fallback
              if (slot.startTime && slot.endTime) {
                try {
                  // Parse time strings (format: "HH:MM")
                  const [startHours, startMinutes] = slot.startTime.split(':').map(Number);
                  const [endHours, endMinutes] = slot.endTime.split(':').map(Number);
                  
                  // Convert to minutes for calculation
                  const startTotalMinutes = startHours * 60 + startMinutes;
                  let endTotalMinutes = endHours * 60 + endMinutes;
                  
                  // Handle case for next day
                  if (endTotalMinutes < startTotalMinutes) {
                    endTotalMinutes += 24 * 60;
                  }
                  
                  // Calculate hours
                  const durationMinutes = endTotalMinutes - startTotalMinutes;
                  hours = Math.round((durationMinutes / 60) * 10) / 10;
                } catch (error) {
                  console.log(`Error calculating hours for slot ${slotId}:`, error);
                  hours = 2; // Fallback if calculation fails
                }
              }
              
              // Get musician pay rates
              const musician = await storage.getMusician(assignment.musicianId);
              if (!musician) continue;
              
              const payRates = await storage.getMusicianPayRatesByMusicianId(assignment.musicianId);
              
              // Use Club Performance (ID 7) as the default event category
              const eventCategoryId = 7;
              
              // Find matching pay rate
              const matchingRate = payRates.find(rate => 
                rate.eventCategoryId === eventCategoryId
              );
              
              if (matchingRate && matchingRate.hourlyRate) {
                // Calculate new fee - exact multiplication without rounding
                const newFee = parseInt((matchingRate.hourlyRate * hours).toFixed(0));
                
                // Update the assignment with the new fee
                console.log(`Updating assignment ${assignment.id} fee to ${newFee} (${matchingRate.hourlyRate} × ${hours} hours)`);
                await storage.updatePlannerAssignment(assignment.id, { actualFee: newFee });
              }
            } catch (error) {
              console.error(`Error recalculating fee for assignment ${assignment.id}:`, error);
            }
          } else {
            console.log(`Skipping fee update for assignment ${assignment.id} - has manual override (${assignment.actualFee})`);
          }
        }
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
  
  // Get all assignments for a specific planner (more efficient than querying by slot ID)
  apiRouter.get("/planner-assignments/by-planner/:plannerId", isAuthenticated, async (req, res) => {
    try {
      const plannerId = parseInt(req.params.plannerId);
      
      // Validate the ID is a valid number
      if (isNaN(plannerId)) {
        return res.status(400).json({ message: "Invalid planner ID" });
      }
      
      console.log(`Fetching assignments for planner ID: ${plannerId}`);
      const assignments = await storage.getPlannerAssignmentsByPlannerId(plannerId);
      console.log(`Found ${assignments.length} assignments`);
      res.json(assignments);
    } catch (error) {
      console.error("Error fetching planner assignments by plannerId:", error);
      res.status(500).json({ message: "Error fetching planner assignments" });
    }
  });

  apiRouter.get("/planner-assignments/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Validate the ID is a valid number
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid assignment ID" });
      }
      
      const assignment = await storage.getPlannerAssignment(id);
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
      
      // Get the planner slot to check the date and time
      const slot = await storage.getPlannerSlot(assignmentData.slotId);
      if (!slot) {
        return res.status(404).json({ message: "Planner slot not found" });
      }
      
      // Convert to ISO date string format for consistent handling
      const dateStr = new Date(slot.date).toISOString().split('T')[0];
      console.log(`Checking availability for musician ${assignmentData.musicianId} on date ${dateStr} (slot: ${slot.id})`);
      
      // Use enhanced storage method to check availability INCLUDING time conflicts
      // Pass the slotId so the system can check for conflicting assignments at the same time
      const isAvailable = await storage.isMusicianAvailableForDate(
        assignmentData.musicianId, 
        dateStr, 
        assignmentData.slotId
      );
      console.log(`Availability check result: ${isAvailable}`);
      
      // If not available, return an error
      if (!isAvailable) {
        return res.status(400).json({ 
          message: "Cannot assign musician to this slot",
          error: "MUSICIAN_UNAVAILABLE",
          details: "Musician already reserved for the same timeslot for your selected date"
        });
      }
      
      // Musician is available, proceed with assignment creation
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
      const id = parseInt(req.params.id);
      
      // Validate the ID is a valid number
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid assignment ID" });
      }
      
      // Get the current assignment to know what we're updating
      const currentAssignment = await storage.getPlannerAssignment(id);
      if (!currentAssignment) {
        return res.status(404).json({ message: "Assignment not found" });
      }
      
      const assignmentData = insertPlannerAssignmentSchema.partial().parse(req.body);
      
      // If musician is being changed, check for time conflicts
      if (assignmentData.musicianId && assignmentData.musicianId !== currentAssignment.musicianId) {
        // Get the slot info to check date and time
        const slot = await storage.getPlannerSlot(currentAssignment.slotId);
        if (!slot) {
          return res.status(404).json({ message: "Associated planner slot not found" });
        }
        
        // Convert to ISO date string format for consistent handling
        const dateStr = new Date(slot.date).toISOString().split('T')[0];
        console.log(`Checking availability for new musician ${assignmentData.musicianId} on date ${dateStr} (slot: ${slot.id})`);
        
        // Check if the new musician is available for this time slot
        const isAvailable = await storage.isMusicianAvailableForDate(
          assignmentData.musicianId, 
          dateStr,
          currentAssignment.slotId // Pass the current slot ID for time conflict checking
        );
        
        if (!isAvailable) {
          return res.status(400).json({ 
            message: "Cannot reassign slot to this musician",
            error: "MUSICIAN_UNAVAILABLE",
            details: "Musician already reserved for the same timeslot for your selected date"
          });
        }
      }
      
      // All checks passed, update the assignment
      const assignment = await storage.updatePlannerAssignment(id, assignmentData);
      if (!assignment) {
        return res.status(404).json({ message: "Failed to update assignment" });
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
      const id = parseInt(req.params.id);
      
      // Validate the ID is a valid number
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid assignment ID" });
      }
      
      const result = await storage.deletePlannerAssignment(id);
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
      const id = parseInt(req.params.id);
      
      // Validate the ID is a valid number
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid assignment ID" });
      }
      
      const { status, notes } = req.body;
      if (!status) {
        return res.status(400).json({ message: "Status is required" });
      }
      
      const userId = (req.user as any).id;
      const assignment = await storage.markAttendance(id, status, userId, notes);
      
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
  // Helper function to get planner assignments by musician
  const getPlannerAssignmentsByMusician = async (plannerId: number) => {
    console.log("Getting planner assignments for musicians with planner ID:", plannerId);
    
    try {
      // 1. Get all the assignments for this planner
      const assignments = await storage.getPlannerAssignmentsByPlannerId(plannerId);
      if (!assignments || assignments.length === 0) {
        console.log("No assignments found for planner ID:", plannerId);
        return { _status: "empty" };
      }
      
      // 2. Get all musicians to look up names
      const musicians = await storage.getMusicians();
      
      // 3. Create a musician name lookup map
      const musicianMap = musicians.reduce((acc: {[key: number]: any}, musician) => {
        acc[musician.id] = musician.name;
        return acc;
      }, {});
      
      // 4. Get venue and slot information for display
      const slots = await storage.getPlannerSlots(plannerId);
      const venues = await storage.getVenues();
      
      // Create maps for quick lookups
      const slotMap = slots.reduce((acc: {[key: number]: any}, slot) => {
        acc[slot.id] = slot;
        return acc;
      }, {});
      
      const venueMap = venues.reduce((acc: {[key: number]: any}, venue) => {
        acc[venue.id] = venue.name;
        return acc;
      }, {});
      
      // 5. Group assignments by musician
      const groupedAssignments: {[key: number]: any} = {};
      
      for (const assignment of assignments) {
        const { musicianId, slotId } = assignment;
        
        // Skip invalid data for robustness
        if (!musicianId || !slotId || !slotMap[slotId]) continue;
        
        // Get the musician name
        const musicianName = musicianMap[musicianId] || `Musician #${musicianId}`;
        
        // Get the slot info
        const slot = slotMap[slotId];
        const venueName = venueMap[slot.venueId] || 'Unknown Venue';
        
        // Initialize this musician's group if it doesn't exist
        if (!groupedAssignments[musicianId]) {
          groupedAssignments[musicianId] = {
            musicianId,
            musicianName,
            assignments: [],
            totalFee: 0
          };
        }
        
        // Add enriched assignment data
        groupedAssignments[musicianId].assignments.push({
          ...assignment,
          slotDate: slot.date,
          venueName,
          startTime: slot.startTime,
          endTime: slot.endTime
        });
        
        // Update the total fee
        if (assignment.actualFee) {
          groupedAssignments[musicianId].totalFee += assignment.actualFee;
        }
      }
      
      return groupedAssignments;
    } catch (error) {
      console.error("Error in getPlannerAssignmentsByMusician:", error);
      return { 
        _status: "error",
        _message: "Failed to process assignments",
        _errorType: "ServerError",
      };
    }
  };

  // Endpoint that takes plannerId as a URL parameter (/:plannerId)
  apiRouter.get("/planner-assignments/by-musician/:plannerId", isAuthenticated, async (req, res) => {
    try {
      const plannerId = parseInt(req.params.plannerId);
      
      if (isNaN(plannerId) || plannerId <= 0) {
        return res.status(400).json({
          _status: "error",
          _message: "Invalid planner ID",
          _errorType: "InvalidParameter"
        });
      }
      
      const result = await getPlannerAssignmentsByMusician(plannerId);
      return res.json(result);
    } catch (error) {
      console.error("Error fetching assignments by musician:", error);
      return res.status(500).json({
        _status: "error",
        _message: "Server error",
        _errorType: "ServerError"
      });
    }
  });

  // Legacy endpoint that takes plannerId as a query parameter (?plannerId=X)
  apiRouter.get("/planner-assignments/by-musician", isAuthenticated, async (req, res) => {
    try {
      console.log("\n\n======== STARTING BY-MUSICIAN ENDPOINT ========");
      console.log("[by-musician] Received request with query params:", req.query);
      
      // Check if plannerId exists
      if (!req.query.plannerId) {
        console.error("[by-musician] No plannerId provided in query params");
        return res.json({
          _status: "error",
          _message: "Missing plannerId parameter",
          _errorType: "InvalidParameters",
          999: {
            musicianId: 999,
            musicianName: "Error: Missing plannerId",
            assignments: [],
            totalFee: 0
          }
        });
      }
      
      // Force convert the plannerId to string first to handle all input types
      const plannerIdInput = req.query.plannerId ? String(req.query.plannerId) : undefined;
      
      // There may be non-numeric characters in the query parameter
      let plannerId = undefined;
      try {
        plannerId = plannerIdInput ? parseInt(plannerIdInput) : undefined;
        // Additional validation to ensure the parsed value is a valid number
        if (plannerId && (isNaN(plannerId) || !Number.isFinite(plannerId) || plannerId <= 0)) {
          plannerId = undefined;
        }
      } catch (parseError) {
        console.error(`[by-musician] Error parsing plannerId: ${parseError}`);
        plannerId = undefined;
      }
      
      console.log(`[by-musician] Parsed plannerId: ${plannerId}, raw value: ${plannerIdInput}`);
      
      if (!plannerId || isNaN(plannerId)) {
        console.error(`[by-musician] Invalid plannerId: ${req.query.plannerId}`);
        return res.json({
          _status: "error",
          _message: "Invalid planner ID provided",
          _details: `Provided value: '${req.query.plannerId}' is not a valid number`,
          _errorType: "InvalidPlannerID",
          999: {
            musicianId: 999,
            musicianName: "Error: Invalid planner ID",
            assignments: [],
            totalFee: 0
          }
        });
      }
      
      // Call our helper function that implements the business logic to group assignments by musician
      console.log(`[by-musician] Fetching assignments by musician for planner ID: ${plannerId}`);
      const musicianAssignments = await getPlannerAssignmentsByMusician(plannerId);
      
      // Check if we have results
      if (!musicianAssignments || Object.keys(musicianAssignments).length === 0) {
        console.log(`[by-musician] No assignments found for planner ID: ${plannerId}`);
        return res.json({
          _status: "empty",
          _message: "No assignments found for this planner",
          999: {
            musicianId: 999,
            musicianName: "No assignments available",
            assignments: [],
            totalFee: 0
          }
        });
      }
      
      console.log(`[by-musician] Found assignments for ${Object.keys(musicianAssignments).length} musicians`);
      
      // Return the grouped assignments
      return res.json(musicianAssignments);
    } catch (error) {
      console.error(`[by-musician] ERROR PROCESSING REQUEST: ${error}`);
      console.error(`[by-musician] Error stack: ${(error as Error).stack}`);
      
      // Return a detailed error response
      return res.json({
        _status: "error",
        _message: "Error fetching musician assignments",
        _errorType: "ServerError",
        _details: (error as Error).message,
        _stack: process.env.NODE_ENV === 'development' ? (error as Error).stack : undefined,
        // Add a dummy entry to ensure the client doesn't crash
        999: {
          musicianId: 999,
          musicianName: "Error loading assignments",
          assignments: [],
          totalFee: 0
        }
      });
    }
  });
  
  // Endpoint to create a monthly contract from selected assignments
  apiRouter.post("/monthly-contracts", isAuthenticated, async (req, res) => {
    try {
      console.log("[monthly-contracts] Creating new monthly contract", req.body);
      
      // Validate required parameters
      if (!req.body.plannerId || !req.body.musicianId || !req.body.assignmentIds || req.body.assignmentIds.length === 0) {
        return res.status(400).json({
          message: "Missing required parameters: plannerId, musicianId, and assignmentIds are required"
        });
      }
      
      const { plannerId, musicianId, assignmentIds, notes } = req.body;
      
      // Create monthly contract
      const contract = await storage.createMonthlyContract({
        plannerId,
        musicianId,
        status: "pending", // Initial status is pending
        notes: notes || null,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      // Associate assignments with this contract
      const updatedAssignments = [];
      for (const assignmentId of assignmentIds) {
        const updated = await storage.updatePlannerAssignment(assignmentId, {
          contractId: contract.id,
          contractStatus: "pending"
        });
        updatedAssignments.push(updated);
      }
      
      // Return the created contract and updated assignments
      return res.json({
        contract,
        assignments: updatedAssignments
      });
    } catch (error) {
      console.error("[monthly-contracts] Error creating contract:", error);
      return res.status(500).json({
        message: "Error creating monthly contract",
        error: (error as Error).message
      });
    }
  });
  
  // Get contracts for a specific planner
  apiRouter.get("/monthly-contracts/planner/:plannerId", isAuthenticated, async (req, res) => {
    try {
      const { plannerId } = req.params;
      
      if (!plannerId || isNaN(parseInt(plannerId))) {
        return res.status(400).json({
          message: "Invalid planner ID"
        });
      }
      
      const contracts = await storage.getMonthlyContractsByPlanner(parseInt(plannerId));
      return res.json(contracts);
    } catch (error) {
      console.error("[monthly-contracts] Error fetching contracts by planner:", error);
      return res.status(500).json({
        message: "Error fetching contracts",
        error: (error as Error).message
      });
    }
  });
  
  // Get a specific contract by ID
  apiRouter.get("/monthly-contracts/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      
      if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({
          message: "Invalid contract ID"
        });
      }
      
      const contract = await storage.getMonthlyContract(parseInt(id));
      
      if (!contract) {
        return res.status(404).json({
          message: "Contract not found"
        });
      }
      
      // Get the musician info
      const musician = await storage.getMusician(contract.musicianId);
      
      // Get assignments linked to this contract by querying planner assignments with contractId
      const assignments = await db
        .select()
        .from(plannerAssignments)
        .where(eq(plannerAssignments.contractId, contract.id));
      
      return res.json({
        contract,
        musician,
        assignments
      });
    } catch (error) {
      console.error("[monthly-contracts] Error fetching contract:", error);
      return res.status(500).json({
        message: "Error fetching contract",
        error: (error as Error).message
      });
    }
  });
  
  // Update a contract's status
  apiRouter.patch("/monthly-contracts/:id/status", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const { status, notes } = req.body;
      
      if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({
          message: "Invalid contract ID"
        });
      }
      
      if (!status || !["pending", "sent", "signed", "rejected", "canceled"].includes(status)) {
        return res.status(400).json({
          message: "Invalid status. Must be one of: pending, sent, signed, rejected, canceled"
        });
      }
      
      // Update contract status
      const contract = await storage.updateMonthlyContract(parseInt(id), {
        status,
        notes: notes || null,
        updatedAt: new Date()
      });
      
      // Also update status for all associated assignments
      await storage.updatePlannerAssignmentsByContract(parseInt(id), {
        contractStatus: status
      });
      
      return res.json(contract);
    } catch (error) {
      console.error("[monthly-contracts] Error updating contract status:", error);
      return res.status(500).json({
        message: "Error updating contract status",
        error: (error as Error).message
      });
    }
  });
  
  // Delete a contract
  apiRouter.delete("/monthly-contracts/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      
      if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({
          message: "Invalid contract ID"
        });
      }
      
      // First update all associated assignments to remove the contract reference
      await storage.updatePlannerAssignmentsByContract(parseInt(id), {
        contractId: null,
        contractStatus: null
      });
      
      // Then delete the contract
      const result = await storage.deleteMonthlyContract(parseInt(id));
      
      return res.json({
        message: "Contract deleted successfully",
        success: result
      });
    } catch (error) {
      console.error("[monthly-contracts] Error deleting contract:", error);
      return res.status(500).json({
        message: "Error deleting contract",
        error: (error as Error).message
      });
    }
  });
  
  // The following is the old code that used to be part of the by-musician endpoint
  // We're keeping it commented out temporarily for reference
  /*
  for (const slotId of slotIds) {
        // Enhanced slot ID validation
        if (slotId === undefined || slotId === null) {
          console.warn(`[by-musician] Missing slot ID, skipping`);
          assignmentErrors.push(`Missing slot ID in slots list`);
          continue;
        }
        
        // Convert to number and validate
        const numericSlotId = Number(slotId);
        if (isNaN(numericSlotId) || !Number.isInteger(numericSlotId) || numericSlotId <= 0) {
          console.warn(`[by-musician] Invalid slot ID format: ${slotId} (type: ${typeof slotId}), skipping`);
          assignmentErrors.push(`Invalid slot ID format: ${slotId}`);
          continue;
        }
        
        try {
          const slotAssignments = await storage.getPlannerAssignments(numericSlotId);
          console.log(`[by-musician] Found ${slotAssignments.length} assignments for slot ID: ${numericSlotId}`);
          
          // Log details about each assignment for debugging
          slotAssignments.forEach(assignment => {
            console.log(`[by-musician] Assignment ID: ${assignment.id}, Musician ID: ${assignment.musicianId}, Status: ${assignment.status || 'none'}`);
          });
          
          // Validate each assignment's musician ID with enhanced validation
          const validAssignments = [];
          for (const assignment of slotAssignments) {
            if (assignment.musicianId === undefined || assignment.musicianId === null) {
              console.warn(`[by-musician] Assignment ${assignment.id} is missing musician ID, skipping`);
              assignmentErrors.push(`Assignment ${assignment.id} is missing musician ID`);
              continue;
            }
            
            // Convert to number and validate
            const numericMusicianId = Number(assignment.musicianId);
            if (isNaN(numericMusicianId) || !Number.isInteger(numericMusicianId) || numericMusicianId <= 0) {
              console.warn(`[by-musician] Assignment ${assignment.id} has invalid musician ID format: ${assignment.musicianId} (type: ${typeof assignment.musicianId}), skipping`);
              assignmentErrors.push(`Assignment ${assignment.id} has invalid musician ID: ${assignment.musicianId}`);
              continue;
            }
            
            // Make a copy with the validated musicianId to ensure it's a proper number
            validAssignments.push({
              ...assignment,
              musicianId: numericMusicianId
            });
          }
          
          assignments.push(...validAssignments);
        } catch (slotError) {
          console.error(`[by-musician] Error getting assignments for slot ${slotId}: ${slotError}`);
          assignmentErrors.push(`Error getting assignments for slot ${slotId}: ${slotError}`);
          continue;
        }
      }
      
      // Log any errors that occurred during assignment processing
      if (assignmentErrors.length > 0) {
        console.warn(`[by-musician] ${assignmentErrors.length} errors occurred while processing assignments:`);
        assignmentErrors.forEach((err, i) => console.warn(`[by-musician] Error ${i+1}: ${err}`));
      }
      
      console.log(`[by-musician] Total assignments found: ${assignments.length}`);
      if (assignments.length === 0) {
        console.log(`[by-musician] No assignments found for planner ID: ${plannerId}, returning empty result`);
        // Return empty object with a specific message and dummy entry in the response
        return res.json({
          _status: "empty",
          _message: "No assignments found for this planner",
          // Add a dummy entry to ensure the client doesn't crash
          999: {
            musicianId: 999,
            musicianName: "No assignments available",
            assignments: [],
            totalFee: 0
          }
        });
      }
      
      // Group by musician ID with detailed logging
      const musicianMap: Record<number, any> = {};
      console.log("[by-musician] Grouping assignments by musician");
      
      for (const assignment of assignments) {
        try {
          // Ensure assignment is valid
          if (!assignment || !assignment.id) {
            console.warn(`[by-musician] Invalid assignment object, skipping`);
            continue;
          }
          
          // Ensure slot ID is valid
          if (!assignment.slotId || isNaN(assignment.slotId)) {
            console.warn(`[by-musician] Assignment ${assignment.id} has invalid slot ID: ${assignment.slotId}, skipping`);
            continue;
          }
          
          const slot = slots.find(s => s.id === assignment.slotId);
          if (!slot) {
            console.warn(`[by-musician] Slot not found for assignment ${assignment.id} with slot ID ${assignment.slotId}, skipping`);
            continue;
          }
          
          // Ensure musician ID is valid
          if (!assignment.musicianId || isNaN(assignment.musicianId)) {
            console.warn(`[by-musician] Assignment ${assignment.id} has invalid musician ID: ${assignment.musicianId}, skipping`);
            continue;
          }
          
          // Get musician data with error catching
          console.log(`[by-musician] Looking up musician ID: ${assignment.musicianId}`);
          const musician = await storage.getMusician(assignment.musicianId);
          
          if (!musician) {
            console.warn(`[by-musician] Musician not found for assignment ${assignment.id} with musician ID ${assignment.musicianId}, skipping`);
            continue;
          }
          
          console.log(`[by-musician] Processing assignment for musician: ${musician.name} (ID: ${musician.id}) at slot: ${slot.id} on ${slot.date}`);
          
          // Venue might be optional, but let's log if it's missing
          let venueName = 'Unknown Venue';
          try {
            if (slot.venueId) {
              const venue = await storage.getVenue(slot.venueId);
              if (venue) {
                venueName = venue.name;
              } else {
                console.warn(`[by-musician] Venue not found for slot ${slot.id} with venue ID ${slot.venueId}, using 'Unknown Venue'`);
              }
            }
          } catch (venueError) {
            console.error(`[by-musician] Error fetching venue: ${venueError}`);
          }
          
          if (!musicianMap[musician.id]) {
            musicianMap[musician.id] = {
              musicianId: musician.id,
              musicianName: musician.name,
              assignments: [],
              totalFee: 0
            };
          }
          
          // Calculate fee based on assignment details
          // Try actualFee first, then calculate based on musician rates
          let fee = assignment.actualFee;
          console.log(`[by-musician] Starting fee calculation for assignment ${assignment.id}: actualFee = ${fee || "not set"}`);
          
          if (!fee) {
            try {
              // Get musician pay rates
              const payRates = await storage.getMusicianPayRatesByMusicianId(musician.id);
              
              // Find rate for this event category (if available)
              const slotCategory = slot.categoryIds && slot.categoryIds.length > 0 ? slot.categoryIds[0] : null;
              const matchingRate = payRates.find(rate => rate.eventCategoryId === slotCategory);
              
              if (matchingRate) {
                // Calculate hours between start and end time
                const hours = 2; // Default to 2 hours if times not available
                fee = matchingRate.hourlyRate ? matchingRate.hourlyRate * hours : 150; // Default to $150 if no rate found
              } else {
                // Fallback to default rate
                fee = 150;
              }
            } catch (feeError) {
              console.error(`[by-musician] Error calculating fee: ${feeError}`);
              fee = 150; // Default fallback
            }
          }
          
          const assignmentDetails = {
            id: assignment.id,
            date: slot.date,
            venueName: venueName,
            venueId: slot.venueId,
            fee: fee,
            startTime: slot.startTime,
            endTime: slot.endTime,
            status: assignment.status
          };
          
          musicianMap[musician.id].assignments.push(assignmentDetails);
          musicianMap[musician.id].totalFee += assignmentDetails.fee || 0;
        } catch (assignmentError) {
          console.error(`[by-musician] Error processing assignment ${assignment.id}: ${assignmentError}`);
          // Continue to next assignment rather than failing the entire request
          // DO NOT return error response here - that would exit the entire endpoint
          continue;
        }
      }
      
      // Check if we have any musicians in the map
      if (Object.keys(musicianMap).length === 0) {
        console.log(`[by-musician] No valid musician assignments found after processing, returning empty result`);
        return res.json({
          _status: "empty",
          _message: "No valid musician assignments could be processed",
          // Add a dummy entry to ensure the client doesn't crash
          999: {
            musicianId: 999,
            musicianName: "No valid musicians available",
            assignments: [],
            totalFee: 0
          }
        });
      }
      
      console.log(`[by-musician] Successfully processed ${Object.keys(musicianMap).length} musicians with assignments`);
      res.json(musicianMap);
    } catch (error) {
      console.error(`[by-musician] ERROR PROCESSING REQUEST: ${error}`);
      console.error(`[by-musician] Error stack: ${(error as Error).stack}`);
      
      // Check if the error already has our "Invalid assignment ID" message or another known error
      const errorMessage = (error as Error).message;
      if (errorMessage.includes("Invalid assignment ID") || 
          errorMessage.includes("musicianId") ||
          errorMessage.includes("TypeError: undefined is not an object")) {
        console.error(`[by-musician] This appears to be a data integrity error with assignments: ${errorMessage}`);
        
        // Return a consistent response structure with dummy data to avoid client-side errors
        // The client expects a specific format with at least one musician entry
        console.log(`[by-musician] Handling gracefully by returning minimal valid structure`);
        return res.json({
          _status: "error",
          _message: "Error fetching assignments. The data shown may be incomplete.",
          _errorType: "AssignmentDataIntegrityError",
          _details: errorMessage,
          // Add a dummy entry to ensure the client doesn't crash on undefined access
          999: {
            musicianId: 999,
            musicianName: "Error loading assignments",
            assignments: [],
            totalFee: 0
          }
        });
      }
      
      // For all other errors, return a detailed error response as a regular JSON
      // object with a status code of 200 but internal _status of "error" to allow client-side handling
      console.log(`[by-musician] Returning structured error response for client-side handling`);
      
      // Previously, we might have returned a 400 status code here, causing the client
      // to receive a rejection instead of a valid response object.
      // Always return a 200 response with error details in the body for consistent handling.
      return res.json({
        _status: "error",
        _message: "Error fetching assignments. Please try again.",
        _errorType: "ServerError",
        _details: (error as Error).message,
        _stack: process.env.NODE_ENV === 'development' ? (error as Error).stack : undefined,
        // Add a dummy entry to ensure the client doesn't crash on undefined access
        999: {
          musicianId: 999,
          musicianName: "Error retrieving musician data",
          assignments: [],
          totalFee: 0
        }
      });
    }
  });
  
  // NEW SIMPLIFIED ENDPOINT: Fetch musician assignments with step-by-step validation
  apiRouter.get("/planner-musicians/:plannerId", isAuthenticated, async (req, res) => {
    try {
      console.log("\n\n======== STARTING PLANNER-MUSICIANS FETCH ========");
      
      // 1. Validate the planner ID parameter
      const plannerId = parseInt(req.params.plannerId);
      if (isNaN(plannerId) || plannerId <= 0) {
        console.error(`[planner-musicians] Invalid planner ID: ${req.params.plannerId}`);
        return res.status(200).json({ 
          success: false, 
          error: "Invalid planner ID",
          message: "The planner ID provided is not valid."
        });
      }
      
      // 2. Check if planner exists
      const planner = await storage.getMonthlyPlanner(plannerId);
      if (!planner) {
        console.error(`[planner-musicians] Planner not found: ${plannerId}`);
        return res.status(200).json({ 
          success: false, 
          error: "PlannerNotFound",
          message: "The monthly planner could not be found."
        });
      }
      
      // 3. Get all slots for the planner
      const slots = await storage.getPlannerSlots(plannerId);
      console.log(`[planner-musicians] Found ${slots.length} slots for planner ID: ${plannerId}`);
      
      if (!slots || slots.length === 0) {
        return res.status(200).json({
          success: false,
          error: "NoSlots",
          message: "No slots found for this planner."
        });
      }
      
      // 4. Process each slot to get assignments
      const slotIds = slots.map(slot => slot.id);
      
      // 5. Get musician data with careful validation at each step
      const musicians = {}; // Final result object to return
      const musiciansSeen = new Set(); // Track which musicians we've already seen
      
      for (const slotId of slotIds) {
        // Get slot details (will need for date, venue, etc.)
        const slot = slots.find(s => s.id === slotId);
        if (!slot) continue;
        
        try {
          // Get assignments for this slot
          const assignments = await storage.getPlannerAssignments(slotId);
          
          for (const assignment of assignments) {
            // Skip if no musician ID or invalid
            if (!assignment.musicianId || isNaN(assignment.musicianId)) continue;
            
            // If we've already processed this musician, just add this assignment
            if (musiciansSeen.has(assignment.musicianId)) {
              const musicianKey = assignment.musicianId.toString();
              
              // Get venue info
              let venueName = "Unknown Venue";
              if (slot.venueId) {
                try {
                  const venue = await storage.getVenue(slot.venueId);
                  if (venue) venueName = venue.name;
                } catch (err) {
                  console.error(`[planner-musicians] Error fetching venue ${slot.venueId}:`, err);
                }
              }
              
              // Calculate fee
              let fee = assignment.actualFee || 0;
              if (!fee) {
                try {
                  const rates = await storage.getMusicianPayRatesByMusicianId(assignment.musicianId);
                  const category = slot.categoryIds && slot.categoryIds.length > 0 ? slot.categoryIds[0] : null;
                  const matchingRate = rates.find(r => r.eventCategoryId === category);
                  
                  if (matchingRate && matchingRate.hourlyRate) {
                    // Default to 2 hours if not specified
                    const duration = 2; 
                    fee = matchingRate.hourlyRate * duration;
                  } else {
                    fee = 150; // Default fallback
                  }
                } catch (err) {
                  console.error(`[planner-musicians] Error calculating fee:`, err);
                  fee = 150; // Default fallback
                }
              }
              
              // Add this assignment to the musician's list
              musicians[musicianKey].assignments.push({
                id: assignment.id,
                date: slot.date,
                venueName: venueName,
                venueId: slot.venueId,
                fee: fee,
                startTime: slot.startTime,
                endTime: slot.endTime,
                status: assignment.status || "pending"
              });
              
              musicians[musicianKey].totalFee += fee;
              continue;
            }
            
            // First time seeing this musician - get their details
            try {
              const musician = await storage.getMusician(assignment.musicianId);
              if (!musician) continue; // Skip if musician not found
              
              // Get venue info
              let venueName = "Unknown Venue";
              if (slot.venueId) {
                try {
                  const venue = await storage.getVenue(slot.venueId);
                  if (venue) venueName = venue.name;
                } catch (err) {
                  console.error(`[planner-musicians] Error fetching venue ${slot.venueId}:`, err);
                }
              }
              
              // Calculate fee
              let fee = assignment.actualFee || 0;
              if (!fee) {
                try {
                  const rates = await storage.getMusicianPayRatesByMusicianId(assignment.musicianId);
                  const category = slot.categoryIds && slot.categoryIds.length > 0 ? slot.categoryIds[0] : null;
                  const matchingRate = rates.find(r => r.eventCategoryId === category);
                  
                  if (matchingRate && matchingRate.hourlyRate) {
                    // Default to 2 hours if not specified
                    const duration = 2; 
                    fee = matchingRate.hourlyRate * duration;
                  } else {
                    fee = 150; // Default fallback
                  }
                } catch (err) {
                  console.error(`[planner-musicians] Error calculating fee:`, err);
                  fee = 150; // Default fallback
                }
              }
              
              // Create new musician entry with first assignment
              const musicianKey = musician.id.toString();
              musicians[musicianKey] = {
                musicianId: musician.id,
                musicianName: musician.name,
                email: musician.email,
                phone: musician.phone,
                assignments: [{
                  id: assignment.id,
                  date: slot.date,
                  venueName: venueName,
                  venueId: slot.venueId,
                  fee: fee,
                  startTime: slot.startTime,
                  endTime: slot.endTime,
                  status: assignment.status || "pending"
                }],
                totalFee: fee
              };
              
              // Mark as seen
              musiciansSeen.add(musician.id);
            } catch (err) {
              console.error(`[planner-musicians] Error processing musician ${assignment.musicianId}:`, err);
              continue;
            }
          }
        } catch (err) {
          console.error(`[planner-musicians] Error processing slot ${slotId}:`, err);
          continue;
        }
      }
      
      // If no musicians found after all that processing, return error
      if (Object.keys(musicians).length === 0) {
        return res.status(200).json({
          success: false,
          error: "NoMusicians",
          message: "No musicians with assignments found for this planner."
        });
      }
      
      // Return successful response with musician data
      return res.status(200).json({
        success: true,
        planner: {
          id: planner.id,
          name: planner.name,
          month: planner.month,
          year: planner.year
        },
        musicians: musicians
      });
      
    } catch (error) {
      console.error("[planner-musicians] Unexpected error:", error);
      return res.status(200).json({
        success: false,
        error: "ServerError",
        message: "An unexpected error occurred while processing musician data."
      });
    }
  });

  // Finalize a planner and optionally send emails (previous implementation)
  apiRouter.post("/planners/:id/finalize", isAuthenticated, async (req, res) => {
    try {
      const plannerId = parseInt(req.params.id);
      const { sendEmails, emailMessage, contractTemplateId, emailTemplateId } = req.body;
      
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
        console.log(`Fetching slots for planner ID: ${plannerId} for email sending`);
        const slots = await storage.getPlannerSlots(plannerId);
        console.log(`Found ${slots.length} slots for planner ID: ${plannerId} for email sending`);
        
        if (slots && slots.length > 0) {
          // Get all assignments for these slots
          const slotIds = slots.map(slot => slot.id);
          console.log(`Getting assignments for ${slotIds.length} slots: ${slotIds.join(', ')} for email sending`);
          const assignments = [];
          
          for (const slotId of slotIds) {
            if (!slotId || isNaN(slotId)) {
              console.warn(`Invalid slot ID: ${slotId}, skipping in email sending`);
              continue;
            }
            
            const slotAssignments = await storage.getPlannerAssignments(slotId);
            console.log(`Found ${slotAssignments.length} assignments for slot ID: ${slotId} for email sending`);
            assignments.push(...slotAssignments);
          }
          
          console.log(`Total assignments found for email sending: ${assignments.length}`);
          if (assignments.length > 0) {
            // Group by musician ID
            const musicianMap: Record<number, any> = {};
            
            for (const assignment of assignments) {
              // Ensure slot ID is valid
              if (!assignment.slotId || isNaN(assignment.slotId)) {
                console.warn(`Assignment ${assignment.id} has invalid slot ID: ${assignment.slotId}, skipping in email sending`);
                continue;
              }
              
              const slot = slots.find(s => s.id === assignment.slotId);
              if (!slot) {
                console.warn(`Slot not found for assignment ${assignment.id} with slot ID ${assignment.slotId}, skipping in email sending`);
                continue;
              }
              
              // Ensure musician ID is valid
              if (!assignment.musicianId || isNaN(assignment.musicianId)) {
                console.warn(`Assignment ${assignment.id} has invalid musician ID: ${assignment.musicianId}, skipping in email sending`);
                continue;
              }
              
              const musician = await storage.getMusician(assignment.musicianId);
              if (!musician) {
                console.warn(`Musician not found for assignment ${assignment.id} with musician ID ${assignment.musicianId}, skipping in email sending`);
                continue;
              }
              
              console.log(`Processing email assignment for musician: ${musician.name} (ID: ${musician.id}, Email: ${musician.email || "No email"}) at slot: ${slot.id} on ${slot.date}`);
              
              // Venue might be optional, but let's log if it's missing
              const venue = await storage.getVenue(slot.venueId);
              if (!venue) {
                console.warn(`Venue not found for slot ${slot.id} with venue ID ${slot.venueId}, using 'Unknown Venue' in email sending`);
              }
              
              if (!musicianMap[musician.id]) {
                musicianMap[musician.id] = {
                  musicianId: musician.id,
                  musicianName: musician.name,
                  musicianEmail: musician.email,
                  assignments: [],
                  totalFee: 0
                };
              }
              
              // Calculate fee based on assignment details
              // Try actualFee first, then calculate based on musician rates
              let fee = assignment.actualFee;
              
              if (!fee) {
                // Get musician pay rates
                const payRates = await storage.getMusicianPayRatesByMusicianId(musician.id);
                
                // Find rate for this event category (if available)
                const slotCategory = slot.categoryIds && slot.categoryIds.length > 0 ? slot.categoryIds[0] : null;
                const matchingRate = payRates.find(rate => rate.eventCategoryId === slotCategory);
                
                if (matchingRate) {
                  // Calculate hours between start and end time
                  const hours = 2; // Default to 2 hours if times not available
                  fee = matchingRate.hourlyRate ? matchingRate.hourlyRate * hours : 150; // Default to $150 if no rate found
                } else {
                  // Fallback to default rate
                  fee = 150;
                }
              }
              
              const assignmentDetails = {
                id: assignment.id,
                date: format(new Date(slot.date), 'MMM d, yyyy'),
                venueName: venue ? venue.name : 'Unknown Venue',
                venueId: slot.venueId,
                fee: fee,
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
                emailMessage,
                emailTemplateId
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
          "May 2025",
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
      console.log("GET /musician-pay-rates - Query:", req.query);
      const musicianId = req.query.musicianId ? parseInt(req.query.musicianId as string) : undefined;
      console.log("Fetching musician pay rates, musicianId:", musicianId);
      
      // RETURN JSON DIRECTLY - Bypassing any storage abstraction for now
      console.log("USING DIRECT SQL QUERY TO RETRIEVE PAY RATES");
      
      // Set explicit headers to force JSON response
      res.setHeader('Content-Type', 'application/json');
      
      try {
        let query = `
          SELECT * FROM musician_pay_rates
        `;
        
        const params = [];
        if (musicianId) {
          query += ` WHERE musician_id = $1`;
          params.push(musicianId);
        }
        
        query += ` ORDER BY id LIMIT 100`;
        
        const result = await pool.query(query, params);
        console.log(`SQL query found ${result.rows.length} pay rates.`);
        
        if (result.rows.length > 0) {
          // Explicitly map the snake_case to camelCase for frontend use
          const formattedPayRates = result.rows.map(row => ({
            id: row.id,
            musicianId: row.musician_id,
            eventCategoryId: row.event_category_id,
            hourlyRate: row.hourly_rate,
            dayRate: row.day_rate,
            eventRate: row.event_rate,
            notes: row.notes
          }));
          
          console.log(`Returning ${formattedPayRates.length} formatted pay rates from direct query.`);
          // Send the formatted data as JSON
          return res.send(JSON.stringify(formattedPayRates));
        } else {
          console.log("No pay rates found in DB. Returning empty array.");
          return res.send("[]");
        }
      } catch (directDbError) {
        console.error("Error in direct SQL query:", directDbError);
        return res.status(500).send(JSON.stringify({ error: "Database error" }));
      }
    } catch (error) {
      console.error("Error in musician-pay-rates endpoint:", error);
      res.status(500).send(JSON.stringify({ message: "Error fetching musician pay rates" }));
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

  // Debug endpoint for musician pay rates (temporary)
  apiRouter.get("/debug-musician-pay-rates", async (req, res) => {
    try {
      const musicianId = req.query.musicianId ? parseInt(req.query.musicianId as string) : undefined;
      console.log("DEBUG endpoint - Checking pay rates for musician:", musicianId);
      
      // Direct SQL query to avoid any potential issues with the storage layer
      const result = await pool.query(`
        SELECT *
        FROM musician_pay_rates
        ${musicianId ? 'WHERE musician_id = $1' : ''}
        LIMIT 100
      `, musicianId ? [musicianId] : []);
      
      console.log(`DEBUG: Found ${result.rows.length} pay rates via direct SQL query.`);
      if (result.rows.length > 0) {
        console.log("DEBUG: First pay rate:", JSON.stringify(result.rows[0]));
      }
      
      // Return the raw data
      res.json({
        count: result.rows.length,
        data: result.rows
      });
    } catch (error) {
      console.error("DEBUG endpoint error:", error);
      res.status(500).json({ error: String(error) });
    }
  });
  
  // New direct endpoint without authentication for testing
  app.get("/direct-musician-rates", async (req, res) => {
    try {
      const musicianId = req.query.musicianId ? parseInt(req.query.musicianId as string) : undefined;
      console.log("DIRECT endpoint - Checking pay rates for musician:", musicianId);
      
      // Direct SQL query bypassing all middleware and authentication
      const result = await pool.query(`
        SELECT *
        FROM musician_pay_rates
        ${musicianId ? 'WHERE musician_id = $1' : ''}
        LIMIT 100
      `, musicianId ? [musicianId] : []);
      
      console.log(`DIRECT: Found ${result.rows.length} pay rates via direct SQL query for musician ${musicianId}.`);
      
      // Explicitly set response headers to ensure JSON
      res.setHeader('Content-Type', 'application/json');
      
      // Return the formatted rates
      if (result.rows.length > 0) {
        console.log("DIRECT: Sample rate:", JSON.stringify(result.rows[0]));
        const formattedRates = result.rows.map(row => ({
          id: row.id,
          musicianId: row.musician_id,
          eventCategoryId: row.event_category_id,
          hourlyRate: row.hourly_rate,
          dayRate: row.day_rate,
          eventRate: row.event_rate,
          notes: row.notes
        }));
        console.log("DIRECT: Returning", formattedRates.length, "formatted pay rates");
        return res.json(formattedRates);
      } else {
        console.log("DIRECT: No pay rates found.");
        return res.json([]);
      }
    } catch (error) {
      console.error("DIRECT endpoint error:", error);
      res.status(500).json({ error: String(error) });
    }
  });
  
  // Second direct endpoint that completely bypasses the Express router structure
  // and attaches directly to the Express app before any other middleware
  app.get("/api/direct/musician-pay-rates", async (req, res) => {
    try {
      const musicianId = req.query.musicianId ? parseInt(req.query.musicianId as string) : undefined;
      const t = req.query.t; // Cache-busting parameter
      
      console.log("DIRECT API musician-pay-rates - Request received:", {
        musicianId,
        timestamp: t,
        requestHeaders: {
          'accept': req.headers.accept,
          'content-type': req.headers['content-type']
        }
      });
      
      // Try direct database query bypassing middleware and authentication
      // First, ensure the table exists
      try {
        const tableCheckResult = await pool.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'musician_pay_rates'
          );
        `);
        
        const tableExists = tableCheckResult.rows[0].exists;
        if (!tableExists) {
          console.error("CRITICAL ERROR: musician_pay_rates table does not exist in database");
          res.setHeader('Content-Type', 'application/json');
          return res.status(500).send(JSON.stringify({ 
            error: "Database table 'musician_pay_rates' not found",
            message: "Critical database configuration error"
          }));
        }
      } catch (dbError) {
        console.error("Error checking for table existence:", dbError);
      }
      
      // Count rows in the table for diagnostics
      try {
        const countResult = await pool.query('SELECT COUNT(*) FROM musician_pay_rates');
        console.log(`Total musician_pay_rates in database: ${countResult.rows[0].count}`);
      } catch (countError) {
        console.error("Error counting pay rates:", countError);
      }
      
      // Perform the main query
      const result = await pool.query(`
        SELECT *
        FROM musician_pay_rates
        ${musicianId ? 'WHERE musician_id = $1' : ''}
        LIMIT 100
      `, musicianId ? [musicianId] : []);
      
      console.log(`DIRECT API: Found ${result.rows.length} pay rates ${musicianId ? `for musician ${musicianId}` : 'total'}`);
      
      // Explicitly set response headers to ensure JSON
      res.setHeader('Content-Type', 'application/json');
      
      // Log a sample of the data for debugging
      if (result.rows.length > 0) {
        console.log("Sample data (first row):", result.rows[0]);
      }
      
      // Return the formatted rates
      if (result.rows.length > 0) {
        const formattedRates = result.rows.map(row => ({
          id: row.id,
          musicianId: row.musician_id,
          eventCategoryId: row.event_category_id,
          hourlyRate: row.hourly_rate,
          dayRate: row.day_rate,
          eventRate: row.event_rate,
          notes: row.notes
        }));
        
        console.log("DIRECT API: Returning", formattedRates.length, "formatted pay rates");
        // Use res.json for proper JSON formatting with correct content-type headers
        return res.json(formattedRates);
      } else {
        console.log("DIRECT API: No pay rates found in the database");
        // Use res.json for proper JSON formatting
        return res.json([]);
      }
    } catch (error) {
      console.error("DIRECT API musician-pay-rates error:", error);
      
      // Always return proper JSON with error details
      res.setHeader('Content-Type', 'application/json');
      res.status(500).json({ 
        error: "Internal server error", 
        message: String(error),
        timestamp: new Date().toISOString()
      });
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
      
      // If an event ID is specified, use the specialized endpoint logic
      if (eventId && !isNaN(eventId)) {
        console.log(`Using specialized event contracts logic for event ${eventId}`);
        
        // First get the event to check musician assignments
        const event = await storage.getEvent(eventId);
        if (!event || !event.musicianAssignments) {
          return res.status(404).json({ message: "Event not found or has no musician assignments" });
        }
        
        // Extract all musician IDs assigned to this event across all dates
        const assignedMusicianIds = new Set<number>();
        Object.values(event.musicianAssignments).forEach(musicianIds => {
          if (Array.isArray(musicianIds)) {
            musicianIds.forEach(id => assignedMusicianIds.add(id));
          }
        });
        
        // Get all contracts for this event
        const allContracts = await storage.getContractLinksByEvent(eventId);
        console.log(`Found ${allContracts.length} total contracts for event ${eventId}`);
        
        // Filter contracts to only include assigned musicians
        const filteredContracts = allContracts.filter(contract => 
          assignedMusicianIds.has(contract.musicianId)
        );
        
        // Apply additional status filter if provided
        const statusFilteredContracts = status 
          ? filteredContracts.filter(c => c.status === status)
          : filteredContracts;
        
        console.log(`Event ${eventId} has ${assignedMusicianIds.size} assigned musicians: ${[...assignedMusicianIds]}`);
        console.log(`Found ${allContracts.length} contracts, filtered to ${filteredContracts.length}, after status filter: ${statusFilteredContracts.length}`);
        
        // Update contracts with latest status from events
        const updatedContracts = await updateContractsWithEventStatus(statusFilteredContracts);
        return res.json(updatedContracts);
      }
      
      // Regular contracts endpoint logic (for non-event-specific requests)
      // Build filters object for more flexible filtering
      const filters: { eventId?: number; musicianId?: number; status?: string | string[] } = {};
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
      console.log(`Found ${contracts.length} contracts with filters:`, filters);
      
      // Additional validation to only show contracts for musicians actually assigned to events
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
      console.log(`After validation, ${contracts.length} contracts remain`);
      
      // Update contracts with latest status from events
      const updatedContracts = await updateContractsWithEventStatus(contracts);
      res.json(updatedContracts);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error fetching contracts" });
    }
  });
  
  // Helper function to update contract statuses from event data
  async function updateContractsWithEventStatus(contracts: any[]) {
    return Promise.all(contracts.map(async (contract) => {
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
  }

  apiRouter.get("/contracts/:id", isAuthenticated, async (req, res) => {
    try {
      const contractId = parseInt(req.params.id);
      const contract = await storage.getContractLink(contractId);
      if (!contract) {
        return res.status(404).json({ message: "Contract not found" });
      }
      
      // Get signature metadata from the status system if available
      let signatureMetadata = {};
      try {
        const { statusService, ENTITY_TYPES } = await import('./services/status');
        const statusEntries = await statusService.getEntityStatuses(
          ENTITY_TYPES.CONTRACT,
          contractId
        );
        
        // Find signature metadata if contract has been signed
        const signatureEntry = statusEntries.find(entry => 
          entry.status === 'contract-signed' && 
          entry.metadata && 
          entry.metadata.signatureValue
        );
        
        if (signatureEntry && signatureEntry.metadata) {
          signatureMetadata = {
            signedAt: signatureEntry.metadata.signedAt,
            signedBy: signatureEntry.metadata.signedBy,
            signatureValue: signatureEntry.metadata.signatureValue,
            signatureType: signatureEntry.metadata.signatureType,
            ipAddress: signatureEntry.metadata.ipAddress
          };
        }
      } catch (e) {
        console.error("Error retrieving signature metadata:", e);
      }
      
      // Return contract with enhanced metadata
      res.json({
        ...contract,
        signatureMetadata: Object.keys(signatureMetadata).length > 0 ? signatureMetadata : null
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error fetching contract" });
    }
  });

  apiRouter.get("/contracts/event/:eventId", isAuthenticated, async (req, res) => {
    try {
      const eventId = parseInt(req.params.eventId);
      
      // First get the event to check musician assignments
      const event = await storage.getEvent(eventId);
      console.log(`Loading contracts for event ${eventId}, event data:`, event ? 'found' : 'not found');
      
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      // Get all contracts for this event first
      const allContracts = await storage.getContractLinksByEvent(eventId);
      console.log(`Found ${allContracts.length} contracts for event ${eventId}`);
      
      // Even if event has no assignments, we'll return any contracts that exist
      if (!event.musicianAssignments || Object.keys(event.musicianAssignments).length === 0) {
        console.log(`Event ${eventId} has no musician assignments, returning all contracts`);
        return res.json(allContracts);
      }
      
      // Extract all musician IDs assigned to this event across all dates
      const assignedMusicianIds = new Set<number>();
      Object.entries(event.musicianAssignments).forEach(([dateStr, musicianIds]) => {
        if (Array.isArray(musicianIds)) {
          console.log(`Date ${dateStr} has musicians:`, musicianIds);
          musicianIds.forEach(id => assignedMusicianIds.add(id));
        }
      });
      
      // If we couldn't find any assigned musicians but have contracts, return all contracts
      if (assignedMusicianIds.size === 0 && allContracts.length > 0) {
        console.log(`Event ${eventId} has no assigned musicians but has contracts, returning all contracts`);
        return res.json(allContracts);
      }
      
      // Filter contracts to only include assigned musicians if we have assignments
      const filteredContracts = assignedMusicianIds.size > 0 
        ? allContracts.filter(contract => assignedMusicianIds.has(contract.musicianId))
        : allContracts;
      
      // For logging/debugging
      console.log(`Event ${eventId} has ${assignedMusicianIds.size} assigned musicians:`, [...assignedMusicianIds]);
      console.log(`Found ${allContracts.length} contracts, filtered to ${filteredContracts.length}`);
      
      res.json(filteredContracts);
    } catch (error) {
      console.error(`Error fetching contracts for event ${req.params.eventId}:`, error);
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
      console.log(`Contract cancellation request received for ID: ${req.params.id}`);
      const contractId = parseInt(req.params.id);
      
      if (isNaN(contractId)) {
        return res.status(400).json({ message: "Invalid contract ID format" });
      }
      
      const contract = await storage.getContractLink(contractId);
      console.log(`Contract found:`, contract ? "yes" : "no");
      
      if (!contract) {
        return res.status(404).json({ message: "Contract not found" });
      }
      
      // Import the status service
      const { statusService, ENTITY_TYPES } = await import('./services/status');
      
      console.log(`Using status service to cancel contract ${contractId}`);
      
      try {
        // Use centralized status service to manage the cancellation
        const userId = (req.user as any)?.id || 0;
        const reason = req.body.reason || 'User initiated cancellation';
        // Ensure we get the event date - critical for date-specific statuses
        const eventDate = req.body.eventDate ? new Date(req.body.eventDate) : null;
        
        // Log detailed information about the request
        console.log(`Cancel contract request details:`, { 
          contractId, 
          userId, 
          reason, 
          eventDate,
          receivedEventDate: req.body.eventDate,
          eventId: req.body.eventId || contract.eventId,
          musicianId: req.body.musicianId || contract.musicianId
        });
        
        // Get event and musician details for the notifications and status metadata
        const event = await storage.getEvent(contract.eventId);
        const musician = await storage.getMusician(contract.musicianId);
        
        // Update contract status
        await statusService.updateEntityStatus(
          ENTITY_TYPES.CONTRACT,
          contractId,
          'cancelled',
          userId,
          reason,
          contract.eventId,
          {
            cancelledBy: userId,
            cancelledAt: new Date().toISOString(),
            bookingId: contract.bookingId,
            eventName: event?.name || 'Event',
            musicianName: musician?.name || 'Musician'
          },
          'user-cancelled', // Add custom status
          contract.musicianId, // Add musician ID
          eventDate // Add event date if provided
        );
        
        // Also update musician status (synchronization)
        await statusService.updateEntityStatus(
          ENTITY_TYPES.MUSICIAN,
          contract.musicianId,
          'contract-cancelled',
          userId,
          `Contract cancelled for event: ${event?.name}. Reason: ${reason}`,
          contract.eventId,
          {
            contractId: contract.id,
            eventName: event?.name || 'Event',
            contractAmount: contract.amount,
            cancelledBy: userId,
            cancelledAt: new Date().toISOString()
          },
          'unavailable', // Custom status for musician
          null, // MusicianId is already specified as entityId
          eventDate // Pass the event date
        );
      } catch (error) {
        console.error("Failed to cancel contract:", error);
        return res.status(400).json({
          message: "Failed to cancel contract",
          error: error instanceof Error ? error.message : String(error)
        });
      }
      
      // Update the contract status directly as a backup/legacy support
      // This can be removed once all systems fully use the status service
      let updatedContract;
      try {
        updatedContract = await storage.updateContractLink(contractId, {
          status: 'cancelled'
          // Removed updatedAt as it's not in the schema and causing errors
        });
        console.log(`Contract record also updated directly for ID: ${contractId}`);
        
        // Also update the musician's status in the event - for backward compatibility
        if (contract.eventId && contract.musicianId) {
          try {
            // First try to use the provided event date from request
            let effectiveEventDate = req.body.eventDate ? new Date(req.body.eventDate) : null;
            
            // If no event date was provided in the request, try to use the contract's event date
            if (!effectiveEventDate && contract.eventDate) {
              console.log(`No eventDate in request, using contract.eventDate: ${contract.eventDate}`);
              effectiveEventDate = new Date(contract.eventDate);
            }
            
            if (effectiveEventDate) {
              const eventDateStr = effectiveEventDate.toISOString();
              await storage.updateMusicianEventStatusForDate(
                contract.eventId,
                contract.musicianId,
                "unavailable",
                eventDateStr
              );
              console.log(`Updated musician ${contract.musicianId} status for event ${contract.eventId} date ${eventDateStr} to 'unavailable'`);
            } else {
              // If we still don't have a date, update general status
              console.log(`No event date available for contract ${contractId}, updating general musician status`);
              await storage.updateMusicianEventStatus(
                contract.eventId,
                contract.musicianId,
                "unavailable"
              );
              console.log(`Updated musician ${contract.musicianId} general status for event ${contract.eventId} to 'unavailable'`);
            }
          } catch (dateError) {
            console.error(`Error updating musician status with date:`, dateError);
            // Try the non-date specific update as fallback
            try {
              await storage.updateMusicianEventStatus(
                contract.eventId,
                contract.musicianId,
                "unavailable"
              );
              console.log(`Fallback: Updated musician ${contract.musicianId} general status for event ${contract.eventId} to 'unavailable'`);
            } catch (fallbackError) {
              console.error(`Even fallback musician status update failed:`, fallbackError);
            }
          }
        }
      } catch (updateError) {
        console.error(`Warning: Direct contract update failed, but status service succeeded:`, updateError);
        // We'll continue as the status service handled the main update
      }
      
      console.log(`Contract cancellation completed successfully for ID: ${contractId}`);
      res.json({ 
        message: "Contract cancelled successfully", 
        contract: updatedContract || contract
      });
    } catch (error) {
      console.error("Contract cancellation error:", error);
      // Return more detailed error information for debugging
      res.status(500).json({ 
        message: "Error cancelling contract",
        details: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
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
      
      // Generate and store the contract content immediately
      try {
        await generateAndStoreContractContent(contract.id);
        console.log(`Stored rendered contract content for contract ID ${contract.id}`);
      } catch (e) {
        console.error(`Failed to store contract content for contract ID ${contract.id}:`, e);
      }
      
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
            paymentStatus: 'confirmed'
          });
          
          // Update the musician's status in the event to "contract-signed" ONLY for the specific date
          if (contract.eventId && contract.musicianId && contract.eventDate) {
            // Use the specific date from the contract
            const eventDateStr = contract.eventDate.toISOString();
            
            // Legacy status update for backward compatibility
            await storage.updateMusicianEventStatusForDate(
              contract.eventId, 
              contract.musicianId,
              "contract-signed",
              eventDateStr
            );
            
            try {
              // Import the status service
              const { statusService, ENTITY_TYPES } = await import('./services/status');
              
              // Update contract status with the centralized status service
              await statusService.updateEntityStatus(
                ENTITY_TYPES.CONTRACT,
                contract.id,
                'contract-signed',
                0, // No specific user ID for public actions
                `Contract signed by ${musician?.name}`,
                contract.eventId,
                {
                  signedAt: new Date().toISOString(),
                  signedBy: musician?.name || 'Musician',
                  signatureValue: signature, // Store the actual signature text entered by the musician
                  signatureType: 'digital',
                  ipAddress: req.ip || 'unknown',
                  bookingId: contract.bookingId
                },
                'musician-signed', // Add custom status
                contract.musicianId,
                contract.eventDate
              );
              
              // Also update musician status
              await statusService.updateEntityStatus(
                ENTITY_TYPES.MUSICIAN,
                contract.musicianId,
                'contract-signed',
                0, // No specific user ID for public actions
                `Contract signed for event: ${event?.name}`,
                contract.eventId,
                {
                  contractId: contract.id,
                  eventName: event?.name || 'Event',
                  contractAmount: contract.amount
                },
                null, // No custom status
                null, // MusicianId is already specified as entityId
                contract.eventDate
              );
              
            } catch (statusError) {
              console.error("Warning: Failed to update status via status service", statusError);
              // Continue with the legacy approach, don't fail the request
            }
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
            paymentStatus: 'confirmed',
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
            
            // Legacy status update for backward compatibility
            await storage.updateMusicianEventStatusForDate(
              contract.eventId, 
              contract.musicianId,
              "contract-signed",
              eventDateStr
            );
            
            try {
              // Import the status service
              const { statusService, ENTITY_TYPES } = await import('./services/status');
              
              // Update contract status with the centralized status service
              await statusService.updateEntityStatus(
                ENTITY_TYPES.CONTRACT,
                contract.id,
                'contract-signed',
                0, // No specific user ID for public actions
                `Contract signed by ${musician?.name}`,
                contract.eventId,
                {
                  signedAt: new Date().toISOString(),
                  signedBy: musician?.name || 'Musician',
                  signatureValue: signature, // Store the actual signature text entered by the musician
                  signatureType: 'digital',
                  ipAddress: req.ip || 'unknown',
                  bookingId: booking.id
                },
                'musician-signed', // Add custom status
                contract.musicianId,
                contract.eventDate
              );
              
              // Also update musician status
              await statusService.updateEntityStatus(
                ENTITY_TYPES.MUSICIAN,
                contract.musicianId,
                'contract-signed',
                0, // No specific user ID for public actions
                `Contract signed for event: ${event?.name}`,
                contract.eventId,
                {
                  contractId: contract.id,
                  eventName: event?.name || 'Event',
                  contractAmount: contract.amount
                },
                null, // No custom status
                null, // MusicianId is already specified as entityId
                contract.eventDate
              );
              
            } catch (statusError) {
              console.error("Warning: Failed to update status via status service", statusError);
              // Continue with the legacy approach, don't fail the request
            }
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
            paymentStatus: 'cancelled',
            contractSigned: false,
            notes: response || 'Contract declined'
          });
        }
        
        // Update the musician's status in the event to "unavailable" for the specific date
        if (contract.eventId && contract.musicianId) {
          try {
            // If we have a specific event date, use it
            if (contract.eventDate) {
              const eventDateStr = contract.eventDate.toISOString();
              
              // Legacy status update for backward compatibility
              await storage.updateMusicianEventStatusForDate(
                contract.eventId, 
                contract.musicianId,
                "unavailable",
                eventDateStr
              );
              
              console.log(`Updated musician ${contract.musicianId} status for event ${contract.eventId} date ${eventDateStr} to 'unavailable' due to rejected contract`);
            } else {
              // If no specific date, update general status
              await storage.updateMusicianEventStatus(
                contract.eventId,
                contract.musicianId,
                "unavailable"
              );
              
              console.log(`Updated musician ${contract.musicianId} general status for event ${contract.eventId} to 'unavailable' due to rejected contract`);
            }
            
            // Update statuses in the centralized system
            try {
              // Import the status service
              const { statusService, ENTITY_TYPES } = await import('./services/status');
              
              // Update contract status with the centralized status service
              await statusService.updateEntityStatus(
                ENTITY_TYPES.CONTRACT,
                contract.id,
                'rejected',
                0, // No specific user ID for public actions
                `Contract rejected by ${musician?.name}: ${response || 'No reason provided'}`,
                contract.eventId,
                {
                  rejectedAt: new Date().toISOString(),
                  rejectedBy: musician?.name || 'Musician',
                  rejectionReason: response || 'No reason provided'
                },
                'musician-rejected', // Add custom status
                contract.musicianId,
                contract.eventDate
              );
              
              // Also update musician status
              await statusService.updateEntityStatus(
                ENTITY_TYPES.MUSICIAN,
                contract.musicianId,
                'unavailable',
                0, // No specific user ID for public actions
                `Contract rejected for event: ${event?.name}`,
                contract.eventId,
                {
                  contractId: contract.id,
                  eventName: event?.name || 'Event',
                  rejectionReason: response || 'No reason provided'
                },
                'contract-rejected', // Custom status for musician
                null, // MusicianId is already specified as entityId
                contract.eventDate
              );
              
              console.log(`Updated status in centralized system for rejected contract ${contract.id}`);
            } catch (statusError) {
              console.error("Warning: Failed to update status via status service", statusError);
              // Continue with the legacy approach, don't fail the request
            }
          } catch (statusUpdateError) {
            console.error("Error updating musician status after contract rejection:", statusUpdateError);
            // Don't fail the request if this part fails
          }
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

  // Helper function to render contract content from template
  async function renderContractContent(contractId: number): Promise<string> {
    try {
      // Get the contract data
      const contract = await storage.getContractLink(contractId);
      if (!contract) {
        throw new Error("Contract not found");
      }
      
      // Get event and musician data
      const event = await storage.getEvent(contract.eventId);
      const musician = await storage.getMusician(contract.musicianId);
      
      if (!event || !musician) {
        throw new Error("Event or musician data not found");
      }
      
      // Get the default template from settings
      const template = await storage.getDefaultContractTemplate();
      
      if (!template) {
        throw new Error("No default contract template found");
      }
      
      console.log(`Using template: ${template.name} (ID: ${template.id})`);
      
      // If we're here, we have a template to use
      
      // Replace template variables with actual data
      let content = template.content;
      
      // Basic variables
      const replacements: Record<string, string> = {
        '{{contract_id}}': contract.id.toString(),
        '{{contract_date}}': new Date(contract.createdAt).toLocaleDateString(),
        '{{musician_name}}': musician.name,
        '{{event_name}}': event.name,
        '{{event_date}}': contract.eventDate ? new Date(contract.eventDate).toLocaleDateString() : 'TBD',
        '{{venue_name}}': event.venueId ? 'Venue #' + event.venueId : 'TBD',
        '{{start_time}}': event.startTime || 'TBD',
        '{{end_time}}': event.endTime || 'TBD',
        '{{amount}}': contract.amount ? contract.amount.toString() : 'TBD',
        '{{company_signature}}': contract.companySignature || 'VAMP Management',
        '{{company_signed_date}}': contract.companySignedAt ? new Date(contract.companySignedAt).toLocaleDateString() : new Date().toLocaleDateString(),
        '{{musician_signature}}': contract.musicianSignature || '',
        '{{signed_date}}': contract.signedAt ? new Date(contract.signedAt).toLocaleDateString() : ''
      };
      
      // Replace all variables in the template
      Object.entries(replacements).forEach(([key, value]) => {
        content = content.replace(new RegExp(key, 'g'), value);
      });
      
      return content;
    } catch (error) {
      console.error("Error rendering contract:", error);
      return "Error rendering contract content. Please contact support.";
    }
  }
  
  /**
   * Generates, renders and stores the contract content at creation time.
   * This ensures that the content viewed by the musician matches
   * exactly what is shown in the admin interface.
   */
  async function generateAndStoreContractContent(contractId: number): Promise<void> {
    try {
      // Get the contract to retrieve its event ID
      const contract = await storage.getContractLink(contractId);
      if (!contract) {
        throw new Error(`Contract #${contractId} not found`);
      }
      
      // Render the content
      const renderedContent = await renderContractContent(contractId);
      
      // Store the rendered content in the centralized status system
      const { statusService, ENTITY_TYPES } = await import('./services/status');
      
      // Update contract content in the centralized system
      await statusService.updateEntityStatus(
        ENTITY_TYPES.CONTRACT,
        contractId,
        'contract-sent', // Use the same status, we'll just update metadata
        0, // No specific user ID for automated actions
        `Contract content generated and stored`,
        contract.eventId, // Pass the eventId from the contract
        {
          renderedContent: renderedContent,
          generatedAt: new Date().toISOString(),
          templateVersion: 1, // Could track template versions in the future
        },
        true // Keep existing status, just update metadata
      );
      
      console.log(`Contract content for contract ID ${contractId} has been generated and stored`);
    } catch (error) {
      console.error("Error generating and storing contract content:", error);
    }
  }
  
  // Endpoint to get rendered contract content
  apiRouter.get("/contracts/:id/content", isAuthenticated, async (req, res) => {
    try {
      const contractId = parseInt(req.params.id);
      
      // Try to get stored content first from status system
      let content = null;
      try {
        const { statusService, ENTITY_TYPES } = await import('./services/status');
        const statusEntries = await statusService.getEntityStatuses(
          ENTITY_TYPES.CONTRACT,
          contractId
        );
        
        // Find the latest status entry with rendered content
        const contentEntry = statusEntries.find(entry => 
          entry.metadata && entry.metadata.renderedContent
        );
        
        if (contentEntry && contentEntry.metadata && contentEntry.metadata.renderedContent) {
          content = contentEntry.metadata.renderedContent;
          console.log(`Using stored contract content for contract ID ${contractId}`);
        }
      } catch (e) {
        console.error("Error retrieving stored contract content:", e);
      }
      
      // If no stored content found, generate it on the fly and store it for next time
      if (!content) {
        content = await renderContractContent(contractId);
        console.log(`Generated fresh contract content for contract ID ${contractId}`);
        
        // Store the generated content for future use
        try {
          await generateAndStoreContractContent(contractId);
        } catch (e) {
          console.error(`Failed to store content for contract ${contractId}:`, e);
        }
      }
      
      res.json({ content });
    } catch (error) {
      console.error("Error getting contract content:", error);
      res.status(500).json({ message: "Error rendering contract content" });
    }
  });
  
  // Public endpoint to get rendered contract content by token
  apiRouter.get("/contracts/token/:token/content", async (req, res) => {
    try {
      const contract = await storage.getContractLinkByToken(req.params.token);
      if (!contract) {
        return res.status(404).json({ message: "Contract not found or expired" });
      }
      
      // Try to get stored content first from status system
      let content = null;
      try {
        const { statusService, ENTITY_TYPES } = await import('./services/status');
        const statusEntries = await statusService.getEntityStatuses(
          ENTITY_TYPES.CONTRACT,
          contract.id
        );
        
        // Find the latest status entry with rendered content
        const contentEntry = statusEntries.find(entry => 
          entry.metadata && entry.metadata.renderedContent
        );
        
        if (contentEntry && contentEntry.metadata && contentEntry.metadata.renderedContent) {
          content = contentEntry.metadata.renderedContent;
          console.log(`Using stored contract content for token ${req.params.token}`);
        }
      } catch (e) {
        console.error("Error retrieving stored contract content:", e);
      }
      
      // If no stored content found, generate it on the fly
      if (!content) {
        content = await renderContractContent(contract.id);
        console.log(`Generated fresh contract content for token ${req.params.token}`);
        
        // Since we're generating it now, let's store it for future use
        try {
          await generateAndStoreContractContent(contract.id);
        } catch (e) {
          console.error("Failed to store generated content:", e);
        }
      }
      
      res.json({ content });
    } catch (error) {
      console.error("Error getting contract content by token:", error);
      res.status(500).json({ message: "Error rendering contract content" });
    }
  });
  
  // Public endpoint to get rendered contract content by token with signature metadata
  apiRouter.get("/contracts/token/:token/details", async (req, res) => {
    try {
      const contract = await storage.getContractLinkByToken(req.params.token);
      if (!contract) {
        return res.status(404).json({ message: "Contract not found or expired" });
      }
      
      // Try to get stored content and signature metadata from status system
      let content = null;
      let signatureMetadata = {};
      
      try {
        const { statusService, ENTITY_TYPES } = await import('./services/status');
        const statusEntries = await statusService.getEntityStatuses(
          ENTITY_TYPES.CONTRACT,
          contract.id
        );
        
        // Find the latest status entry with rendered content
        const contentEntry = statusEntries.find(entry => 
          entry.metadata && entry.metadata.renderedContent
        );
        
        if (contentEntry && contentEntry.metadata && contentEntry.metadata.renderedContent) {
          content = contentEntry.metadata.renderedContent;
        }
        
        // Find signature metadata if contract has been signed
        const signatureEntry = statusEntries.find(entry => 
          entry.status === 'contract-signed' && 
          entry.metadata && 
          entry.metadata.signatureValue
        );
        
        if (signatureEntry && signatureEntry.metadata) {
          signatureMetadata = {
            signedAt: signatureEntry.metadata.signedAt,
            signedBy: signatureEntry.metadata.signedBy,
            signatureValue: signatureEntry.metadata.signatureValue,
            signatureType: signatureEntry.metadata.signatureType,
            ipAddress: signatureEntry.metadata.ipAddress
          };
        }
      } catch (e) {
        console.error("Error retrieving contract details:", e);
      }
      
      // If no stored content found, generate it on the fly
      if (!content) {
        content = await renderContractContent(contract.id);
        
        // Since we're generating it now, let's store it for future use
        try {
          await generateAndStoreContractContent(contract.id);
        } catch (e) {
          console.error("Failed to store generated content:", e);
        }
      }
      
      // Get event and musician data
      const event = await storage.getEvent(contract.eventId);
      const musician = await storage.getMusician(contract.musicianId);
      
      res.json({ 
        content,
        contract: {
          id: contract.id,
          status: contract.status,
          token: contract.token,
          eventId: contract.eventId,
          musicianId: contract.musicianId,
          eventDate: contract.eventDate,
          amount: contract.amount,
          createdAt: contract.createdAt,
          companySignature: contract.companySignature,
          companySignedAt: contract.companySignedAt,
          musicianSignature: contract.musicianSignature,
          signedAt: contract.signedAt
        },
        event: event ? {
          id: event.id,
          name: event.name,
          date: contract.eventDate || event.startDate,
          venue: event.venueId || null,
          status: event.status
        } : null,
        musician: musician ? {
          id: musician.id,
          name: musician.name,
          email: musician.email
        } : null,
        signatureMetadata
      });
    } catch (error) {
      console.error("Error getting contract details by token:", error);
      res.status(500).json({ message: "Error retrieving contract details" });
    }
  });
  
  // Test endpoint for contract metadata
  apiRouter.get("/test/contract-metadata/:id", isAuthenticated, async (req, res) => {
    try {
      const contractId = parseInt(req.params.id);
      
      // Get contract data from the database
      const contract = await storage.getContractLink(contractId);
      if (!contract) {
        return res.status(404).json({ message: "Contract not found" });
      }
      
      // Get status data from the status service
      const { statusService, ENTITY_TYPES } = await import('./services/status');
      const statusEntries = await statusService.getEntityStatuses(
        ENTITY_TYPES.CONTRACT,
        contractId
      );
      
      // Try to get stored content first from status system
      let storedContent = null;
      let signatureMetadata = {};
      
      // Find the latest status entry with rendered content
      const contentEntry = statusEntries.find(entry => 
        entry.metadata && entry.metadata.renderedContent
      );
      
      if (contentEntry && contentEntry.metadata && contentEntry.metadata.renderedContent) {
        storedContent = contentEntry.metadata.renderedContent;
      }
      
      // Find signature metadata if contract has been signed
      const signatureEntry = statusEntries.find(entry => 
        entry.status === 'contract-signed' && 
        entry.metadata && 
        entry.metadata.signatureValue
      );
      
      if (signatureEntry && signatureEntry.metadata) {
        signatureMetadata = {
          signedAt: signatureEntry.metadata.signedAt,
          signedBy: signatureEntry.metadata.signedBy,
          signatureValue: signatureEntry.metadata.signatureValue,
          signatureType: signatureEntry.metadata.signatureType,
          ipAddress: signatureEntry.metadata.ipAddress
        };
      }
      
      // Get freshly rendered content
      const renderedContent = await renderContractContent(contractId);
      
      // Return both data sources for comparison
      res.json({
        contract,
        statusEntries,
        storedContent,
        renderedContent,
        signatureMetadata,
        storageStatus: storedContent ? "Content is stored in status system" : "No stored content found",
        signatureStatus: Object.keys(signatureMetadata).length > 0 ? 
          "Signature metadata found in status system" : 
          "No signature metadata found",
        contentMatch: storedContent === renderedContent ? 
          "Stored and rendered content match exactly" : 
          "Stored and rendered content are different",
        message: "Use this data to debug signature and IP address display issues"
      });
    } catch (error) {
      console.error("Error testing contract metadata:", error);
      res.status(500).json({ message: "Error testing contract metadata" });
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
  
  // Monthly Contract routes
  apiRouter.get("/monthly-contracts", isAuthenticated, async (req, res) => {
    try {
      const plannerId = req.query.plannerId ? parseInt(req.query.plannerId as string) : undefined;
      
      let contracts;
      if (plannerId) {
        contracts = await storage.getMonthlyContractsByPlanner(plannerId);
      } else {
        contracts = await storage.getMonthlyContracts();
      }
      
      res.json(contracts);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error fetching monthly contracts" });
    }
  });
  
  apiRouter.get("/monthly-contracts/:id", isAuthenticated, async (req, res) => {
    try {
      const contract = await storage.getMonthlyContract(parseInt(req.params.id));
      if (!contract) {
        return res.status(404).json({ message: "Monthly contract not found" });
      }
      
      // Get the musicians associated with this contract
      const contractMusicians = await storage.getMonthlyContractMusicians(contract.id);
      
      // For each musician, get their dates
      const enrichedMusicians = await Promise.all(
        contractMusicians.map(async (cm) => {
          const musician = await storage.getMusician(cm.musicianId);
          const dates = await storage.getMonthlyContractDates(cm.id);
          
          return {
            ...cm,
            musician,
            dates
          };
        })
      );
      
      // Return the full contract with musicians and dates
      res.json({
        ...contract,
        musicians: enrichedMusicians
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error fetching monthly contract" });
    }
  });
  
  apiRouter.post("/monthly-contracts", isAuthenticated, async (req, res) => {
    try {
      console.log("Request body for monthly contract:", req.body);
      const contractData = insertMonthlyContractSchema.parse(req.body);
      console.log("Parsed contract data:", contractData);
      const contract = await storage.createMonthlyContract(contractData);
      
      res.status(201).json(contract);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid contract data", errors: error.errors });
      }
      console.error("Monthly contract creation error:", error);
      res.status(500).json({ message: "Error creating monthly contract" });
    }
  });
  
  apiRouter.put("/monthly-contracts/:id", isAuthenticated, async (req, res) => {
    try {
      const contractData = insertMonthlyContractSchema.partial().parse(req.body);
      const contract = await storage.updateMonthlyContract(parseInt(req.params.id), contractData);
      
      if (!contract) {
        return res.status(404).json({ message: "Monthly contract not found" });
      }
      
      res.json(contract);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid contract data", errors: error.errors });
      }
      console.error(error);
      res.status(500).json({ message: "Error updating monthly contract" });
    }
  });
  
  apiRouter.delete("/monthly-contracts/:id", isAuthenticated, async (req, res) => {
    try {
      const result = await storage.deleteMonthlyContract(parseInt(req.params.id));
      if (!result) {
        return res.status(404).json({ message: "Monthly contract not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error deleting monthly contract" });
    }
  });
  
  // Monthly Contract Musicians routes
  
  // Get monthly contract musician by ID
  apiRouter.get("/monthly-contracts/musician/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID" });
      }
      
      // Get the monthly contract musician by ID (not by musician ID)
      const musicianContract = await storage.getMonthlyContractMusician(id);
      if (!musicianContract) {
        return res.status(404).json({ message: "Musician contract not found" });
      }
      
      // Enrich with musician details
      const musician = await storage.getMusician(musicianContract.musicianId);
      const data = {
        ...musicianContract,
        musicianName: musician ? musician.name : "Unknown Musician"
      };
      
      return res.json(data);
    } catch (error) {
      console.error("Error getting musician contract:", error);
      return res.status(500).json({ message: "Server error" });
    }
  });
  
  // Resend contract to musician
  apiRouter.post("/monthly-contracts/musician/:id/resend", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID" });
      }
      
      const musicianContract = await storage.getMonthlyContractMusician(id);
      if (!musicianContract) {
        return res.status(404).json({ message: "Musician contract not found" });
      }
      
      // Update the contract status and sent date
      const updatedContract = await storage.updateMonthlyContractMusician(id, {
        status: "sent",
        sentAt: new Date()
      });
      
      // In a real system, we would send an email here
      
      return res.json({ success: true, message: "Contract resent successfully" });
    } catch (error) {
      console.error("Error resending musician contract:", error);
      return res.status(500).json({ message: "Server error" });
    }
  });
  
  // Reject contract
  apiRouter.post("/monthly-contracts/musician/:id/reject", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID" });
      }
      
      const musicianContract = await storage.getMonthlyContractMusician(id);
      if (!musicianContract) {
        return res.status(404).json({ message: "Musician contract not found" });
      }
      
      // Update the contract status
      const updatedContract = await storage.updateMonthlyContractMusician(id, {
        status: "rejected",
        rejectionReason: "Rejected by admin"
      });
      
      return res.json({ success: true, message: "Contract rejected successfully" });
    } catch (error) {
      console.error("Error rejecting musician contract:", error);
      return res.status(500).json({ message: "Server error" });
    }
  });
  
  apiRouter.get("/monthly-contracts/:contractId/musicians", isAuthenticated, async (req, res) => {
    try {
      const contractMusicians = await storage.getMonthlyContractMusicians(parseInt(req.params.contractId));
      
      // Enrich with musician details
      const enrichedMusicians = await Promise.all(
        contractMusicians.map(async (cm) => {
          const musician = await storage.getMusician(cm.musicianId);
          const dates = await storage.getMonthlyContractDates(cm.id);
          
          return {
            id: cm.id,
            status: cm.status,
            sentAt: cm.sentAt,
            respondedAt: cm.respondedAt,
            musicianSignature: cm.musicianSignature,
            ipAddress: cm.ipAddress,
            musician: {
              id: musician.id,
              name: musician.name,
              email: musician.email,
              phone: musician.phone
            },
            dates: dates.map(date => ({
              id: date.id,
              date: date.date,
              status: date.status,
              fee: date.fee?.toString() || "0",
              notes: date.notes
            }))
          };
        })
      );
      
      res.json(enrichedMusicians);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error fetching monthly contract musicians" });
    }
  });
  
  // API endpoint for monthly contract assignments (for the detail page)
  apiRouter.get("/monthly-contracts/:contractId/assignments", isAuthenticated, async (req, res) => {
    try {
      const contractId = parseInt(req.params.contractId);
      
      // Get all musicians assigned to this contract
      const contractMusicians = await storage.getMonthlyContractMusicians(contractId);
      
      // For each musician, get their dates and actual musician data
      const assignments = await Promise.all(
        contractMusicians.map(async (cm) => {
          try {
            const musician = await storage.getMusician(cm.musicianId);
            const dates = await storage.getMonthlyContractDates(cm.id);
            
            return {
              id: cm.id,
              musicianId: cm.musicianId,
              contractId: cm.contractId,
              status: cm.status,
              responseDate: cm.respondedAt,
              notes: cm.notes,
              musician: {
                id: musician?.id || 0,
                name: musician?.name || "Unknown",
                email: musician?.email || "",
                phone: musician?.phone || "",
                type: musician?.type || "Unknown",
              },
              dates,
              dateCount: dates.length
            };
          } catch (error) {
            console.error(`Error enriching musician ${cm.musicianId}:`, error);
            return {
              id: cm.id,
              musicianId: cm.musicianId,
              contractId: cm.contractId,
              status: cm.status,
              responseDate: cm.respondedAt,
              notes: cm.notes,
              musician: { id: 0, name: "Unknown", type: "Unknown", email: "", phone: "" },
              dates: [],
              dateCount: 0
            };
          }
        })
      );
      
      res.json(assignments);
    } catch (error) {
      console.error("Error fetching contract assignments:", error);
      res.status(500).json({ message: "Error fetching contract assignments" });
    }
  });
  
  apiRouter.post("/monthly-contracts/:contractId/musicians", isAuthenticated, async (req, res) => {
    try {
      const contractId = parseInt(req.params.contractId);
      
      // Validate contract exists
      const contract = await storage.getMonthlyContract(contractId);
      if (!contract) {
        return res.status(404).json({ message: "Monthly contract not found" });
      }
      
      const musicianData = insertMonthlyContractMusicianSchema.parse({
        ...req.body,
        contractId
      });
      
      const contractMusician = await storage.createMonthlyContractMusician(musicianData);
      
      // Also get the musician details
      const musician = await storage.getMusician(contractMusician.musicianId);
      
      res.status(201).json({
        ...contractMusician,
        musician
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid musician contract data", errors: error.errors });
      }
      console.error(error);
      res.status(500).json({ message: "Error adding musician to monthly contract" });
    }
  });
  
  apiRouter.put("/monthly-contract-musicians/:id", isAuthenticated, async (req, res) => {
    try {
      const musicianData = insertMonthlyContractMusicianSchema.partial().parse(req.body);
      const contractMusician = await storage.updateMonthlyContractMusician(parseInt(req.params.id), musicianData);
      
      if (!contractMusician) {
        return res.status(404).json({ message: "Contract musician not found" });
      }
      
      // Also get the musician details
      const musician = await storage.getMusician(contractMusician.musicianId);
      
      res.json({
        ...contractMusician,
        musician
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid musician contract data", errors: error.errors });
      }
      console.error(error);
      res.status(500).json({ message: "Error updating musician in monthly contract" });
    }
  });
  
  apiRouter.delete("/monthly-contract-musicians/:id", isAuthenticated, async (req, res) => {
    try {
      const result = await storage.deleteMonthlyContractMusician(parseInt(req.params.id));
      if (!result) {
        return res.status(404).json({ message: "Contract musician not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error removing musician from monthly contract" });
    }
  });
  
  // Monthly Contract Dates routes
  apiRouter.get("/monthly-contract-musicians/:musicianContractId/dates", isAuthenticated, async (req, res) => {
    try {
      const dates = await storage.getMonthlyContractDates(parseInt(req.params.musicianContractId));
      res.json(dates);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error fetching monthly contract dates" });
    }
  });
  
  apiRouter.post("/monthly-contract-musicians/:musicianContractId/dates", isAuthenticated, async (req, res) => {
    try {
      const musicianContractId = parseInt(req.params.musicianContractId);
      
      // Validate musician contract exists
      const musicianContract = await storage.getMonthlyContractMusician(musicianContractId);
      if (!musicianContract) {
        return res.status(404).json({ message: "Monthly contract musician not found" });
      }
      
      console.log("Received date data:", req.body);
      console.log("Musician contract ID:", musicianContractId);
      
      // Parse the date data
      const { date, fee, status = 'pending', notes = '' } = req.body;
      
      // Use direct SQL query
      try {
        // Prepare SQL query
        const query = `
          INSERT INTO monthly_contract_dates 
            (musician_contract_id, date, status, fee, notes, created_at, updated_at)
          VALUES 
            ($1, $2, $3, $4, $5, NOW(), NOW())
          RETURNING *
        `;
        
        // Execute with parameters
        const result = await pool.query(query, [
          musicianContractId,
          new Date(date),
          status,
          fee,
          notes || null
        ]);
        
        if (result.rows && result.rows.length > 0) {
          console.log("Date added successfully:", result.rows[0]);
          
          // Log activity
          const dateStr = format(new Date(date), 'yyyy-MM-dd');
          const musician = await storage.getMusician(musicianContract.musician_id);
          const musicianName = musician ? musician.name : "Unknown";
          
          await storage.createActivity({
            entityType: 'monthlyContractDate',
            entityId: result.rows[0].id,
            action: 'create',
            userId: 1,
            timestamp: new Date(),
            details: JSON.stringify({
              message: `Date ${dateStr} added to monthly contract for ${musicianName}`,
              status: result.rows[0].status
            })
          });
          
          res.status(201).json(result.rows[0]);
        } else {
          throw new Error("Insert returned no results");
        }
      } catch (sqlError) {
        console.error("SQL error:", sqlError);
        res.status(500).json({ message: "Error inserting date into database" });
      }
    } catch (error) {
      console.error("Error adding date to contract:", error);
      res.status(500).json({ message: "Error adding date to monthly contract" });
    }
  });
  
  apiRouter.put("/monthly-contract-dates/:id", isAuthenticated, async (req, res) => {
    try {
      const dateData = insertMonthlyContractDateSchema.partial().parse(req.body);
      const contractDate = await storage.updateMonthlyContractDate(parseInt(req.params.id), dateData);
      
      if (!contractDate) {
        return res.status(404).json({ message: "Contract date not found" });
      }
      
      res.json(contractDate);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid contract date data", errors: error.errors });
      }
      console.error(error);
      res.status(500).json({ message: "Error updating date in monthly contract" });
    }
  });
  
  apiRouter.delete("/monthly-contract-dates/:id", isAuthenticated, async (req, res) => {
    try {
      const result = await storage.deleteMonthlyContractDate(parseInt(req.params.id));
      if (!result) {
        return res.status(404).json({ message: "Contract date not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error removing date from monthly contract" });
    }
  });
  
  // Get musician contract by token (for public response page)
  apiRouter.get("/monthly-contract-musicians/token/:token", async (req, res) => {
    try {
      const token = req.params.token;
      
      // Find the musician contract with this token
      const musicianContract = await storage.getMonthlyContractMusicianByToken(token);
      
      if (!musicianContract) {
        return res.status(404).json({ message: "Contract not found" });
      }
      
      // Get the associated contract
      const contract = await storage.getMonthlyContract(musicianContract.contractId);
      
      // Get the musician
      const musician = await storage.getMusician(musicianContract.musicianId);
      
      // Get the dates
      const dates = await storage.getMonthlyContractDates(musicianContract.id);
      
      // Return the combined data with formatted fields
      res.json({
        id: musicianContract.id,
        musicianId: musicianContract.musicianId,
        contractId: musicianContract.contractId,
        status: musicianContract.status,
        sentAt: musicianContract.sentAt,
        signedAt: musicianContract.signedAt,
        token: musicianContract.token,
        createdAt: musicianContract.createdAt,
        updatedAt: musicianContract.updatedAt,
        musician,
        contract,
        dates: dates.map(date => ({
          id: date.id,
          musicianContractId: date.musicianContractId,
          date: date.date,
          status: date.status,
          fee: date.fee,
          notes: date.notes,
          venueId: date.venueId,
          venueName: date.venueName,
          createdAt: date.createdAt,
          updatedAt: date.updatedAt
        }))
      });
    } catch (error) {
      console.error("Error fetching musician contract by token:", error);
      res.status(500).json({ message: "Error fetching contract data" });
    }
  });
  
  // Update date status in a monthly contract (for musician responses)
  apiRouter.put("/monthly-contract-dates/:dateId/status", async (req, res) => {
    try {
      const dateId = parseInt(req.params.dateId);
      const { status, notes, ipAddress, musicianSignature } = req.body;
      
      if (!['accepted', 'rejected', 'pending'].includes(status)) {
        return res.status(400).json({ message: "Invalid status value" });
      }
      
      // Get the date first to verify it exists
      const date = await storage.getMonthlyContractDate(dateId);
      if (!date) {
        return res.status(404).json({ message: "Date not found" });
      }
      
      // Update the date status
      const updatedDate = await storage.updateMonthlyContractDate(dateId, {
        status,
        notes: notes || date.notes
      });
      
      // Get the musician contract to update its status if needed
      const musicianContract = await storage.getMonthlyContractMusician(date.musicianContractId);
      if (!musicianContract) {
        return res.status(404).json({ message: "Musician contract not found" });
      }
      
      // Check if all dates have responses
      const allDates = await storage.getMonthlyContractDates(musicianContract.id);
      const allResponded = allDates.every(d => d.status === 'accepted' || d.status === 'rejected');
      
      // If all dates have responses, update the musician contract status
      if (allResponded) {
        const hasAccepted = allDates.some(d => d.status === 'accepted');
        
        const updateData: any = {
          status: hasAccepted ? 'signed' : 'rejected',
          respondedAt: new Date()
        };
        
        // Include signature and IP if provided and at least one date was accepted
        if (hasAccepted && musicianSignature) {
          updateData.musicianSignature = musicianSignature;
        }
        
        // Always update IP address if provided, regardless of accepted status
        if (ipAddress) {
          updateData.ipAddress = ipAddress;
        }
        
        await storage.updateMonthlyContractMusician(musicianContract.id, updateData);
        
        // Update the parent contract if all musicians have responded
        const allMusicians = await storage.getMonthlyContractMusicians(musicianContract.contractId);
        const allMusiciansResponded = allMusicians.every(m => 
          m.status === 'signed' || m.status === 'rejected'
        );
        
        if (allMusiciansResponded) {
          await storage.updateMonthlyContract(musicianContract.contractId, {
            status: 'completed'
          });
        }
      }
      
      // Return the updated date
      res.json({
        id: updatedDate.id,
        musicianContractId: updatedDate.musicianContractId,
        date: updatedDate.date,
        status: updatedDate.status,
        fee: updatedDate.fee,
        notes: updatedDate.notes,
        createdAt: updatedDate.createdAt,
        updatedAt: updatedDate.updatedAt
      });
    } catch (error) {
      console.error("Error updating date status:", error);
      res.status(500).json({ message: "Error updating date status" });
    }
  });
  
  // Generate Monthly Contract
  apiRouter.post("/monthly-contracts/generate", isAuthenticated, async (req, res) => {
    try {
      const { plannerId, month, year, templateId, musicianId, assignmentIds } = req.body;
      
      if (!plannerId || !month || !year) {
        return res.status(400).json({ message: "Missing required fields: plannerId, month, year" });
      }
      
      // Log information about the contract generation request
      if (assignmentIds && assignmentIds.length > 0) {
        console.log(`Generating contract for planner ${plannerId}, month ${month}, year ${year}, with specific assignment IDs: ${assignmentIds.join(', ')}`);
      } else if (musicianId) {
        console.log(`Generating contract for planner ${plannerId}, month ${month}, year ${year}, specifically for musician ${musicianId}`);
      } else {
        console.log(`Generating contract for planner ${plannerId}, month ${month}, year ${year}, for all musicians`);
      }
      
      // 1. Validate planner exists
      const planner = await storage.getMonthlyPlanner(plannerId);
      if (!planner) {
        return res.status(404).json({ message: "Monthly planner not found" });
      }
      
      // 2. Get contract template
      let template;
      if (templateId) {
        template = await storage.getContractTemplate(templateId);
        if (!template) {
          return res.status(404).json({ message: "Contract template not found" });
        }
      } else {
        // Get default template
        template = await storage.getDefaultContractTemplate();
        if (!template) {
          return res.status(400).json({ message: "No default contract template found" });
        }
      }
      
      // 3. Create monthly contract
      const contract = await storage.createMonthlyContract({
        plannerId,
        month,
        year,
        templateId: template.id,
        status: 'draft',
        name: `${planner.name} - ${month}/${year} Contracts`,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      // 4. Get only the selected assignments for the contract
      let assignments = [];
      
      // Only fetch the specific assignments requested (by ID)
      if (assignmentIds && assignmentIds.length > 0) {
        console.log(`Fetching specific assignments by ID: ${assignmentIds.join(', ')}`);
        
        // Fetch only the specified assignments by ID
        for (const assignmentId of assignmentIds) {
          const assignment = await storage.getPlannerAssignment(assignmentId);
          if (assignment) {
            assignments.push(assignment);
          } else {
            console.warn(`Assignment ID ${assignmentId} not found`);
          }
        }
      } else {
        // Fallback to getting all assignments
        console.log("No specific assignments provided, fetching all assignments");
        const slots = await storage.getPlannerSlots(plannerId);
        for (const slot of slots) {
          const slotAssignments = await storage.getPlannerAssignments(slot.id);
          assignments.push(...slotAssignments);
        }
        
        // Filter for a specific musician if musicianId is provided
        if (musicianId) {
          console.log(`Filtering assignments for musician ${musicianId}`);
          assignments = assignments.filter(assignment => assignment.musicianId === parseInt(musicianId));
        }
      }
      
      console.log(`Found ${assignments.length} assignments to include in contract`);
      
      // 5. Group assignments by musician
      const musicianAssignments = {};
      
      // Group the assignments by musician ID
      assignments.forEach(assignment => {
        if (!musicianAssignments[assignment.musicianId]) {
          musicianAssignments[assignment.musicianId] = [];
        }
        musicianAssignments[assignment.musicianId].push(assignment);
      });
      
      // 6. Create contract musician and dates for each musician
      for (const [musicianId, assignments] of Object.entries(musicianAssignments)) {
        try {
          console.log(`Creating monthly contract for musician ${musicianId} with ${assignments.length} assignments`);
          
          const contractMusician = await storage.createMonthlyContractMusician({
            contractId: contract.id,
            musicianId: parseInt(musicianId),
            status: 'pending',
            createdAt: new Date(),
            updatedAt: new Date()
          });
          
          console.log(`Successfully created monthly contract musician with ID ${contractMusician.id}`);
          
          // Use the new helper function to create dates from assignments
          const dates = await storage.createMonthlyContractDatesFromAssignments(
            contractMusician.id, 
            assignments
          );
          
          console.log(`Successfully created ${dates.length} dates for musician ${musicianId}`);
          
          // Update the musician contract with summary stats
          if (dates.length > 0) {
            await storage.updateMonthlyContractMusician(contractMusician.id, {
              totalDates: dates.length,
              pendingDates: dates.length,
              totalFee: dates.reduce((sum, date) => sum + (date.fee || 0), 0)
            });
            
            // Update each assignment's contract status to "contract generated"
            for (const assignment of assignments) {
              try {
                await storage.updatePlannerAssignment(assignment.id, {
                  contractId: contract.id,
                  contractStatus: 'contract generated'
                });
                console.log(`Updated assignment ${assignment.id} with contractId ${contract.id} and status 'contract generated'`);
              } catch (updateError) {
                console.error(`Error updating assignment ${assignment.id}:`, updateError);
              }
            }
          }
        } catch (error) {
          console.error(`Error creating contract for musician ${musicianId}:`, error);
        }
      }
      
      // 7. Return the complete contract
      const completeContract = await storage.getMonthlyContract(contract.id);
      res.status(201).json(completeContract);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error generating monthly contract" });
    }
  });
  
  // Send Monthly Contract
  apiRouter.post("/monthly-contracts/:id/send", isAuthenticated, async (req, res) => {
    try {
      const contractId = parseInt(req.params.id);
      
      // 1. Get the contract
      const contract = await storage.getMonthlyContract(contractId);
      if (!contract) {
        return res.status(404).json({ message: "Monthly contract not found" });
      }
      
      console.log(`Sending contract ID ${contractId} for month ${contract.month}/${contract.year}`);
      
      // 2. Update contract status
      const updatedContract = await storage.updateMonthlyContract(contractId, {
        status: 'sent',
        sentAt: new Date()
      });
      
      // 3. Update all musician statuses in this contract
      const contractMusicians = await storage.getMonthlyContractMusicians(contractId);
      console.log(`Found ${contractMusicians.length} musicians in this contract`);
      
      for (const cm of contractMusicians) {
        console.log(`Processing musician ${cm.musicianId} in contract ${contractId}`);
        
        // 3a. Update the musician's contract status
        await db
          .update(monthlyContractMusicians)
          .set({
            status: 'sent',
            sentAt: new Date(),
          })
          .where(eq(monthlyContractMusicians.id, cm.id));
          
        // 3b. Get all the dates that are included in this musician's contract
        const contractDates = await storage.getMonthlyContractDates(cm.id);
        console.log(`Found ${contractDates.length} dates for musician ${cm.musicianId} in this contract`);
        
        if (contractDates.length === 0) {
          console.log(`No dates found for musician ${cm.musicianId} in contract ${contractId}`);
          continue;
        }
        
        // 3c. Only update the assignments that are INCLUDED in this contract
        // Find only the planner assignment IDs that match this contract's dates
        const dateStrings = contractDates.map(date => {
          const dateObj = new Date(date.date);
          return dateObj.toISOString().split('T')[0]; // Format as YYYY-MM-DD
        });
        
        console.log(`Looking for assignments with dates: ${dateStrings.join(', ')}`);
        
        // First, get planner slots to match assignments by date
        const slots = await db.select().from(plannerSlots);
        const slotDateMap = {};
        
        // Create a map of slot IDs to their dates
        for (const slot of slots) {
          slotDateMap[slot.id] = new Date(slot.date).toISOString().split('T')[0];
        }
        
        // Get the specific dates included in this contract (for this musician)
        const contractDateStrings = new Set(dateStrings);
        
        console.log(`Dates in this contract: ${[...contractDateStrings].join(', ')}`);
        
        // Get all assignments for this musician
        const allAssignments = await db
          .select()
          .from(plannerAssignments)
          .where(eq(plannerAssignments.musicianId, cm.musicianId));
        
        // Filter to only assignments that match the dates in this contract
        const assignments = allAssignments.filter(assignment => {
          const slot = slots.find(s => s.id === assignment.slotId);
          if (!slot) return false;
          
          const assignmentDateStr = new Date(slot.date).toISOString().split('T')[0];
          return contractDateStrings.has(assignmentDateStr);
        });
        
        console.log(`Found ${assignments.length} assignments for musician ${cm.musicianId} that match contract dates`);
        
        // Update only those assignments
        for (const assignment of assignments) {
          await storage.updatePlannerAssignment(assignment.id, {
            contractId: contractId,
            contractStatus: 'sent'
          });
          console.log(`Updated assignment ${assignment.id} with status 'sent' and contractId ${contractId}`);
        }
      }
      
      // 4. In a real app, we would send emails to musicians here
      
      res.json(updatedContract);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error sending monthly contract" });
    }
  });

  // Mount the status router
  apiRouter.use("/status", statusRouter);
  
  // Mount the monthly contract response router
  apiRouter.use("/monthly-contract-responses", monthlyContractResponseRouter);
  
  // Mount the contract router
  apiRouter.use("/monthly-contracts", contractRouter);
  apiRouter.use("/monthly-contracts", plannerContractsMusicianRouter);
  
  // Setup additional monthly contract routes
  setupMonthlyContractRoutes(apiRouter, storage);
  
  // Mount the API router
  app.use("/api", apiRouter);

  const httpServer = createServer(app);

  return httpServer;
}
