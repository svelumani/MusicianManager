import {
  users, venues, categories, musicians, availability, 
  events, bookings, payments, collections, expenses, 
  activities, monthlyPlanners, plannerSlots, plannerAssignments, monthlyInvoices,
  type User, type InsertUser, type Venue, 
  type InsertVenue, type Category, type InsertCategory, 
  type Musician, type InsertMusician, type Availability, 
  type InsertAvailability, type Event, type InsertEvent, 
  type Booking, type InsertBooking, type Payment, type InsertPayment, 
  type Collection, type InsertCollection, type Expense, 
  type InsertExpense, type Activity, type InsertActivity,
  type MonthlyPlanner, type InsertMonthlyPlanner,
  type PlannerSlot, type InsertPlannerSlot,
  type PlannerAssignment, type InsertPlannerAssignment,
  type MonthlyInvoice, type InsertMonthlyInvoice
} from "@shared/schema";

// Define the storage interface
export interface IStorage {
  // User management
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, data: Partial<InsertUser>): Promise<User | undefined>;
  
  // Venue management
  getVenues(): Promise<Venue[]>;
  getVenue(id: number): Promise<Venue | undefined>;
  createVenue(venue: InsertVenue): Promise<Venue>;
  updateVenue(id: number, data: Partial<InsertVenue>): Promise<Venue | undefined>;
  deleteVenue(id: number): Promise<boolean>;
  
  // Category management
  getCategories(): Promise<Category[]>;
  getCategory(id: number): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: number, data: Partial<InsertCategory>): Promise<Category | undefined>;
  deleteCategory(id: number): Promise<boolean>;
  
  // Musician management
  getMusicians(): Promise<Musician[]>;
  getMusician(id: number): Promise<Musician | undefined>;
  createMusician(musician: InsertMusician): Promise<Musician>;
  updateMusician(id: number, data: Partial<InsertMusician>): Promise<Musician | undefined>;
  deleteMusician(id: number): Promise<boolean>;
  
  // Availability management
  getAvailability(musicianId: number, month: string): Promise<Availability[]>;
  getMusicianAvailabilityForDate(musicianId: number, date: Date): Promise<Availability | undefined>;
  createAvailability(availability: InsertAvailability): Promise<Availability>;
  updateAvailability(id: number, data: Partial<InsertAvailability>): Promise<Availability | undefined>;
  deleteAvailability(id: number): Promise<boolean>;
  getAvailableMusiciansForDate(date: Date, categoryIds?: number[]): Promise<Musician[]>;
  
  // Event management
  getEvents(): Promise<Event[]>;
  getEvent(id: number): Promise<Event | undefined>;
  createEvent(event: InsertEvent): Promise<Event>;
  updateEvent(id: number, data: Partial<InsertEvent>): Promise<Event | undefined>;
  deleteEvent(id: number): Promise<boolean>;
  getUpcomingEvents(limit?: number): Promise<Event[]>;
  
  // Booking management
  getBookings(eventId?: number): Promise<Booking[]>;
  getBooking(id: number): Promise<Booking | undefined>;
  getBookingsByMusician(musicianId: number): Promise<Booking[]>;
  createBooking(booking: InsertBooking): Promise<Booking>;
  updateBooking(id: number, data: Partial<InsertBooking>): Promise<Booking | undefined>;
  deleteBooking(id: number): Promise<boolean>;
  
  // Payment management
  getPayments(bookingId?: number): Promise<Payment[]>;
  getPayment(id: number): Promise<Payment | undefined>;
  createPayment(payment: InsertPayment): Promise<Payment>;
  updatePayment(id: number, data: Partial<InsertPayment>): Promise<Payment | undefined>;
  deletePayment(id: number): Promise<boolean>;
  
  // Collection management
  getCollections(eventId?: number): Promise<Collection[]>;
  getCollection(id: number): Promise<Collection | undefined>;
  createCollection(collection: InsertCollection): Promise<Collection>;
  updateCollection(id: number, data: Partial<InsertCollection>): Promise<Collection | undefined>;
  deleteCollection(id: number): Promise<boolean>;
  
  // Expense management
  getExpenses(eventId?: number): Promise<Expense[]>;
  getExpense(id: number): Promise<Expense | undefined>;
  createExpense(expense: InsertExpense): Promise<Expense>;
  updateExpense(id: number, data: Partial<InsertExpense>): Promise<Expense | undefined>;
  deleteExpense(id: number): Promise<boolean>;
  
  // Activity log
  getActivities(limit?: number): Promise<Activity[]>;
  getActivity(id: number): Promise<Activity | undefined>;
  createActivity(activity: InsertActivity): Promise<Activity>;
  
  // Dashboard metrics
  getDashboardMetrics(): Promise<{
    totalBookings: number;
    activeEvents: number;
    totalMusicians: number;
    totalVenues: number;
    revenueData: {month: string, amount: number}[];
    pendingCollections: number;
  }>;
  
  // Event profitability
  getEventProfitability(eventId: number): Promise<{
    totalCollections: number;
    totalPayments: number;
    totalExpenses: number;
    profit: number;
  }>;
  
  // Monthly Planner management
  getMonthlyPlanners(): Promise<MonthlyPlanner[]>;
  getMonthlyPlanner(id: number): Promise<MonthlyPlanner | undefined>;
  getMonthlyPlannerByMonth(month: number, year: number): Promise<MonthlyPlanner | undefined>;
  createMonthlyPlanner(planner: InsertMonthlyPlanner): Promise<MonthlyPlanner>;
  updateMonthlyPlanner(id: number, data: Partial<InsertMonthlyPlanner>): Promise<MonthlyPlanner | undefined>;
  deleteMonthlyPlanner(id: number): Promise<boolean>;
  
  // Planner Slots management
  getPlannerSlots(plannerId?: number): Promise<PlannerSlot[]>;
  getPlannerSlot(id: number): Promise<PlannerSlot | undefined>;
  createPlannerSlot(slot: InsertPlannerSlot): Promise<PlannerSlot>;
  updatePlannerSlot(id: number, data: Partial<InsertPlannerSlot>): Promise<PlannerSlot | undefined>;
  deletePlannerSlot(id: number): Promise<boolean>;
  getPlannerSlotsByDate(date: Date): Promise<PlannerSlot[]>;
  
  // Planner Assignments management
  getPlannerAssignments(slotId?: number, musicianId?: number): Promise<PlannerAssignment[]>;
  getPlannerAssignment(id: number): Promise<PlannerAssignment | undefined>;
  createPlannerAssignment(assignment: InsertPlannerAssignment): Promise<PlannerAssignment>;
  updatePlannerAssignment(id: number, data: Partial<InsertPlannerAssignment>): Promise<PlannerAssignment | undefined>;
  deletePlannerAssignment(id: number): Promise<boolean>;
  markAttendance(id: number, status: string, userId: number, notes?: string): Promise<PlannerAssignment | undefined>;
  
  // Monthly Invoice management
  getMonthlyInvoices(plannerId?: number, musicianId?: number): Promise<MonthlyInvoice[]>;
  getMonthlyInvoice(id: number): Promise<MonthlyInvoice | undefined>;
  createMonthlyInvoice(invoice: InsertMonthlyInvoice): Promise<MonthlyInvoice>;
  updateMonthlyInvoice(id: number, data: Partial<InsertMonthlyInvoice>): Promise<MonthlyInvoice | undefined>;
  deleteMonthlyInvoice(id: number): Promise<boolean>;
  generateMonthlyInvoices(plannerId: number): Promise<MonthlyInvoice[]>;
  finalizeMonthlyInvoice(id: number): Promise<MonthlyInvoice | undefined>;
  markMonthlyInvoiceAsPaid(id: number, notes?: string): Promise<MonthlyInvoice | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private venues: Map<number, Venue>;
  private categories: Map<number, Category>;
  private musicians: Map<number, Musician>;
  private availability: Map<number, Availability>;
  private events: Map<number, Event>;
  private bookings: Map<number, Booking>;
  private payments: Map<number, Payment>;
  private collections: Map<number, Collection>;
  private expenses: Map<number, Expense>;
  private activities: Map<number, Activity>;
  private monthlyPlanners: Map<number, MonthlyPlanner>;
  private plannerSlots: Map<number, PlannerSlot>;
  private plannerAssignments: Map<number, PlannerAssignment>;
  private monthlyInvoices: Map<number, MonthlyInvoice>;
  
  // Current ID trackers
  private currentUserId: number;
  private currentVenueId: number;
  private currentCategoryId: number;
  private currentMusicianId: number;
  private currentAvailabilityId: number;
  private currentEventId: number;
  private currentBookingId: number;
  private currentPaymentId: number;
  private currentCollectionId: number;
  private currentExpenseId: number;
  private currentActivityId: number;
  private currentMonthlyPlannerId: number;
  private currentPlannerSlotId: number;
  private currentPlannerAssignmentId: number;
  private currentMonthlyInvoiceId: number;

  constructor() {
    // Initialize maps
    this.users = new Map();
    this.venues = new Map();
    this.categories = new Map();
    this.musicians = new Map();
    this.availability = new Map();
    this.events = new Map();
    this.bookings = new Map();
    this.payments = new Map();
    this.collections = new Map();
    this.expenses = new Map();
    this.activities = new Map();
    
    // Initialize IDs
    this.currentUserId = 1;
    this.currentVenueId = 1;
    this.currentCategoryId = 1;
    this.currentMusicianId = 1;
    this.currentAvailabilityId = 1;
    this.currentEventId = 1;
    this.currentBookingId = 1;
    this.currentPaymentId = 1;
    this.currentCollectionId = 1;
    this.currentExpenseId = 1;
    this.currentActivityId = 1;
    
    // Initialize with default admin user
    this.createUser({
      username: "admin",
      password: "admin123", // This would be hashed in a real app
      name: "Admin User",
      email: "admin@vamp.com",
      role: "admin",
      profileImage: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
    });
    
    // Initialize with some default categories
    this.createCategory({ title: "Jazz", description: "Jazz musicians including pianists, saxophonists, and more" });
    this.createCategory({ title: "Classical", description: "Classical musicians including pianists, violinists, and more" });
    this.createCategory({ title: "Rock", description: "Rock musicians including guitarists, drummers, and vocalists" });
    this.createCategory({ title: "Pop", description: "Pop musicians including vocalists, guitarists, and more" });
    
    // Initialize with sample venues
    this.createVenue({
      name: "Blue Moon Lounge",
      location: "Downtown",
      paxCount: 150,
      address: "123 Main St, City Center",
      venuePictures: ["https://images.unsplash.com/photo-1566737236500-c8ac43014a67?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&h=900&q=80"],
      openingHours: "5:00 PM - 2:00 AM",
      capacity: 200,
      hourlyRate: 300,
      description: "An intimate jazz lounge with a sophisticated atmosphere",
      rating: 4.5
    });
    
    this.createVenue({
      name: "Grand Hyatt",
      location: "Business District",
      paxCount: 500,
      address: "456 Corporate Blvd, Business District",
      venuePictures: ["https://images.unsplash.com/photo-1519167758481-83f550bb49b3?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&h=900&q=80"],
      openingHours: "24/7",
      capacity: 1000,
      hourlyRate: 1200,
      description: "Luxurious hotel venue perfect for corporate events and weddings",
      rating: 4.8
    });
    
    this.createVenue({
      name: "Sunset Beach Resort",
      location: "Coastal Area",
      paxCount: 300,
      address: "789 Beach Road, Coastal Area",
      venuePictures: ["https://images.unsplash.com/photo-1540541338287-41700207dee6?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&h=900&q=80"],
      openingHours: "9:00 AM - 11:00 PM",
      capacity: 350,
      hourlyRate: 900,
      description: "Beautiful beachfront resort for weddings and special occasions",
      rating: 4.7
    });
  }

  // User management methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  
  async updateUser(id: number, data: Partial<InsertUser>): Promise<User | undefined> {
    const user = await this.getUser(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...data };
    this.users.set(id, updatedUser);
    return updatedUser;
  }
  
  // Venue management methods
  async getVenues(): Promise<Venue[]> {
    return Array.from(this.venues.values());
  }
  
  async getVenue(id: number): Promise<Venue | undefined> {
    return this.venues.get(id);
  }
  
  async createVenue(venue: InsertVenue): Promise<Venue> {
    const id = this.currentVenueId++;
    const newVenue: Venue = { ...venue, id };
    this.venues.set(id, newVenue);
    return newVenue;
  }
  
  async updateVenue(id: number, data: Partial<InsertVenue>): Promise<Venue | undefined> {
    const venue = await this.getVenue(id);
    if (!venue) return undefined;
    
    const updatedVenue = { ...venue, ...data };
    this.venues.set(id, updatedVenue);
    return updatedVenue;
  }
  
  async deleteVenue(id: number): Promise<boolean> {
    return this.venues.delete(id);
  }
  
  // Category management methods
  async getCategories(): Promise<Category[]> {
    return Array.from(this.categories.values());
  }
  
  async getCategory(id: number): Promise<Category | undefined> {
    return this.categories.get(id);
  }
  
  async createCategory(category: InsertCategory): Promise<Category> {
    const id = this.currentCategoryId++;
    const newCategory: Category = { ...category, id };
    this.categories.set(id, newCategory);
    return newCategory;
  }
  
  async updateCategory(id: number, data: Partial<InsertCategory>): Promise<Category | undefined> {
    const category = await this.getCategory(id);
    if (!category) return undefined;
    
    const updatedCategory = { ...category, ...data };
    this.categories.set(id, updatedCategory);
    return updatedCategory;
  }
  
  async deleteCategory(id: number): Promise<boolean> {
    return this.categories.delete(id);
  }
  
  // Musician management methods
  async getMusicians(): Promise<Musician[]> {
    return Array.from(this.musicians.values());
  }
  
  async getMusician(id: number): Promise<Musician | undefined> {
    return this.musicians.get(id);
  }
  
  async createMusician(musician: InsertMusician): Promise<Musician> {
    const id = this.currentMusicianId++;
    const newMusician: Musician = { ...musician, id };
    this.musicians.set(id, newMusician);
    
    // Create activity
    this.createActivity({
      userId: 1, // Default admin
      action: "Created",
      entityType: "Musician",
      entityId: id,
      timestamp: new Date(),
      details: { musician: newMusician.name }
    });
    
    return newMusician;
  }
  
  async updateMusician(id: number, data: Partial<InsertMusician>): Promise<Musician | undefined> {
    const musician = await this.getMusician(id);
    if (!musician) return undefined;
    
    const updatedMusician = { ...musician, ...data };
    this.musicians.set(id, updatedMusician);
    return updatedMusician;
  }
  
  async deleteMusician(id: number): Promise<boolean> {
    return this.musicians.delete(id);
  }
  
  // Availability management methods
  async getAvailability(musicianId: number, month: string): Promise<Availability[]> {
    return Array.from(this.availability.values()).filter(
      (a) => a.musicianId === musicianId && a.month === month
    );
  }
  
  async getMusicianAvailabilityForDate(musicianId: number, date: Date): Promise<Availability | undefined> {
    // Format the date to match the stored date format
    const dateStr = date.toISOString().split('T')[0];
    
    return Array.from(this.availability.values()).find(
      (a) => a.musicianId === musicianId && a.date.toISOString().split('T')[0] === dateStr
    );
  }
  
  async createAvailability(availability: InsertAvailability): Promise<Availability> {
    const id = this.currentAvailabilityId++;
    const newAvailability: Availability = { ...availability, id };
    this.availability.set(id, newAvailability);
    return newAvailability;
  }
  
  async updateAvailability(id: number, data: Partial<InsertAvailability>): Promise<Availability | undefined> {
    const availability = Array.from(this.availability.values()).find(a => a.id === id);
    if (!availability) return undefined;
    
    const updatedAvailability = { ...availability, ...data };
    this.availability.set(id, updatedAvailability);
    return updatedAvailability;
  }
  
  async deleteAvailability(id: number): Promise<boolean> {
    return this.availability.delete(id);
  }
  
  async getAvailableMusiciansForDate(date: Date, categoryIds?: number[]): Promise<Musician[]> {
    // Get all available musicians for the date
    const dateStr = date.toISOString().split('T')[0];
    const availableIds = Array.from(this.availability.values())
      .filter(a => a.isAvailable && a.date.toISOString().split('T')[0] === dateStr)
      .map(a => a.musicianId);
    
    let musicians = Array.from(this.musicians.values())
      .filter(m => availableIds.includes(m.id));
    
    // Filter by categories if provided
    if (categoryIds && categoryIds.length > 0) {
      musicians = musicians.filter(m => categoryIds.includes(m.categoryId));
    }
    
    return musicians;
  }
  
  // Event management methods
  async getEvents(): Promise<Event[]> {
    return Array.from(this.events.values());
  }
  
  async getEvent(id: number): Promise<Event | undefined> {
    return this.events.get(id);
  }
  
  async createEvent(event: InsertEvent): Promise<Event> {
    const id = this.currentEventId++;
    const newEvent: Event = { ...event, id };
    this.events.set(id, newEvent);
    
    // Create activity
    this.createActivity({
      userId: 1, // Default admin
      action: "Created",
      entityType: "Event",
      entityId: id,
      timestamp: new Date(),
      details: { event: newEvent.name }
    });
    
    return newEvent;
  }
  
  async updateEvent(id: number, data: Partial<InsertEvent>): Promise<Event | undefined> {
    const event = await this.getEvent(id);
    if (!event) return undefined;
    
    const updatedEvent = { ...event, ...data };
    this.events.set(id, updatedEvent);
    return updatedEvent;
  }
  
  async deleteEvent(id: number): Promise<boolean> {
    return this.events.delete(id);
  }
  
  async getUpcomingEvents(limit: number = 5): Promise<Event[]> {
    const now = new Date();
    return Array.from(this.events.values())
      .filter(e => new Date(e.startDate) >= now)
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
      .slice(0, limit);
  }
  
  // Booking management methods
  async getBookings(eventId?: number): Promise<Booking[]> {
    if (eventId) {
      return Array.from(this.bookings.values()).filter(b => b.eventId === eventId);
    }
    return Array.from(this.bookings.values());
  }
  
  async getBooking(id: number): Promise<Booking | undefined> {
    return this.bookings.get(id);
  }
  
  async getBookingsByMusician(musicianId: number): Promise<Booking[]> {
    return Array.from(this.bookings.values()).filter(b => b.musicianId === musicianId);
  }
  
  async createBooking(booking: InsertBooking): Promise<Booking> {
    const id = this.currentBookingId++;
    const newBooking: Booking = { ...booking, id };
    this.bookings.set(id, newBooking);
    
    // Create activity
    this.createActivity({
      userId: 1, // Default admin
      action: "Invited",
      entityType: "Booking",
      entityId: id,
      timestamp: new Date(),
      details: { 
        musicianId: newBooking.musicianId, 
        eventId: newBooking.eventId 
      }
    });
    
    return newBooking;
  }
  
  async updateBooking(id: number, data: Partial<InsertBooking>): Promise<Booking | undefined> {
    const booking = await this.getBooking(id);
    if (!booking) return undefined;
    
    const updatedBooking = { ...booking, ...data };
    this.bookings.set(id, updatedBooking);
    
    // Create appropriate activity based on the update
    if (data.isAccepted === true && !booking.isAccepted) {
      this.createActivity({
        userId: 1,
        action: "Accepted",
        entityType: "Booking",
        entityId: id,
        timestamp: new Date(),
        details: { 
          musicianId: booking.musicianId, 
          eventId: booking.eventId 
        }
      });
    } else if (data.contractSigned === true && !booking.contractSigned) {
      this.createActivity({
        userId: 1,
        action: "ContractSigned",
        entityType: "Booking",
        entityId: id,
        timestamp: new Date(),
        details: { 
          musicianId: booking.musicianId, 
          eventId: booking.eventId 
        }
      });
    }
    
    return updatedBooking;
  }
  
  async deleteBooking(id: number): Promise<boolean> {
    return this.bookings.delete(id);
  }
  
  // Payment management methods
  async getPayments(bookingId?: number): Promise<Payment[]> {
    if (bookingId) {
      return Array.from(this.payments.values()).filter(p => p.bookingId === bookingId);
    }
    return Array.from(this.payments.values());
  }
  
  async getPayment(id: number): Promise<Payment | undefined> {
    return this.payments.get(id);
  }
  
  async createPayment(payment: InsertPayment): Promise<Payment> {
    const id = this.currentPaymentId++;
    const newPayment: Payment = { ...payment, id };
    this.payments.set(id, newPayment);
    
    // Create activity
    this.createActivity({
      userId: 1, // Default admin
      action: "Payment",
      entityType: "Payment",
      entityId: id,
      timestamp: new Date(),
      details: { 
        bookingId: newPayment.bookingId, 
        amount: newPayment.amount 
      }
    });
    
    // Update booking payment status
    const booking = await this.getBooking(payment.bookingId);
    if (booking) {
      // Get all payments for this booking
      const payments = await this.getPayments(booking.bookingId);
      const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
      
      let paymentStatus = "pending";
      if (totalPaid >= booking.paymentAmount) {
        paymentStatus = "paid";
      } else if (totalPaid > 0) {
        paymentStatus = "partial";
      }
      
      await this.updateBooking(booking.id, { paymentStatus });
    }
    
    return newPayment;
  }
  
  async updatePayment(id: number, data: Partial<InsertPayment>): Promise<Payment | undefined> {
    const payment = await this.getPayment(id);
    if (!payment) return undefined;
    
    const updatedPayment = { ...payment, ...data };
    this.payments.set(id, updatedPayment);
    return updatedPayment;
  }
  
  async deletePayment(id: number): Promise<boolean> {
    return this.payments.delete(id);
  }
  
  // Collection management methods
  async getCollections(eventId?: number): Promise<Collection[]> {
    if (eventId) {
      return Array.from(this.collections.values()).filter(c => c.eventId === eventId);
    }
    return Array.from(this.collections.values());
  }
  
  async getCollection(id: number): Promise<Collection | undefined> {
    return this.collections.get(id);
  }
  
  async createCollection(collection: InsertCollection): Promise<Collection> {
    const id = this.currentCollectionId++;
    const newCollection: Collection = { ...collection, id };
    this.collections.set(id, newCollection);
    
    // Create activity
    this.createActivity({
      userId: 1, // Default admin
      action: "Collection",
      entityType: "Collection",
      entityId: id,
      timestamp: new Date(),
      details: { 
        eventId: newCollection.eventId, 
        amount: newCollection.amount 
      }
    });
    
    return newCollection;
  }
  
  async updateCollection(id: number, data: Partial<InsertCollection>): Promise<Collection | undefined> {
    const collection = await this.getCollection(id);
    if (!collection) return undefined;
    
    const updatedCollection = { ...collection, ...data };
    this.collections.set(id, updatedCollection);
    return updatedCollection;
  }
  
  async deleteCollection(id: number): Promise<boolean> {
    return this.collections.delete(id);
  }
  
  // Expense management methods
  async getExpenses(eventId?: number): Promise<Expense[]> {
    if (eventId) {
      return Array.from(this.expenses.values()).filter(e => e.eventId === eventId);
    }
    return Array.from(this.expenses.values());
  }
  
  async getExpense(id: number): Promise<Expense | undefined> {
    return this.expenses.get(id);
  }
  
  async createExpense(expense: InsertExpense): Promise<Expense> {
    const id = this.currentExpenseId++;
    const newExpense: Expense = { ...expense, id };
    this.expenses.set(id, newExpense);
    return newExpense;
  }
  
  async updateExpense(id: number, data: Partial<InsertExpense>): Promise<Expense | undefined> {
    const expense = await this.getExpense(id);
    if (!expense) return undefined;
    
    const updatedExpense = { ...expense, ...data };
    this.expenses.set(id, updatedExpense);
    return updatedExpense;
  }
  
  async deleteExpense(id: number): Promise<boolean> {
    return this.expenses.delete(id);
  }
  
  // Activity log methods
  async getActivities(limit: number = 10): Promise<Activity[]> {
    return Array.from(this.activities.values())
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }
  
  async getActivity(id: number): Promise<Activity | undefined> {
    return this.activities.get(id);
  }
  
  async createActivity(activity: InsertActivity): Promise<Activity> {
    const id = this.currentActivityId++;
    const newActivity: Activity = { ...activity, id };
    this.activities.set(id, newActivity);
    return newActivity;
  }
  
  // Dashboard metrics
  async getDashboardMetrics(): Promise<{
    totalBookings: number;
    activeEvents: number;
    totalMusicians: number;
    totalVenues: number;
    revenueData: {month: string, amount: number}[];
    pendingCollections: number;
  }> {
    const now = new Date();
    const totalBookings = this.bookings.size;
    const activeEvents = Array.from(this.events.values()).filter(
      e => new Date(e.startDate) >= now
    ).length;
    const totalMusicians = this.musicians.size;
    const totalVenues = this.venues.size;
    
    // Generate revenue data for last 6 months
    const revenueData: {month: string, amount: number}[] = [];
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    for (let i = 5; i >= 0; i--) {
      let month = currentMonth - i;
      let year = currentYear;
      
      if (month < 0) {
        month += 12;
        year -= 1;
      }
      
      const monthName = new Date(year, month, 1).toLocaleString('default', { month: 'short' });
      
      // Sum collections for this month
      const collections = Array.from(this.collections.values()).filter(c => {
        const collectionDate = new Date(c.date);
        return collectionDate.getMonth() === month && collectionDate.getFullYear() === year;
      });
      
      const monthlyAmount = collections.reduce((sum, c) => sum + c.amount, 0);
      revenueData.push({ month: monthName, amount: monthlyAmount });
    }
    
    // Calculate pending collections
    let pendingCollections = 0;
    const events = Array.from(this.events.values());
    
    for (const event of events) {
      // Get all collections for this event
      const eventCollections = await this.getCollections(event.id);
      const totalCollected = eventCollections.reduce((sum, c) => sum + c.amount, 0);
      
      // Estimate expected collection - in a real app this would be from the event contract
      // For now, we'll use a placeholder value
      const expectedCollection = 1000; // Placeholder
      
      if (totalCollected < expectedCollection) {
        pendingCollections += (expectedCollection - totalCollected);
      }
    }
    
    return {
      totalBookings,
      activeEvents,
      totalMusicians,
      totalVenues,
      revenueData,
      pendingCollections
    };
  }
  
  // Event profitability
  async getEventProfitability(eventId: number): Promise<{
    totalCollections: number;
    totalPayments: number;
    totalExpenses: number;
    profit: number;
  }> {
    // Get all collections for this event
    const collections = await this.getCollections(eventId);
    const totalCollections = collections.reduce((sum, c) => sum + c.amount, 0);
    
    // Get all bookings for this event
    const eventBookings = await this.getBookings(eventId);
    
    // Sum all payments for bookings
    let totalPayments = 0;
    for (const booking of eventBookings) {
      const bookingPayments = await this.getPayments(booking.id);
      totalPayments += bookingPayments.reduce((sum, p) => sum + p.amount, 0);
    }
    
    // Get all expenses for this event
    const expenses = await this.getExpenses(eventId);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    
    // Calculate profit
    const profit = totalCollections - totalPayments - totalExpenses;
    
    return {
      totalCollections,
      totalPayments,
      totalExpenses,
      profit
    };
  }
}

export const storage = new MemStorage();
