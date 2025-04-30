import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import express from "express";
import * as z from "zod";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import MemoryStore from "memorystore";
import { 
  insertUserSchema, 
  insertVenueSchema, 
  insertCategorySchema,
  insertMusicianSchema,
  insertAvailabilitySchema,
  insertEventSchema,
  insertBookingSchema,
  insertPaymentSchema,
  insertCollectionSchema,
  insertExpenseSchema
} from "@shared/schema";

const SessionStore = MemoryStore(session);

export async function registerRoutes(app: Express): Promise<Server> {
  // Configure session middleware
  app.use(
    session({
      secret: "vamp-musician-management-secret",
      resave: false,
      saveUninitialized: false,
      cookie: { secure: process.env.NODE_ENV === "production" },
      store: new SessionStore({
        checkPeriod: 86400000 // prune expired entries every 24h
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
  apiRouter.post("/auth/login", passport.authenticate("local"), (req, res) => {
    res.json({ user: req.user });
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

  // Category routes
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

  // Musician routes
  apiRouter.get("/musicians", isAuthenticated, async (req, res) => {
    try {
      const musicians = await storage.getMusicians();
      res.json(musicians);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error fetching musicians" });
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
      const parsedCategoryIds = categoryIds ? (categoryIds as string).split(',').map(id => parseInt(id)) : undefined;
      
      const musicians = await storage.getAvailableMusiciansForDate(parsedDate, parsedCategoryIds);
      res.json(musicians);
    } catch (error) {
      console.error(error);
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
      const event = await storage.getEvent(parseInt(req.params.id));
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      res.json(event);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error fetching event" });
    }
  });

  apiRouter.post("/events", isAuthenticated, async (req, res) => {
    try {
      const eventData = insertEventSchema.parse(req.body);
      const event = await storage.createEvent(eventData);
      res.status(201).json(event);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid event data", errors: error.errors });
      }
      console.error(error);
      res.status(500).json({ message: "Error creating event" });
    }
  });

  apiRouter.put("/events/:id", isAuthenticated, async (req, res) => {
    try {
      const eventData = insertEventSchema.partial().parse(req.body);
      const event = await storage.updateEvent(parseInt(req.params.id), eventData);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
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

  // Mount the API router
  app.use("/api", apiRouter);

  const httpServer = createServer(app);

  return httpServer;
}
