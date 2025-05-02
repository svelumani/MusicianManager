import {
  users, venues, categories, musicianCategories, venueCategories, eventCategories,
  musicians, musicianPayRates, availability, events, bookings, payments, collections, expenses, 
  activities, monthlyPlanners, plannerSlots, plannerAssignments, monthlyInvoices,
  settings, emailTemplates, musicianTypes, musicianTypeCategories,
  performanceRatings, performanceMetrics, skillTags, musicianSkillTags,
  improvementPlans, improvementActions, availabilityShareLinks, contractLinks, contractTemplates,
  type User, type InsertUser, type Venue, 
  type InsertVenue, type Category, type InsertCategory, 
  type MusicianCategory, type InsertMusicianCategory,
  type VenueCategory, type InsertVenueCategory,
  type EventCategory, type InsertEventCategory,
  type Musician, type InsertMusician, type MusicianPayRate, type InsertMusicianPayRate, type Availability, 
  type InsertAvailability, type Event, type InsertEvent, 
  type Booking, type InsertBooking, type Payment, type InsertPayment, 
  type Collection, type InsertCollection, type Expense, 
  type InsertExpense, type Activity, type InsertActivity,
  type MonthlyPlanner, type InsertMonthlyPlanner,
  type PlannerSlot, type InsertPlannerSlot,
  type PlannerAssignment, type InsertPlannerAssignment,
  type MonthlyInvoice, type InsertMonthlyInvoice,
  type Settings, type InsertSettings,
  type EmailTemplate, type InsertEmailTemplate,
  type MusicianType, type InsertMusicianType,
  type MusicianTypeCategory, type InsertMusicianTypeCategory,
  type PerformanceRating, type InsertPerformanceRating,
  type PerformanceMetric, type InsertPerformanceMetric,
  type SkillTag, type InsertSkillTag,
  type MusicianSkillTag, type InsertMusicianSkillTag,
  type ImprovementPlan, type InsertImprovementPlan,
  type ImprovementAction, type InsertImprovementAction,
  type AvailabilityShareLink, type InsertAvailabilityShareLink,
  type ContractLink, type InsertContractLink,
  type ContractTemplate, type InsertContractTemplate
} from "@shared/schema";

// Define the storage interface
export interface IStorage {
  // User management
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, data: Partial<InsertUser>): Promise<User | undefined>;
  
  // Event musician assignments and invitations
  getEventMusicianAssignments(eventId: number): Promise<Record<string, number[]>>;
  getEventMusicianStatuses(eventId: number): Promise<Record<string, Record<number, string>>>;
  updateMusicianEventStatus(eventId: number, musicianId: number, status: string): Promise<boolean>;
  
  // Settings management
  getSettings(type: string): Promise<Settings | undefined>;
  createSettings(type: string, data: any): Promise<Settings>;
  updateSettings(type: string, data: any): Promise<Settings | undefined>;
  
  // Email template management
  getEmailTemplates(): Promise<EmailTemplate[]>;
  getEmailTemplate(id: number): Promise<EmailTemplate | undefined>;
  getEmailTemplateByName(name: string): Promise<EmailTemplate | undefined>;
  createEmailTemplate(template: InsertEmailTemplate): Promise<EmailTemplate>;
  updateEmailTemplate(id: number, data: Partial<InsertEmailTemplate>): Promise<EmailTemplate | undefined>;
  deleteEmailTemplate(id: number): Promise<boolean>;
  
  // Musician Type management
  getMusicianTypes(): Promise<MusicianType[]>;
  getMusicianType(id: number): Promise<MusicianType | undefined>;
  getMusicianTypeCategories(musicianTypeId: number): Promise<Category[]>;
  createMusicianType(musicianType: InsertMusicianType): Promise<MusicianType>;
  updateMusicianType(id: number, data: Partial<InsertMusicianType>): Promise<MusicianType | undefined>;
  deleteMusicianType(id: number): Promise<boolean>;
  associateMusicianTypeWithCategory(musicianTypeId: number, categoryId: number): Promise<boolean>;
  removeMusicianTypeCategory(musicianTypeId: number, categoryId: number): Promise<boolean>;
  
  // Venue management
  getVenues(): Promise<Venue[]>;
  getVenue(id: number): Promise<Venue | undefined>;
  createVenue(venue: InsertVenue): Promise<Venue>;
  updateVenue(id: number, data: Partial<InsertVenue>): Promise<Venue | undefined>;
  deleteVenue(id: number): Promise<boolean>;
  
  // Category management (legacy)
  getCategories(): Promise<Category[]>;
  getCategory(id: number): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: number, data: Partial<InsertCategory>): Promise<Category | undefined>;
  deleteCategory(id: number): Promise<boolean>;
  
  // Musician Category management
  getMusicianCategories(): Promise<MusicianCategory[]>;
  getMusicianCategory(id: number): Promise<MusicianCategory | undefined>;
  createMusicianCategory(category: InsertMusicianCategory): Promise<MusicianCategory>;
  updateMusicianCategory(id: number, data: Partial<InsertMusicianCategory>): Promise<MusicianCategory | undefined>;
  deleteMusicianCategory(id: number): Promise<boolean>;
  
  // Venue Category management
  getVenueCategories(): Promise<VenueCategory[]>;
  getVenueCategory(id: number): Promise<VenueCategory | undefined>;
  createVenueCategory(category: InsertVenueCategory): Promise<VenueCategory>;
  updateVenueCategory(id: number, data: Partial<InsertVenueCategory>): Promise<VenueCategory | undefined>;
  deleteVenueCategory(id: number): Promise<boolean>;
  
  // Event Category management
  getEventCategories(): Promise<EventCategory[]>;
  getEventCategory(id: number): Promise<EventCategory | undefined>;
  createEventCategory(category: InsertEventCategory): Promise<EventCategory>;
  updateEventCategory(id: number, data: Partial<InsertEventCategory>): Promise<EventCategory | undefined>;
  deleteEventCategory(id: number): Promise<boolean>;
  
  // Musician management
  getMusicians(): Promise<Musician[]>;
  getMusician(id: number): Promise<Musician | undefined>;
  createMusician(musician: InsertMusician): Promise<Musician>;
  updateMusician(id: number, data: Partial<InsertMusician>): Promise<Musician | undefined>;
  deleteMusician(id: number): Promise<boolean>;
  
  // Musician Pay Rates management
  getMusicianPayRates(): Promise<MusicianPayRate[]>;
  getMusicianPayRate(id: number): Promise<MusicianPayRate | undefined>;
  getMusicianPayRatesByMusicianId(musicianId: number): Promise<MusicianPayRate[]>;
  createMusicianPayRate(payRate: InsertMusicianPayRate): Promise<MusicianPayRate>;
  updateMusicianPayRate(id: number, data: Partial<InsertMusicianPayRate>): Promise<MusicianPayRate | undefined>;
  deleteMusicianPayRate(id: number): Promise<boolean>;
  
  // Availability management
  getAvailability(musicianId: number, month: string): Promise<Availability[]>;
  getMusicianAvailabilityForDate(musicianId: number, date: Date): Promise<Availability | undefined>;
  createAvailability(availability: InsertAvailability): Promise<Availability>;
  updateAvailability(id: number, data: Partial<InsertAvailability>): Promise<Availability | undefined>;
  deleteAvailability(id: number): Promise<boolean>;
  getAvailableMusiciansForDate(date: Date, categoryIds?: number[]): Promise<Musician[]>;
  updateAvailabilityForDate(musicianId: number, date: string, isAvailable: boolean, month: string, year: number): Promise<Availability>;
  
  // Event management
  getEvents(): Promise<Event[]>;
  getEvent(id: number): Promise<Event | undefined>;
  createEvent(event: InsertEvent): Promise<Event>;
  updateEvent(id: number, data: Partial<InsertEvent>): Promise<Event | undefined>;
  deleteEvent(id: number): Promise<boolean>;
  getUpcomingEvents(limit?: number): Promise<Event[]>;
  getEventMusicianAssignments(eventId: number): Promise<Record<string, number[]>>;
  
  // Booking management
  getBookings(eventId?: number): Promise<Booking[]>;
  getBooking(id: number): Promise<Booking | undefined>;
  getBookingsByMusician(musicianId: number): Promise<Booking[]>;
  getBookingsByMusicianAndMonth(musicianId: number, month: number, year: number): Promise<Booking[]>;
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
  
  // Contract management
  getContractLinks(): Promise<ContractLink[]>;
  getContractLink(id: number): Promise<ContractLink | undefined>;
  getContractLinkByToken(token: string): Promise<ContractLink | undefined>;
  getContractLinksByEvent(eventId: number): Promise<ContractLink[]>;
  getContractLinksByMusician(musicianId: number): Promise<ContractLink[]>;
  createContractLink(contract: InsertContractLink): Promise<ContractLink>;
  updateContractLink(id: number, data: Partial<InsertContractLink>): Promise<ContractLink | undefined>;
  updateContractLinkStatus(token: string, status: string, response?: string): Promise<ContractLink | undefined>;
  
  // Contract Template management
  getContractTemplates(): Promise<ContractTemplate[]>;
  getContractTemplate(id: number): Promise<ContractTemplate | undefined>;
  getDefaultContractTemplate(): Promise<ContractTemplate | undefined>;
  createContractTemplate(template: InsertContractTemplate): Promise<ContractTemplate>;
  updateContractTemplate(id: number, data: Partial<InsertContractTemplate>): Promise<ContractTemplate | undefined>;
  deleteContractTemplate(id: number): Promise<boolean>;
  setDefaultContractTemplate(id: number): Promise<boolean>;
  
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
  
  // Musician Types management
  getMusicianTypes(): Promise<MusicianType[]>;
  getMusicianType(id: number): Promise<MusicianType | undefined>;
  getMusicianTypeCategories(musicianTypeId: number): Promise<Category[]>;
  createMusicianType(musicianType: InsertMusicianType): Promise<MusicianType>;
  updateMusicianType(id: number, data: Partial<InsertMusicianType>): Promise<MusicianType | undefined>;
  deleteMusicianType(id: number): Promise<boolean>;
  associateMusicianTypeWithCategory(musicianTypeId: number, categoryId: number): Promise<boolean>;
  removeMusicianTypeCategory(musicianTypeId: number, categoryId: number): Promise<boolean>;
  
  // Musician Pay Rates management
  getMusicianPayRates(): Promise<MusicianPayRate[]>;
  getMusicianPayRate(id: number): Promise<MusicianPayRate | undefined>;
  getMusicianPayRatesByMusicianId(musicianId: number): Promise<MusicianPayRate[]>;
  createMusicianPayRate(payRate: InsertMusicianPayRate): Promise<MusicianPayRate>;
  updateMusicianPayRate(id: number, data: Partial<InsertMusicianPayRate>): Promise<MusicianPayRate | undefined>;
  deleteMusicianPayRate(id: number): Promise<boolean>;
  
  // Performance Rating management
  getPerformanceRatings(musicianId?: number, bookingId?: number, plannerAssignmentId?: number): Promise<PerformanceRating[]>;
  getPerformanceRating(id: number): Promise<PerformanceRating | undefined>;
  createPerformanceRating(rating: InsertPerformanceRating): Promise<PerformanceRating>;
  updatePerformanceRating(id: number, data: Partial<InsertPerformanceRating>): Promise<PerformanceRating | undefined>;
  deletePerformanceRating(id: number): Promise<boolean>;
  getMusicianAverageRatings(musicianId: number): Promise<{
    overallRating: number;
    punctuality: number;
    musicianship: number;
    professionalism: number;
    appearance: number;
    flexibility: number;
    totalRatings: number;
  }>;
  
  // Performance Metrics management
  getPerformanceMetrics(musicianId: number): Promise<PerformanceMetric | undefined>;
  createPerformanceMetrics(metrics: InsertPerformanceMetric): Promise<PerformanceMetric>;
  updatePerformanceMetrics(id: number, data: Partial<InsertPerformanceMetric>): Promise<PerformanceMetric | undefined>;
  updateMusicianRatingMetrics(musicianId: number): Promise<PerformanceMetric | undefined>;
  
  // Skill Tags management
  getSkillTags(): Promise<SkillTag[]>;
  getSkillTag(id: number): Promise<SkillTag | undefined>;
  createSkillTag(tag: InsertSkillTag): Promise<SkillTag>;
  updateSkillTag(id: number, data: Partial<InsertSkillTag>): Promise<SkillTag | undefined>;
  deleteSkillTag(id: number): Promise<boolean>;
  
  // Musician Skill Tags management
  getMusicianSkillTags(musicianId: number): Promise<MusicianSkillTag[]>;
  getMusicianSkillTag(id: number): Promise<MusicianSkillTag | undefined>;
  createMusicianSkillTag(skillTag: InsertMusicianSkillTag): Promise<MusicianSkillTag>;
  updateMusicianSkillTag(id: number, data: Partial<InsertMusicianSkillTag>): Promise<MusicianSkillTag | undefined>;
  deleteMusicianSkillTag(id: number): Promise<boolean>;
  endorseSkill(musicianId: number, skillTagId: number): Promise<MusicianSkillTag | undefined>;
  
  // Performance Improvement Plans management
  getImprovementPlans(musicianId?: number): Promise<ImprovementPlan[]>;
  getImprovementPlan(id: number): Promise<ImprovementPlan | undefined>;
  createImprovementPlan(plan: InsertImprovementPlan): Promise<ImprovementPlan>;
  updateImprovementPlan(id: number, data: Partial<InsertImprovementPlan>): Promise<ImprovementPlan | undefined>;
  deleteImprovementPlan(id: number): Promise<boolean>;
  
  // Improvement Actions management
  getImprovementActions(planId: number): Promise<ImprovementAction[]>;
  getImprovementAction(id: number): Promise<ImprovementAction | undefined>;
  createImprovementAction(action: InsertImprovementAction): Promise<ImprovementAction>;
  updateImprovementAction(id: number, data: Partial<InsertImprovementAction>): Promise<ImprovementAction | undefined>;
  deleteImprovementAction(id: number): Promise<boolean>;
  completeImprovementAction(id: number, feedback?: string): Promise<ImprovementAction | undefined>;
  
  // Availability Share Links management
  createAvailabilityShareLink(shareLink: InsertAvailabilityShareLink): Promise<AvailabilityShareLink>;
  getAvailabilityShareLinks(musicianId: number): Promise<AvailabilityShareLink[]>;
  getAvailabilityShareLink(id: number): Promise<AvailabilityShareLink | undefined>;
  getAvailabilityShareLinkByToken(token: string): Promise<AvailabilityShareLink | undefined>;
  deleteAvailabilityShareLink(id: number): Promise<boolean>;
  
  // Contract Link management
  createContractLink(contract: InsertContractLink): Promise<ContractLink>;
  getContractLinks(): Promise<ContractLink[]>;
  getContractLink(id: number): Promise<ContractLink | undefined>;
  getContractLinkByToken(token: string): Promise<ContractLink | undefined>;
  getContractLinksByEvent(eventId: number): Promise<ContractLink[]>;
  getContractLinksByMusician(musicianId: number): Promise<ContractLink[]>;
  updateContractLink(id: number, data: Partial<InsertContractLink>): Promise<ContractLink | undefined>;
  updateContractLinkStatus(token: string, status: string, response?: string): Promise<ContractLink | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private venues: Map<number, Venue>;
  private categories: Map<number, Category>; // Legacy categories
  private musicianCategories: Map<number, MusicianCategory>;
  private venueCategories: Map<number, VenueCategory>;
  private eventCategories: Map<number, EventCategory>;
  private musicians: Map<number, Musician>;
  private availability: Map<number, Availability>;
  private events: Map<number, Event>;
  private eventMusicianAssignments: Map<number, Record<string, number[]>>;
  private eventMusicianStatuses: Map<number, Record<string, Record<number, string>>>;
  private bookings: Map<number, Booking>;
  private payments: Map<number, Payment>;
  private collections: Map<number, Collection>;
  private expenses: Map<number, Expense>;
  private activities: Map<number, Activity>;
  private monthlyPlanners: Map<number, MonthlyPlanner>;
  private plannerSlots: Map<number, PlannerSlot>;
  private plannerAssignments: Map<number, PlannerAssignment>;
  private monthlyInvoices: Map<number, MonthlyInvoice>;
  private settings: Map<number, Settings>;
  private emailTemplates: Map<number, EmailTemplate>;
  private musicianTypes: Map<number, MusicianType>;
  private musicianTypeCategories: Map<number, MusicianTypeCategory>;
  private musicianPayRates: Map<number, MusicianPayRate>;
  private performanceRatings: Map<number, PerformanceRating>;
  private performanceMetrics: Map<number, PerformanceMetric>;
  private skillTags: Map<number, SkillTag>;
  private musicianSkillTags: Map<number, MusicianSkillTag>;
  private improvementPlans: Map<number, ImprovementPlan>;
  private improvementActions: Map<number, ImprovementAction>;
  private availabilityShareLinks: Map<number, AvailabilityShareLink>;
  private contractLinks: Map<number, ContractLink>;
  private contractTemplates: Map<number, ContractTemplate>;
  
  // Current ID trackers
  private currentUserId: number;
  private currentVenueId: number;
  private currentCategoryId: number;
  private currentMusicianCategoryId: number;
  private currentVenueCategoryId: number;
  private currentEventCategoryId: number;
  private currentMusicianId: number;
  private currentMusicianPayRateId: number;
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
  private currentSettingsId: number;
  private currentEmailTemplateId: number;
  private currentMusicianTypeId: number;
  private currentMusicianTypeCategoryId: number;
  private currentPerformanceRatingId: number;
  private currentPerformanceMetricId: number;
  private currentSkillTagId: number;
  private currentMusicianSkillTagId: number;
  private currentImprovementPlanId: number;
  private currentImprovementActionId: number;
  private currentAvailabilityShareLinkId: number;
  private currentContractLinkId: number;
  private currentContractTemplateId: number;

  constructor() {
    // Initialize maps
    this.users = new Map();
    this.venues = new Map();
    this.categories = new Map(); // Legacy categories
    this.musicianCategories = new Map();
    this.venueCategories = new Map();
    this.eventCategories = new Map();
    this.musicians = new Map();
    this.musicianPayRates = new Map();
    this.availability = new Map();
    this.events = new Map();
    this.bookings = new Map();
    this.payments = new Map();
    this.collections = new Map();
    this.expenses = new Map();
    this.activities = new Map();
    this.monthlyPlanners = new Map();
    this.plannerSlots = new Map();
    this.plannerAssignments = new Map();
    this.monthlyInvoices = new Map();
    this.settings = new Map();
    this.emailTemplates = new Map();
    this.musicianTypes = new Map();
    this.musicianTypeCategories = new Map();
    this.performanceRatings = new Map();
    this.performanceMetrics = new Map();
    this.skillTags = new Map();
    this.musicianSkillTags = new Map();
    this.improvementPlans = new Map();
    this.improvementActions = new Map();
    this.availabilityShareLinks = new Map();
    this.contractLinks = new Map();
    this.contractTemplates = new Map();
    
    // Storage for musician assignments to events by date
    this.eventMusicianAssignments = new Map();
    
    // Storage for musician statuses by event and date
    this.eventMusicianStatuses = new Map();
    
    // Initialize IDs
    this.currentUserId = 1;
    this.currentVenueId = 1;
    this.currentCategoryId = 1;
    this.currentMusicianCategoryId = 1;
    this.currentVenueCategoryId = 1;
    this.currentEventCategoryId = 1;
    this.currentMusicianId = 1;
    this.currentMusicianPayRateId = 1;
    this.currentAvailabilityId = 1;
    this.currentEventId = 1;
    this.currentBookingId = 1;
    this.currentPaymentId = 1;
    this.currentCollectionId = 1;
    this.currentExpenseId = 1;
    this.currentActivityId = 1;
    this.currentMonthlyPlannerId = 1;
    this.currentPlannerSlotId = 1;
    this.currentPlannerAssignmentId = 1;
    this.currentMonthlyInvoiceId = 1;
    this.currentSettingsId = 1;
    this.currentEmailTemplateId = 1;
    this.currentMusicianTypeId = 1;
    this.currentMusicianTypeCategoryId = 1;
    this.currentPerformanceRatingId = 1;
    this.currentPerformanceMetricId = 1;
    this.currentSkillTagId = 1;
    this.currentMusicianSkillTagId = 1;
    this.currentImprovementPlanId = 1;
    this.currentImprovementActionId = 1;
    this.currentAvailabilityShareLinkId = 1;
    this.currentContractLinkId = 1;
    this.currentContractTemplateId = 1;
    
    // Initialize with default admin user
    this.createUser({
      username: "admin",
      password: "admin123", // This would be hashed in a real app
      name: "Admin User",
      email: "admin@vamp.com",
      role: "admin",
      profileImage: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
    });
    
    // Initialize with some default categories (legacy)
    this.createCategory({ title: "Jazz", description: "Jazz musicians including pianists, saxophonists, and more" });
    this.createCategory({ title: "Classical", description: "Classical musicians including pianists, violinists, and more" });
    this.createCategory({ title: "Rock", description: "Rock musicians including guitarists, drummers, and vocalists" });
    this.createCategory({ title: "Pop", description: "Pop musicians including vocalists, guitarists, and more" });
    
    // Initialize with musician categories
    this.createMusicianCategory({ title: "Jazz", description: "Jazz musicians including pianists, saxophonists, and more" });
    this.createMusicianCategory({ title: "Classical", description: "Classical musicians including pianists, violinists, and more" });
    this.createMusicianCategory({ title: "Rock", description: "Rock musicians including guitarists, drummers, and vocalists" });
    this.createMusicianCategory({ title: "Pop", description: "Pop musicians including vocalists, guitarists, and more" });
    
    // Initialize with venue categories
    this.createVenueCategory({ title: "Hotel", description: "Hotels and resorts with event spaces" });
    this.createVenueCategory({ title: "Bar & Lounge", description: "Bars, lounges, and nightclubs" });
    this.createVenueCategory({ title: "Restaurant", description: "Restaurants and dining establishments" });
    this.createVenueCategory({ title: "Concert Hall", description: "Dedicated music venues and concert halls" });
    
    // Initialize with event categories
    this.createEventCategory({ title: "Corporate", description: "Corporate events, conferences, and gatherings" });
    this.createEventCategory({ title: "Wedding", description: "Wedding ceremonies and receptions" });
    this.createEventCategory({ title: "Private Party", description: "Private celebrations and special occasions" });
    this.createEventCategory({ title: "Concert", description: "Public concerts and performances" });
    
    // Initialize with musician types
    this.createMusicianType({ title: "Pianist", description: "Piano players of various genres" });
    this.createMusicianType({ title: "Guitarist", description: "Guitar players including acoustic, electric, and bass" });
    this.createMusicianType({ title: "Vocalist", description: "Singers of various genres and styles" });
    this.createMusicianType({ title: "Violinist", description: "Violin players primarily for classical music" });
    
    // Initialize with sample musicians
    const musician1 = this.createMusician({
      name: "Sarah Johnson",
      email: "sarah@musician.com",
      profileImage: "https://images.unsplash.com/photo-1580489944761-15a19d654956?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&h=300&q=80",
      typeId: 1, // Pianist
      rating: 4.8,
      phone: "555-123-4567",
      categoryId: 1, // Jazz
      instruments: ["Piano", "Saxophone"],
      bio: "Sarah is an accomplished jazz pianist with over 10 years of experience performing in top venues across the country. Her unique style blends traditional jazz elements with contemporary influences."
    });
    
    // Add pay rates for each event category
    this.createMusicianPayRate({
      musicianId: musician1.id,
      eventCategoryId: 1, // Corporate
      hourlyRate: 100,
      dayRate: 500,
      eventRate: 350,
      notes: "Regular corporate bookings rate"
    });
    
    this.createMusicianPayRate({
      musicianId: musician1.id,
      eventCategoryId: 2, // Wedding
      hourlyRate: 120,
      dayRate: 600,
      eventRate: 400,
      notes: "Weekend premium rate for weddings"
    });
    
    this.createMusicianPayRate({
      musicianId: musician1.id,
      eventCategoryId: 3, // Private Party
      hourlyRate: 90,
      dayRate: 450,
      eventRate: 300,
      notes: "Standard private event rate"
    });
    
    this.createMusicianPayRate({
      musicianId: musician1.id,
      eventCategoryId: 4, // Concert
      hourlyRate: 150,
      dayRate: 700,
      eventRate: 500,
      notes: "Premium rate for concerts and public performances"
    });
    
    const musician2 = this.createMusician({
      name: "Michael Chen",
      email: "michael@musician.com",
      profileImage: "https://images.unsplash.com/photo-1542103749-8ef59b94f47e?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&h=300&q=80",
      typeId: 4, // Violinist
      rating: 4.9,
      phone: "555-987-6543",
      categoryId: 2, // Classical
      instruments: ["Violin", "Piano"],
      bio: "Michael is a classically trained violinist who has performed with several symphony orchestras. His repertoire spans from baroque to contemporary classical pieces."
    });
    
    // Add pay rates for Michael
    this.createMusicianPayRate({
      musicianId: musician2.id,
      eventCategoryId: 1, // Corporate
      hourlyRate: 120,
      dayRate: 600,
      eventRate: 400,
      notes: "Classical corporate events rate"
    });
    
    this.createMusicianPayRate({
      musicianId: musician2.id,
      eventCategoryId: 2, // Wedding
      hourlyRate: 150,
      dayRate: 700,
      eventRate: 500,
      notes: "Premium wedding ceremony rate"
    });
    
    this.createMusicianPayRate({
      musicianId: musician2.id,
      eventCategoryId: 3, // Private Party
      hourlyRate: 120,
      dayRate: 550,
      eventRate: 350,
      notes: "Standard private event rate"
    });
    
    this.createMusicianPayRate({
      musicianId: musician2.id,
      eventCategoryId: 4, // Concert
      hourlyRate: 180,
      dayRate: 800,
      eventRate: 600,
      notes: "Premium classical concert rate"
    });
    
    const musician3 = this.createMusician({
      name: "Olivia Martinez",
      email: "olivia@musician.com",
      profileImage: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&h=300&q=80",
      typeId: 3, // Vocalist
      rating: 4.7,
      phone: "555-456-7890",
      categoryId: 4, // Pop (ID 4 based on createCategory order above)
      instruments: ["Vocals", "Guitar"],
      bio: "Olivia is a charismatic vocalist and guitarist specializing in contemporary pop music. Her energetic performances and wide vocal range make her perfect for events requiring audience engagement."
    });
    
    // Add pay rates for Olivia
    this.createMusicianPayRate({
      musicianId: musician3.id,
      eventCategoryId: 1, // Corporate
      hourlyRate: 90,
      dayRate: 450,
      eventRate: 300,
      notes: "Standard corporate event rate"
    });
    
    this.createMusicianPayRate({
      musicianId: musician3.id,
      eventCategoryId: 2, // Wedding
      hourlyRate: 110,
      dayRate: 550,
      eventRate: 380,
      notes: "Premium wedding reception rate"
    });
    
    this.createMusicianPayRate({
      musicianId: musician3.id,
      eventCategoryId: 3, // Private Party
      hourlyRate: 100,
      dayRate: 500,
      eventRate: 350,
      notes: "Standard private party rate"
    });
    
    this.createMusicianPayRate({
      musicianId: musician3.id,
      eventCategoryId: 4, // Concert
      hourlyRate: 130,
      dayRate: 650,
      eventRate: 450,
      notes: "Premium concert performance rate"
    });

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
    
    // Initialize with default email templates
    this.createEmailTemplate({
      name: "Monthly Assignment Email",
      subject: "Your Performance Schedule for {{month}} {{year}}",
      htmlContent: "<!DOCTYPE html><html><body><div style=\"font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;\"><h2>Hello {{musicianName}},</h2><p>We're pleased to share your performance schedule for {{month}} {{year}}.</p><h3>Your Scheduled Performances:</h3><table style=\"width: 100%; border-collapse: collapse; margin-bottom: 20px;\"><tr style=\"background-color: #f2f2f2;\"><th style=\"padding: 8px; text-align: left; border: 1px solid #ddd;\">Date</th><th style=\"padding: 8px; text-align: left; border: 1px solid #ddd;\">Venue</th><th style=\"padding: 8px; text-align: left; border: 1px solid #ddd;\">Time</th></tr>{{#each assignments}}<tr><td style=\"padding: 8px; text-align: left; border: 1px solid #ddd;\">{{date}}</td><td style=\"padding: 8px; text-align: left; border: 1px solid #ddd;\">{{venue}}</td><td style=\"padding: 8px; text-align: left; border: 1px solid #ddd;\">{{startTime}} - {{endTime}}</td></tr>{{/each}}</table><p>Please confirm your availability for these dates as soon as possible by replying to this email.</p><p>If you have any questions or concerns, please don't hesitate to contact us.</p><p>Best regards,<br>The VAMP Team</p></div></body></html>",
      textContent: "Hello {{musicianName}},\n\nWe're pleased to share your performance schedule for {{month}} {{year}}.\n\nYour Scheduled Performances:\n{{#each assignments}}\n- Date: {{date}}\n  Venue: {{venue}}\n  Time: {{startTime}} - {{endTime}}\n{{/each}}\n\nPlease confirm your availability for these dates as soon as possible by replying to this email.\n\nIf you have any questions or concerns, please don't hesitate to contact us.\n\nBest regards,\nThe VAMP Team",
      description: "Template for sending monthly performance schedules to musicians",
      isDefault: true
    });
    
    this.createEmailTemplate({
      name: "Contract Confirmation",
      subject: "Contract Confirmation for {{venueName}} on {{date}}",
      htmlContent: "<!DOCTYPE html><html><body><div style=\"font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;\"><h2>Hello {{musicianName}},</h2><p>We're pleased to confirm your booking at <strong>{{venueName}}</strong> on <strong>{{date}}</strong> from <strong>{{startTime}}</strong> to <strong>{{endTime}}</strong>.</p><h3>Performance Details:</h3><ul><li><strong>Venue:</strong> {{venueName}}</li><li><strong>Address:</strong> {{venueAddress}}</li><li><strong>Date:</strong> {{date}}</li><li><strong>Time:</strong> {{startTime}} - {{endTime}}</li><li><strong>Fee:</strong> ${{fee}}</li></ul><p>Please review the attached contract and sign it at your earliest convenience.</p><p>If you have any questions or concerns, please don't hesitate to contact us.</p><p>Best regards,<br>The VAMP Team</p></div></body></html>",
      textContent: "Hello {{musicianName}},\n\nWe're pleased to confirm your booking at {{venueName}} on {{date}} from {{startTime}} to {{endTime}}.\n\nPerformance Details:\n- Venue: {{venueName}}\n- Address: {{venueAddress}}\n- Date: {{date}}\n- Time: {{startTime}} - {{endTime}}\n- Fee: ${{fee}}\n\nPlease review the attached contract and sign it at your earliest convenience.\n\nIf you have any questions or concerns, please don't hesitate to contact us.\n\nBest regards,\nThe VAMP Team",
      description: "Template for sending contract confirmations to musicians",
      isDefault: true
    });
    
    // Initialize with sample musician types (synchronously since we're in the constructor)
    const pianistType: MusicianType = {
      id: this.currentMusicianTypeId++,
      name: "Pianist",
      description: "Professional piano players for various venues and events",
      defaultRate: 200,
      isDefault: true,
      createdAt: new Date(),
      updatedAt: null
    };
    this.musicianTypes.set(pianistType.id, pianistType);
    
    const vocalistType: MusicianType = {
      id: this.currentMusicianTypeId++,
      name: "Vocalist",
      description: "Solo vocalists and singers for events",
      defaultRate: 180,
      isDefault: true,
      createdAt: new Date(),
      updatedAt: null
    };
    this.musicianTypes.set(vocalistType.id, vocalistType);
    
    const guitaristType: MusicianType = {
      id: this.currentMusicianTypeId++,
      name: "Guitarist",
      description: "Acoustic and electric guitar players",
      defaultRate: 150,
      isDefault: true,
      createdAt: new Date(),
      updatedAt: null
    };
    this.musicianTypes.set(guitaristType.id, guitaristType);
    
    const violinistType: MusicianType = {
      id: this.currentMusicianTypeId++,
      name: "Violinist",
      description: "Classical and contemporary violin players",
      defaultRate: 190,
      isDefault: true,
      createdAt: new Date(),
      updatedAt: null
    };
    this.musicianTypes.set(violinistType.id, violinistType);
    
    // Associate musician types with categories (synchronously for constructor)
    // Pianist - Jazz & Classical
    this.musicianTypeCategories.set(this.currentMusicianTypeCategoryId++, {
      id: this.currentMusicianTypeCategoryId,
      musicianTypeId: pianistType.id,
      categoryId: 1
    });
    
    this.musicianTypeCategories.set(this.currentMusicianTypeCategoryId++, {
      id: this.currentMusicianTypeCategoryId,
      musicianTypeId: pianistType.id,
      categoryId: 2
    });
    
    // Vocalist - Rock & Pop
    this.musicianTypeCategories.set(this.currentMusicianTypeCategoryId++, {
      id: this.currentMusicianTypeCategoryId,
      musicianTypeId: vocalistType.id,
      categoryId: 3
    });
    
    this.musicianTypeCategories.set(this.currentMusicianTypeCategoryId++, {
      id: this.currentMusicianTypeCategoryId,
      musicianTypeId: vocalistType.id,
      categoryId: 4
    });
    
    // Guitarist - Rock & Pop
    this.musicianTypeCategories.set(this.currentMusicianTypeCategoryId++, {
      id: this.currentMusicianTypeCategoryId,
      musicianTypeId: guitaristType.id,
      categoryId: 3
    });
    
    this.musicianTypeCategories.set(this.currentMusicianTypeCategoryId++, {
      id: this.currentMusicianTypeCategoryId,
      musicianTypeId: guitaristType.id,
      categoryId: 4
    });
    
    // Violinist - Classical
    this.musicianTypeCategories.set(this.currentMusicianTypeCategoryId++, {
      id: this.currentMusicianTypeCategoryId,
      musicianTypeId: violinistType.id,
      categoryId: 2
    });
    
    // Initialize with sample skill tags
    const skillTags = [
      { name: "Sight Reading", description: "Ability to read and perform music at first sight" },
      { name: "Improvisation", description: "Ability to compose and perform music spontaneously" },
      { name: "Music Theory", description: "Knowledge of music theory and composition" },
      { name: "Stage Presence", description: "Strong stage presence and audience engagement" },
      { name: "Versatility", description: "Ability to perform multiple music styles" },
      { name: "Vocals", description: "Singing ability in addition to instrumental skills" },
      { name: "Studio Experience", description: "Experience with recording in studio environments" },
      { name: "Original Compositions", description: "Creates and performs original music" },
      { name: "Music Direction", description: "Can lead and direct other musicians" },
      { name: "Multilingual", description: "Can perform songs in multiple languages" }
    ];
    
    // Add skill tags to the database
    skillTags.forEach(tag => {
      const skillTag: SkillTag = {
        id: this.currentSkillTagId++,
        name: tag.name,
        description: tag.description,
        createdAt: new Date()
      };
      this.skillTags.set(skillTag.id, skillTag);
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
  
  // Category management methods (legacy)
  async getCategories(): Promise<Category[]> {
    return Array.from(this.categories.values());
  }
  
  async getCategory(id: number): Promise<Category | undefined> {
    return this.categories.get(id);
  }
  
  async createCategory(category: InsertCategory): Promise<Category> {
    const id = this.currentCategoryId++;
    const newCategory: Category = { 
      id, 
      title: category.title,
      description: category.description ?? null
    };
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
  
  // Musician Category management methods
  async getMusicianCategories(): Promise<MusicianCategory[]> {
    return Array.from(this.musicianCategories.values());
  }
  
  async getMusicianCategory(id: number): Promise<MusicianCategory | undefined> {
    return this.musicianCategories.get(id);
  }
  
  async createMusicianCategory(category: InsertMusicianCategory): Promise<MusicianCategory> {
    const id = this.currentMusicianCategoryId++;
    const newCategory: MusicianCategory = { 
      id, 
      title: category.title,
      description: category.description ?? null
    };
    this.musicianCategories.set(id, newCategory);
    return newCategory;
  }
  
  async updateMusicianCategory(id: number, data: Partial<InsertMusicianCategory>): Promise<MusicianCategory | undefined> {
    const category = await this.getMusicianCategory(id);
    if (!category) return undefined;
    
    const updatedCategory = { ...category, ...data };
    this.musicianCategories.set(id, updatedCategory);
    return updatedCategory;
  }
  
  async deleteMusicianCategory(id: number): Promise<boolean> {
    return this.musicianCategories.delete(id);
  }
  
  // Venue Category management methods
  async getVenueCategories(): Promise<VenueCategory[]> {
    return Array.from(this.venueCategories.values());
  }
  
  async getVenueCategory(id: number): Promise<VenueCategory | undefined> {
    return this.venueCategories.get(id);
  }
  
  async createVenueCategory(category: InsertVenueCategory): Promise<VenueCategory> {
    const id = this.currentVenueCategoryId++;
    const newCategory: VenueCategory = { 
      id, 
      title: category.title,
      description: category.description ?? null
    };
    this.venueCategories.set(id, newCategory);
    return newCategory;
  }
  
  async updateVenueCategory(id: number, data: Partial<InsertVenueCategory>): Promise<VenueCategory | undefined> {
    const category = await this.getVenueCategory(id);
    if (!category) return undefined;
    
    const updatedCategory = { ...category, ...data };
    this.venueCategories.set(id, updatedCategory);
    return updatedCategory;
  }
  
  async deleteVenueCategory(id: number): Promise<boolean> {
    return this.venueCategories.delete(id);
  }
  
  // Event Category management methods
  async getEventCategories(): Promise<EventCategory[]> {
    return Array.from(this.eventCategories.values());
  }
  
  async getEventCategory(id: number): Promise<EventCategory | undefined> {
    return this.eventCategories.get(id);
  }
  
  async createEventCategory(category: InsertEventCategory): Promise<EventCategory> {
    const id = this.currentEventCategoryId++;
    const newCategory: EventCategory = { 
      id, 
      title: category.title,
      description: category.description ?? null
    };
    this.eventCategories.set(id, newCategory);
    return newCategory;
  }
  
  async updateEventCategory(id: number, data: Partial<InsertEventCategory>): Promise<EventCategory | undefined> {
    const category = await this.getEventCategory(id);
    if (!category) return undefined;
    
    const updatedCategory = { ...category, ...data };
    this.eventCategories.set(id, updatedCategory);
    return updatedCategory;
  }
  
  async deleteEventCategory(id: number): Promise<boolean> {
    return this.eventCategories.delete(id);
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
    const newAvailability: Availability = { 
      id,
      date: availability.date,
      musicianId: availability.musicianId,
      month: availability.month,
      year: availability.year,
      isAvailable: availability.isAvailable ?? false
    };
    this.availability.set(id, newAvailability);
    return newAvailability;
  }
  
  async updateAvailability(id: number, data: Partial<InsertAvailability>): Promise<Availability | undefined> {
    const availability = Array.from(this.availability.values()).find(a => a.id === id);
    if (!availability) return undefined;
    
    // Implement the rest of the method...
    
    const updatedAvailability = { ...availability, ...data };
    this.availability.set(id, updatedAvailability);
    return updatedAvailability;
  }
  
  async deleteAvailability(id: number): Promise<boolean> {
    return this.availability.delete(id);
  }
  
  async updateAvailabilityForDate(musicianId: number, date: string, isAvailable: boolean, month: string, year: number): Promise<Availability> {
    // Check if there's already an availability record for this date
    const dateObj = new Date(date);
    const existingAvailability = Array.from(this.availability.values()).find(
      a => a.musicianId === musicianId && a.date.toISOString().split('T')[0] === date
    );
    
    if (existingAvailability) {
      // Update existing record
      const updatedAvailability = { 
        ...existingAvailability, 
        isAvailable 
      };
      this.availability.set(existingAvailability.id, updatedAvailability);
      return updatedAvailability;
    } else {
      // Create new record
      const id = this.currentAvailabilityId++;
      const newAvailability: Availability = { 
        id, 
        musicianId, 
        date: dateObj, 
        isAvailable,
        month,
        year 
      };
      this.availability.set(id, newAvailability);
      return newAvailability;
    }
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
    
    // Store musician assignments separately if they exist
    const musicianAssignments = (event as any).musicianAssignments;
    if (musicianAssignments) {
      this.eventMusicianAssignments.set(id, musicianAssignments);
      
      // Don't include assignments in the event object as it's not part of the schema
      delete (event as any).musicianAssignments;
    }
    
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
  
  async getEventMusicianAssignments(eventId: number): Promise<Record<string, number[]>> {
    const assignments = this.eventMusicianAssignments.get(eventId);
    return assignments || {};
  }
  
  async getEventMusicianStatuses(eventId: number): Promise<Record<string, Record<number, string>>> {
    const statuses = this.eventMusicianStatuses.get(eventId);
    return statuses || {};
  }
  
  async updateMusicianEventStatus(eventId: number, musicianId: number, status: string): Promise<boolean> {
    const assignments = await this.getEventMusicianAssignments(eventId);
    let found = false;
    
    // Find which date this musician is assigned to
    for (const [date, musicians] of Object.entries(assignments)) {
      if (musicians.includes(musicianId)) {
        found = true;
        
        // Get current statuses for this event, create if doesn't exist
        const eventStatuses = this.eventMusicianStatuses.get(eventId) || {};
        
        // Get current statuses for this date, create if doesn't exist
        const dateStatuses = eventStatuses[date] || {};
        
        // Update status for this musician
        dateStatuses[musicianId] = status;
        
        // Update date statuses in event statuses
        eventStatuses[date] = dateStatuses;
        
        // Update event statuses in map
        this.eventMusicianStatuses.set(eventId, eventStatuses);
        
        // Log the activity
        this.createActivity({
          userId: 1, // Default admin user
          action: `Updated musician #${musicianId} status to "${status}" for event #${eventId}`,
          timestamp: new Date(),
          entityId: musicianId,
          entityType: "musician"
        });
        
        break;
      }
    }
    
    return found;
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
  
  async getVenueEvents(venueId: number): Promise<Event[]> {
    return Array.from(this.events.values())
      .filter(e => e.venueId === venueId)
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
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
  
  async getBookingsByMusicianAndMonth(musicianId: number, month: number, year: number): Promise<Booking[]> {
    return Array.from(this.bookings.values()).filter(b => {
      if (b.musicianId !== musicianId) return false;
      
      const bookingDate = new Date(b.date);
      return bookingDate.getMonth() + 1 === month && bookingDate.getFullYear() === year;
    });
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
  
  // Monthly Planner management methods
  async getMonthlyPlanners(): Promise<MonthlyPlanner[]> {
    return Array.from(this.monthlyPlanners.values());
  }

  async getMonthlyPlanner(id: number): Promise<MonthlyPlanner | undefined> {
    return this.monthlyPlanners.get(id);
  }

  async getMonthlyPlannerByMonth(month: number, year: number): Promise<MonthlyPlanner | undefined> {
    return Array.from(this.monthlyPlanners.values()).find(
      p => p.month === month && p.year === year
    );
  }

  async createMonthlyPlanner(planner: InsertMonthlyPlanner): Promise<MonthlyPlanner> {
    const id = this.currentMonthlyPlannerId++;
    const newPlanner: MonthlyPlanner = { 
      ...planner, 
      id,
      createdAt: new Date(),
      updatedAt: null
    };
    this.monthlyPlanners.set(id, newPlanner);
    
    // Create activity
    this.createActivity({
      userId: 1, // Default admin
      action: "Created",
      entityType: "MonthlyPlanner",
      entityId: id,
      timestamp: new Date(),
      details: { planner: newPlanner.name, month: newPlanner.month, year: newPlanner.year }
    });
    
    return newPlanner;
  }

  async updateMonthlyPlanner(id: number, data: Partial<InsertMonthlyPlanner>): Promise<MonthlyPlanner | undefined> {
    const planner = await this.getMonthlyPlanner(id);
    if (!planner) return undefined;
    
    const updatedPlanner = { 
      ...planner, 
      ...data,
      updatedAt: new Date()
    };
    this.monthlyPlanners.set(id, updatedPlanner);
    return updatedPlanner;
  }

  async deleteMonthlyPlanner(id: number): Promise<boolean> {
    // First delete all related slots
    const slots = await this.getPlannerSlots(id);
    for (const slot of slots) {
      await this.deletePlannerSlot(slot.id);
    }
    
    return this.monthlyPlanners.delete(id);
  }

  // Planner Slots management methods
  async getPlannerSlots(plannerId?: number): Promise<PlannerSlot[]> {
    if (plannerId) {
      return Array.from(this.plannerSlots.values()).filter(s => s.plannerId === plannerId);
    }
    return Array.from(this.plannerSlots.values());
  }

  async getPlannerSlot(id: number): Promise<PlannerSlot | undefined> {
    return this.plannerSlots.get(id);
  }

  async createPlannerSlot(slot: InsertPlannerSlot): Promise<PlannerSlot> {
    const id = this.currentPlannerSlotId++;
    const newSlot: PlannerSlot = { ...slot, id };
    this.plannerSlots.set(id, newSlot);
    
    // Create activity
    const venue = await this.getVenue(slot.venueId);
    const category = await this.getCategory(slot.categoryId);
    
    this.createActivity({
      userId: 1, // Default admin
      action: "Created",
      entityType: "PlannerSlot",
      entityId: id,
      timestamp: new Date(),
      details: { 
        date: newSlot.date.toISOString().split('T')[0],
        venue: venue?.name || 'Unknown',
        category: category?.title || 'Unknown',
        time: `${newSlot.startTime}-${newSlot.endTime}`
      }
    });
    
    return newSlot;
  }

  async updatePlannerSlot(id: number, data: Partial<InsertPlannerSlot>): Promise<PlannerSlot | undefined> {
    const slot = await this.getPlannerSlot(id);
    if (!slot) return undefined;
    
    const updatedSlot = { ...slot, ...data };
    this.plannerSlots.set(id, updatedSlot);
    return updatedSlot;
  }

  async deletePlannerSlot(id: number): Promise<boolean> {
    // First delete all related assignments
    const assignments = await this.getPlannerAssignments(id);
    for (const assignment of assignments) {
      await this.deletePlannerAssignment(assignment.id);
    }
    
    return this.plannerSlots.delete(id);
  }

  async getPlannerSlotsByDate(date: Date): Promise<PlannerSlot[]> {
    const dateStr = date.toISOString().split('T')[0];
    return Array.from(this.plannerSlots.values()).filter(slot => 
      slot.date.toISOString().split('T')[0] === dateStr
    );
  }

  // Planner Assignments management methods
  async getPlannerAssignments(slotId?: number, musicianId?: number): Promise<PlannerAssignment[]> {
    let assignments = Array.from(this.plannerAssignments.values());
    
    if (slotId) {
      assignments = assignments.filter(a => a.slotId === slotId);
    }
    
    if (musicianId) {
      assignments = assignments.filter(a => a.musicianId === musicianId);
    }
    
    return assignments;
  }

  async getPlannerAssignment(id: number): Promise<PlannerAssignment | undefined> {
    return this.plannerAssignments.get(id);
  }

  async createPlannerAssignment(assignment: InsertPlannerAssignment): Promise<PlannerAssignment> {
    const id = this.currentPlannerAssignmentId++;
    const newAssignment: PlannerAssignment = {
      ...assignment,
      id,
      assignedAt: new Date(),
      attendanceMarkedAt: null,
      attendanceMarkedBy: null
    };
    this.plannerAssignments.set(id, newAssignment);
    
    // Create activity
    const slot = await this.getPlannerSlot(assignment.slotId);
    const musician = await this.getMusician(assignment.musicianId);
    
    this.createActivity({
      userId: 1, // Default admin
      action: "Assigned",
      entityType: "PlannerAssignment",
      entityId: id,
      timestamp: new Date(),
      details: { 
        musician: musician?.name || 'Unknown',
        date: slot?.date.toISOString().split('T')[0] || 'Unknown',
        fee: assignment.actualFee || slot?.fee || 0
      }
    });
    
    return newAssignment;
  }

  async updatePlannerAssignment(id: number, data: Partial<InsertPlannerAssignment>): Promise<PlannerAssignment | undefined> {
    const assignment = await this.getPlannerAssignment(id);
    if (!assignment) return undefined;
    
    const updatedAssignment = { ...assignment, ...data };
    this.plannerAssignments.set(id, updatedAssignment);
    return updatedAssignment;
  }

  async deletePlannerAssignment(id: number): Promise<boolean> {
    return this.plannerAssignments.delete(id);
  }

  async markAttendance(id: number, status: string, userId: number, notes?: string): Promise<PlannerAssignment | undefined> {
    const assignment = await this.getPlannerAssignment(id);
    if (!assignment) return undefined;
    
    const updatedAssignment: PlannerAssignment = {
      ...assignment,
      status,
      attendanceMarkedAt: new Date(),
      attendanceMarkedBy: userId,
      notes: notes || assignment.notes
    };
    
    this.plannerAssignments.set(id, updatedAssignment);
    
    // Create activity
    const slot = await this.getPlannerSlot(assignment.slotId);
    const musician = await this.getMusician(assignment.musicianId);
    const user = await this.getUser(userId);
    
    this.createActivity({
      userId,
      action: "Marked Attendance",
      entityType: "PlannerAssignment",
      entityId: id,
      timestamp: new Date(),
      details: { 
        musician: musician?.name || 'Unknown',
        date: slot?.date.toISOString().split('T')[0] || 'Unknown',
        status,
        markedBy: user?.name || 'Unknown'
      }
    });
    
    return updatedAssignment;
  }

  // Monthly Invoice management methods
  async getMonthlyInvoices(plannerId?: number, musicianId?: number): Promise<MonthlyInvoice[]> {
    let invoices = Array.from(this.monthlyInvoices.values());
    
    if (plannerId) {
      invoices = invoices.filter(i => i.plannerId === plannerId);
    }
    
    if (musicianId) {
      invoices = invoices.filter(i => i.musicianId === musicianId);
    }
    
    return invoices;
  }

  async getMonthlyInvoice(id: number): Promise<MonthlyInvoice | undefined> {
    return this.monthlyInvoices.get(id);
  }

  async createMonthlyInvoice(invoice: InsertMonthlyInvoice): Promise<MonthlyInvoice> {
    const id = this.currentMonthlyInvoiceId++;
    const newInvoice: MonthlyInvoice = {
      ...invoice,
      id,
      generatedAt: new Date(),
      paidAt: null
    };
    this.monthlyInvoices.set(id, newInvoice);
    return newInvoice;
  }

  async updateMonthlyInvoice(id: number, data: Partial<InsertMonthlyInvoice>): Promise<MonthlyInvoice | undefined> {
    const invoice = await this.getMonthlyInvoice(id);
    if (!invoice) return undefined;
    
    const updatedInvoice = { ...invoice, ...data };
    this.monthlyInvoices.set(id, updatedInvoice);
    return updatedInvoice;
  }

  async deleteMonthlyInvoice(id: number): Promise<boolean> {
    return this.monthlyInvoices.delete(id);
  }

  async generateMonthlyInvoices(plannerId: number): Promise<MonthlyInvoice[]> {
    const planner = await this.getMonthlyPlanner(plannerId);
    if (!planner) {
      throw new Error("Planner not found");
    }
    
    // Get all slots for this planner
    const slots = await this.getPlannerSlots(plannerId);
    if (slots.length === 0) {
      throw new Error("No slots found for this planner");
    }
    
    // Get all musicians who have assignments for these slots
    const slotIds = slots.map(s => s.id);
    const assignments = Array.from(this.plannerAssignments.values())
      .filter(a => slotIds.includes(a.slotId));
    
    // Group assignments by musician
    const musicianAssignments = new Map<number, PlannerAssignment[]>();
    for (const assignment of assignments) {
      if (!musicianAssignments.has(assignment.musicianId)) {
        musicianAssignments.set(assignment.musicianId, []);
      }
      musicianAssignments.get(assignment.musicianId)?.push(assignment);
    }
    
    // Generate invoices for each musician
    const invoices: MonthlyInvoice[] = [];
    for (const [musicianId, assignments] of musicianAssignments.entries()) {
      const totalSlots = assignments.length;
      const attendedSlots = assignments.filter(a => a.status === 'attended').length;
      
      // Calculate total amount based on actual fees or slot fees
      let totalAmount = 0;
      for (const assignment of assignments) {
        if (assignment.status === 'attended') {
          if (assignment.actualFee) {
            totalAmount += assignment.actualFee;
          } else {
            const slot = await this.getPlannerSlot(assignment.slotId);
            if (slot && slot.fee) {
              totalAmount += slot.fee;
            }
          }
        }
      }
      
      // Create a new invoice
      const invoice = await this.createMonthlyInvoice({
        plannerId,
        musicianId,
        month: planner.month,
        year: planner.year,
        totalSlots,
        attendedSlots,
        totalAmount,
        status: 'draft',
        notes: `Auto-generated invoice for ${planner.name}`
      });
      
      invoices.push(invoice);
      
      // Create activity
      const musician = await this.getMusician(musicianId);
      this.createActivity({
        userId: 1, // Default admin
        action: "Generated Invoice",
        entityType: "MonthlyInvoice",
        entityId: invoice.id,
        timestamp: new Date(),
        details: { 
          musician: musician?.name || 'Unknown',
          month: planner.month,
          year: planner.year,
          totalAmount,
          attendedSlots: `${attendedSlots}/${totalSlots}`
        }
      });
    }
    
    return invoices;
  }

  async finalizeMonthlyInvoice(id: number): Promise<MonthlyInvoice | undefined> {
    const invoice = await this.getMonthlyInvoice(id);
    if (!invoice) return undefined;
    
    const finalizedInvoice = {
      ...invoice,
      status: 'finalized'
    };
    
    this.monthlyInvoices.set(id, finalizedInvoice);
    
    // Create activity
    const musician = await this.getMusician(invoice.musicianId);
    this.createActivity({
      userId: 1, // Default admin
      action: "Finalized Invoice",
      entityType: "MonthlyInvoice",
      entityId: id,
      timestamp: new Date(),
      details: { 
        musician: musician?.name || 'Unknown',
        month: invoice.month,
        year: invoice.year,
        totalAmount: invoice.totalAmount
      }
    });
    
    return finalizedInvoice;
  }

  async markMonthlyInvoiceAsPaid(id: number, notes?: string): Promise<MonthlyInvoice | undefined> {
    const invoice = await this.getMonthlyInvoice(id);
    if (!invoice) return undefined;
    
    const paidInvoice = {
      ...invoice,
      status: 'paid',
      paidAt: new Date(),
      notes: notes || invoice.notes
    };
    
    this.monthlyInvoices.set(id, paidInvoice);
    
    // Create activity
    const musician = await this.getMusician(invoice.musicianId);
    this.createActivity({
      userId: 1, // Default admin
      action: "Marked Invoice as Paid",
      entityType: "MonthlyInvoice",
      entityId: id,
      timestamp: new Date(),
      details: { 
        musician: musician?.name || 'Unknown',
        month: invoice.month,
        year: invoice.year,
        totalAmount: invoice.totalAmount,
        paidAt: paidInvoice.paidAt?.toISOString()
      }
    });
    
    return paidInvoice;
  }
  
  // Settings management methods
  async getSettings(type: string): Promise<Settings | undefined> {
    return Array.from(this.settings.values()).find(s => s.type === type);
  }
  
  async createSettings(type: string, data: any): Promise<Settings> {
    const id = this.currentSettingsId++;
    const newSettings: Settings = {
      id,
      type,
      data,
      updatedAt: new Date()
    };
    this.settings.set(id, newSettings);
    return newSettings;
  }
  
  async updateSettings(type: string, data: any): Promise<Settings | undefined> {
    const settings = await this.getSettings(type);
    if (!settings) {
      return this.createSettings(type, data);
    }
    
    const updatedSettings = {
      ...settings,
      data,
      updatedAt: new Date()
    };
    this.settings.set(settings.id, updatedSettings);
    return updatedSettings;
  }
  
  // Email template management methods
  async getEmailTemplates(): Promise<EmailTemplate[]> {
    return Array.from(this.emailTemplates.values());
  }
  
  async getEmailTemplate(id: number): Promise<EmailTemplate | undefined> {
    return this.emailTemplates.get(id);
  }
  
  async getEmailTemplateByName(name: string): Promise<EmailTemplate | undefined> {
    return Array.from(this.emailTemplates.values()).find(
      (template) => template.name === name
    );
  }
  
  async createEmailTemplate(template: InsertEmailTemplate): Promise<EmailTemplate> {
    const id = this.currentEmailTemplateId++;
    const now = new Date();
    const newTemplate: EmailTemplate = {
      ...template,
      id,
      createdAt: now,
      updatedAt: null
    };
    this.emailTemplates.set(id, newTemplate);
    
    // Create activity
    this.createActivity({
      userId: 1, // Default admin
      action: "Created",
      entityType: "EmailTemplate",
      entityId: id,
      timestamp: now,
      details: { templateName: newTemplate.name }
    });
    
    return newTemplate;
  }
  
  async updateEmailTemplate(id: number, data: Partial<InsertEmailTemplate>): Promise<EmailTemplate | undefined> {
    const template = await this.getEmailTemplate(id);
    if (!template) return undefined;
    
    const updatedTemplate: EmailTemplate = {
      ...template,
      ...data,
      updatedAt: new Date()
    };
    this.emailTemplates.set(id, updatedTemplate);
    
    // Create activity
    this.createActivity({
      userId: 1, // Default admin
      action: "Updated",
      entityType: "EmailTemplate",
      entityId: id,
      timestamp: new Date(),
      details: { templateName: updatedTemplate.name }
    });
    
    return updatedTemplate;
  }
  
  async deleteEmailTemplate(id: number): Promise<boolean> {
    const template = await this.getEmailTemplate(id);
    if (!template) return false;
    
    // Create activity before deletion
    this.createActivity({
      userId: 1, // Default admin
      action: "Deleted",
      entityType: "EmailTemplate",
      entityId: id,
      timestamp: new Date(),
      details: { templateName: template.name }
    });
    
    return this.emailTemplates.delete(id);
  }

  // Musician Type management methods
  // Musician Types
  async getMusicianTypes(): Promise<MusicianType[]> {
    return Array.from(this.musicianTypes.values());
  }

  async getMusicianType(id: number): Promise<MusicianType | undefined> {
    return this.musicianTypes.get(id);
  }

  async createMusicianType(musicianType: InsertMusicianType): Promise<MusicianType> {
    const id = this.currentMusicianTypeId++;
    const newType: MusicianType = {
      id,
      title: musicianType.title,
      description: musicianType.description || null,
    };
    this.musicianTypes.set(id, newType);
    // Create activity record
    await this.createActivity({
      userId: 1, // Default admin
      action: "Created",
      entityType: "MusicianType",
      entityId: id,
      timestamp: new Date(),
      details: { type: musicianType.title }
    });
    return newType;
  }

  async updateMusicianType(id: number, data: Partial<InsertMusicianType>): Promise<MusicianType | undefined> {
    const existingType = this.musicianTypes.get(id);
    if (!existingType) {
      return undefined;
    }
    
    const updatedType = {
      ...existingType,
      ...data,
    };
    
    this.musicianTypes.set(id, updatedType);
    // Create activity record
    await this.createActivity({
      userId: 1, // Default admin
      action: "Updated",
      entityType: "MusicianType",
      entityId: id,
      timestamp: new Date(),
      details: { type: updatedType.title }
    });
    return updatedType;
  }

  async deleteMusicianType(id: number): Promise<boolean> {
    const typeToDelete = this.musicianTypes.get(id);
    const success = this.musicianTypes.delete(id);
    if (success && typeToDelete) {
      // Create activity record
      await this.createActivity({
        userId: 1, // Default admin
        action: "Deleted",
        entityType: "MusicianType",
        entityId: id,
        timestamp: new Date(),
        details: { type: typeToDelete.title }
      });
    }
    return success;
  }
  
  async getMusicianTypeCategories(musicianTypeId: number): Promise<Category[]> {
    // Find all musician type category associations for this musician type
    const categoryIds = Array.from(this.musicianTypeCategories.values())
      .filter(mtc => mtc.musicianTypeId === musicianTypeId)
      .map(mtc => mtc.categoryId);
    
    // Get the full category objects
    return Array.from(this.categories.values())
      .filter(category => categoryIds.includes(category.id));
  }
  
  // Second createMusicianType implementation removed to fix duplication issue
  
  // Second updateMusicianType implementation removed to fix duplication issue
  
  // Second deleteMusicianType implementation removed to fix duplication issue
  
  async associateMusicianTypeWithCategory(musicianTypeId: number, categoryId: number): Promise<boolean> {
    // Check if the musician type and category exist
    const musicianType = await this.getMusicianType(musicianTypeId);
    const category = await this.getCategory(categoryId);
    
    if (!musicianType || !category) return false;
    
    // Check if the association already exists
    const existingAssociation = Array.from(this.musicianTypeCategories.values())
      .find(mtc => mtc.musicianTypeId === musicianTypeId && mtc.categoryId === categoryId);
    
    if (existingAssociation) return true; // Already exists
    
    // Create new association
    const id = this.currentMusicianTypeCategoryId++;
    const association: MusicianTypeCategory = {
      id,
      musicianTypeId,
      categoryId
    };
    
    this.musicianTypeCategories.set(id, association);
    return true;
  }
  
  async removeMusicianTypeCategory(musicianTypeId: number, categoryId: number): Promise<boolean> {
    // Find the association to remove
    const association = Array.from(this.musicianTypeCategories.values())
      .find(mtc => mtc.musicianTypeId === musicianTypeId && mtc.categoryId === categoryId);
    
    if (!association) return false;
    
    // Delete the association
    return this.musicianTypeCategories.delete(association.id);
  }
  
  // ---- Performance Rating Management Methods ----
  
  async getPerformanceRatings(musicianId?: number, bookingId?: number, plannerAssignmentId?: number): Promise<PerformanceRating[]> {
    let ratings = Array.from(this.performanceRatings.values());
    
    if (musicianId) {
      ratings = ratings.filter(r => r.musicianId === musicianId);
    }
    
    if (bookingId) {
      ratings = ratings.filter(r => r.bookingId === bookingId);
    }
    
    if (plannerAssignmentId) {
      ratings = ratings.filter(r => r.plannerAssignmentId === plannerAssignmentId);
    }
    
    return ratings.sort((a, b) => {
      // Ensure we're working with Date objects
      const dateA = a.ratedAt instanceof Date ? a.ratedAt : new Date(a.ratedAt);
      const dateB = b.ratedAt instanceof Date ? b.ratedAt : new Date(b.ratedAt);
      return dateB.getTime() - dateA.getTime();
    });
  }
  
  async getPerformanceRating(id: number): Promise<PerformanceRating | undefined> {
    return this.performanceRatings.get(id);
  }
  
  async createPerformanceRating(rating: InsertPerformanceRating): Promise<PerformanceRating> {
    const id = this.currentPerformanceRatingId++;
    // Ensure we're working with a Date object for ratedAt
    const ratedAt = rating.ratedAt ? 
      (rating.ratedAt instanceof Date ? rating.ratedAt : new Date(rating.ratedAt)) : 
      new Date();
      
    const newRating: PerformanceRating = { 
      ...rating, 
      id,
      ratedAt
    };
    
    this.performanceRatings.set(id, newRating);
    
    // Update musician's overall rating based on all ratings
    await this.updateMusicianRatingMetrics(newRating.musicianId);
    
    // Create activity
    this.createActivity({
      userId: newRating.ratedBy,
      action: "Rated",
      entityType: "Musician",
      entityId: newRating.musicianId,
      timestamp: new Date(),
      details: { 
        rating: newRating.overallRating,
        venue: newRating.venueId,
        date: newRating.eventDate
      }
    });
    
    return newRating;
  }
  
  async updatePerformanceRating(id: number, data: Partial<InsertPerformanceRating>): Promise<PerformanceRating | undefined> {
    const rating = await this.getPerformanceRating(id);
    if (!rating) return undefined;
    
    const updatedRating = { ...rating, ...data };
    this.performanceRatings.set(id, updatedRating);
    
    // If rating values changed, update musician metrics
    if (
      data.punctuality !== undefined || 
      data.musicianship !== undefined || 
      data.professionalism !== undefined || 
      data.appearance !== undefined || 
      data.flexibility !== undefined || 
      data.overallRating !== undefined
    ) {
      await this.updateMusicianRatingMetrics(rating.musicianId);
    }
    
    return updatedRating;
  }
  
  async deletePerformanceRating(id: number): Promise<boolean> {
    const rating = await this.getPerformanceRating(id);
    if (!rating) return false;
    
    const deleted = this.performanceRatings.delete(id);
    
    // Update musician metrics after deletion
    if (deleted) {
      await this.updateMusicianRatingMetrics(rating.musicianId);
    }
    
    return deleted;
  }
  
  async getMusicianAverageRatings(musicianId: number): Promise<{
    overallRating: number;
    punctuality: number;
    musicianship: number;
    professionalism: number;
    appearance: number;
    flexibility: number;
    totalRatings: number;
  }> {
    const ratings = await this.getPerformanceRatings(musicianId);
    
    if (ratings.length === 0) {
      return {
        overallRating: 0,
        punctuality: 0,
        musicianship: 0,
        professionalism: 0,
        appearance: 0,
        flexibility: 0,
        totalRatings: 0
      };
    }
    
    // Calculate average values
    const sum = ratings.reduce((acc, rating) => {
      return {
        overallRating: acc.overallRating + rating.overallRating,
        punctuality: acc.punctuality + rating.punctuality,
        musicianship: acc.musicianship + rating.musicianship,
        professionalism: acc.professionalism + rating.professionalism,
        appearance: acc.appearance + rating.appearance,
        flexibility: acc.flexibility + rating.flexibility
      };
    }, {
      overallRating: 0,
      punctuality: 0,
      musicianship: 0,
      professionalism: 0,
      appearance: 0,
      flexibility: 0
    });
    
    return {
      overallRating: Number((sum.overallRating / ratings.length).toFixed(1)),
      punctuality: Number((sum.punctuality / ratings.length).toFixed(1)),
      musicianship: Number((sum.musicianship / ratings.length).toFixed(1)),
      professionalism: Number((sum.professionalism / ratings.length).toFixed(1)),
      appearance: Number((sum.appearance / ratings.length).toFixed(1)),
      flexibility: Number((sum.flexibility / ratings.length).toFixed(1)),
      totalRatings: ratings.length
    };
  }
  
  // ---- Musician Pay Rates Management Methods ----
  
  async getMusicianPayRates(): Promise<MusicianPayRate[]> {
    return Array.from(this.musicianPayRates.values());
  }

  async getMusicianPayRate(id: number): Promise<MusicianPayRate | undefined> {
    return this.musicianPayRates.get(id);
  }

  async getMusicianPayRatesByMusicianId(musicianId: number): Promise<MusicianPayRate[]> {
    return Array.from(this.musicianPayRates.values()).filter(rate => rate.musicianId === musicianId);
  }

  async createMusicianPayRate(payRate: InsertMusicianPayRate): Promise<MusicianPayRate> {
    const newPayRate: MusicianPayRate = {
      id: this.currentMusicianPayRateId++,
      ...payRate,
      createdAt: new Date(),
      updatedAt: null
    };
    this.musicianPayRates.set(newPayRate.id, newPayRate);
    
    // Add an activity log entry
    await this.createActivity({
      type: "pay-rate-created",
      message: `Pay rate added for musician ID ${payRate.musicianId} (${payRate.rateType})`,
      userId: 1, // Default to admin for now
      timestamp: new Date(),
      entityId: newPayRate.id,
      entityType: "musician-pay-rate"
    });
    
    return newPayRate;
  }

  async updateMusicianPayRate(id: number, data: Partial<InsertMusicianPayRate>): Promise<MusicianPayRate | undefined> {
    const existingPayRate = this.musicianPayRates.get(id);
    if (!existingPayRate) {
      return undefined;
    }
    
    const updatedPayRate: MusicianPayRate = {
      ...existingPayRate,
      ...data,
      updatedAt: new Date()
    };
    
    this.musicianPayRates.set(id, updatedPayRate);
    
    // Add an activity log entry
    await this.createActivity({
      type: "pay-rate-updated",
      message: `Pay rate updated for musician ID ${updatedPayRate.musicianId} (${updatedPayRate.rateType})`,
      userId: 1, // Default to admin for now
      timestamp: new Date(),
      entityId: updatedPayRate.id,
      entityType: "musician-pay-rate"
    });
    
    return updatedPayRate;
  }

  async deleteMusicianPayRate(id: number): Promise<boolean> {
    const payRate = this.musicianPayRates.get(id);
    if (!payRate) {
      return false;
    }
    
    const deleted = this.musicianPayRates.delete(id);
    
    if (deleted) {
      // Add an activity log entry
      await this.createActivity({
        type: "pay-rate-deleted",
        message: `Pay rate deleted for musician ID ${payRate.musicianId} (${payRate.rateType})`,
        userId: 1, // Default to admin for now
        timestamp: new Date(),
        entityId: id,
        entityType: "musician-pay-rate"
      });
    }
    
    return deleted;
  }

  // ---- Performance Metrics Management Methods ----
  
  async getPerformanceMetrics(musicianId: number): Promise<PerformanceMetric | undefined> {
    return Array.from(this.performanceMetrics.values()).find(m => m.musicianId === musicianId);
  }
  
  async createPerformanceMetrics(metrics: InsertPerformanceMetric): Promise<PerformanceMetric> {
    const id = this.currentPerformanceMetricId++;
    const newMetrics: PerformanceMetric = { 
      ...metrics, 
      id,
      lastUpdated: metrics.lastUpdated || new Date()
    };
    
    this.performanceMetrics.set(id, newMetrics);
    return newMetrics;
  }
  
  async updatePerformanceMetrics(id: number, data: Partial<InsertPerformanceMetric>): Promise<PerformanceMetric | undefined> {
    const metrics = await this.getPerformanceMetrics(data.musicianId!);
    if (!metrics) return undefined;
    
    const updatedMetrics = { 
      ...metrics, 
      ...data,
      lastUpdated: new Date()
    };
    
    this.performanceMetrics.set(id, updatedMetrics);
    return updatedMetrics;
  }
  
  async updateMusicianRatingMetrics(musicianId: number): Promise<PerformanceMetric | undefined> {
    // Get current metrics or create new ones
    let metrics = await this.getPerformanceMetrics(musicianId);
    
    // Get bookings to calculate performance counts
    const bookings = await this.getBookingsByMusician(musicianId);
    
    // Get planner assignments
    const plannerAssignments = Array.from(this.plannerAssignments.values())
      .filter(a => a.musicianId === musicianId);
    
    // Calculate performance stats
    const totalPerformances = bookings.filter(b => b.isAccepted === true).length + plannerAssignments.length;
    const completedPerformances = bookings.filter(b => b.isAccepted === true && b.contractSigned === true).length + 
      plannerAssignments.filter(a => a.status === 'attended').length;
    const cancelledPerformances = bookings.filter(b => b.isAccepted === false).length + 
      plannerAssignments.filter(a => a.status === 'absent').length;
    
    // Get latest ratings
    const avgRatings = await this.getMusicianAverageRatings(musicianId);
    
    // Find last performance date
    const performanceDates = [
      ...bookings.map(b => b.invitedAt),
      ...plannerAssignments.map(a => a.assignedAt)
    ];
    const lastPerformanceDate = performanceDates.length > 0
      ? new Date(Math.max(...performanceDates.map(date => date.getTime())))
      : null;
    
    // Calculate improvement trend (comparing recent ratings to older ones)
    let improvementTrend = 0;
    const ratings = await this.getPerformanceRatings(musicianId);
    if (ratings.length >= 3) {
      const recentRatings = ratings.slice(0, Math.ceil(ratings.length / 2));
      const olderRatings = ratings.slice(Math.ceil(ratings.length / 2));
      
      const recentAvg = recentRatings.reduce((sum, r) => sum + r.overallRating, 0) / recentRatings.length;
      const olderAvg = olderRatings.reduce((sum, r) => sum + r.overallRating, 0) / olderRatings.length;
      
      improvementTrend = Number((recentAvg - olderAvg).toFixed(2));
    }
    
    // Calculate performance streak
    let performanceStreak = 0;
    const sortedAssignments = [...plannerAssignments].sort((a, b) => 
      new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime()
    );
    
    for (const assignment of sortedAssignments) {
      if (assignment.status === 'attended') {
        performanceStreak++;
      } else if (assignment.status === 'absent') {
        break;
      }
    }
    
    // Update metrics or create new ones
    const updatedMetricsData = {
      musicianId,
      totalPerformances,
      completedPerformances,
      cancelledPerformances,
      averageRating: avgRatings.overallRating,
      punctualityAvg: avgRatings.punctuality,
      musicianshipAvg: avgRatings.musicianship,
      professionalismAvg: avgRatings.professionalism,
      appearanceAvg: avgRatings.appearance,
      flexibilityAvg: avgRatings.flexibility,
      lastUpdated: new Date(),
      lastPerformanceDate,
      performanceStreak,
      improvementTrend
    };
    
    // Create new metrics if they don't exist
    if (!metrics) {
      metrics = await this.createPerformanceMetrics(updatedMetricsData);
    } else {
      // Update existing metrics
      metrics = await this.updatePerformanceMetrics(metrics.id, updatedMetricsData);
    }
    
    // Also update the musician's rating
    if (avgRatings.overallRating > 0) {
      const musician = await this.getMusician(musicianId);
      if (musician) {
        await this.updateMusician(musicianId, { rating: avgRatings.overallRating });
      }
    }
    
    return metrics;
  }
  
  // ---- Skill Tags Management Methods ----
  
  async getSkillTags(): Promise<SkillTag[]> {
    return Array.from(this.skillTags.values());
  }
  
  async getSkillTag(id: number): Promise<SkillTag | undefined> {
    return this.skillTags.get(id);
  }
  
  async createSkillTag(tag: InsertSkillTag): Promise<SkillTag> {
    const id = this.currentSkillTagId++;
    const newTag: SkillTag = { 
      ...tag, 
      id,
      createdAt: new Date()
    };
    
    this.skillTags.set(id, newTag);
    
    // Create activity
    this.createActivity({
      userId: 1, // Default admin
      action: "Created",
      entityType: "SkillTag",
      entityId: id,
      timestamp: new Date(),
      details: { skillTag: newTag.name }
    });
    
    return newTag;
  }
  
  async updateSkillTag(id: number, data: Partial<InsertSkillTag>): Promise<SkillTag | undefined> {
    const skillTag = await this.getSkillTag(id);
    if (!skillTag) return undefined;
    
    const updatedTag = { ...skillTag, ...data };
    this.skillTags.set(id, updatedTag);
    
    return updatedTag;
  }
  
  async deleteSkillTag(id: number): Promise<boolean> {
    const skillTag = await this.getSkillTag(id);
    if (!skillTag) return false;
    
    // Remove all musician associations first
    const associations = Array.from(this.musicianSkillTags.values())
      .filter(mst => mst.skillTagId === id);
    
    for (const assoc of associations) {
      this.musicianSkillTags.delete(assoc.id);
    }
    
    // Create activity
    this.createActivity({
      userId: 1, // Default admin
      action: "Deleted",
      entityType: "SkillTag",
      entityId: id,
      timestamp: new Date(),
      details: { skillTag: skillTag.name }
    });
    
    return this.skillTags.delete(id);
  }
  
  // ---- Musician Skill Tags Management Methods ----
  
  async getMusicianSkillTags(musicianId: number): Promise<MusicianSkillTag[]> {
    return Array.from(this.musicianSkillTags.values())
      .filter(mst => mst.musicianId === musicianId);
  }
  
  async getMusicianSkillTag(id: number): Promise<MusicianSkillTag | undefined> {
    return this.musicianSkillTags.get(id);
  }
  
  async createMusicianSkillTag(skillTag: InsertMusicianSkillTag): Promise<MusicianSkillTag> {
    // Check if the association already exists
    const existingAssoc = Array.from(this.musicianSkillTags.values())
      .find(mst => mst.musicianId === skillTag.musicianId && mst.skillTagId === skillTag.skillTagId);
    
    if (existingAssoc) {
      return existingAssoc; // Return existing one instead of creating duplicate
    }
    
    const id = this.currentMusicianSkillTagId++;
    const newSkillTag: MusicianSkillTag = { 
      ...skillTag, 
      id,
      addedAt: new Date(),
      endorsementCount: skillTag.endorsementCount || 0
    };
    
    this.musicianSkillTags.set(id, newSkillTag);
    
    // Get musician and skill tag names for activity log
    const musician = await this.getMusician(skillTag.musicianId);
    const tag = await this.getSkillTag(skillTag.skillTagId);
    
    // Create activity
    this.createActivity({
      userId: 1, // Default admin
      action: "Added",
      entityType: "MusicianSkill",
      entityId: id,
      timestamp: new Date(),
      details: { 
        musician: musician?.name,
        skillTag: tag?.name
      }
    });
    
    return newSkillTag;
  }
  
  async updateMusicianSkillTag(id: number, data: Partial<InsertMusicianSkillTag>): Promise<MusicianSkillTag | undefined> {
    const skillTag = await this.getMusicianSkillTag(id);
    if (!skillTag) return undefined;
    
    const updatedSkillTag = { ...skillTag, ...data };
    this.musicianSkillTags.set(id, updatedSkillTag);
    
    return updatedSkillTag;
  }
  
  async deleteMusicianSkillTag(id: number): Promise<boolean> {
    const musicianSkillTag = await this.getMusicianSkillTag(id);
    if (!musicianSkillTag) return false;
    
    // Create activity
    const musician = await this.getMusician(musicianSkillTag.musicianId);
    const tag = await this.getSkillTag(musicianSkillTag.skillTagId);
    
    this.createActivity({
      userId: 1, // Default admin
      action: "Removed",
      entityType: "MusicianSkill",
      entityId: id,
      timestamp: new Date(),
      details: { 
        musician: musician?.name,
        skillTag: tag?.name
      }
    });
    
    return this.musicianSkillTags.delete(id);
  }
  
  async endorseSkill(musicianId: number, skillTagId: number): Promise<MusicianSkillTag | undefined> {
    // Find the association
    const skillTag = Array.from(this.musicianSkillTags.values())
      .find(mst => mst.musicianId === musicianId && mst.skillTagId === skillTagId);
    
    if (!skillTag) return undefined;
    
    // Increment the endorsement count
    const updatedSkillTag = { 
      ...skillTag, 
      endorsementCount: skillTag.endorsementCount + 1 
    };
    
    this.musicianSkillTags.set(skillTag.id, updatedSkillTag);
    
    // Create activity
    const musician = await this.getMusician(musicianId);
    const tag = await this.getSkillTag(skillTagId);
    
    this.createActivity({
      userId: 1, // Default admin
      action: "Endorsed",
      entityType: "MusicianSkill",
      entityId: skillTag.id,
      timestamp: new Date(),
      details: { 
        musician: musician?.name,
        skillTag: tag?.name
      }
    });
    
    return updatedSkillTag;
  }
  
  // ---- Improvement Plans Management Methods ----
  
  async getImprovementPlans(musicianId?: number): Promise<ImprovementPlan[]> {
    let plans = Array.from(this.improvementPlans.values());
    
    if (musicianId) {
      plans = plans.filter(p => p.musicianId === musicianId);
    }
    
    return plans.sort((a, b) => 
      // Sort by created date, most recent first
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }
  
  async getImprovementPlan(id: number): Promise<ImprovementPlan | undefined> {
    return this.improvementPlans.get(id);
  }
  
  async createImprovementPlan(plan: InsertImprovementPlan): Promise<ImprovementPlan> {
    const id = this.currentImprovementPlanId++;
    const newPlan: ImprovementPlan = { 
      ...plan, 
      id,
      createdAt: new Date(),
      updatedAt: null,
      completedAt: null,
      status: plan.status || 'active'
    };
    
    this.improvementPlans.set(id, newPlan);
    
    // Create activity
    const musician = await this.getMusician(plan.musicianId);
    
    this.createActivity({
      userId: plan.createdBy,
      action: "Created",
      entityType: "ImprovementPlan",
      entityId: id,
      timestamp: new Date(),
      details: { 
        musician: musician?.name,
        title: plan.title,
        target: plan.targetArea
      }
    });
    
    return newPlan;
  }
  
  async updateImprovementPlan(id: number, data: Partial<InsertImprovementPlan>): Promise<ImprovementPlan | undefined> {
    const plan = await this.getImprovementPlan(id);
    if (!plan) return undefined;
    
    const updatedPlan = { 
      ...plan, 
      ...data,
      updatedAt: new Date()
    };
    
    // Handle status change to 'completed'
    if (data.status === 'completed' && plan.status !== 'completed') {
      updatedPlan.completedAt = new Date();
    }
    
    this.improvementPlans.set(id, updatedPlan);
    
    // Create activity if status changed
    if (data.status && data.status !== plan.status) {
      const musician = await this.getMusician(plan.musicianId);
      
      this.createActivity({
        userId: 1, // Default admin
        action: `${data.status.charAt(0).toUpperCase() + data.status.slice(1)}`,
        entityType: "ImprovementPlan",
        entityId: id,
        timestamp: new Date(),
        details: { 
          musician: musician?.name,
          title: plan.title
        }
      });
    }
    
    return updatedPlan;
  }
  
  async deleteImprovementPlan(id: number): Promise<boolean> {
    const plan = await this.getImprovementPlan(id);
    if (!plan) return false;
    
    // Delete all associated actions first
    const actions = await this.getImprovementActions(id);
    for (const action of actions) {
      await this.deleteImprovementAction(action.id);
    }
    
    // Create activity
    const musician = await this.getMusician(plan.musicianId);
    
    this.createActivity({
      userId: 1, // Default admin
      action: "Deleted",
      entityType: "ImprovementPlan",
      entityId: id,
      timestamp: new Date(),
      details: { 
        musician: musician?.name,
        title: plan.title
      }
    });
    
    return this.improvementPlans.delete(id);
  }
  
  // ---- Improvement Actions Management Methods ----
  
  async getImprovementActions(planId: number): Promise<ImprovementAction[]> {
    return Array.from(this.improvementActions.values())
      .filter(a => a.planId === planId)
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  }
  
  async getImprovementAction(id: number): Promise<ImprovementAction | undefined> {
    return this.improvementActions.get(id);
  }
  
  async createImprovementAction(action: InsertImprovementAction): Promise<ImprovementAction> {
    const id = this.currentImprovementActionId++;
    const newAction: ImprovementAction = { 
      ...action, 
      id,
      createdAt: new Date(),
      updatedAt: null,
      completedAt: null,
      status: action.status || 'pending'
    };
    
    this.improvementActions.set(id, newAction);
    
    // Create activity
    const plan = await this.getImprovementPlan(action.planId);
    if (plan) {
      const musician = await this.getMusician(plan.musicianId);
      
      this.createActivity({
        userId: 1, // Default admin
        action: "Created",
        entityType: "ImprovementAction",
        entityId: id,
        timestamp: new Date(),
        details: { 
          musician: musician?.name,
          planTitle: plan.title,
          action: action.description
        }
      });
    }
    
    return newAction;
  }
  
  async updateImprovementAction(id: number, data: Partial<InsertImprovementAction>): Promise<ImprovementAction | undefined> {
    const action = await this.getImprovementAction(id);
    if (!action) return undefined;
    
    const updatedAction = { 
      ...action, 
      ...data,
      updatedAt: new Date()
    };
    
    // Handle status change to 'completed'
    if (data.status === 'completed' && action.status !== 'completed') {
      updatedAction.completedAt = new Date();
      
      // Check if all actions are completed for the plan
      const plan = await this.getImprovementPlan(action.planId);
      if (plan) {
        const allActions = await this.getImprovementActions(action.planId);
        const otherActions = allActions.filter(a => a.id !== id);
        
        const allCompleted = otherActions.every(a => a.status === 'completed' || a.status === 'skipped');
        
        if (allCompleted) {
          // Automatically mark plan as completed
          await this.updateImprovementPlan(action.planId, { status: 'completed' });
        }
      }
    }
    
    this.improvementActions.set(id, updatedAction);
    
    // Create activity if status changed
    if (data.status && data.status !== action.status) {
      const plan = await this.getImprovementPlan(action.planId);
      if (plan) {
        const musician = await this.getMusician(plan.musicianId);
        
        this.createActivity({
          userId: 1, // Default admin
          action: `${data.status.charAt(0).toUpperCase() + data.status.slice(1)}`,
          entityType: "ImprovementAction",
          entityId: id,
          timestamp: new Date(),
          details: { 
            musician: musician?.name,
            planTitle: plan.title,
            action: action.description
          }
        });
      }
    }
    
    return updatedAction;
  }
  
  async deleteImprovementAction(id: number): Promise<boolean> {
    const action = await this.getImprovementAction(id);
    if (!action) return false;
    
    // Create activity
    const plan = await this.getImprovementPlan(action.planId);
    if (plan) {
      const musician = await this.getMusician(plan.musicianId);
      
      this.createActivity({
        userId: 1, // Default admin
        action: "Deleted",
        entityType: "ImprovementAction",
        entityId: id,
        timestamp: new Date(),
        details: { 
          musician: musician?.name,
          planTitle: plan.title,
          action: action.description
        }
      });
    }
    
    return this.improvementActions.delete(id);
  }
  
  async completeImprovementAction(id: number, feedback?: string): Promise<ImprovementAction | undefined> {
    const action = await this.getImprovementAction(id);
    if (!action) return undefined;
    
    // Update the action to completed status with any feedback
    const updatedAction = await this.updateImprovementAction(id, { 
      status: 'completed',
      feedback: feedback || action.feedback // Keep existing feedback if none provided
    });
    
    if (!updatedAction) return undefined;
    
    // Check if all actions in the plan are now completed
    const plan = await this.getImprovementPlan(action.planId);
    if (plan && plan.status !== 'completed') {
      const allActions = await this.getImprovementActions(action.planId);
      
      // Check if all actions are completed or skipped
      const allCompleted = allActions.every(a => 
        a.status === 'completed' || a.status === 'skipped'
      );
      
      if (allCompleted) {
        // Automatically mark plan as completed
        await this.updateImprovementPlan(action.planId, { status: 'completed' });
      }
    }
    
    return updatedAction;
  }
  
  // Availability Share Links management
  async createAvailabilityShareLink(data: InsertAvailabilityShareLink): Promise<AvailabilityShareLink> {
    const shareLink: AvailabilityShareLink = {
      id: this.currentAvailabilityShareLinkId++,
      musicianId: data.musicianId,
      token: data.token,
      expiryDate: new Date(data.expiryDate),
      createdAt: new Date(data.createdAt || new Date())
    };
    
    this.availabilityShareLinks.set(shareLink.id, shareLink);
    
    // Log activity
    this.createActivity({
      action: 'create',
      entityType: 'availability-share-link',
      entityId: shareLink.id,
      timestamp: new Date(),
      userId: null,
      details: { musicianId: shareLink.musicianId }
    });
    
    return shareLink;
  }
  
  async getAvailabilityShareLinks(musicianId: number): Promise<AvailabilityShareLink[]> {
    return Array.from(this.availabilityShareLinks.values())
      .filter(link => link.musicianId === musicianId);
  }
  
  async getAvailabilityShareLink(id: number): Promise<AvailabilityShareLink | undefined> {
    return this.availabilityShareLinks.get(id);
  }
  
  async getAvailabilityShareLinkByToken(token: string): Promise<AvailabilityShareLink | undefined> {
    return Array.from(this.availabilityShareLinks.values())
      .find(link => link.token === token);
  }
  
  async deleteAvailabilityShareLink(id: number): Promise<boolean> {
    if (!this.availabilityShareLinks.has(id)) {
      return false;
    }
    
    const shareLink = this.availabilityShareLinks.get(id);
    this.availabilityShareLinks.delete(id);
    
    // Log activity
    this.createActivity({
      action: 'delete',
      entityType: 'availability-share-link',
      entityId: id,
      timestamp: new Date(),
      userId: null,
      details: { musicianId: shareLink?.musicianId }
    });
    
    return true;
  }

  // Contract Link Methods
  
  async createContractLink(contractData: InsertContractLink): Promise<ContractLink> {
    const contractLink: ContractLink = {
      id: this.currentContractLinkId++,
      bookingId: contractData.bookingId,
      eventId: contractData.eventId,
      musicianId: contractData.musicianId,
      token: contractData.token,
      expiresAt: new Date(contractData.expiresAt),
      status: contractData.status || 'pending',
      respondedAt: null,
      response: null,
      createdAt: new Date(),
      amount: contractData.amount || null,
      eventDate: contractData.eventDate ? new Date(contractData.eventDate) : null
    };
    
    this.contractLinks.set(contractLink.id, contractLink);
    
    // Log activity
    this.createActivity({
      action: 'create',
      entityType: 'contract-link',
      entityId: contractLink.id,
      timestamp: new Date(),
      userId: null,
      details: { 
        musicianId: contractLink.musicianId,
        eventId: contractLink.eventId,
        bookingId: contractLink.bookingId
      }
    });
    
    return contractLink;
  }
  
  async getContractLinks(): Promise<ContractLink[]> {
    return Array.from(this.contractLinks.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
  
  async getContractLink(id: number): Promise<ContractLink | undefined> {
    return this.contractLinks.get(id);
  }
  
  async getContractLinkByToken(token: string): Promise<ContractLink | undefined> {
    return Array.from(this.contractLinks.values())
      .find(link => link.token === token);
  }
  
  async getContractLinksByEvent(eventId: number): Promise<ContractLink[]> {
    return Array.from(this.contractLinks.values())
      .filter(link => link.eventId === eventId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
  
  async getContractLinksByMusician(musicianId: number): Promise<ContractLink[]> {
    return Array.from(this.contractLinks.values())
      .filter(link => link.musicianId === musicianId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
  
  async updateContractLink(id: number, data: Partial<InsertContractLink>): Promise<ContractLink | undefined> {
    const contractLink = this.contractLinks.get(id);
    if (!contractLink) return undefined;
    
    const updatedContractLink = {
      ...contractLink,
      ...data
    };
    
    this.contractLinks.set(id, updatedContractLink);
    
    // Log activity
    this.createActivity({
      action: 'update',
      entityType: 'contract-link',
      entityId: id,
      timestamp: new Date(),
      userId: null,
      details: { 
        musicianId: contractLink.musicianId,
        eventId: contractLink.eventId,
        bookingId: contractLink.bookingId
      }
    });
    
    return updatedContractLink;
  }
  
  async updateContractLinkStatus(token: string, status: string, response?: string): Promise<ContractLink | undefined> {
    const contractLink = await this.getContractLinkByToken(token);
    if (!contractLink) return undefined;
    
    const updatedContractLink = {
      ...contractLink,
      status,
      respondedAt: new Date(),
      response: response || null
    };
    
    this.contractLinks.set(contractLink.id, updatedContractLink);
    
    // Log activity
    this.createActivity({
      action: 'update-status',
      entityType: 'contract-link',
      entityId: contractLink.id,
      timestamp: new Date(),
      userId: null,
      details: { 
        musicianId: contractLink.musicianId,
        eventId: contractLink.eventId,
        bookingId: contractLink.bookingId,
        status,
        response
      }
    });
    
    return updatedContractLink;
  }
}

// TODO: In the future, we'll implement database persistence
// For now, we'll continue using in-memory storage while we work on the DB implementation
// This approach allows us to make progress on other features immediately
export const storage = new MemStorage();
