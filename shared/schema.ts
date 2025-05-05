import { pgTable, text, serial, integer, boolean, doublePrecision, timestamp, jsonb, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

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
  typeId: integer("type_id").notNull(), // Legacy foreign key to musician_types (keeping for backward compatibility)
  categoryId: integer("category_id").notNull(), // Legacy foreign key to musician_categories (keeping for backward compatibility)
  categoryIds: integer("category_ids").array(), // Multiple categories a musician can perform as
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
  categoryIds: true, // Added categoryIds array
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
  eventCategoryId: integer("event_category_id"), // Primary event category for rate calculation
  categoryIds: integer("category_ids").array(), // Foreign keys to event_categories (legacy, use eventCategoryId instead)
  musicianCategoryIds: integer("musician_category_ids").array(), // Foreign keys to musician_categories (replacing type_id)
  totalPayment: doublePrecision("total_payment"), // Total payment amount for the event
  advancePayment: doublePrecision("advance_payment"), // Advance payment received
  secondPayment: doublePrecision("second_payment"), // Second payment received
  paymentModel: text("payment_model"), // hourly, daily, or event based payment
  hoursCount: integer("hours_count"), // Number of hours for hourly payment model
  daysCount: integer("days_count"), // Number of days for daily payment model
  notes: text("notes"), // Notes about the event
});

export const insertEventSchema = createInsertSchema(events, {
  eventType: z.string().optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  paymentModel: z.string().optional(),
  hoursCount: z.number().optional(),
  daysCount: z.number().optional()
})
  .pick({
    name: true,
    paxCount: true,
    venueId: true,
    eventDates: true,
    status: true,
    eventCategoryId: true, // Primary event category for rate calculation
    categoryIds: true,     // Legacy field
    musicianCategoryIds: true, // Updated to musician category IDs
    totalPayment: true,
    advancePayment: true,
    secondPayment: true,
    notes: true,
    eventType: true,
    startDate: true,
    endDate: true,
    paymentModel: true, // Added payment model
    hoursCount: true,   // Added hours count for hourly payment model
    daysCount: true,    // Added days count for daily payment model
  })
  .extend({
    // Additional fields for our extended functionality
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
  date: timestamp("date"), // Specific date for multi-date events
  updatedAt: timestamp("updated_at"), // When the invitation was last updated
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
  date: true,
  updatedAt: true,
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
  date: true, // Include the date field
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
  categoryIds: integer("category_ids").array(), // Multiple categories/musician types
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
  categoryIds: true,
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
  contractStatus: text("contract_status").default("pending"), // pending, included, sent, signed, rejected
  contractId: integer("contract_id"), // Reference to monthly_contract_musicians
});

export const insertPlannerAssignmentSchema = createInsertSchema(plannerAssignments).pick({
  slotId: true,
  musicianId: true,
  status: true,
  notes: true,
  actualFee: true,
  contractStatus: true,
  contractId: true,
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
  isMonthly: boolean("is_monthly").default(false), // Flag to indicate if this is a monthly contract template
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
  isMonthly: true,
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

// Availability Share Links table - for sharing availability calendar with external users
export const availabilityShareLinks = pgTable("availability_share_links", {
  id: serial("id").primaryKey(),
  musicianId: integer("musician_id").notNull(), // Foreign key to musicians
  token: text("token").notNull().unique(), // Unique token for accessing the calendar
  expiresAt: timestamp("expires_at"), // When the link expires (null = never)
  createdAt: timestamp("created_at").notNull().defaultNow(),
  lastAccessedAt: timestamp("last_accessed_at"), // When the link was last accessed
});

export const insertAvailabilityShareLinkSchema = createInsertSchema(availabilityShareLinks).pick({
  musicianId: true,
  token: true,
  expiresAt: true,
});

export type AvailabilityShareLink = typeof availabilityShareLinks.$inferSelect;
export type InsertAvailabilityShareLink = z.infer<typeof insertAvailabilityShareLinkSchema>;

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

// Entity Status - centralized status management
export const entityStatus = pgTable("entity_status", {
  id: serial("id").primaryKey(),
  entityType: text("entity_type").notNull(), // 'contract', 'musician', 'event', etc.
  entityId: integer("entity_id").notNull(),
  primaryStatus: text("primary_status").notNull(), // The main status value
  customStatus: text("custom_status"), // Optional custom/specific status
  statusDate: timestamp("status_date").defaultNow(), // Date when the status is applicable
  eventId: integer("event_id"), // Optional related event
  musicianId: integer("musician_id"), // Optional related musician
  eventDate: timestamp("event_date"), // Optional related event date
  metadata: jsonb("metadata"), // Additional status context (JSON)
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
}, (table) => [
  // Create composite index for quick lookups
  // index("idx_entity_status_lookup").on(
  //   table.entityType, 
  //   table.entityId
  // ),
  // Create index for event-based lookups
  // index("idx_entity_status_event").on(
  //   table.eventId
  // )
]);

export const insertEntityStatusSchema = createInsertSchema(entityStatus).pick({
  entityType: true,
  entityId: true,
  primaryStatus: true,
  customStatus: true,
  statusDate: true,
  eventId: true,
  musicianId: true,
  eventDate: true,
  metadata: true,
});

export type EntityStatus = typeof entityStatus.$inferSelect;
export type InsertEntityStatus = z.infer<typeof insertEntityStatusSchema>;

// Monthly Contracts Schema
export const monthlyContracts = pgTable("monthly_contracts", {
  id: serial("id").primaryKey(),
  plannerId: integer("planner_id").notNull(), // Foreign key to monthly_planners
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  templateId: integer("template_id").notNull(), // Foreign key to contract_templates
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at"),
  sentAt: timestamp("sent_at"),
  status: text("status").notNull().default("draft"), // draft, sent, completed
  name: text("name"),
});

export const insertMonthlyContractSchema = createInsertSchema(monthlyContracts).pick({
  plannerId: true,
  templateId: true,
  name: true,
  month: true,
  year: true,
  status: true,
});

export type MonthlyContract = typeof monthlyContracts.$inferSelect;
export type InsertMonthlyContract = z.infer<typeof insertMonthlyContractSchema>;

// Monthly Contract Musicians table (musicians included in a monthly contract)
export const monthlyContractMusicians = pgTable("monthly_contract_musicians", {
  id: serial("id").primaryKey(),
  contractId: integer("contract_id").notNull(), // Foreign key to monthly_contracts
  musicianId: integer("musician_id").notNull(), // Foreign key to musicians
  status: text("status").notNull().default("pending"), // pending, sent, signed, rejected
  token: text("token").notNull().unique(), // Unique token for musician to access contract
  sentAt: timestamp("sent_at"), // When the contract was sent to the musician
  respondedAt: timestamp("responded_at"), // When the musician first responded
  completedAt: timestamp("completed_at"), // When all dates were responded to
  lastReminderAt: timestamp("last_reminder_at"), // When the last reminder was sent
  reminderCount: integer("reminder_count").default(0), // Number of reminders sent
  notes: text("notes"), // Admin notes about this musician's contract
  musicianNotes: text("musician_notes"), // Notes from the musician
  companySignature: text("company_signature"), // Company digital signature for the overall contract
  musicianSignature: text("musician_signature"), // Musician signature for the overall contract
  ipAddress: text("ip_address"), // IP address captured during signature
  acceptedDates: integer("accepted_dates").default(0), // Count of accepted dates
  rejectedDates: integer("rejected_dates").default(0), // Count of rejected dates
  pendingDates: integer("pending_dates").default(0), // Count of pending dates
  totalDates: integer("total_dates").default(0), // Total number of dates in this contract
  totalFee: doublePrecision("total_fee").default(0), // Total fee for all dates
  responseUrl: text("response_url"), // Unique URL for contract response
  rejectionReason: text("rejection_reason"), // If rejected, the reason provided by the musician
});

export const insertMonthlyContractMusicianSchema = createInsertSchema(monthlyContractMusicians).pick({
  contractId: true,
  musicianId: true,
  status: true,
  token: true,
  sentAt: true,
  notes: true,
  musicianNotes: true,
  companySignature: true,
  musicianSignature: true,
  ipAddress: true,
  reminderCount: true,
  acceptedDates: true,
  rejectedDates: true,
  pendingDates: true,
  totalDates: true,
  totalFee: true,
});

export type MonthlyContractMusician = typeof monthlyContractMusicians.$inferSelect;
export type InsertMonthlyContractMusician = z.infer<typeof insertMonthlyContractMusicianSchema>;

// Monthly Contract Dates table (individual dates in a monthly contract with responses)
export const monthlyContractDates = pgTable("monthly_contract_dates", {
  id: serial("id").primaryKey(),
  musicianContractId: integer("musician_contract_id").notNull(), // Foreign key to monthly_contract_musicians
  date: date("date").notNull(), // Changed to date() instead of timestamp()
  status: text("status").notNull().default("pending"), // accepted, rejected, pending
  fee: doublePrecision("fee").notNull(), // Fee for this date
  notes: text("notes"), // Notes for this specific date
  responseNotes: text("response_notes"), // Notes from musician about this date
  eventId: integer("event_id"), // Optional related event/planner slot
  venueId: integer("venue_id"), // Optional venue ID for this date
  venueName: text("venue_name"), // Venue name for this date
  startTime: text("start_time"), // Start time for this performance
  endTime: text("end_time"), // End time for this performance
  responseTimestamp: timestamp("response_timestamp"), // When the musician responded
  ipAddress: text("ip_address"), // IP address when responding
  signatureData: jsonb("signature_data"), // Signature data for this specific date
  replacementMusicianId: integer("replacement_musician_id"), // If this date was reassigned
  isReplacement: boolean("is_replacement").default(false), // If this is a replacement booking
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertMonthlyContractDateSchema = createInsertSchema(monthlyContractDates, {
  date: z.coerce.date(), // Add coercion to allow string dates
})
.omit({
  createdAt: true,
  updatedAt: true,
})
.pick({
  musicianContractId: true,
  date: true,
  status: true,
  fee: true,
  notes: true,
  responseNotes: true,
  eventId: true,
  venueId: true,
  venueName: true,
  startTime: true,
  endTime: true,
  ipAddress: true,
  signatureData: true,
  replacementMusicianId: true,
  isReplacement: true
});

export type MonthlyContractDate = typeof monthlyContractDates.$inferSelect;
export type InsertMonthlyContractDate = z.infer<typeof insertMonthlyContractDateSchema>;

// Monthly Contract Status History table
export const monthlyContractStatusHistory = pgTable("monthly_contract_status_history", {
  id: serial("id").primaryKey(),
  contractId: integer("contract_id").notNull(), // FK to monthly_contracts
  musicianId: integer("musician_id").notNull(), // FK to musicians - which musician this status change applies to
  previousStatus: text("previous_status").notNull(),
  newStatus: text("new_status").notNull(),
  changedAt: timestamp("changed_at").notNull().defaultNow(),
  changedById: integer("changed_by_id"), // FK to users - who made the change
  notes: text("notes"), // Optional notes about this status change
  reason: text("reason"), // Reason for rejection or cancellation
});

export const insertMonthlyContractStatusHistorySchema = createInsertSchema(monthlyContractStatusHistory)
.omit({
  id: true,
})
.pick({
  contractId: true,
  previousStatus: true,
  newStatus: true,
  changedById: true,
  notes: true
});

export type MonthlyContractStatusHistory = typeof monthlyContractStatusHistory.$inferSelect;
export type InsertMonthlyContractStatusHistory = z.infer<typeof insertMonthlyContractStatusHistorySchema>;

// Define relationships between tables

export const monthlyContractsRelations = relations(monthlyContracts, ({ one, many }) => ({
  planner: one(monthlyPlanners, {
    fields: [monthlyContracts.plannerId],
    references: [monthlyPlanners.id],
  }),
  template: one(contractTemplates, {
    fields: [monthlyContracts.templateId],
    references: [contractTemplates.id],
  }),
  musicians: many(monthlyContractMusicians),
}));

export const monthlyContractMusiciansRelations = relations(monthlyContractMusicians, ({ one, many }) => ({
  contract: one(monthlyContracts, {
    fields: [monthlyContractMusicians.contractId],
    references: [monthlyContracts.id],
  }),
  musician: one(musicians, {
    fields: [monthlyContractMusicians.musicianId],
    references: [musicians.id],
  }),
  dates: many(monthlyContractDates),
}));

export const monthlyContractDatesRelations = relations(monthlyContractDates, ({ one }) => ({
  musicianContract: one(monthlyContractMusicians, {
    fields: [monthlyContractDates.musicianContractId],
    references: [monthlyContractMusicians.id],
  }),
}));