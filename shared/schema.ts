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

// Musician category model
export const musicianCategories = pgTable("musician_categories", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  // Additional fields can be added here
});

export const insertMusicianCategorySchema = createInsertSchema(musicianCategories).pick({
  title: true,
  description: true,
});

// Venue category model
export const venueCategories = pgTable("venue_categories", {
  id: serial("id").primaryKey(), 
  title: text("title").notNull(),
  description: text("description"),
  // Additional fields can be added here
});

export const insertVenueCategorySchema = createInsertSchema(venueCategories).pick({
  title: true,
  description: true,
});

// Event category model
export const eventCategories = pgTable("event_categories", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  // Additional fields can be added here
});

export const insertEventCategorySchema = createInsertSchema(eventCategories).pick({
  title: true,
  description: true,
});

// Musician type model
export const musicianTypes = pgTable("musician_types", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  // Additional fields can be added here
});

export const insertMusicianTypeSchema = createInsertSchema(musicianTypes).pick({
  title: true,
  description: true,
});

// Musician model
export const musicians = pgTable("musicians", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  typeId: integer("type_id").notNull(), // Foreign key to musician_types
  categoryId: integer("category_id").notNull(), // Foreign key to musician_categories
  instruments: text("instruments").array(),
  profileImage: text("profile_image"),
  bio: text("bio"),
  rating: doublePrecision("rating"),
});

export const insertMusicianSchema = createInsertSchema(musicians).pick({
  name: true,
  email: true,
  phone: true,
  typeId: true,
  categoryId: true,
  instruments: true,
  profileImage: true,
  bio: true,
  rating: true,
});

// Musician pay rates model
export const musicianPayRates = pgTable("musician_pay_rates", {
  id: serial("id").primaryKey(),
  musicianId: integer("musician_id").notNull(), // Foreign key to musicians
  eventCategoryId: integer("event_category_id").notNull(), // Foreign key to event_categories
  hourlyRate: doublePrecision("hourly_rate"), // Rate per hour
  dayRate: doublePrecision("day_rate"), // Rate per day
  eventRate: doublePrecision("event_rate"), // Rate per event
  notes: text("notes"), // Additional notes about the pay rate
});

export const insertMusicianPayRateSchema = createInsertSchema(musicianPayRates).pick({
  musicianId: true,
  eventCategoryId: true,
  hourlyRate: true,
  dayRate: true,
  eventRate: true,
  notes: true,
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
  eventDates: timestamp("event_dates").array(), // Array of dates for multi-day events
  status: text("status").notNull().default("pending"), // pending, confirmed, cancelled
  categoryIds: integer("category_ids").array(), // Foreign keys to event_categories
  musicianTypeId: integer("musician_type_id"), // Foreign key to musician_types
  totalPayment: doublePrecision("total_payment"), // Total payment amount for the event
  advancePayment: doublePrecision("advance_payment"), // Advance payment received
  secondPayment: doublePrecision("second_payment"), // Second payment received
  notes: text("notes"), // Notes about the event
});

export const insertEventSchema = createInsertSchema(events, {
  eventType: z.string().optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional()
})
  .pick({
    name: true,
    paxCount: true,
    venueId: true,
    eventDates: true,
    status: true,
    categoryIds: true,
    musicianTypeId: true,
    totalPayment: true,
    advancePayment: true,
    secondPayment: true,
    notes: true,
    eventType: true,
    startDate: true,
    endDate: true,
  })
  .extend({
    // Additional fields for our extended functionality
    musicianTypeIds: z.array(z.number()).optional(),
    musicianIds: z.array(z.number()).optional(),
    // Date-specific musician assignments
    // Format: { "2023-01-01T00:00:00.000Z": [1, 2, 3] }
    musicianAssignments: z.record(z.string(), z.array(z.number())).optional(),
  });

// Invitation model (invitations to musicians for events)
export const invitations = pgTable("invitations", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull(), // Foreign key to events
  musicianId: integer("musician_id").notNull(), // Foreign key to musicians
  invitedAt: timestamp("invited_at").notNull(),
  respondedAt: timestamp("responded_at"),
  status: text("status").notNull().default("invited"), // invited, accepted, rejected
  responseMessage: text("response_message"),
  email: text("email").notNull(),
  messageSubject: text("message_subject").notNull(),
  messageBody: text("message_body").notNull(),
  reminders: integer("reminders").default(0), // Number of reminders sent
  lastReminderAt: timestamp("last_reminder_at"),
});

export const insertInvitationSchema = createInsertSchema(invitations).pick({
  eventId: true,
  musicianId: true,
  invitedAt: true,
  respondedAt: true,
  status: true,
  responseMessage: true,
  email: true,
  messageSubject: true,
  messageBody: true,
  reminders: true,
  lastReminderAt: true,
});

// Booking model (confirmed musicians for events after contract signing)
export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull(), // Foreign key to events
  musicianId: integer("musician_id").notNull(), // Foreign key to musicians
  invitationId: integer("invitation_id").notNull(), // Foreign key to invitations
  contractSent: boolean("contract_sent").default(false),
  contractSentAt: timestamp("contract_sent_at"),
  contractSigned: boolean("contract_signed").default(false),
  contractSignedAt: timestamp("contract_signed_at"),
  paymentAmount: doublePrecision("payment_amount"),
  paymentStatus: text("payment_status").default("pending"), // pending, paid, partial
  advancePayment: doublePrecision("advance_payment"),
  advancePaidAt: timestamp("advance_paid_at"),
  finalPayment: doublePrecision("final_payment"),
  finalPaidAt: timestamp("final_paid_at"),
  contractDetails: jsonb("contract_details"),
  notes: text("notes"),
  date: timestamp("date"), // Added date field to track which specific date this booking is for
});

export const insertBookingSchema = createInsertSchema(bookings).pick({
  eventId: true,
  musicianId: true,
  invitationId: true,
  contractSent: true,
  contractSentAt: true,
  contractSigned: true,
  contractSignedAt: true,
  paymentAmount: true,
  paymentStatus: true,
  advancePayment: true,
  advancePaidAt: true,
  finalPayment: true,
  finalPaidAt: true,
  contractDetails: true,
  notes: true,
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

// Category types
export type MusicianCategory = typeof musicianCategories.$inferSelect;
export type InsertMusicianCategory = z.infer<typeof insertMusicianCategorySchema>;

export type VenueCategory = typeof venueCategories.$inferSelect;
export type InsertVenueCategory = z.infer<typeof insertVenueCategorySchema>;

export type EventCategory = typeof eventCategories.$inferSelect;
export type InsertEventCategory = z.infer<typeof insertEventCategorySchema>;

export type MusicianType = typeof musicianTypes.$inferSelect;
export type InsertMusicianType = z.infer<typeof insertMusicianTypeSchema>;

// Legacy category type (for backwards compatibility)
// This will keep existing code working until we can update references
export const categories = musicianCategories;
export const insertCategorySchema = insertMusicianCategorySchema;
export type Category = MusicianCategory;
export type InsertCategory = InsertMusicianCategory;

export type Musician = typeof musicians.$inferSelect;
export type InsertMusician = z.infer<typeof insertMusicianSchema>;

export type MusicianPayRate = typeof musicianPayRates.$inferSelect;
export type InsertMusicianPayRate = z.infer<typeof insertMusicianPayRateSchema>;

export type Availability = typeof availability.$inferSelect;
export type InsertAvailability = z.infer<typeof insertAvailabilitySchema>;

export type Event = typeof events.$inferSelect;
export type InsertEvent = z.infer<typeof insertEventSchema>;

export type Invitation = typeof invitations.$inferSelect;
export type InsertInvitation = z.infer<typeof insertInvitationSchema>;

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
  categoryId: integer("category_id").notNull(), // Foreign key to musician_categories
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

// Email Templates model
export const emailTemplates = pgTable("email_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  subject: text("subject").notNull(),
  htmlContent: text("html_content").notNull(),
  textContent: text("text_content").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at"),
  isDefault: boolean("is_default").notNull().default(false),
});

export const insertEmailTemplateSchema = createInsertSchema(emailTemplates).pick({
  name: true,
  subject: true,
  htmlContent: true,
  textContent: true,
  description: true,
  isDefault: true,
});

export type EmailTemplate = typeof emailTemplates.$inferSelect;
export type InsertEmailTemplate = z.infer<typeof insertEmailTemplateSchema>;

// Share Links for availability
export const shareLinks = pgTable("share_links", {
  id: serial("id").primaryKey(),
  token: text("token").notNull().unique(),
  musicianId: integer("musician_id").notNull(), // Foreign key to musicians
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  isActive: boolean("is_active").notNull().default(true),
});

export const insertShareLinkSchema = createInsertSchema(shareLinks).pick({
  token: true,
  musicianId: true,
  expiresAt: true,
  isActive: true,
});

export type ShareLink = typeof shareLinks.$inferSelect;
export type InsertShareLink = z.infer<typeof insertShareLinkSchema>;

// Contract Links model for sending private contract links to musicians
export const contractLinks = pgTable("contract_links", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id").notNull(), // Foreign key to bookings
  eventId: integer("event_id").notNull(), // Foreign key to events
  musicianId: integer("musician_id").notNull(), // Foreign key to musicians
  invitationId: integer("invitation_id").notNull(), // Foreign key to musician invitations
  token: text("token").notNull().unique(), // Unique token for access
  expiresAt: timestamp("expires_at").notNull(),
  status: text("status").notNull().default("pending"), // pending, accepted, rejected
  respondedAt: timestamp("responded_at"),
  response: text("response"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  amount: doublePrecision("amount"), // Amount to be paid to musician
  eventDate: timestamp("event_date"), // Specific date for the event if multi-day
  companySignature: text("company_signature"), // Company digital signature
  musicianSignature: text("musician_signature"), // Musician digital signature
});

export const insertContractLinkSchema = createInsertSchema(contractLinks).pick({
  bookingId: true,
  eventId: true,
  musicianId: true,
  invitationId: true,
  token: true,
  expiresAt: true,
  status: true,
  amount: true,
  eventDate: true,
  companySignature: true,
  musicianSignature: true,
});

export type ContractLink = typeof contractLinks.$inferSelect;
export type InsertContractLink = z.infer<typeof insertContractLinkSchema>;

// Contract Templates for standardizing contract content
export const contractTemplates = pgTable("contract_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  content: text("content").notNull(),
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at"),
  createdBy: integer("created_by"), // User ID
  variables: jsonb("variables"), // List of variables that can be used in the template
});

export const insertContractTemplateSchema = createInsertSchema(contractTemplates).pick({
  name: true,
  description: true,
  content: true,
  isDefault: true,
  createdBy: true,
  variables: true,
});

export type ContractTemplate = typeof contractTemplates.$inferSelect;
export type InsertContractTemplate = z.infer<typeof insertContractTemplateSchema>;

// Performance Rating and Improvement Plans
export const performanceRatings = pgTable("performance_ratings", {
  id: serial("id").primaryKey(),
  musicianId: integer("musician_id").notNull(),
  bookingId: integer("booking_id"),
  rating: integer("rating").notNull(), // 1-5 scale
  feedback: text("feedback"),
  ratedBy: integer("rated_by").notNull(), // User ID
  ratedAt: timestamp("rated_at").notNull().defaultNow(),
  category: text("category"), // punctuality, musicianship, etc.
});

export const insertPerformanceRatingSchema = createInsertSchema(performanceRatings).pick({
  musicianId: true,
  bookingId: true,
  rating: true,
  feedback: true,
  ratedBy: true,
  category: true,
});

export type PerformanceRating = typeof performanceRatings.$inferSelect;
export type InsertPerformanceRating = z.infer<typeof insertPerformanceRatingSchema>;

// Improvement Plans for musicians
export const improvementPlans = pgTable("improvement_plans", {
  id: serial("id").primaryKey(),
  musicianId: integer("musician_id").notNull(),
  planId: integer("plan_id").notNull(),
  action: text("action").notNull(),
  addedAt: timestamp("added_at").notNull().defaultNow(),
  dueDate: timestamp("due_date"),
  status: text("status").notNull().default("pending"), // pending, completed, overdue
  completedAt: timestamp("completed_at"),
  feedback: text("feedback"),
});

export const insertImprovementPlanSchema = createInsertSchema(improvementPlans).pick({
  musicianId: true,
  planId: true,
  action: true,
  dueDate: true,
  status: true,
  feedback: true,
});

export type ImprovementPlan = typeof improvementPlans.$inferSelect;
export type InsertImprovementPlan = z.infer<typeof insertImprovementPlanSchema>;

// Skill Tags for musicians
export const skillTags = pgTable("skill_tags", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
});

export const insertSkillTagSchema = createInsertSchema(skillTags).pick({
  name: true,
  description: true,
});

export type SkillTag = typeof skillTags.$inferSelect;
export type InsertSkillTag = z.infer<typeof insertSkillTagSchema>;

// Musician Skills (many-to-many)
export const musicianSkills = pgTable("musician_skills", {
  id: serial("id").primaryKey(),
  musicianId: integer("musician_id").notNull(),
  skillId: integer("skill_id").notNull(),
  level: integer("level"), // Optional proficiency level (1-5)
  addedAt: timestamp("added_at").notNull().defaultNow(),
});

export const insertMusicianSkillSchema = createInsertSchema(musicianSkills).pick({
  musicianId: true,
  skillId: true,
  level: true,
});

export type MusicianSkill = typeof musicianSkills.$inferSelect;
export type InsertMusicianSkill = z.infer<typeof insertMusicianSkillSchema>;