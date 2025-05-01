import { pgTable, text, serial, integer, boolean, doublePrecision, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Define JSON type for TypeScript
export type Json = any;

// User model for admin authentication
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  role: text("role").notNull().default("admin"),
  profileImage: text("profile_image"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  name: true,
  email: true,
  role: true,
  profileImage: true,
});

// Venue model
export const venues = pgTable("venues", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  location: text("location").notNull(),
  paxCount: integer("pax_count").notNull(),
  address: text("address").notNull(),
  venuePictures: text("venue_pictures").array(),
  openingHours: text("opening_hours"),
  capacity: integer("capacity"),
  hourlyRate: doublePrecision("hourly_rate"),
  description: text("description"),
  rating: doublePrecision("rating"),
});

export const insertVenueSchema = createInsertSchema(venues).pick({
  name: true,
  location: true,
  paxCount: true,
  address: true,
  venuePictures: true,
  openingHours: true,
  capacity: true,
  hourlyRate: true,
  description: true,
  rating: true,
});

// Music category model
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
});

export const insertCategorySchema = createInsertSchema(categories).pick({
  title: true,
  description: true,
});

// Musician model
export const musicians = pgTable("musicians", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  type: text("type").notNull(), // e.g., Pianist, Guitarist, Vocalist
  payRate: doublePrecision("pay_rate").notNull(),
  categoryId: integer("category_id").notNull(), // Foreign key to categories
  instruments: text("instruments").array(),
  profileImage: text("profile_image"),
  bio: text("bio"),
  rating: doublePrecision("rating"),
});

export const insertMusicianSchema = createInsertSchema(musicians).pick({
  name: true,
  email: true,
  phone: true,
  type: true,
  payRate: true,
  categoryId: true,
  instruments: true,
  profileImage: true,
  bio: true,
  rating: true,
});

// Musician availability model
export const availability = pgTable("availability", {
  id: serial("id").primaryKey(),
  musicianId: integer("musician_id").notNull(), // Foreign key to musicians
  date: timestamp("date").notNull(),
  isAvailable: boolean("is_available").notNull().default(false),
  month: text("month").notNull(), // Format: YYYY-MM
  year: integer("year").notNull(),
});

export const insertAvailabilitySchema = createInsertSchema(availability).pick({
  musicianId: true,
  date: true,
  isAvailable: true,
  month: true,
  year: true,
});

// Event model
export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  paxCount: integer("pax_count").notNull(),
  venueId: integer("venue_id").notNull(), // Foreign key to venues
  eventType: text("event_type").notNull(), // One Day, Multi-day (continuous), Multi-day (occurrence)
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  status: text("status").notNull().default("pending"), // pending, confirmed, cancelled
  categoryIds: integer("category_ids").array(), // Foreign keys to categories
});

export const insertEventSchema = createInsertSchema(events).pick({
  name: true,
  paxCount: true,
  venueId: true,
  eventType: true,
  startDate: true,
  endDate: true,
  status: true,
  categoryIds: true,
});

// Booking model (musicians for events)
export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull(), // Foreign key to events
  musicianId: integer("musician_id").notNull(), // Foreign key to musicians
  invitedAt: timestamp("invited_at").notNull(),
  respondedAt: timestamp("responded_at"),
  isAccepted: boolean("is_accepted"),
  contractSent: boolean("contract_sent").default(false),
  contractSentAt: timestamp("contract_sent_at"),
  contractSigned: boolean("contract_signed").default(false),
  contractSignedAt: timestamp("contract_signed_at"),
  paymentAmount: doublePrecision("payment_amount"),
  paymentStatus: text("payment_status").default("pending"), // pending, paid, partial
  contractDetails: jsonb("contract_details"),
});

export const insertBookingSchema = createInsertSchema(bookings).pick({
  eventId: true,
  musicianId: true,
  invitedAt: true,
  respondedAt: true,
  isAccepted: true,
  contractSent: true,
  contractSentAt: true,
  contractSigned: true,
  contractSignedAt: true,
  paymentAmount: true,
  paymentStatus: true,
  contractDetails: true,
});

// Payment model for musicians
export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id").notNull(), // Foreign key to bookings
  amount: doublePrecision("amount").notNull(),
  date: timestamp("date").notNull(),
  method: text("method"), // e.g., Cash, Bank Transfer
  notes: text("notes"),
});

export const insertPaymentSchema = createInsertSchema(payments).pick({
  bookingId: true,
  amount: true,
  date: true,
  method: true,
  notes: true,
});

// Collection model for payments received from events
export const collections = pgTable("collections", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull(), // Foreign key to events
  amount: doublePrecision("amount").notNull(),
  date: timestamp("date").notNull(),
  method: text("method"), // e.g., Cash, Bank Transfer
  notes: text("notes"),
});

export const insertCollectionSchema = createInsertSchema(collections).pick({
  eventId: true,
  amount: true,
  date: true,
  method: true,
  notes: true,
});

// Event expenses (for overseas events)
export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull(), // Foreign key to events
  description: text("description").notNull(),
  amount: doublePrecision("amount").notNull(),
  date: timestamp("date").notNull(),
  category: text("category"), // e.g., Travel, Accommodation
  notes: text("notes"),
});

export const insertExpenseSchema = createInsertSchema(expenses).pick({
  eventId: true,
  description: true,
  amount: true,
  date: true,
  category: true,
  notes: true,
});

// Activity log
export const activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"), // Foreign key to users, can be null for system actions
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(), // e.g., Musician, Event, Booking
  entityId: integer("entity_id").notNull(),
  timestamp: timestamp("timestamp").notNull(),
  details: jsonb("details"),
});

export const insertActivitySchema = createInsertSchema(activities).pick({
  userId: true,
  action: true,
  entityType: true,
  entityId: true,
  timestamp: true,
  details: true,
});

// Export types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Venue = typeof venues.$inferSelect;
export type InsertVenue = z.infer<typeof insertVenueSchema>;

export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;

export type Musician = typeof musicians.$inferSelect;
export type InsertMusician = z.infer<typeof insertMusicianSchema>;

export type Availability = typeof availability.$inferSelect;
export type InsertAvailability = z.infer<typeof insertAvailabilitySchema>;

export type Event = typeof events.$inferSelect;
export type InsertEvent = z.infer<typeof insertEventSchema>;

export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = z.infer<typeof insertBookingSchema>;

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;

export type Collection = typeof collections.$inferSelect;
export type InsertCollection = z.infer<typeof insertCollectionSchema>;

export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;

export type Activity = typeof activities.$inferSelect;
export type InsertActivity = z.infer<typeof insertActivitySchema>;

// Application Settings model
export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  type: text("type").notNull().unique(), // email, notifications, etc.
  data: jsonb("data").notNull(), // JSON data for the specific settings type
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertSettingsSchema = createInsertSchema(settings).pick({
  type: true,
  data: true,
});

export type Settings = typeof settings.$inferSelect;
export type InsertSettings = z.infer<typeof insertSettingsSchema>;

// Monthly Planner model
export const monthlyPlanners = pgTable("monthly_planners", {
  id: serial("id").primaryKey(),
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  status: text("status").notNull().default("draft"), // draft, active, completed
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at"),
});

export const insertMonthlyPlannerSchema = createInsertSchema(monthlyPlanners).pick({
  month: true,
  year: true,
  name: true,
  description: true,
  status: true,
});

// Planner Slot model (individual performances within a planner)
export const plannerSlots = pgTable("planner_slots", {
  id: serial("id").primaryKey(),
  plannerId: integer("planner_id").notNull(), // Foreign key to monthly_planners
  date: timestamp("date").notNull(),
  venueId: integer("venue_id").notNull(), // Foreign key to venues
  categoryId: integer("category_id").notNull(), // Foreign key to categories
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  description: text("description"),
  status: text("status").notNull().default("open"), // open, assigned, completed
  fee: doublePrecision("fee"), // Fee for this slot
});

export const insertPlannerSlotSchema = createInsertSchema(plannerSlots).pick({
  plannerId: true,
  date: true,
  venueId: true,
  categoryId: true,
  startTime: true,
  endTime: true,
  description: true,
  status: true,
  fee: true,
});

// Planner Assignment model (musician assigned to slots)
export const plannerAssignments = pgTable("planner_assignments", {
  id: serial("id").primaryKey(),
  slotId: integer("slot_id").notNull(), // Foreign key to planner_slots
  musicianId: integer("musician_id").notNull(), // Foreign key to musicians
  assignedAt: timestamp("assigned_at").notNull().defaultNow(),
  status: text("status").notNull().default("scheduled"), // scheduled, confirmed, attended, absent
  attendanceMarkedAt: timestamp("attendance_marked_at"),
  attendanceMarkedBy: integer("attendance_marked_by"), // User ID who marked attendance
  notes: text("notes"),
  actualFee: doublePrecision("actual_fee"), // Could differ from slot fee (e.g., overtime)
});

export const insertPlannerAssignmentSchema = createInsertSchema(plannerAssignments).pick({
  slotId: true,
  musicianId: true,
  status: true,
  notes: true,
  actualFee: true,
});

// Monthly Invoice model
export const monthlyInvoices = pgTable("monthly_invoices", {
  id: serial("id").primaryKey(),
  plannerId: integer("planner_id").notNull(), // Foreign key to monthly_planners
  musicianId: integer("musician_id").notNull(), // Foreign key to musicians
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  totalSlots: integer("total_slots").notNull().default(0),
  attendedSlots: integer("attended_slots").notNull().default(0),
  totalAmount: doublePrecision("total_amount").notNull().default(0),
  status: text("status").notNull().default("draft"), // draft, finalized, paid
  generatedAt: timestamp("generated_at").notNull().defaultNow(),
  paidAt: timestamp("paid_at"),
  notes: text("notes"),
});

export const insertMonthlyInvoiceSchema = createInsertSchema(monthlyInvoices).pick({
  plannerId: true,
  musicianId: true,
  month: true,
  year: true,
  totalSlots: true,
  attendedSlots: true,
  totalAmount: true,
  status: true,
  notes: true,
});

export type MonthlyPlanner = typeof monthlyPlanners.$inferSelect;
export type InsertMonthlyPlanner = z.infer<typeof insertMonthlyPlannerSchema>;

export type PlannerSlot = typeof plannerSlots.$inferSelect;
export type InsertPlannerSlot = z.infer<typeof insertPlannerSlotSchema>;

export type PlannerAssignment = typeof plannerAssignments.$inferSelect;
export type InsertPlannerAssignment = z.infer<typeof insertPlannerAssignmentSchema>;

export type MonthlyInvoice = typeof monthlyInvoices.$inferSelect;
export type InsertMonthlyInvoice = z.infer<typeof insertMonthlyInvoiceSchema>;
