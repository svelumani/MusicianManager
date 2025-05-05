import {
  users, venues, categories, musicianCategories, venueCategories, eventCategories,
  musicians, musicianPayRates, availability, events, bookings, payments, collections, expenses, 
  activities, monthlyPlanners, plannerSlots, plannerAssignments, monthlyInvoices,
  settings, emailTemplates, musicianTypes, invitations, availabilityShareLinks, contractLinks, contractTemplates,
  monthlyContracts, monthlyContractMusicians, monthlyContractDates,
  type User, type InsertUser, type Venue, 
  type InsertVenue, type Category, type InsertCategory, 
  type MusicianCategory, type InsertMusicianCategory,
  type VenueCategory, type InsertVenueCategory,
  type EventCategory, type InsertEventCategory,
  type Musician, type InsertMusician, type MusicianPayRate, type InsertMusicianPayRate, type Availability, 
  type InsertAvailability, type Event, type InsertEvent, 
  type Booking, type InsertBooking, type Payment, type InsertPayment, 
  type Collection, type InsertCollection, type Expense, 
  type InsertExpense, type Activity, type InsertActivity, type Invitation, type InsertInvitation,
  type MonthlyPlanner, type InsertMonthlyPlanner,
  type PlannerSlot, type InsertPlannerSlot,
  type PlannerAssignment, type InsertPlannerAssignment,
  type MonthlyInvoice, type InsertMonthlyInvoice,
  type Settings, type InsertSettings,
  type EmailTemplate, type InsertEmailTemplate,
  type MusicianType, type InsertMusicianType,
  type PerformanceRating, type InsertPerformanceRating,
  type AvailabilityShareLink, type InsertAvailabilityShareLink,
  type ContractLink, type InsertContractLink,
  type ContractTemplate, type InsertContractTemplate,
  type MonthlyContract, type InsertMonthlyContract,
  type MonthlyContractMusician, type InsertMonthlyContractMusician,
  type MonthlyContractDate, type InsertMonthlyContractDate
} from "@shared/schema";
import { IStorage } from "./storage";
import { db, pool } from "./db";
import { eq, and, desc, sql, gte, lte, isNull, like, or, inArray, not, count, asc, max, min, sum } from "drizzle-orm";
import crypto from 'crypto';
import { format, startOfMonth, endOfMonth, addMonths, parseISO, isValid, startOfDay, endOfDay } from 'date-fns';

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  async updateUser(id: number, data: Partial<InsertUser>): Promise<User | undefined> {
    const [updated] = await db.update(users)
      .set(data)
      .where(eq(users.id, id))
      .returning();
    
    return updated;
  }

  // Event musician assignments and invitations
  async getEventMusicianAssignments(eventId: number): Promise<Record<string, number[]>> {
    const assignedMusicians: Record<string, number[]> = {};
    
    // Get all bookings for this event, grouped by date
    const eventBookings = await db.select({
      id: bookings.id,
      eventId: bookings.eventId,
      musicianId: bookings.musicianId,
      date: bookings.date,
    })
    .from(bookings)
    .where(eq(bookings.eventId, eventId));
    
    console.log(`Found ${eventBookings.length} bookings for event ${eventId}`);
    
    // Group bookings by date
    for (const booking of eventBookings) {
      if (!booking.date) {
        console.warn(`Booking ${booking.id} has no date, skipping`);
        continue;
      }
      
      // Normalize date to YYYY-MM-DD format
      const dateStr = format(booking.date, 'yyyy-MM-dd');
      
      if (!assignedMusicians[dateStr]) {
        assignedMusicians[dateStr] = [];
      }
      
      // Only add musician ID if it's not already in the array for this date
      if (!assignedMusicians[dateStr].includes(booking.musicianId)) {
        assignedMusicians[dateStr].push(booking.musicianId);
      }
    }
    
    console.log(`Musician assignments for event: ${eventId}`, assignedMusicians);
    return assignedMusicians;
  }
  
  async getEventMusicianStatuses(eventId: number): Promise<Record<string, Record<number, string>>> {
    const musicianStatuses: Record<string, Record<number, string>> = {};
    
    // Get all invitations for this event
    const eventInvitations = await db.select()
      .from(invitations)
      .where(eq(invitations.eventId, eventId));
    
    // Group invitations by date
    for (const invitation of eventInvitations) {
      const dateStr = invitation.date ? format(invitation.date, 'yyyy-MM-dd') : 'all';
      
      if (!musicianStatuses[dateStr]) {
        musicianStatuses[dateStr] = {};
      }
      
      musicianStatuses[dateStr][invitation.musicianId] = invitation.status;
    }
    
    return musicianStatuses;
  }
  
  async updateMusicianEventStatus(eventId: number, musicianId: number, status: string): Promise<boolean> {
    // Find invitation
    const invites = await db.select()
      .from(invitations)
      .where(and(
        eq(invitations.eventId, eventId),
        eq(invitations.musicianId, musicianId),
        isNull(invitations.date)
      ));
    
    if (invites.length > 0) {
      // Update existing invitation
      await db.update(invitations)
        .set({ status, updatedAt: new Date() })
        .where(eq(invitations.id, invites[0].id));
    } else {
      // Create new invitation
      await db.insert(invitations).values({
        eventId,
        musicianId,
        status,
        sentAt: new Date(),
        updatedAt: new Date()
      });
    }
    
    // Handle confirmed/declined status changes
    if (status === 'confirmed') {
      // Check if booking already exists
      const existingBooking = await db.select()
        .from(bookings)
        .where(and(
          eq(bookings.eventId, eventId),
          eq(bookings.musicianId, musicianId)
        ));
      
      if (existingBooking.length === 0) {
        // Create booking
        const event = await this.getEvent(eventId);
        
        if (event) {
          await db.insert(bookings).values({
            eventId,
            musicianId,
            date: event.startDate,
            amount: 0, // To be filled in later
            status: 'confirmed'
          });
        }
      } else {
        // Update booking status
        await db.update(bookings)
          .set({ status: 'confirmed' })
          .where(eq(bookings.id, existingBooking[0].id));
      }
    } else if (status === 'declined') {
      // Check if booking exists and delete
      await db.delete(bookings)
        .where(and(
          eq(bookings.eventId, eventId),
          eq(bookings.musicianId, musicianId)
        ));
    }
    
    return true;
  }
  
  async updateMusicianEventStatusForDate(eventId: number, musicianId: number, status: string, dateStr: string): Promise<boolean> {
    console.log(`Updating status to ${status} for musician ${musicianId} in event ${eventId} on date ${dateStr}`);
    const date = new Date(dateStr);
    
    if (!isValid(date)) {
      throw new Error('Invalid date format');
    }
    
    // Find invitation for this event and musician (global one without date)
    const invites = await db.select()
      .from(invitations)
      .where(and(
        eq(invitations.eventId, eventId),
        eq(invitations.musicianId, musicianId),
        isNull(invitations.date)
      ));
    
    // Check for date-specific invitation first
    const dateSpecificInvites = await db.select()
      .from(invitations)
      .where(and(
        eq(invitations.eventId, eventId),
        eq(invitations.musicianId, musicianId),
        eq(invitations.date, date)
      ));
    
    console.log(`Found ${dateSpecificInvites.length} date-specific invitations and ${invites.length} global invitations`);
    
    if (dateSpecificInvites.length > 0) {
      // Update existing date-specific invitation
      console.log(`Updating existing date-specific invitation ${dateSpecificInvites[0].id} with status ${status} for date ${dateStr}`);
      await db.update(invitations)
        .set({ 
          status, 
          updatedAt: new Date(),
          respondedAt: status !== 'invited' ? new Date() : dateSpecificInvites[0].respondedAt 
        })
        .where(eq(invitations.id, dateSpecificInvites[0].id));
        
      return true;
    } else if (invites.length > 0) {
      // If no date-specific invitation but we have a general one,
      // create a new date-specific one based on the general invitation
      console.log(`Creating new date-specific invitation for existing musician ${musicianId} in event ${eventId} with status ${status} for date ${dateStr}`);
      
      const newInvitation = {
        eventId,
        musicianId,
        invitedAt: new Date(),
        status,
        date, // Store the specific date this status applies to
        updatedAt: new Date(),
        respondedAt: status !== 'invited' ? new Date() : null,
        email: invites[0].email,
        messageSubject: `Event Invitation for ${dateStr}`,
        messageBody: `You have been invited to an event on ${dateStr}.`,
        reminders: 0,
        lastReminderAt: null,
        responseMessage: null
      };
      
      await db.insert(invitations).values(newInvitation);
    } else {
      // No invitation exists at all, create a new one with the date
      console.log(`Creating completely new invitation for musician ${musicianId} in event ${eventId} with status ${status} for date ${dateStr}`);
      // Get musician data for the email
      const musician = await db.select()
        .from(musicians)
        .where(eq(musicians.id, musicianId))
        .limit(1);
        
      // Create new invitation
      await db.insert(invitations).values({
        eventId,
        musicianId,
        invitedAt: new Date(),
        status,
        date, // Important! Store the date
        email: musician.length > 0 ? musician[0].email : 'no-email@example.com',
        messageSubject: `Event Invitation for ${dateStr}`,
        messageBody: `You have been invited to an event on ${dateStr}.`
      });
    }
    
    // Handle confirmed/declined status changes
    if (status === 'confirmed' || status === 'contract-signed') {
      // Check if booking already exists for this date
      const existingBooking = await db.select()
        .from(bookings)
        .where(and(
          eq(bookings.eventId, eventId),
          eq(bookings.musicianId, musicianId),
          eq(bookings.date, date)
        ));
      
      if (existingBooking.length === 0) {
        // Find the most recent invitation for this musician and event
        const latestInvite = await db.select()
          .from(invitations)
          .where(and(
            eq(invitations.eventId, eventId),
            eq(invitations.musicianId, musicianId)
          ))
          .orderBy(desc(invitations.invitedAt))
          .limit(1);
        
        if (latestInvite.length === 0) {
          throw new Error('Cannot create booking without an invitation');
        }
        
        // Create booking
        await db.insert(bookings).values({
          eventId,
          musicianId,
          invitationId: latestInvite[0].id,
          date,
          paymentStatus: 'pending'
        });
      } else {
        // Update booking status based on the new musician status
        const bookingStatus = status === 'contract-signed' ? 'confirmed' : 'pending';
        
        await db.update(bookings)
          .set({ 
            contractSigned: status === 'contract-signed',
            contractSignedAt: status === 'contract-signed' ? new Date() : undefined,
            paymentStatus: bookingStatus
          })
          .where(eq(bookings.id, existingBooking[0].id));
      }
    } else if (status === 'rejected') {
      // Delete booking if exists
      await db.delete(bookings)
        .where(and(
          eq(bookings.eventId, eventId),
          eq(bookings.musicianId, musicianId),
          eq(bookings.date, date)
        ));
    }
    
    return true;
  }
  
  // Invitation management
  async getInvitations(eventId?: number, musicianId?: number): Promise<Invitation[]> {
    let query = db.select().from(invitations);
    
    if (eventId && musicianId) {
      query = query.where(and(
        eq(invitations.eventId, eventId),
        eq(invitations.musicianId, musicianId)
      ));
    } else if (eventId) {
      query = query.where(eq(invitations.eventId, eventId));
    } else if (musicianId) {
      query = query.where(eq(invitations.musicianId, musicianId));
    }
    
    return await query.orderBy(desc(invitations.invitedAt));
  }
  
  async getInvitationsByEventAndMusician(eventId: number, musicianId: number): Promise<Invitation[]> {
    return await db.select()
      .from(invitations)
      .where(and(
        eq(invitations.eventId, eventId),
        eq(invitations.musicianId, musicianId)
      ))
      .orderBy(invitations.invitedAt);
  }
  
  async getInvitation(id: number): Promise<Invitation | undefined> {
    const [invitation] = await db.select()
      .from(invitations)
      .where(eq(invitations.id, id));
    
    return invitation;
  }
  
  async createInvitation(invitation: InsertInvitation): Promise<Invitation> {
    const [newInvitation] = await db.insert(invitations)
      .values(invitation)
      .returning();
    
    return newInvitation;
  }
  
  async updateInvitation(id: number, data: Partial<InsertInvitation>): Promise<Invitation | undefined> {
    const [updated] = await db.update(invitations)
      .set(data)
      .where(eq(invitations.id, id))
      .returning();
    
    return updated;
  }
  
  // Settings management
  async getSettings(type: string): Promise<Settings | undefined> {
    const [setting] = await db.select()
      .from(settings)
      .where(eq(settings.type, type));
    
    return setting;
  }
  
  async createSettings(type: string, data: any): Promise<Settings> {
    const [newSetting] = await db.insert(settings)
      .values({
        type,
        data: JSON.stringify(data)
      })
      .returning();
    
    return newSetting;
  }
  
  async updateSettings(type: string, data: any): Promise<Settings | undefined> {
    // Check if settings exist
    const existing = await this.getSettings(type);
    
    if (!existing) {
      return await this.createSettings(type, data);
    }
    
    // Update existing settings
    const [updated] = await db.update(settings)
      .set({
        data: JSON.stringify(data),
        updatedAt: new Date()
      })
      .where(eq(settings.type, type))
      .returning();
    
    return updated;
  }
  
  // Email template management
  async getEmailTemplates(): Promise<EmailTemplate[]> {
    return await db.select().from(emailTemplates).orderBy(emailTemplates.name);
  }
  
  async getEmailTemplate(id: number): Promise<EmailTemplate | undefined> {
    const [template] = await db.select()
      .from(emailTemplates)
      .where(eq(emailTemplates.id, id));
    
    return template;
  }
  
  async getEmailTemplateByName(name: string): Promise<EmailTemplate | undefined> {
    const [template] = await db.select()
      .from(emailTemplates)
      .where(eq(emailTemplates.name, name));
    
    return template;
  }
  
  async createEmailTemplate(template: InsertEmailTemplate): Promise<EmailTemplate> {
    const [newTemplate] = await db.insert(emailTemplates)
      .values(template)
      .returning();
    
    return newTemplate;
  }
  
  async updateEmailTemplate(id: number, data: Partial<InsertEmailTemplate>): Promise<EmailTemplate | undefined> {
    const [updated] = await db.update(emailTemplates)
      .set(data)
      .where(eq(emailTemplates.id, id))
      .returning();
    
    return updated;
  }
  
  async deleteEmailTemplate(id: number): Promise<boolean> {
    const result = await db.delete(emailTemplates)
      .where(eq(emailTemplates.id, id));
    
    return result.rowCount > 0;
  }
  
  // Musician Type management
  async getMusicianTypes(): Promise<MusicianType[]> {
    return await db.select().from(musicianTypes).orderBy(musicianTypes.title);
  }
  
  async getMusicianType(id: number): Promise<MusicianType | undefined> {
    const [type] = await db.select()
      .from(musicianTypes)
      .where(eq(musicianTypes.id, id));
    
    return type;
  }
  
  async getMusicianTypeCategories(musicianTypeId: number): Promise<Category[]> {
    const categoryLinks = await db.select({
      categoryId: musicianTypeCategories.categoryId
    })
    .from(musicianTypeCategories)
    .where(eq(musicianTypeCategories.musicianTypeId, musicianTypeId));
    
    const categoryIds = categoryLinks.map(link => link.categoryId);
    
    if (categoryIds.length === 0) {
      return [];
    }
    
    return await db.select()
      .from(categories)
      .where(inArray(categories.id, categoryIds))
      .orderBy(categories.title);
  }
  
  async createMusicianType(musicianType: InsertMusicianType): Promise<MusicianType> {
    const [newType] = await db.insert(musicianTypes)
      .values(musicianType)
      .returning();
    
    return newType;
  }
  
  async updateMusicianType(id: number, data: Partial<InsertMusicianType>): Promise<MusicianType | undefined> {
    const [updated] = await db.update(musicianTypes)
      .set(data)
      .where(eq(musicianTypes.id, id))
      .returning();
    
    return updated;
  }
  
  async deleteMusicianType(id: number): Promise<boolean> {
    // Delete relations first
    await db.delete(musicianTypeCategories)
      .where(eq(musicianTypeCategories.musicianTypeId, id));
    
    // Delete the musician type
    const result = await db.delete(musicianTypes)
      .where(eq(musicianTypes.id, id));
    
    return result.rowCount > 0;
  }
  
  async associateMusicianTypeWithCategory(musicianTypeId: number, categoryId: number): Promise<boolean> {
    // Check if association already exists
    const [existing] = await db.select()
      .from(musicianTypeCategories)
      .where(and(
        eq(musicianTypeCategories.musicianTypeId, musicianTypeId),
        eq(musicianTypeCategories.categoryId, categoryId)
      ));
    
    if (existing) {
      return true; // Already associated
    }
    
    // Create new association
    await db.insert(musicianTypeCategories)
      .values({
        musicianTypeId,
        categoryId
      });
    
    return true;
  }
  
  async removeMusicianTypeCategory(musicianTypeId: number, categoryId: number): Promise<boolean> {
    const result = await db.delete(musicianTypeCategories)
      .where(and(
        eq(musicianTypeCategories.musicianTypeId, musicianTypeId),
        eq(musicianTypeCategories.categoryId, categoryId)
      ));
    
    return result.rowCount > 0;
  }
  
  // Venue management
  async getVenues(): Promise<Venue[]> {
    return await db.select().from(venues).orderBy(venues.name);
  }
  
  async getVenue(id: number): Promise<Venue | undefined> {
    const [venue] = await db.select()
      .from(venues)
      .where(eq(venues.id, id));
    
    return venue;
  }
  
  async createVenue(venue: InsertVenue): Promise<Venue> {
    const [newVenue] = await db.insert(venues)
      .values(venue)
      .returning();
    
    return newVenue;
  }
  
  async updateVenue(id: number, data: Partial<InsertVenue>): Promise<Venue | undefined> {
    const [updated] = await db.update(venues)
      .set(data)
      .where(eq(venues.id, id))
      .returning();
    
    return updated;
  }
  
  async deleteVenue(id: number): Promise<boolean> {
    const result = await db.delete(venues)
      .where(eq(venues.id, id));
    
    return result.rowCount > 0;
  }
  
  // Category management
  async getCategories(): Promise<Category[]> {
    return await db.select().from(categories).orderBy(categories.title);
  }
  
  async getCategory(id: number): Promise<Category | undefined> {
    const [category] = await db.select()
      .from(categories)
      .where(eq(categories.id, id));
    
    return category;
  }
  
  async createCategory(category: InsertCategory): Promise<Category> {
    const [newCategory] = await db.insert(categories)
      .values(category)
      .returning();
    
    return newCategory;
  }
  
  async updateCategory(id: number, data: Partial<InsertCategory>): Promise<Category | undefined> {
    const [updated] = await db.update(categories)
      .set(data)
      .where(eq(categories.id, id))
      .returning();
    
    return updated;
  }
  
  async deleteCategory(id: number): Promise<boolean> {
    const result = await db.delete(categories)
      .where(eq(categories.id, id));
    
    return result.rowCount > 0;
  }
  
  // Musician Category management
  async getMusicianCategories(): Promise<MusicianCategory[]> {
    return await db.select().from(musicianCategories).orderBy(musicianCategories.title);
  }
  
  async getMusicianCategory(id: number): Promise<MusicianCategory | undefined> {
    const [category] = await db.select()
      .from(musicianCategories)
      .where(eq(musicianCategories.id, id));
    
    return category;
  }
  
  async createMusicianCategory(category: InsertMusicianCategory): Promise<MusicianCategory> {
    const [newCategory] = await db.insert(musicianCategories)
      .values(category)
      .returning();
    
    return newCategory;
  }
  
  async updateMusicianCategory(id: number, data: Partial<InsertMusicianCategory>): Promise<MusicianCategory | undefined> {
    const [updated] = await db.update(musicianCategories)
      .set(data)
      .where(eq(musicianCategories.id, id))
      .returning();
    
    return updated;
  }
  
  async deleteMusicianCategory(id: number): Promise<boolean> {
    const result = await db.delete(musicianCategories)
      .where(eq(musicianCategories.id, id));
    
    return result.rowCount > 0;
  }
  
  // Venue Category management
  async getVenueCategories(): Promise<VenueCategory[]> {
    return await db.select().from(venueCategories).orderBy(venueCategories.title);
  }
  
  async getVenueCategory(id: number): Promise<VenueCategory | undefined> {
    const [category] = await db.select()
      .from(venueCategories)
      .where(eq(venueCategories.id, id));
    
    return category;
  }
  
  async createVenueCategory(category: InsertVenueCategory): Promise<VenueCategory> {
    const [newCategory] = await db.insert(venueCategories)
      .values(category)
      .returning();
    
    return newCategory;
  }
  
  async updateVenueCategory(id: number, data: Partial<InsertVenueCategory>): Promise<VenueCategory | undefined> {
    const [updated] = await db.update(venueCategories)
      .set(data)
      .where(eq(venueCategories.id, id))
      .returning();
    
    return updated;
  }
  
  async deleteVenueCategory(id: number): Promise<boolean> {
    const result = await db.delete(venueCategories)
      .where(eq(venueCategories.id, id));
    
    return result.rowCount > 0;
  }
  
  // Event Category management
  async getEventCategories(): Promise<EventCategory[]> {
    return await db.select().from(eventCategories).orderBy(eventCategories.title);
  }
  
  async getEventCategory(id: number): Promise<EventCategory | undefined> {
    const [category] = await db.select()
      .from(eventCategories)
      .where(eq(eventCategories.id, id));
    
    return category;
  }
  
  async createEventCategory(category: InsertEventCategory): Promise<EventCategory> {
    const [newCategory] = await db.insert(eventCategories)
      .values(category)
      .returning();
    
    return newCategory;
  }
  
  async updateEventCategory(id: number, data: Partial<InsertEventCategory>): Promise<EventCategory | undefined> {
    const [updated] = await db.update(eventCategories)
      .set(data)
      .where(eq(eventCategories.id, id))
      .returning();
    
    return updated;
  }
  
  async deleteEventCategory(id: number): Promise<boolean> {
    const result = await db.delete(eventCategories)
      .where(eq(eventCategories.id, id));
    
    return result.rowCount > 0;
  }
  
  // Musician management
  async getMusicians(): Promise<Musician[]> {
    return await db.select().from(musicians).orderBy(musicians.name);
  }
  
  async getMusician(id: number): Promise<Musician | undefined> {
    const [musician] = await db.select()
      .from(musicians)
      .where(eq(musicians.id, id));
    
    return musician;
  }
  
  async createMusician(musician: InsertMusician): Promise<Musician> {
    const [newMusician] = await db.insert(musicians)
      .values(musician)
      .returning();
    
    // Create activity log
    await this.createActivity({
      entityType: 'musician',
      entityId: newMusician.id,
      action: 'create',
      userId: 1, // Default admin user
      details: `Added new musician: ${newMusician.name}`
    });
    
    return newMusician;
  }
  
  async updateMusician(id: number, data: Partial<InsertMusician>): Promise<Musician | undefined> {
    const [updated] = await db.update(musicians)
      .set(data)
      .where(eq(musicians.id, id))
      .returning();
    
    // Create activity log
    if (updated) {
      await this.createActivity({
        entityType: 'musician',
        entityId: updated.id,
        action: 'update',
        userId: 1, // Default admin user
        details: `Updated musician: ${updated.name}`
      });
    }
    
    return updated;
  }
  
  async deleteMusician(id: number): Promise<boolean> {
    // Get musician details for activity log
    const musician = await this.getMusician(id);
    
    const result = await db.delete(musicians)
      .where(eq(musicians.id, id));
    
    // Create activity log
    if (result.rowCount > 0 && musician) {
      await this.createActivity({
        entityType: 'musician',
        entityId: musician.id,
        action: 'delete',
        userId: 1, // Default admin user
        details: `Deleted musician: ${musician.name}`
      });
    }
    
    return result.rowCount > 0;
  }
  
  // Musician events and contracts integration
  async getMusicianEvents(musicianId: number, status?: string, timeframe?: string): Promise<any[]> {
    // Base query to get all events that have bookings for this musician
    let query = db.select({
      eventId: bookings.eventId,
      bookingId: bookings.id,
      date: bookings.date,
      status: bookings.status,
      amount: bookings.amount,
      eventTitle: events.title,
      venue: events.venue,
      startTime: events.startTime,
      endTime: events.endTime
    })
    .from(bookings)
    .innerJoin(events, eq(bookings.eventId, events.id))
    .where(eq(bookings.musicianId, musicianId));
    
    // Apply status filter if provided
    if (status) {
      query = query.where(eq(bookings.status, status));
    }
    
    // Apply timeframe filter if provided
    if (timeframe) {
      const now = new Date();
      
      if (timeframe === 'upcoming') {
        query = query.where(gte(bookings.date, now));
      } else if (timeframe === 'past') {
        query = query.where(lte(bookings.date, now));
      }
    }
    
    // Execute query and order by date
    return await query.orderBy(bookings.date);
  }
  
  async getMusicianEventDatesInMonth(musicianId: number, month: number, year: number): Promise<any[]> {
    try {
      console.log(`Fetching event dates for musician ${musicianId} in ${month}/${year}`);
      
      // Calculate first and last day of month
      const startDate = startOfMonth(new Date(year, month - 1));
      const endDate = endOfMonth(startDate);
      
      // First approach: Skip trying to directly query contractLinks table
      // Get all the bookings for this musician in this month
      const bookingsQuery = db.select({
        id: bookings.id,
        date: bookings.date,
        status: bookings.status,
        eventId: bookings.eventId,
        musicianId: bookings.musicianId
      })
      .from(bookings)
      .where(and(
        eq(bookings.musicianId, musicianId),
        gte(bookings.date, startDate),
        lte(bookings.date, endDate)
      ));
      
      // We'll try-catch each database operation separately
      let bookingsInMonth: any[] = [];
      try {
        bookingsInMonth = await bookingsQuery.orderBy(bookings.date);
        console.log(`Found ${bookingsInMonth.length} bookings for musician ${musicianId} in ${month}/${year}`);
      } catch (bookingErr) {
        console.error("Error fetching bookings:", bookingErr);
        return [];
      }
      
      if (bookingsInMonth.length === 0) {
        return [];
      }
      
      // Now transform the bookings into event data
      const enhancedEvents = [];
      
      for (const booking of bookingsInMonth) {
        try {
          // Get the event details
          let eventName = "Unknown Event";
          let venueId = null;
          let venueName = "Unknown Venue";
          
          try {
            const [event] = await db.select({
              id: events.id,
              name: events.name,
              venueId: events.venueId
            })
            .from(events)
            .where(eq(events.id, booking.eventId));
            
            if (event) {
              eventName = event.name;
              venueId = event.venueId;
            }
          } catch (eventErr) {
            console.warn(`Error fetching event details for event ${booking.eventId}:`, eventErr);
          }
          
          // Get venue name if we have a venue ID
          if (venueId) {
            try {
              const [venue] = await db.select({
                id: venues.id,
                name: venues.name
              })
              .from(venues)
              .where(eq(venues.id, venueId));
              
              if (venue) {
                venueName = venue.name;
              }
            } catch (venueErr) {
              console.warn(`Error fetching venue details for venue ${venueId}:`, venueErr);
            }
          }
          
          // Check the centralized status system directly (skip contractLinks)
          let contractStatus = "none";
          try {
            // Import the status service
            const { statusService, ENTITY_TYPES } = await import('./services/status');
            
            // Get status for this booking/contract
            const statusData = await statusService.getEntityStatus(
              ENTITY_TYPES.CONTRACT,
              0, // We don't have contract ID, pass 0
              booking.eventId,
              booking.musicianId,
              booking.date
            );
            
            if (statusData && statusData.status) {
              contractStatus = statusData.status;
              console.log(`Using centralized status "${contractStatus}" for booking on ${format(booking.date, 'yyyy-MM-dd')}`);
            }
          } catch (statusErr) {
            console.warn(`Error fetching centralized status:`, statusErr);
            
            // Fallback to booking status
            contractStatus = booking.status || "none";
          }
          
          // Add event data to results
          enhancedEvents.push({
            date: booking.date,
            status: booking.status,
            eventTitle: eventName,
            eventId: booking.eventId,
            venueName: venueName,
            contractStatus: contractStatus
          });
        } catch (itemErr) {
          console.warn(`Error processing booking ${booking.id}:`, itemErr);
        }
      }
      
      return enhancedEvents;
    } catch (error) {
      console.error("Error fetching musician event dates:", error);
      return [];
    }
  }
  
  // Musician Pay Rates management
  async getMusicianPayRates(): Promise<MusicianPayRate[]> {
    return await db.select().from(musicianPayRates);
  }
  
  async getMusicianPayRate(id: number): Promise<MusicianPayRate | undefined> {
    const [rate] = await db.select()
      .from(musicianPayRates)
      .where(eq(musicianPayRates.id, id));
    
    return rate;
  }
  
  async getMusicianPayRatesByMusicianId(musicianId: number): Promise<MusicianPayRate[]> {
    return await db.select()
      .from(musicianPayRates)
      .where(eq(musicianPayRates.musicianId, musicianId));
  }
  
  async createMusicianPayRate(payRate: InsertMusicianPayRate): Promise<MusicianPayRate> {
    const [newRate] = await db.insert(musicianPayRates)
      .values(payRate)
      .returning();
    
    return newRate;
  }
  
  async updateMusicianPayRate(id: number, data: Partial<InsertMusicianPayRate>): Promise<MusicianPayRate | undefined> {
    const [updated] = await db.update(musicianPayRates)
      .set(data)
      .where(eq(musicianPayRates.id, id))
      .returning();
    
    return updated;
  }
  
  async deleteMusicianPayRate(id: number): Promise<boolean> {
    const result = await db.delete(musicianPayRates)
      .where(eq(musicianPayRates.id, id));
    
    return result.rowCount > 0;
  }
  
  // Availability management
  async getAvailability(musicianId: number, month: string): Promise<Availability[]> {
    return await db.select()
      .from(availability)
      .where(and(
        eq(availability.musicianId, musicianId),
        eq(availability.month, month)
      ));
  }
  
  async getMusicianAvailabilityForDate(musicianId: number, date: Date): Promise<Availability | undefined> {
    const dateStart = startOfDay(date);
    const dateEnd = endOfDay(date);
    
    const [result] = await db.select()
      .from(availability)
      .where(and(
        eq(availability.musicianId, musicianId),
        gte(availability.date, dateStart),
        lte(availability.date, dateEnd)
      ));
    
    return result;
  }
  
  async isMusicianAvailableForDate(musicianId: number, dateStr: string): Promise<boolean> {
    try {
      console.log(`Checking database availability for musician ${musicianId} on ${dateStr}`);
      
      // Convert the string date to a Date object
      const date = new Date(dateStr);
      
      // Query directly to ensure we get the most accurate data
      const [result] = await db.select()
        .from(availability)
        .where(and(
          eq(availability.musicianId, musicianId),
          sql`DATE(${availability.date}) = DATE(${date})`
        ));
      
      console.log(`Direct availability query result:`, result);
      
      // If no record exists, we assume they are available (default state)
      if (!result) {
        console.log(`No availability record found, assuming available`);
        return true;
      }
      
      // Otherwise, return the isAvailable flag
      console.log(`Availability record found, isAvailable=${result.isAvailable}`);
      return result.isAvailable;
    } catch (error) {
      console.error(`Error checking availability for musician ${musicianId} on ${dateStr}:`, error);
      // Default to unavailable in case of error to prevent incorrect bookings
      return false;
    }
  }
  
  async createAvailability(availabilityData: InsertAvailability): Promise<Availability> {
    const [result] = await db.insert(availability)
      .values(availabilityData)
      .returning();
    
    return result;
  }
  
  async updateAvailability(id: number, data: Partial<InsertAvailability>): Promise<Availability | undefined> {
    const [updated] = await db.update(availability)
      .set(data)
      .where(eq(availability.id, id))
      .returning();
    
    return updated;
  }
  
  async deleteAvailability(id: number): Promise<boolean> {
    const result = await db.delete(availability)
      .where(eq(availability.id, id));
    
    return result.rowCount > 0;
  }
  
  async getAvailableMusiciansForDate(date: Date, categoryIds?: number[]): Promise<Musician[]> {
    const dateStart = startOfDay(date);
    const dateEnd = endOfDay(date);
    
    if (!categoryIds || categoryIds.length === 0) {
      // Base query to find all musicians who have availability for this date
      const availableMusicians = await db.select({
        musician: musicians
      })
      .from(musicians)
      .innerJoin(
        availability,
        and(
          eq(musicians.id, availability.musicianId),
          eq(availability.isAvailable, true),
          gte(availability.date, dateStart),
          lte(availability.date, dateEnd)
        )
      );
      
      // Return unique musicians
      return availableMusicians.map(row => row.musician);
    }
    
    // Base query to find all musicians who have availability for this date
    const availableMusicians = await db.select({
      musician: musicians
    })
    .from(musicians)
    .innerJoin(
      availability,
      and(
        eq(musicians.id, availability.musicianId),
        eq(availability.isAvailable, true),
        gte(availability.date, dateStart),
        lte(availability.date, dateEnd)
      )
    );
    
    // Filter by category IDs
    const filteredMusicians = availableMusicians.filter(row => {
      // Check if the musician's categoryIds array (from the DB) includes any of the requested categoryIds
      const musicianCategoryIds = row.musician.categoryIds || [];
      return categoryIds.some(catId => musicianCategoryIds.includes(catId));
    });
    
    // Using a Map to deduplicate musicians (in case they appear multiple times due to multiple availability records)
    const uniqueMusicians = new Map();
    for (const row of filteredMusicians) {
      uniqueMusicians.set(row.musician.id, row.musician);
    }
    
    return Array.from(uniqueMusicians.values());
  }
  
  async getAvailableMusiciansForDateAndCategories(date: Date, categoryIds: number[]): Promise<Musician[]> {
    return this.getAvailableMusiciansForDate(date, categoryIds);
  }
  
  async updateAvailabilityForDate(musicianId: number, date: string, isAvailable: boolean, month: string, year: number): Promise<Availability> {
    const dateObj = parseISO(date);
    if (!isValid(dateObj)) {
      throw new Error('Invalid date format');
    }
    
    // Check if availability record already exists
    const existingAvailability = await this.getMusicianAvailabilityForDate(musicianId, dateObj);
    
    if (existingAvailability) {
      // Update existing record
      const updated = await this.updateAvailability(existingAvailability.id, { isAvailable });
      if (!updated) {
        throw new Error('Failed to update availability');
      }
      return updated;
    }
    
    // Create new availability record
    return await this.createAvailability({
      musicianId,
      date: dateObj,
      isAvailable,
      month,
      year
    });
  }
  
  // Event management
  async getEvents(): Promise<Event[]> {
    return await db.select().from(events).orderBy(desc(events.startDate));
  }
  
  async getEvent(id: number): Promise<Event | undefined> {
    const [event] = await db.select()
      .from(events)
      .where(eq(events.id, id));
    
    return event;
  }
  
  async createEvent(event: any): Promise<Event> {
    // Extract musicianAssignments before inserting the event
    const musicianAssignments = event.musicianAssignments;
    delete event.musicianAssignments;
    
    // Insert the event
    const [newEvent] = await db.insert(events)
      .values(event)
      .returning();
    
    // Create activity log
    await this.createActivity({
      entityType: 'event',
      entityId: newEvent.id, // Add the event ID
      action: 'create',
      userId: 1, // Default admin user
      details: `Created new event: ${newEvent.name}`
    });
    
    // Create booking records for musician assignments if present
    if (musicianAssignments && Object.keys(musicianAssignments).length > 0) {
      console.log(`Processing musician assignments for event ${newEvent.id}:`, musicianAssignments);
      
      // Normalize the assignments to ensure consistent date formats
      const normalizedAssignments: Record<string, number[]> = {};
      
      for (const dateStr of Object.keys(musicianAssignments)) {
        try {
          // Parse the date to ensure it's valid
          const date = new Date(dateStr);
          if (isNaN(date.getTime())) {
            console.warn(`Invalid date format in assignments: ${dateStr}, skipping`);
            continue;
          }
          
          // Normalize the date format
          const normalizedDateStr = format(date, 'yyyy-MM-dd');
          
          // Ensure we have an array for this date
          if (!normalizedAssignments[normalizedDateStr]) {
            normalizedAssignments[normalizedDateStr] = [];
          }
          
          // Get unique musician IDs for this date
          const uniqueMusicianIds = Array.from(new Set(musicianAssignments[dateStr]));
          normalizedAssignments[normalizedDateStr].push(...uniqueMusicianIds);
        } catch (error) {
          console.error(`Error processing date ${dateStr}:`, error);
        }
      }
      
      // Process normalized assignments
      for (const normalizedDateStr of Object.keys(normalizedAssignments)) {
        const date = new Date(normalizedDateStr);
        const uniqueMusicianIds = Array.from(new Set(normalizedAssignments[normalizedDateStr]));
        
        for (const musicianId of uniqueMusicianIds) {
          try {
            // Get musician details
            const musician = await this.getMusician(musicianId);
            if (!musician) {
              throw new Error(`Musician with ID ${musicianId} not found`);
            }
            
            // Check if a booking already exists for this musician, event, and date
            const existingBookings = await db.select()
              .from(bookings)
              .where(and(
                eq(bookings.eventId, newEvent.id),
                eq(bookings.musicianId, musicianId),
                eq(bookings.date, date)
              ));
              
            if (existingBookings.length > 0) {
              console.log(`Booking already exists for event ${newEvent.id}, musician ${musicianId}, date ${normalizedDateStr}`);
              continue;
            }
            
            // Create invitation record first
            const [invitation] = await db.insert(invitations)
              .values({
                eventId: newEvent.id,
                musicianId: musicianId,
                status: 'confirmed',
                invitedAt: new Date(),
                respondedAt: new Date(),
                email: musician.email,
                messageSubject: `Invitation to ${newEvent.name}`,
                messageBody: `You are invited to perform at ${newEvent.name}.`
              })
              .returning();
            
            // Create booking record
            await db.insert(bookings)
              .values({
                eventId: newEvent.id,
                musicianId: musicianId,
                invitationId: invitation.id,
                date: date,
                paymentStatus: 'pending'
              });
            
            console.log(`Created booking for event ${newEvent.id}, musician ${musicianId}, date ${normalizedDateStr}`);
          } catch (error) {
            console.error(`Failed to create booking for event ${newEvent.id}, musician ${musicianId}:`, error);
          }
        }
      }
    }
    
    return newEvent;
  }
  
  async updateEvent(id: number, data: any): Promise<Event | undefined> {
    // Extract musicianAssignments before updating the event
    const musicianAssignments = data.musicianAssignments;
    delete data.musicianAssignments;
    
    const [updated] = await db.update(events)
      .set(data)
      .where(eq(events.id, id))
      .returning();
    
    // Create activity log
    if (updated) {
      await this.createActivity({
        entityType: 'event',
        entityId: updated.id,
        action: 'update',
        userId: 1, // Default admin user
        details: `Updated event: ${updated.name}`
      });
      
      // Process musician assignments if provided
      if (musicianAssignments && Object.keys(musicianAssignments).length > 0) {
        console.log(`Processing musician assignments update for event ${id}:`, musicianAssignments);
        
        // Remove existing bookings for this event to avoid duplicates
        await db.delete(bookings).where(eq(bookings.eventId, id));
        
        // Normalize date formats and deduplicate musician IDs before creating bookings
        const normalizedAssignments: Record<string, number[]> = {};
        
        // Process and normalize each date entry
        for (const dateStr of Object.keys(musicianAssignments)) {
          // Parse and format the date consistently
          const date = new Date(dateStr);
          if (isNaN(date.getTime())) {
            console.warn(`Invalid date format in assignments: ${dateStr}, skipping`);
            continue;
          }
          
          // Format date as YYYY-MM-DD for consistent keys
          const normalizedDateStr = format(date, 'yyyy-MM-dd');
          
          // Get the musician IDs for this date, ensure they're unique
          const musicianIds = Array.from(new Set(musicianAssignments[dateStr]));
          
          // Store with normalized date
          if (!normalizedAssignments[normalizedDateStr]) {
            normalizedAssignments[normalizedDateStr] = [];
          }
          
          // Add unique musician IDs to this date
          for (const musicianId of musicianIds) {
            if (!normalizedAssignments[normalizedDateStr].includes(musicianId)) {
              normalizedAssignments[normalizedDateStr].push(musicianId);
            }
          }
        }
        
        // Add new bookings using normalized assignments
        for (const normalizedDateStr of Object.keys(normalizedAssignments)) {
          const date = new Date(normalizedDateStr);
          const uniqueMusicianIds = normalizedAssignments[normalizedDateStr];
          
          for (const musicianId of uniqueMusicianIds) {
            try {
              // Get musician details
              const musician = await this.getMusician(musicianId);
              if (!musician) {
                throw new Error(`Musician with ID ${musicianId} not found`);
              }
              
              // Create invitation record first
              const [invitation] = await db.insert(invitations)
                .values({
                  eventId: id,
                  musicianId: musicianId,
                  status: 'confirmed',
                  invitedAt: new Date(),
                  respondedAt: new Date(),
                  email: musician.email,
                  messageSubject: `Invitation to event ID ${id}`,
                  messageBody: `You are invited to perform at this event.`
                })
                .returning();
              
              // Create booking record
              await db.insert(bookings)
                .values({
                  eventId: id,
                  musicianId: musicianId,
                  invitationId: invitation.id,
                  date: date,
                  paymentStatus: 'pending'
                });
              
              console.log(`Created booking for updated event ${id}, musician ${musicianId}, date ${normalizedDateStr}`);
            } catch (error) {
              console.error(`Failed to create booking for updated event ${id}, musician ${musicianId}:`, error);
            }
          }
        }
      }
    }
    
    return updated;
  }
  
  async deleteEvent(id: number): Promise<boolean> {
    // Get event details for activity log
    const event = await this.getEvent(id);
    
    const result = await db.delete(events)
      .where(eq(events.id, id));
    
    // Create activity log
    if (result.rowCount > 0 && event) {
      await this.createActivity({
        entityType: 'event',
        entityId: event.id,
        action: 'delete',
        userId: 1, // Default admin user
        details: `Deleted event: ${event.name}`
      });
    }
    
    return result.rowCount > 0;
  }
  
  async getUpcomingEvents(limit = 5): Promise<Event[]> {
    const now = new Date();
    
    return await db.select()
      .from(events)
      .where(gte(events.startDate, now))
      .orderBy(events.startDate)
      .limit(limit);
  }
  
  // Booking management
  async getBookings(eventId?: number, musicianId?: number): Promise<Booking[]> {
    let query = db.select().from(bookings);
    
    if (eventId && musicianId) {
      query = query.where(and(
        eq(bookings.eventId, eventId),
        eq(bookings.musicianId, musicianId)
      ));
    } else if (eventId) {
      query = query.where(eq(bookings.eventId, eventId));
    } else if (musicianId) {
      query = query.where(eq(bookings.musicianId, musicianId));
    }
    
    return await query.orderBy(desc(bookings.date));
  }
  
  async getBooking(id: number): Promise<Booking | undefined> {
    const [booking] = await db.select()
      .from(bookings)
      .where(eq(bookings.id, id));
    
    return booking;
  }
  
  async getBookingsByMusician(musicianId: number): Promise<Booking[]> {
    return await db.select()
      .from(bookings)
      .where(eq(bookings.musicianId, musicianId))
      .orderBy(desc(bookings.date));
  }
  
  async getBookingsByMusicianAndMonth(musicianId: number, month: number, year: number): Promise<Booking[]> {
    // Calculate first and last day of month
    const startDate = startOfMonth(new Date(year, month - 1));
    const endDate = endOfMonth(startDate);
    
    return await db.select()
      .from(bookings)
      .where(and(
        eq(bookings.musicianId, musicianId),
        gte(bookings.date, startDate),
        lte(bookings.date, endDate)
      ))
      .orderBy(bookings.date);
  }
  
  async getBookingsByEventAndMusician(eventId: number, musicianId: number): Promise<Booking[]> {
    return await db.select()
      .from(bookings)
      .where(and(
        eq(bookings.eventId, eventId),
        eq(bookings.musicianId, musicianId)
      ));
  }
  
  async createBooking(booking: InsertBooking): Promise<Booking> {
    const [newBooking] = await db.insert(bookings)
      .values(booking)
      .returning();
    
    // Get event and musician details for activity log
    const event = await this.getEvent(newBooking.eventId);
    const musician = await this.getMusician(newBooking.musicianId);
    
    // Create activity log
    if (event && musician) {
      await this.createActivity({
        entityType: 'booking',
        entityId: newBooking.id,
        action: 'create',
        userId: 1, // Default admin user
        details: `Booked ${musician.name} for event: ${event.name}`
      });
    }
    
    return newBooking;
  }
  
  async updateBooking(id: number, data: Partial<InsertBooking>): Promise<Booking | undefined> {
    const [updated] = await db.update(bookings)
      .set(data)
      .where(eq(bookings.id, id))
      .returning();
    
    // Get event and musician details for activity log
    if (updated) {
      const event = await this.getEvent(updated.eventId);
      const musician = await this.getMusician(updated.musicianId);
      
      // Create activity log
      if (event && musician) {
        await this.createActivity({
          entityType: 'booking',
          entityId: updated.id,
          action: 'update',
          userId: 1, // Default admin user
          details: `Updated booking for ${musician.name} for event: ${event.name}`
        });
      }
    }
    
    return updated;
  }
  
  async deleteBooking(id: number): Promise<boolean> {
    // Get booking details for activity log
    const booking = await this.getBooking(id);
    
    const result = await db.delete(bookings)
      .where(eq(bookings.id, id));
    
    // Create activity log
    if (result.rowCount > 0 && booking) {
      const event = await this.getEvent(booking.eventId);
      const musician = await this.getMusician(booking.musicianId);
      
      if (event && musician) {
        await this.createActivity({
          entityType: 'booking',
          entityId: booking.id,
          action: 'delete',
          userId: 1, // Default admin user
          details: `Removed booking for ${musician.name} from event: ${event.name}`
        });
      }
    }
    
    return result.rowCount > 0;
  }
  
  // Payment management
  async getPayments(bookingId?: number): Promise<Payment[]> {
    let query = db.select().from(payments);
    
    if (bookingId) {
      query = query.where(eq(payments.bookingId, bookingId));
    }
    
    return await query.orderBy(desc(payments.date));
  }
  
  async getPayment(id: number): Promise<Payment | undefined> {
    const [payment] = await db.select()
      .from(payments)
      .where(eq(payments.id, id));
    
    return payment;
  }
  
  async createPayment(payment: InsertPayment): Promise<Payment> {
    const [newPayment] = await db.insert(payments)
      .values(payment)
      .returning();
    
    // Get booking details for activity log
    const booking = await this.getBooking(newPayment.bookingId);
    
    if (booking) {
      const musician = await this.getMusician(booking.musicianId);
      
      if (musician) {
        await this.createActivity({
          entityType: 'payment',
          entityId: newPayment.id,
          action: 'create',
          userId: 1, // Default admin user
          details: `Created payment of $${newPayment.amount} to ${musician.name}`
        });
      }
    }
    
    return newPayment;
  }
  
  async updatePayment(id: number, data: Partial<InsertPayment>): Promise<Payment | undefined> {
    const [updated] = await db.update(payments)
      .set(data)
      .where(eq(payments.id, id))
      .returning();
    
    return updated;
  }
  
  async deletePayment(id: number): Promise<boolean> {
    const result = await db.delete(payments)
      .where(eq(payments.id, id));
    
    return result.rowCount > 0;
  }
  
  // Collection management
  async getCollections(eventId?: number): Promise<Collection[]> {
    let query = db.select().from(collections);
    
    if (eventId) {
      query = query.where(eq(collections.eventId, eventId));
    }
    
    return await query.orderBy(desc(collections.date));
  }
  
  async getCollection(id: number): Promise<Collection | undefined> {
    const [collection] = await db.select()
      .from(collections)
      .where(eq(collections.id, id));
    
    return collection;
  }
  
  async createCollection(collection: InsertCollection): Promise<Collection> {
    const [newCollection] = await db.insert(collections)
      .values(collection)
      .returning();
    
    // Get event details for activity log
    const event = await this.getEvent(newCollection.eventId);
    
    if (event) {
      await this.createActivity({
        entityType: 'collection',
        entityId: newCollection.id,
        action: 'create',
        userId: 1, // Default admin user
        details: `Recorded collection of $${newCollection.amount} for event: ${event.name}`
      });
    }
    
    return newCollection;
  }
  
  async updateCollection(id: number, data: Partial<InsertCollection>): Promise<Collection | undefined> {
    const [updated] = await db.update(collections)
      .set(data)
      .where(eq(collections.id, id))
      .returning();
    
    return updated;
  }
  
  async deleteCollection(id: number): Promise<boolean> {
    const result = await db.delete(collections)
      .where(eq(collections.id, id));
    
    return result.rowCount > 0;
  }
  
  // Expense management
  async getExpenses(eventId?: number): Promise<Expense[]> {
    let query = db.select().from(expenses);
    
    if (eventId) {
      query = query.where(eq(expenses.eventId, eventId));
    }
    
    return await query.orderBy(desc(expenses.date));
  }
  
  async getExpense(id: number): Promise<Expense | undefined> {
    const [expense] = await db.select()
      .from(expenses)
      .where(eq(expenses.id, id));
    
    return expense;
  }
  
  async createExpense(expense: InsertExpense): Promise<Expense> {
    const [newExpense] = await db.insert(expenses)
      .values(expense)
      .returning();
    
    return newExpense;
  }
  
  async updateExpense(id: number, data: Partial<InsertExpense>): Promise<Expense | undefined> {
    const [updated] = await db.update(expenses)
      .set(data)
      .where(eq(expenses.id, id))
      .returning();
    
    return updated;
  }
  
  async deleteExpense(id: number): Promise<boolean> {
    const result = await db.delete(expenses)
      .where(eq(expenses.id, id));
    
    return result.rowCount > 0;
  }
  
  // Activity log
  async getActivities(limit = 10): Promise<Activity[]> {
    return await db.select()
      .from(activities)
      .orderBy(desc(activities.timestamp))
      .limit(limit);
  }
  
  async getActivity(id: number): Promise<Activity | undefined> {
    const [activity] = await db.select()
      .from(activities)
      .where(eq(activities.id, id));
    
    return activity;
  }
  
  async createActivity(activityData: InsertActivity): Promise<Activity> {
    const [newActivity] = await db.insert(activities)
      .values({
        ...activityData,
        timestamp: new Date()
      })
      .returning();
    
    return newActivity;
  }
  
  // Get venue events
  async getVenueEvents(venueId: number): Promise<Event[]> {
    return await db.select()
      .from(events)
      .where(eq(events.venueId, venueId))
      .orderBy(desc(events.startDate));
  }
  
  // Contract management
  async getContractLinks(filters?: {
    eventId?: number,
    musicianId?: number,
    status?: string | string[],
    eventDate?: Date
  }): Promise<ContractLink[]> {
    let query = db.select().from(contractLinks);
    
    if (filters) {
      // Apply eventId filter
      if (filters.eventId !== undefined) {
        query = query.where(eq(contractLinks.eventId, filters.eventId));
      }
      
      // Apply musicianId filter
      if (filters.musicianId !== undefined) {
        query = query.where(eq(contractLinks.musicianId, filters.musicianId));
      }
      
      // Apply status filter
      if (filters.status !== undefined) {
        if (Array.isArray(filters.status)) {
          query = query.where(inArray(contractLinks.status, filters.status));
        } else {
          query = query.where(eq(contractLinks.status, filters.status));
        }
      }
      
      // Apply eventDate filter
      if (filters.eventDate) {
        query = query.where(eq(contractLinks.eventDate, filters.eventDate));
      }
    }
    
    return await query.orderBy(desc(contractLinks.createdAt));
  }
  
  async getContractLink(id: number): Promise<ContractLink | undefined> {
    // Get the contract data from contractLinks table
    const [link] = await db.select()
      .from(contractLinks)
      .where(eq(contractLinks.id, id));
    
    if (!link) return undefined;
    
    try {
      // Get the status from entityStatus table
      const { statusService, ENTITY_TYPES } = await import('./services/status');
      const statusData = await statusService.getEntityStatus(
        ENTITY_TYPES.CONTRACT,
        id,
        link.eventId,
        link.musicianId, 
        link.eventDate
      );
      
      // If we found status data in the central system, override the status field from the contract
      if (statusData) {
        console.log(`Using centralized status "${statusData.status}" for contract ${id} (original status: ${link.status})`);
        
        // Return a merged object with central status taking precedence
        return {
          ...link,
          status: statusData.status, // Use primaryStatus from centralized system
          // Include any other status-related fields from central system
          centralizedStatus: {
            primaryStatus: statusData.status,
            customStatus: statusData.customStatus,
            statusDate: statusData.statusDate,
            metadata: statusData.metadata
          }
        };
      }
    } catch (error) {
      // Log error but don't fail, fall back to original contract data
      console.error(`Error getting centralized status for contract ${id}:`, error);
    }
    
    return link;
  }
  
  async getContractLinkByToken(token: string): Promise<ContractLink | undefined> {
    const [link] = await db.select()
      .from(contractLinks)
      .where(eq(contractLinks.token, token));
    
    if (!link) return undefined;
    
    try {
      // Get the status from entityStatus table
      const { statusService, ENTITY_TYPES } = await import('./services/status');
      const statusData = await statusService.getEntityStatus(
        ENTITY_TYPES.CONTRACT,
        link.id,
        link.eventId,
        link.musicianId,
        link.eventDate
      );
      
      // If we found status data in the central system, override the status field from the contract
      if (statusData) {
        console.log(`Using centralized status "${statusData.status}" for contract token ${token} (original status: ${link.status})`);
        
        // Return a merged object with central status taking precedence
        return {
          ...link,
          status: statusData.status, // Use primaryStatus from centralized system
          // Include any other status-related fields from central system
          centralizedStatus: {
            primaryStatus: statusData.status,
            customStatus: statusData.customStatus,
            statusDate: statusData.statusDate,
            metadata: statusData.metadata
          }
        };
      }
    } catch (error) {
      // Log error but don't fail, fall back to original contract data
      console.error(`Error getting centralized status for contract token ${token}:`, error);
    }
    
    return link;
  }
  
  async getContractLinksByEvent(eventId: number): Promise<ContractLink[]> {
    return await db.select()
      .from(contractLinks)
      .where(eq(contractLinks.eventId, eventId))
      .orderBy(desc(contractLinks.createdAt));
  }
  
  async getContractLinksByEventAndDate(eventId: number, date?: Date): Promise<ContractLink[]> {
    if (!date) {
      return this.getContractLinksByEvent(eventId);
    }
    
    console.log(`Getting contract links for event ${eventId} and date ${date}`);
    
    return await db.select()
      .from(contractLinks)
      .where(and(
        eq(contractLinks.eventId, eventId),
        eq(contractLinks.eventDate, date)
      ))
      .orderBy(desc(contractLinks.createdAt));
  }
  
  async getContractLinksByMusician(musicianId: number): Promise<ContractLink[]> {
    return await db.select()
      .from(contractLinks)
      .where(eq(contractLinks.musicianId, musicianId))
      .orderBy(desc(contractLinks.createdAt));
  }
  
  async createContractLink(contract: InsertContractLink): Promise<ContractLink> {
    // Generate a unique token
    const token = crypto.randomBytes(16).toString('hex');
    
    const [newLink] = await db.insert(contractLinks)
      .values({
        ...contract,
        token,
        createdAt: new Date()
      })
      .returning();
    
    return newLink;
  }
  
  async updateContractLink(id: number, data: Partial<InsertContractLink>): Promise<ContractLink | undefined> {
    const [updated] = await db.update(contractLinks)
      .set(data)
      .where(eq(contractLinks.id, id))
      .returning();
    
    return updated;
  }
  
  async updateContractLinkStatus(token: string, status: string, response?: string, signature?: string): Promise<ContractLink | undefined> {
    // First get the existing contract link to have access to its data
    const existingContract = await this.getContractLinkByToken(token);
    if (!existingContract) {
      return undefined;
    }
    
    // Create signature data if provided
    let musicianSignature = existingContract.musicianSignature;
    if (signature) {
      const signatureData = {
        signedAt: new Date(),
        signedBy: "musician",
        signatureValue: signature,
        signatureType: "typed",
        ipAddress: "127.0.0.1" // Placeholder
      };
      musicianSignature = JSON.stringify(signatureData);
    }
    
    // Update contract status
    const data: Record<string, any> = {
      status,
      updatedAt: new Date(),
      musicianSignature
    };
    
    if (response) {
      data.response = response;
    }
    
    const [updated] = await db.update(contractLinks)
      .set(data)
      .where(eq(contractLinks.token, token))
      .returning();
    
    if (updated) {
      try {
        // Update related booking status
        if (updated.bookingId) {
          let bookingStatus = 'pending';
          let contractSigned = false;
          
          // Map contract status to booking status
          if (status === 'signed') {
            bookingStatus = 'confirmed';
            contractSigned = true;
          } else if (status === 'rejected') {
            bookingStatus = 'cancelled';
          }
          
          await db.update(bookings)
            .set({ 
              status: bookingStatus,
              contractSigned
            })
            .where(eq(bookings.id, updated.bookingId));
            
          console.log(`Updated booking #${updated.bookingId} status to ${bookingStatus}`);
        }
        
        // Sync with musician availability calendar
        if (updated.musicianId && updated.eventDate) {
          const dateStr = format(updated.eventDate, 'yyyy-MM-dd');
          const month = format(updated.eventDate, 'MMMM');
          const year = getYear(updated.eventDate);
          
          // If contract is signed, mark musician as unavailable (isAvailable=false)
          // If contract is rejected, ensure musician is available (isAvailable=true)
          const isAvailable = status === 'rejected';
          
          await this.updateAvailabilityForDate(
            updated.musicianId,
            dateStr,
            isAvailable,
            month,
            year
          );
          
          console.log(`Updated availability for musician ${updated.musicianId} on ${dateStr} to ${isAvailable ? 'available' : 'unavailable'}`);
        }
      } catch (error) {
        console.error("Error updating related records for contract:", error);
      }
    }
    
    return updated;
  }
  
  // Contract Template management
  async getContractTemplates(): Promise<ContractTemplate[]> {
    return await db.select().from(contractTemplates).orderBy(contractTemplates.name);
  }
  
  async getContractTemplate(id: number): Promise<ContractTemplate | undefined> {
    const [template] = await db.select()
      .from(contractTemplates)
      .where(eq(contractTemplates.id, id));
    
    return template;
  }
  
  async getDefaultContractTemplate(): Promise<ContractTemplate | undefined> {
    const [template] = await db.select()
      .from(contractTemplates)
      .where(eq(contractTemplates.isDefault, true));
    
    return template;
  }
  
  async createContractTemplate(template: InsertContractTemplate): Promise<ContractTemplate> {
    // If this is set as default, reset all other templates
    if (template.isDefault) {
      await db.update(contractTemplates)
        .set({ isDefault: false })
        .where(eq(contractTemplates.isDefault, true));
    }
    
    const [newTemplate] = await db.insert(contractTemplates)
      .values(template)
      .returning();
    
    return newTemplate;
  }
  
  async updateContractTemplate(id: number, data: Partial<InsertContractTemplate>): Promise<ContractTemplate | undefined> {
    // If this is set as default, reset all other templates
    if (data.isDefault) {
      await db.update(contractTemplates)
        .set({ isDefault: false })
        .where(not(eq(contractTemplates.id, id)));
    }
    
    const [updated] = await db.update(contractTemplates)
      .set(data)
      .where(eq(contractTemplates.id, id))
      .returning();
    
    return updated;
  }
  
  async deleteContractTemplate(id: number): Promise<boolean> {
    const result = await db.delete(contractTemplates)
      .where(eq(contractTemplates.id, id));
    
    return result.rowCount > 0;
  }
  
  async setDefaultContractTemplate(id: number): Promise<boolean> {
    // Reset all templates
    await db.update(contractTemplates)
      .set({ isDefault: false });
    
    // Set the requested template as default
    const result = await db.update(contractTemplates)
      .set({ isDefault: true })
      .where(eq(contractTemplates.id, id));
    
    return result.rowCount > 0;
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
    // Count bookings
    const [bookingsResult] = await db.select({ count: count() }).from(bookings);
    const totalBookings = bookingsResult?.count || 0;
    
    // Count active events (future events)
    const now = new Date();
    const [eventsResult] = await db.select({ count: count() })
      .from(events)
      .where(gte(events.startDate, now));
    const activeEvents = eventsResult?.count || 0;
    
    // Count musicians
    const [musiciansResult] = await db.select({ count: count() }).from(musicians);
    const totalMusicians = musiciansResult?.count || 0;
    
    // Count venues
    const [venuesResult] = await db.select({ count: count() }).from(venues);
    const totalVenues = venuesResult?.count || 0;
    
    // Revenue data for last 6 months
    const revenueData: {month: string, amount: number}[] = [];
    
    // Current month and 5 previous months
    for (let i = 0; i < 6; i++) {
      const date = addMonths(new Date(), -i);
      const monthStart = startOfMonth(date);
      const monthEnd = endOfMonth(date);
      const monthLabel = format(date, 'MMM yyyy');
      
      // Sum collections for this month
      const [result] = await db.select({ amount: sum(collections.amount) })
        .from(collections)
        .where(and(
          gte(collections.date, monthStart),
          lte(collections.date, monthEnd)
        ));
      
      revenueData.unshift({
        month: monthLabel,
        amount: result?.amount || 0
      });
    }
    
    // Count events without collections
    const [pendingResult] = await db.select({ count: count() })
      .from(events)
      .leftJoin(collections, eq(events.id, collections.eventId))
      .where(and(
        lte(events.startDate, now),  // Past events
        isNull(collections.id)       // No collections
      ));
    const pendingCollections = pendingResult?.count || 0;
    
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
    // Sum collections
    const [collectionsResult] = await db.select({ total: sum(collections.amount) })
      .from(collections)
      .where(eq(collections.eventId, eventId));
    const totalCollections = collectionsResult?.total || 0;
    
    // Sum payments (need to join through bookings)
    const [paymentsResult] = await db.select({ total: sum(payments.amount) })
      .from(payments)
      .innerJoin(bookings, eq(payments.bookingId, bookings.id))
      .where(eq(bookings.eventId, eventId));
    const totalPayments = paymentsResult?.total || 0;
    
    // Sum expenses
    const [expensesResult] = await db.select({ total: sum(expenses.amount) })
      .from(expenses)
      .where(eq(expenses.eventId, eventId));
    const totalExpenses = expensesResult?.total || 0;
    
    // Calculate profit
    const profit = totalCollections - totalPayments - totalExpenses;
    
    return {
      totalCollections,
      totalPayments,
      totalExpenses,
      profit
    };
  }
  
  // Monthly Planner management
  async getMonthlyPlanners(): Promise<MonthlyPlanner[]> {
    return await db.select().from(monthlyPlanners).orderBy(desc(monthlyPlanners.year), desc(monthlyPlanners.month));
  }
  
  async getMonthlyPlanner(id: number): Promise<MonthlyPlanner | undefined> {
    const [planner] = await db.select()
      .from(monthlyPlanners)
      .where(eq(monthlyPlanners.id, id));
    
    return planner;
  }
  
  async getMonthlyPlannerByMonth(month: number, year: number): Promise<MonthlyPlanner | undefined> {
    // Get the most recently created planner for this month/year
    // This ensures we get the most up-to-date planner when multiple exist
    const [planner] = await db.select()
      .from(monthlyPlanners)
      .where(and(
        eq(monthlyPlanners.month, month),
        eq(monthlyPlanners.year, year)
      ))
      .orderBy(desc(monthlyPlanners.id))  // Order by ID descending to get the most recent one
      .limit(1);  // Only get one result
    
    return planner;
  }
  
  async createMonthlyPlanner(planner: InsertMonthlyPlanner): Promise<MonthlyPlanner> {
    const [newPlanner] = await db.insert(monthlyPlanners)
      .values(planner)
      .returning();
    
    // Create activity
    await this.createActivity({
      type: 'planner',
      action: 'create',
      userId: 1,
      details: `Created monthly planner for ${format(new Date(planner.year, planner.month - 1), 'MMMM yyyy')}`
    });
    
    return newPlanner;
  }
  
  async updateMonthlyPlanner(id: number, data: Partial<InsertMonthlyPlanner>): Promise<MonthlyPlanner | undefined> {
    const [updated] = await db.update(monthlyPlanners)
      .set(data)
      .where(eq(monthlyPlanners.id, id))
      .returning();
    
    if (updated) {
      // Create activity
      await this.createActivity({
        action: 'update',
        entityType: 'monthly_planner',
        entityId: updated.id,
        userId: 1,
        details: `Updated monthly planner for ${format(new Date(updated.year, updated.month - 1), 'MMMM yyyy')}`
      });
    }
    
    return updated;
  }
  
  async deleteMonthlyPlanner(id: number): Promise<boolean> {
    // Get planner details for activity log
    const planner = await this.getMonthlyPlanner(id);
    
    // Delete all slots and assignments first
    if (planner) {
      const slots = await this.getPlannerSlots(id);
      
      for (const slot of slots) {
        // Delete all assignments for this slot
        await db.delete(plannerAssignments)
          .where(eq(plannerAssignments.slotId, slot.id));
      }
      
      // Delete all slots
      await db.delete(plannerSlots)
        .where(eq(plannerSlots.plannerId, id));
      
      // Delete all invoices
      await db.delete(monthlyInvoices)
        .where(eq(monthlyInvoices.plannerId, id));
    }
    
    // Delete the planner
    const result = await db.delete(monthlyPlanners)
      .where(eq(monthlyPlanners.id, id));
    
    // Create activity log
    if (result.rowCount > 0 && planner) {
      await this.createActivity({
        action: 'delete',
        entityType: 'monthly_planner',
        entityId: id,
        userId: 1,
        details: `Deleted monthly planner for ${format(new Date(planner.year, planner.month - 1), 'MMMM yyyy')}`
      });
    }
    
    return result.rowCount > 0;
  }
  
  // Planner Slots management
  async getPlannerSlots(plannerId?: number): Promise<PlannerSlot[]> {
    // Validate plannerId if provided
    if (plannerId !== undefined && isNaN(plannerId)) {
      console.warn(`Invalid plannerId in getPlannerSlots: ${plannerId}`);
      return []; // Return empty array for invalid input
    }
    
    let query = db.select().from(plannerSlots);
    
    if (plannerId !== undefined && !isNaN(plannerId)) {
      query = query.where(eq(plannerSlots.plannerId, plannerId));
    }
    
    return await query.orderBy(plannerSlots.date);
  }
  
  async getPlannerSlot(id: number): Promise<PlannerSlot | undefined> {
    // Validate id
    if (!id || isNaN(id)) {
      console.warn(`Invalid planner slot ID: ${id}`);
      return undefined;
    }
    
    const [slot] = await db.select()
      .from(plannerSlots)
      .where(eq(plannerSlots.id, id));
    
    return slot;
  }
  
  async createPlannerSlot(slot: InsertPlannerSlot): Promise<PlannerSlot> {
    const [newSlot] = await db.insert(plannerSlots)
      .values(slot)
      .returning();
    
    return newSlot;
  }
  
  async updatePlannerSlot(id: number, data: Partial<InsertPlannerSlot>): Promise<PlannerSlot | undefined> {
    const [updated] = await db.update(plannerSlots)
      .set(data)
      .where(eq(plannerSlots.id, id))
      .returning();
    
    return updated;
  }
  
  async deletePlannerSlot(id: number): Promise<boolean> {
    // Delete all assignments first
    await db.delete(plannerAssignments)
      .where(eq(plannerAssignments.slotId, id));
    
    // Delete the slot
    const result = await db.delete(plannerSlots)
      .where(eq(plannerSlots.id, id));
    
    return result.rowCount > 0;
  }
  
  async getPlannerSlotsByDate(date: Date): Promise<PlannerSlot[]> {
    const dateStart = startOfDay(date);
    const dateEnd = endOfDay(date);
    
    return await db.select()
      .from(plannerSlots)
      .where(and(
        gte(plannerSlots.date, dateStart),
        lte(plannerSlots.date, dateEnd)
      ));
  }
  
  // Planner Assignments management
  async getPlannerAssignments(slotId?: number, musicianId?: number): Promise<PlannerAssignment[]> {
    // Enhanced validation of parameters - strictly check for valid numbers
    if (slotId !== undefined) {
      // Convert to number and validate
      const numericSlotId = Number(slotId);
      if (isNaN(numericSlotId) || !Number.isInteger(numericSlotId) || numericSlotId <= 0) {
        console.warn(`Invalid slotId parameter in getPlannerAssignments: ${slotId} (type: ${typeof slotId})`);
        return []; // Return empty array instead of querying with invalid params
      }
      // Normalize to ensure it's a number
      slotId = numericSlotId;
    }

    if (musicianId !== undefined) {
      // Convert to number and validate
      const numericMusicianId = Number(musicianId);
      if (isNaN(numericMusicianId) || !Number.isInteger(numericMusicianId) || numericMusicianId <= 0) {
        console.warn(`Invalid musicianId parameter in getPlannerAssignments: ${musicianId} (type: ${typeof musicianId})`);
        return []; // Return empty array instead of querying with invalid params
      }
      // Normalize to ensure it's a number
      musicianId = numericMusicianId;
    }

    let query = db.select().from(plannerAssignments);
    
    try {
      // Apply filters based on parameters
      if (slotId !== undefined && musicianId !== undefined) {
        query = query.where(and(
          eq(plannerAssignments.slotId, slotId),
          eq(plannerAssignments.musicianId, musicianId)
        ));
      } else if (slotId !== undefined) {
        query = query.where(eq(plannerAssignments.slotId, slotId));
      } else if (musicianId !== undefined) {
        query = query.where(eq(plannerAssignments.musicianId, musicianId));
      }
      
      // Execute query and catch any database errors
      return await query;
    } catch (error) {
      console.error(`Database error in getPlannerAssignments:`, error);
      console.error(`Query parameters: slotId=${slotId}, musicianId=${musicianId}`);
      // Return empty array instead of throwing
      return [];
    }
  }
  
  async getPlannerAssignmentsByPlannerId(plannerId: number): Promise<PlannerAssignment[]> {
    try {
      // Validate the plannerId
      const numericPlannerId = Number(plannerId);
      if (isNaN(numericPlannerId) || !Number.isInteger(numericPlannerId) || numericPlannerId <= 0) {
        console.warn(`Invalid plannerId parameter in getPlannerAssignmentsByPlannerId: ${plannerId}`);
        return [];
      }
      
      console.log(`Getting planner assignments for planner ID: ${plannerId}`);
      
      // First, get all slots for this planner
      const slots = await db.select()
        .from(plannerSlots)
        .where(eq(plannerSlots.plannerId, plannerId));
      
      if (!slots.length) {
        console.log(`No slots found for planner ID: ${plannerId}`);
        return [];
      }
      
      // Get all slot IDs for this planner
      const slotIds = slots.map(slot => slot.id);
      console.log(`Found ${slotIds.length} slots for planner ID: ${plannerId}`);
      
      // Then get all assignments for these slots
      const assignments = await db.select()
        .from(plannerAssignments)
        .where(inArray(plannerAssignments.slotId, slotIds))
        .orderBy(plannerAssignments.slotId, plannerAssignments.id);
      
      console.log(`Found ${assignments.length} assignments for planner ID: ${plannerId}`);
      return assignments;
    } catch (error) {
      console.error(`Database error in getPlannerAssignmentsByPlannerId:`, error);
      return [];
    }
  }
  
  async getPlannerAssignment(id: number): Promise<PlannerAssignment | undefined> {
    // Enhanced validation of numeric ID
    if (id === undefined || id === null) {
      console.warn(`Missing planner assignment ID`);
      return undefined;
    }
    
    // Force convert to number and validate
    const numericId = Number(id);
    if (isNaN(numericId) || !Number.isInteger(numericId) || numericId <= 0) {
      console.warn(`Invalid planner assignment ID format: ${id} (type: ${typeof id})`);
      return undefined;
    }
    
    try {
      const [assignment] = await db.select()
        .from(plannerAssignments)
        .where(eq(plannerAssignments.id, numericId));
      
      return assignment;
    } catch (error) {
      console.error(`Database error in getPlannerAssignment:`, error);
      console.error(`Query parameters: id=${numericId}`);
      return undefined;
    }
  }
  
  async createPlannerAssignment(assignment: InsertPlannerAssignment): Promise<PlannerAssignment> {
    const [newAssignment] = await db.insert(plannerAssignments)
      .values(assignment)
      .returning();
    
    // Get musician and slot details for activity log
    const musician = await this.getMusician(assignment.musicianId);
    const slot = await this.getPlannerSlot(assignment.slotId);
    
    if (musician && slot) {
      await this.createActivity({
        action: 'create',
        entityType: 'planner_assignment',
        entityId: newAssignment.id,
        userId: 1,
        details: `Assigned ${musician.name} to ${slot.venue} on ${format(slot.date, 'yyyy-MM-dd')}`
      });
    }
    
    return newAssignment;
  }
  
  async updatePlannerAssignment(id: number, data: Partial<InsertPlannerAssignment>): Promise<PlannerAssignment | undefined> {
    const [updated] = await db.update(plannerAssignments)
      .set(data)
      .where(eq(plannerAssignments.id, id))
      .returning();
    
    return updated;
  }
  
  async deletePlannerAssignment(id: number): Promise<boolean> {
    // Get assignment details for activity log
    const assignment = await this.getPlannerAssignment(id);
    
    const result = await db.delete(plannerAssignments)
      .where(eq(plannerAssignments.id, id));
    
    // Create activity log
    if (result.rowCount > 0 && assignment) {
      const musician = await this.getMusician(assignment.musicianId);
      const slot = await this.getPlannerSlot(assignment.slotId);
      
      if (musician && slot) {
        await this.createActivity({
          action: 'delete',
          entityType: 'planner_assignment',
          entityId: id,
          userId: 1,
          details: `Removed ${musician.name} from ${slot.venue} on ${format(slot.date, 'yyyy-MM-dd')}`
        });
      }
    }
    
    return result.rowCount > 0;
  }
  
  async getPlannerAssignmentsByMusician(plannerId: number): Promise<Record<number, {
    musicianId: number;
    musicianName: string;
    assignments: Array<{
      id: number;
      slotId: number;
      date: Date;
      venueName: string;
      fee: number;
      attendance: string;
      contractStatus: string;
      contractId?: number;
    }>;
    totalFee: number;
    contractStatus?: string;
  }>> {
    try {
      // Get all assignments for this planner
      const assignments = await this.getPlannerAssignmentsByPlannerId(plannerId);
      
      if (assignments.length === 0) {
        return {};
      }
      
      // Get all slots for these assignments
      const slotIds = [...new Set(assignments.map(a => a.slotId))];
      const slots = await db.select()
        .from(plannerSlots)
        .where(inArray(plannerSlots.id, slotIds));
      
      // Create a map of slot ID to slot data for easy lookup
      const slotMap = new Map(slots.map(slot => [slot.id, slot]));
      
      // Get all musicians involved
      const musicianIds = [...new Set(assignments.map(a => a.musicianId))];
      const musicians = await db.select()
        .from(schema.musicians)
        .where(inArray(schema.musicians.id, musicianIds));
      
      // Create a map of musician ID to musician data for easy lookup
      const musicianMap = new Map(musicians.map(m => [m.id, m]));
      
      // Get all venues for these slots
      const venueIds = [...new Set(slots.map(s => s.venueId).filter(Boolean))];
      let venues: any[] = [];
      if (venueIds.length > 0) {
        venues = await db.select()
          .from(schema.venues)
          .where(inArray(schema.venues.id, venueIds as number[]));
      }
      
      // Create a map of venue ID to venue data for easy lookup
      const venueMap = new Map(venues.map(v => [v.id, v]));
      
      // Group assignments by musician
      const result: Record<number, {
        musicianId: number;
        musicianName: string;
        assignments: Array<{
          id: number;
          slotId: number;
          date: Date;
          venueName: string;
          fee: number;
          attendance: string;
          contractStatus: string;
          contractId?: number;
        }>;
        totalFee: number;
        contractStatus?: string;
      }> = {};
      
      // Process each assignment and group by musician
      for (const assignment of assignments) {
        const musicianId = assignment.musicianId;
        const slot = slotMap.get(assignment.slotId);
        
        if (!slot) continue; // Skip if slot not found
        
        const musician = musicianMap.get(musicianId);
        if (!musician) continue; // Skip if musician not found
        
        const venue = slot.venueId ? venueMap.get(slot.venueId) : null;
        const venueName = venue ? venue.name : 'No venue specified';
        
        // Initialize musician entry if it doesn't exist
        if (!result[musicianId]) {
          result[musicianId] = {
            musicianId,
            musicianName: musician.name,
            assignments: [],
            totalFee: 0,
            contractStatus: assignment.contractStatus || 'pending'
          };
        }
        
        // Add this assignment to the musician's list
        result[musicianId].assignments.push({
          id: assignment.id,
          slotId: assignment.slotId,
          date: slot.date,
          venueName,
          fee: slot.fee || 0,
          attendance: assignment.status,
          contractStatus: assignment.contractStatus || 'pending',
          contractId: assignment.contractId
        });
        
        // Add fee to total
        result[musicianId].totalFee += (slot.fee || 0);
        
        // Update contract status based on the "lowest common denominator"
        // Priority: pending < included < sent < signed, rejected
        const currentStatus = result[musicianId].contractStatus;
        const newStatus = assignment.contractStatus || 'pending';
        
        // Simple priority logic - we want the "least progressed" status to be shown
        if (currentStatus === 'signed' && newStatus !== 'signed') {
          result[musicianId].contractStatus = newStatus;
        } else if (currentStatus === 'sent' && (newStatus === 'pending' || newStatus === 'included')) {
          result[musicianId].contractStatus = newStatus;
        } else if (currentStatus === 'included' && newStatus === 'pending') {
          result[musicianId].contractStatus = newStatus;
        } else if (newStatus === 'rejected') {
          // If any assignment is rejected, the overall status is rejected
          result[musicianId].contractStatus = 'rejected';
        }
      }
      
      // Sort assignments by date for each musician
      for (const musicianId in result) {
        result[musicianId].assignments.sort((a, b) => {
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        });
      }
      
      return result;
    } catch (error) {
      console.error(`Error in getPlannerAssignmentsByMusician:`, error);
      return {};
    }
  }
  
  async markAttendance(id: number, status: string, userId: number, notes?: string): Promise<PlannerAssignment | undefined> {
    const [updated] = await db.update(plannerAssignments)
      .set({
        attendanceStatus: status,
        attendanceMarkedBy: userId,
        attendanceMarkedAt: new Date(),
        attendanceNotes: notes
      })
      .where(eq(plannerAssignments.id, id))
      .returning();
    
    // Create activity log
    if (updated) {
      const musician = await this.getMusician(updated.musicianId);
      const slot = await this.getPlannerSlot(updated.slotId);
      
      if (musician && slot) {
        await this.createActivity({
          action: 'mark',
          entityType: 'attendance',
          entityId: updated.id,
          userId,
          details: `Marked ${musician.name} as ${status} for ${slot.venue} on ${format(slot.date, 'yyyy-MM-dd')}`
        });
      }
    }
    
    return updated;
  }
  
  // Monthly Invoice management
  async getMonthlyInvoices(plannerId?: number, musicianId?: number): Promise<MonthlyInvoice[]> {
    // Validate parameters
    if ((plannerId !== undefined && isNaN(plannerId)) || (musicianId !== undefined && isNaN(musicianId))) {
      console.warn(`Invalid parameters in getMonthlyInvoices: plannerId=${plannerId}, musicianId=${musicianId}`);
      return []; // Return empty array for invalid input
    }
    
    let query = db.select().from(monthlyInvoices);
    
    if (plannerId !== undefined && !isNaN(plannerId) && musicianId !== undefined && !isNaN(musicianId)) {
      query = query.where(and(
        eq(monthlyInvoices.plannerId, plannerId),
        eq(monthlyInvoices.musicianId, musicianId)
      ));
    } else if (plannerId !== undefined && !isNaN(plannerId)) {
      query = query.where(eq(monthlyInvoices.plannerId, plannerId));
    } else if (musicianId !== undefined && !isNaN(musicianId)) {
      query = query.where(eq(monthlyInvoices.musicianId, musicianId));
    }
    
    return await query.orderBy(desc(monthlyInvoices.createdAt));
  }
  
  async getMonthlyInvoice(id: number): Promise<MonthlyInvoice | undefined> {
    // Validate id
    if (!id || isNaN(id)) {
      console.warn(`Invalid monthly invoice ID: ${id}`);
      return undefined;
    }
    
    const [invoice] = await db.select()
      .from(monthlyInvoices)
      .where(eq(monthlyInvoices.id, id));
    
    return invoice;
  }
  
  async createMonthlyInvoice(invoice: InsertMonthlyInvoice): Promise<MonthlyInvoice> {
    const [newInvoice] = await db.insert(monthlyInvoices)
      .values(invoice)
      .returning();
    
    return newInvoice;
  }
  
  async updateMonthlyInvoice(id: number, data: Partial<InsertMonthlyInvoice>): Promise<MonthlyInvoice | undefined> {
    const [updated] = await db.update(monthlyInvoices)
      .set(data)
      .where(eq(monthlyInvoices.id, id))
      .returning();
    
    return updated;
  }
  
  async deleteMonthlyInvoice(id: number): Promise<boolean> {
    const result = await db.delete(monthlyInvoices)
      .where(eq(monthlyInvoices.id, id));
    
    return result.rowCount > 0;
  }
  
  async generateMonthlyInvoices(plannerId: number): Promise<MonthlyInvoice[]> {
    // Get the planner
    const planner = await this.getMonthlyPlanner(plannerId);
    
    if (!planner) {
      throw new Error('Planner not found');
    }
    
    // Get all slots for this planner
    const slots = await this.getPlannerSlots(plannerId);
    
    // Group assignments by musician
    const musicianAssignments: Record<number, PlannerAssignment[]> = {};
    
    for (const slot of slots) {
      const assignments = await this.getPlannerAssignments(slot.id);
      
      for (const assignment of assignments) {
        // Only include completed assignments
        if (assignment.attendanceStatus === 'completed') {
          if (!musicianAssignments[assignment.musicianId]) {
            musicianAssignments[assignment.musicianId] = [];
          }
          
          musicianAssignments[assignment.musicianId].push(assignment);
        }
      }
    }
    
    // Generate invoices for each musician
    const generatedInvoices: MonthlyInvoice[] = [];
    
    for (const musicianId in musicianAssignments) {
      const numericMusicianId = parseInt(musicianId);
      const assignments = musicianAssignments[numericMusicianId];
      
      // Calculate total amount
      let totalAmount = 0;
      const assignmentDetails: any[] = [];
      
      for (const assignment of assignments) {
        const slot = await this.getPlannerSlot(assignment.slotId);
        
        if (slot) {
          // Get the musician's pay rate for this type of event
          let rate = assignment.agreedRate;
          
          if (!rate) {
            // Look up the musician's pay rate for this category
            const payRates = await this.getMusicianPayRatesByMusicianId(numericMusicianId);
            
            // Find matching pay rate for the slot's category
            const matchingRate = payRates.find(pr => 
              pr.eventCategoryId === slot.eventCategoryId
            );
            
            if (matchingRate) {
              // Use appropriate rate based on duration
              if (slot.endTime && slot.startTime) {
                const startTime = new Date(slot.startTime);
                const endTime = new Date(slot.endTime);
                const durationHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
                
                if (durationHours <= 4) {
                  // Use hourly rate
                  rate = matchingRate.hourlyRate ? matchingRate.hourlyRate * durationHours : 0;
                } else {
                  // Use day rate
                  rate = matchingRate.dayRate || 0;
                }
              } else {
                // Default to event rate if times not specified
                rate = matchingRate.eventRate || 0;
              }
            }
          }
          
          // Add to total
          totalAmount += rate || 0;
          
          // Add details
          assignmentDetails.push({
            date: format(slot.date, 'yyyy-MM-dd'),
            venue: slot.venue,
            rate,
            description: slot.description || 'Performance'
          });
        }
      }
      
      // Create invoice object
      const invoice: InsertMonthlyInvoice = {
        plannerId,
        musicianId: numericMusicianId,
        month: planner.month,
        year: planner.year,
        totalAmount,
        status: 'draft',
        assignmentDetails: JSON.stringify(assignmentDetails),
        createdAt: new Date()
      };
      
      // Check if invoice already exists
      const existingInvoices = await this.getMonthlyInvoices(plannerId, numericMusicianId);
      
      if (existingInvoices.length > 0) {
        // Update existing invoice
        const updated = await this.updateMonthlyInvoice(existingInvoices[0].id, invoice);
        
        if (updated) {
          generatedInvoices.push(updated);
        }
      } else {
        // Create new invoice
        const newInvoice = await this.createMonthlyInvoice(invoice);
        generatedInvoices.push(newInvoice);
      }
    }
    
    return generatedInvoices;
  }
  
  async finalizeMonthlyInvoice(id: number): Promise<MonthlyInvoice | undefined> {
    const [updated] = await db.update(monthlyInvoices)
      .set({
        status: 'finalized',
        finalizedAt: new Date()
      })
      .where(eq(monthlyInvoices.id, id))
      .returning();
    
    // Create activity log
    if (updated) {
      const musician = await this.getMusician(updated.musicianId);
      
      if (musician) {
        await this.createActivity({
          entityType: 'monthly_invoice',
          entityId: updated.id,
          action: 'finalize',
          userId: 1,
          details: `Finalized invoice for ${musician.name} for ${format(new Date(updated.year, updated.month - 1), 'MMMM yyyy')}`
        });
      }
    }
    
    return updated;
  }
  
  async markMonthlyInvoiceAsPaid(id: number, notes?: string): Promise<MonthlyInvoice | undefined> {
    const [updated] = await db.update(monthlyInvoices)
      .set({
        status: 'paid',
        paidAt: new Date(),
        paymentNotes: notes
      })
      .where(eq(monthlyInvoices.id, id))
      .returning();
    
    // Create activity log
    if (updated) {
      const musician = await this.getMusician(updated.musicianId);
      
      if (musician) {
        await this.createActivity({
          entityType: 'monthly_invoice',
          entityId: updated.id,
          action: 'paid',
          userId: 1,
          details: `Marked invoice for ${musician.name} as paid for ${format(new Date(updated.year, updated.month - 1), 'MMMM yyyy')}`
        });
      }
    }
    
    return updated;
  }
  
  // Availability Share Links
  async getAvailabilityShareLinks(musicianId: number): Promise<AvailabilityShareLink[]> {
    return await db.select()
      .from(availabilityShareLinks)
      .where(eq(availabilityShareLinks.musicianId, musicianId))
      .orderBy(desc(availabilityShareLinks.createdAt));
  }
  
  async getAvailabilityShareLink(id: number): Promise<AvailabilityShareLink | undefined> {
    const [link] = await db.select()
      .from(availabilityShareLinks)
      .where(eq(availabilityShareLinks.id, id));
    
    return link;
  }
  
  // This method has been replaced by the implementation at line ~2533
  
  // This method has been replaced by the createAvailabilityShareLink method below
  
  async deleteAvailabilityShareLink(id: number): Promise<boolean> {
    const result = await db.delete(availabilityShareLinks)
      .where(eq(availabilityShareLinks.id, id));
    
    return result.rowCount > 0;
  }
  
  // Performance management
  async getPerformanceRatings(musicianId?: number, bookingId?: number, plannerAssignmentId?: number): Promise<PerformanceRating[]> {
    let query = db.select().from(performanceRatings);
    
    if (musicianId) {
      query = query.where(eq(performanceRatings.musicianId, musicianId));
    }
    
    if (bookingId) {
      query = query.where(eq(performanceRatings.bookingId, bookingId));
    }
    
    if (plannerAssignmentId) {
      query = query.where(eq(performanceRatings.plannerAssignmentId, plannerAssignmentId));
    }
    
    return await query.orderBy(desc(performanceRatings.date));
  }
  
  async getPerformanceRating(id: number): Promise<PerformanceRating | undefined> {
    const [rating] = await db.select()
      .from(performanceRatings)
      .where(eq(performanceRatings.id, id));
    
    return rating;
  }
  
  async createPerformanceRating(rating: InsertPerformanceRating): Promise<PerformanceRating> {
    const [newRating] = await db.insert(performanceRatings)
      .values(rating)
      .returning();
    
    return newRating;
  }
  
  async updatePerformanceRating(id: number, data: Partial<InsertPerformanceRating>): Promise<PerformanceRating | undefined> {
    const [updated] = await db.update(performanceRatings)
      .set(data)
      .where(eq(performanceRatings.id, id))
      .returning();
    
    return updated;
  }
  
  async deletePerformanceRating(id: number): Promise<boolean> {
    const result = await db.delete(performanceRatings)
      .where(eq(performanceRatings.id, id));
    
    return result.rowCount > 0;
  }
  
  async getMusicianAverageRatings(musicianId: number): Promise<{
    overallRating: number;
    metrics: Record<string, number>;
  }> {
    // Get all ratings for this musician
    const ratings = await this.getPerformanceRatings(musicianId);
    
    if (ratings.length === 0) {
      return {
        overallRating: 0,
        metrics: {}
      };
    }
    
    // Calculate average overall rating
    const overallSum = ratings.reduce((sum, rating) => sum + rating.overallRating, 0);
    const overallRating = overallSum / ratings.length;
    
    // Calculate average metrics
    const metricValues: Record<string, number[]> = {};
    
    ratings.forEach(rating => {
      try {
        const metricsData = JSON.parse(rating.metricsData || '{}');
        
        for (const [metric, value] of Object.entries(metricsData)) {
          if (!metricValues[metric]) {
            metricValues[metric] = [];
          }
          
          metricValues[metric].push(value as number);
        }
      } catch (e) {
        // Ignore invalid JSON
      }
    });
    
    const metrics: Record<string, number> = {};
    
    for (const [metric, values] of Object.entries(metricValues)) {
      metrics[metric] = values.reduce((sum, val) => sum + val, 0) / values.length;
    }
    
    return {
      overallRating,
      metrics
    };
  }
  
  async getPerformanceMetrics(): Promise<PerformanceMetric[]> {
    return await db.select().from(performanceMetrics).orderBy(asc(performanceMetrics.order));
  }
  
  async getPerformanceMetric(id: number): Promise<PerformanceMetric | undefined> {
    const [metric] = await db.select()
      .from(performanceMetrics)
      .where(eq(performanceMetrics.id, id));
    
    return metric;
  }
  
  async createPerformanceMetric(metric: InsertPerformanceMetric): Promise<PerformanceMetric> {
    const [newMetric] = await db.insert(performanceMetrics)
      .values(metric)
      .returning();
    
    return newMetric;
  }
  
  async updatePerformanceMetric(id: number, data: Partial<InsertPerformanceMetric>): Promise<PerformanceMetric | undefined> {
    const [updated] = await db.update(performanceMetrics)
      .set(data)
      .where(eq(performanceMetrics.id, id))
      .returning();
    
    return updated;
  }
  
  async deletePerformanceMetric(id: number): Promise<boolean> {
    const result = await db.delete(performanceMetrics)
      .where(eq(performanceMetrics.id, id));
    
    return result.rowCount > 0;
  }
  
  // Skill management
  async getSkillTags(): Promise<SkillTag[]> {
    return await db.select().from(skillTags).orderBy(skillTags.name);
  }
  
  async getSkillTag(id: number): Promise<SkillTag | undefined> {
    const [tag] = await db.select()
      .from(skillTags)
      .where(eq(skillTags.id, id));
    
    return tag;
  }
  
  async createSkillTag(tag: InsertSkillTag): Promise<SkillTag> {
    const [newTag] = await db.insert(skillTags)
      .values(tag)
      .returning();
    
    return newTag;
  }
  
  async updateSkillTag(id: number, data: Partial<InsertSkillTag>): Promise<SkillTag | undefined> {
    const [updated] = await db.update(skillTags)
      .set(data)
      .where(eq(skillTags.id, id))
      .returning();
    
    return updated;
  }
  
  async deleteSkillTag(id: number): Promise<boolean> {
    // Remove all musician associations first
    await db.delete(musicianSkillTags)
      .where(eq(musicianSkillTags.skillTagId, id));
    
    const result = await db.delete(skillTags)
      .where(eq(skillTags.id, id));
    
    return result.rowCount > 0;
  }
  
  async getMusicianSkillTags(musicianId: number): Promise<SkillTag[]> {
    const skillTagLinks = await db.select({
      skillTagId: musicianSkillTags.skillTagId
    })
    .from(musicianSkillTags)
    .where(eq(musicianSkillTags.musicianId, musicianId));
    
    const skillTagIds = skillTagLinks.map(link => link.skillTagId);
    
    if (skillTagIds.length === 0) {
      return [];
    }
    
    return await db.select()
      .from(skillTags)
      .where(inArray(skillTags.id, skillTagIds))
      .orderBy(skillTags.name);
  }
  
  async addMusicianSkillTag(musicianId: number, skillTagId: number, proficiencyLevel?: number): Promise<boolean> {
    // Check if association already exists
    const [existing] = await db.select()
      .from(musicianSkillTags)
      .where(and(
        eq(musicianSkillTags.musicianId, musicianId),
        eq(musicianSkillTags.skillTagId, skillTagId)
      ));
    
    if (existing) {
      // Update proficiency if provided
      if (proficiencyLevel !== undefined) {
        await db.update(musicianSkillTags)
          .set({ proficiencyLevel })
          .where(eq(musicianSkillTags.id, existing.id));
      }
      
      return true;
    }
    
    // Create new association
    await db.insert(musicianSkillTags)
      .values({
        musicianId,
        skillTagId,
        proficiencyLevel: proficiencyLevel !== undefined ? proficiencyLevel : 3, // Default mid-level
        addedAt: new Date()
      });
    
    return true;
  }
  
  async removeMusicianSkillTag(musicianId: number, skillTagId: number): Promise<boolean> {
    const result = await db.delete(musicianSkillTags)
      .where(and(
        eq(musicianSkillTags.musicianId, musicianId),
        eq(musicianSkillTags.skillTagId, skillTagId)
      ));
    
    return result.rowCount > 0;
  }
  
  async updateMusicianSkillProficiency(musicianId: number, skillTagId: number, proficiencyLevel: number): Promise<boolean> {
    const result = await db.update(musicianSkillTags)
      .set({ proficiencyLevel })
      .where(and(
        eq(musicianSkillTags.musicianId, musicianId),
        eq(musicianSkillTags.skillTagId, skillTagId)
      ));
    
    return result.rowCount > 0;
  }
  
  // Improvement Plans
  async getImprovementPlans(musicianId?: number): Promise<ImprovementPlan[]> {
    let query = db.select().from(improvementPlans);
    
    if (musicianId) {
      query = query.where(eq(improvementPlans.musicianId, musicianId));
    }
    
    return await query.orderBy(desc(improvementPlans.createdAt));
  }
  
  async getImprovementPlan(id: number): Promise<ImprovementPlan | undefined> {
    const [plan] = await db.select()
      .from(improvementPlans)
      .where(eq(improvementPlans.id, id));
    
    return plan;
  }
  
  async createImprovementPlan(plan: InsertImprovementPlan): Promise<ImprovementPlan> {
    const [newPlan] = await db.insert(improvementPlans)
      .values({
        ...plan,
        createdAt: new Date()
      })
      .returning();
    
    return newPlan;
  }
  
  async updateImprovementPlan(id: number, data: Partial<InsertImprovementPlan>): Promise<ImprovementPlan | undefined> {
    const [updated] = await db.update(improvementPlans)
      .set(data)
      .where(eq(improvementPlans.id, id))
      .returning();
    
    return updated;
  }
  
  async deleteImprovementPlan(id: number): Promise<boolean> {
    // Delete all actions first
    await db.delete(improvementActions)
      .where(eq(improvementActions.planId, id));
    
    const result = await db.delete(improvementPlans)
      .where(eq(improvementPlans.id, id));
    
    return result.rowCount > 0;
  }
  
  async getImprovementActions(planId: number): Promise<ImprovementAction[]> {
    return await db.select()
      .from(improvementActions)
      .where(eq(improvementActions.planId, planId))
      .orderBy(improvementActions.dueDate);
  }
  
  async getImprovementAction(id: number): Promise<ImprovementAction | undefined> {
    const [action] = await db.select()
      .from(improvementActions)
      .where(eq(improvementActions.id, id));
    
    return action;
  }
  
  async createImprovementAction(action: InsertImprovementAction): Promise<ImprovementAction> {
    const [newAction] = await db.insert(improvementActions)
      .values(action)
      .returning();
    
    return newAction;
  }
  
  async updateImprovementAction(id: number, data: Partial<InsertImprovementAction>): Promise<ImprovementAction | undefined> {
    const [updated] = await db.update(improvementActions)
      .set(data)
      .where(eq(improvementActions.id, id))
      .returning();
    
    return updated;
  }
  
  async deleteImprovementAction(id: number): Promise<boolean> {
    const result = await db.delete(improvementActions)
      .where(eq(improvementActions.id, id));
    
    return result.rowCount > 0;
  }
  
  async markImprovementActionComplete(id: number, completionNotes?: string): Promise<ImprovementAction | undefined> {
    const [updated] = await db.update(improvementActions)
      .set({
        status: 'completed',
        completedAt: new Date(),
        completionNotes
      })
      .where(eq(improvementActions.id, id))
      .returning();
    
    return updated;
  }
  
  // Helper functions
  async getMusiciansByCategory(categoryId: number): Promise<Musician[]> {
    return await db.select()
      .from(musicians)
      .where(sql`${musicians.categoryIds} @> ARRAY[${categoryId}]::integer[]`);
  }
  
  async getMusiciansByExperience(minYears: number): Promise<Musician[]> {
    return await db.select()
      .from(musicians)
      .where(gte(musicians.yearsOfExperience, minYears));
  }
  
  async searchMusicians(query: string): Promise<Musician[]> {
    return await db.select()
      .from(musicians)
      .where(or(
        like(musicians.name, `%${query}%`),
        like(musicians.biography, `%${query}%`),
        like(musicians.specializations, `%${query}%`)
      ));
  }

  // Availability Share Links
  async getAvailabilityShareLinks(musicianId: number): Promise<AvailabilityShareLink[]> {
    return await db.select()
      .from(availabilityShareLinks)
      .where(eq(availabilityShareLinks.musicianId, musicianId))
      .orderBy(desc(availabilityShareLinks.createdAt));
  }

  async getAvailabilityShareLinkByToken(token: string): Promise<AvailabilityShareLink | undefined> {
    const [shareLink] = await db.select()
      .from(availabilityShareLinks)
      .where(eq(availabilityShareLinks.token, token));
    
    // Update the last accessed timestamp if found
    if (shareLink) {
      await db.update(availabilityShareLinks)
        .set({ lastAccessedAt: new Date() })
        .where(eq(availabilityShareLinks.id, shareLink.id));
    }
    
    return shareLink;
  }

  async createAvailabilityShareLink(data: InsertAvailabilityShareLink): Promise<AvailabilityShareLink> {
    // Generate a random token if not provided
    if (!data.token) {
      data.token = crypto.randomBytes(32).toString('hex');
    }
    
    // Handle expiresAt - ensure it's a valid Date object
    // Don't try to convert it to ISO string - let Drizzle ORM handle it
    const values = {
      ...data,
      expiresAt: data.expiresAt instanceof Date ? data.expiresAt : new Date(data.expiresAt)
    };
    
    const [shareLink] = await db.insert(availabilityShareLinks)
      .values(values)
      .returning();
    
    return shareLink;
  }

  async updateAvailabilityShareLink(id: number, data: Partial<InsertAvailabilityShareLink>): Promise<AvailabilityShareLink | undefined> {
    // Handle expiresAt if present - ensure it's a valid Date object
    const values = {...data};
    
    if (values.expiresAt) {
      values.expiresAt = values.expiresAt instanceof Date 
        ? values.expiresAt 
        : new Date(values.expiresAt);
    }
    
    const [updated] = await db.update(availabilityShareLinks)
      .set(values)
      .where(eq(availabilityShareLinks.id, id))
      .returning();
    
    return updated;
  }

  async deleteAvailabilityShareLink(id: number): Promise<boolean> {
    const result = await db.delete(availabilityShareLinks)
      .where(eq(availabilityShareLinks.id, id));
    
    return result.rowCount > 0;
  }
  
  // Monthly Contract management implementation
  async getMonthlyContracts(): Promise<MonthlyContract[]> {
    console.log(`[DatabaseStorage] Getting all monthly contracts`);
    
    // First get all contracts
    const contracts = await db.select().from(monthlyContracts).orderBy(desc(monthlyContracts.createdAt));
    
    // Now get the date counts for each contract
    if (contracts.length > 0) {
      const contractIds = contracts.map(c => c.id);
      
      try {
        // Use a SQL query to efficiently get the count of dates for each contract
        const query = `
          SELECT 
            mcm.contract_id, 
            COUNT(mcd.id) as date_count
          FROM 
            monthly_contract_musicians mcm
          LEFT JOIN 
            monthly_contract_dates mcd ON mcm.id = mcd.musician_contract_id
          WHERE 
            mcm.contract_id = ANY($1)
          GROUP BY 
            mcm.contract_id
        `;
        
        const result = await pool.query(query, [contractIds]);
        
        // Create a map of contract IDs to date counts
        const dateCounts: Record<number, number> = {};
        for (const row of result.rows) {
          dateCounts[row.contract_id] = parseInt(row.date_count) || 0;
        }
        
        console.log(`[DatabaseStorage] Found day counts for ${result.rowCount} contracts`);
        
        // Add the date count to each contract
        return contracts.map(contract => ({
          ...contract,
          dateCount: dateCounts[contract.id] || 0
        }));
      } catch (error) {
        console.error(`[DatabaseStorage] Error getting day counts for contracts:`, error);
        // Return the contracts without date counts if there was an error
        return contracts;
      }
    }
    
    return contracts;
  }

  async getMonthlyContract(id: number): Promise<MonthlyContract | undefined> {
    console.log(`[DatabaseStorage] Getting monthly contract with ID ${id}`);
    
    const [contract] = await db.select()
      .from(monthlyContracts)
      .where(eq(monthlyContracts.id, id));
    
    if (!contract) {
      return undefined;
    }
    
    try {
      // Get the date count for this contract
      const query = `
        SELECT COUNT(mcd.id) as date_count
        FROM monthly_contract_musicians mcm
        LEFT JOIN monthly_contract_dates mcd ON mcm.id = mcd.musician_contract_id
        WHERE mcm.contract_id = $1
      `;
      
      const result = await pool.query(query, [id]);
      const dateCount = result.rows.length > 0 ? parseInt(result.rows[0].date_count) || 0 : 0;
      
      console.log(`[DatabaseStorage] Found ${dateCount} days for contract ${id}`);
      
      // Return the contract with the date count
      return {
        ...contract,
        dateCount
      };
    } catch (error) {
      console.error(`[DatabaseStorage] Error getting day count for contract ${id}:`, error);
      // Return the contract without date count if there was an error
      return contract;
    }
  }

  async getMonthlyContractsByPlanner(plannerId: number): Promise<MonthlyContract[]> {
    console.log(`[DatabaseStorage] Getting monthly contracts for planner ID ${plannerId}`);
    
    // Get all contracts for this planner
    const contracts = await db.select()
      .from(monthlyContracts)
      .where(eq(monthlyContracts.plannerId, plannerId))
      .orderBy(desc(monthlyContracts.createdAt));
    
    // Now get the date counts for each contract
    if (contracts.length > 0) {
      const contractIds = contracts.map(c => c.id);
      
      try {
        // Use SQL to get the counts efficiently
        const query = `
          SELECT 
            mcm.contract_id, 
            COUNT(mcd.id) as date_count
          FROM 
            monthly_contract_musicians mcm
          LEFT JOIN 
            monthly_contract_dates mcd ON mcm.id = mcd.musician_contract_id
          WHERE 
            mcm.contract_id = ANY($1)
          GROUP BY 
            mcm.contract_id
        `;
        
        const result = await pool.query(query, [contractIds]);
        
        // Build a map of contract ID to date count
        const dateCounts: Record<number, number> = {};
        for (const row of result.rows) {
          dateCounts[row.contract_id] = parseInt(row.date_count) || 0;
        }
        
        console.log(`[DatabaseStorage] Found day counts for planner contracts:`, dateCounts);
        
        // Add the date count to each contract
        return contracts.map(contract => ({
          ...contract,
          dateCount: dateCounts[contract.id] || 0
        }));
      } catch (error) {
        console.error(`[DatabaseStorage] Error getting day counts for planner contracts:`, error);
        // Return the contracts without date counts if there was an error
        return contracts;
      }
    }
    
    return contracts;
  }

  async createMonthlyContract(contract: InsertMonthlyContract): Promise<MonthlyContract> {
    console.log("Creating monthly contract with data:", contract);
    
    // Let's try a more direct approach using raw SQL
    try {
      const result = await db.execute(`
        INSERT INTO monthly_contracts (
          planner_id, month, year, template_id, name, status, created_at, updated_at
        ) VALUES (
          ${contract.plannerId}, ${contract.month}, ${contract.year}, ${contract.templateId}, 
          '${contract.name}', '${contract.status || 'draft'}', 
          NOW(), NOW()
        )
        RETURNING *
      `);
      
      console.log("SQL insert result:", result);
      
      if (result.rows && result.rows.length > 0) {
        const newContract = result.rows[0];
        console.log("Created new contract:", newContract);
        
        // Log activity
        await this.createActivity({
          entityType: 'monthlyContract',
          entityId: newContract.id,
          action: 'create',
          userId: 1, // Assuming admin user
          timestamp: new Date(),
          details: JSON.stringify({
            message: `Monthly contract created for planner: ${contract.plannerId}`,
            status: newContract.status
          })
        });
        
        return newContract;
      } else {
        throw new Error("No contract was returned from insert operation");
      }
    } catch (error) {
      console.error("Error in createMonthlyContract:", error);
      throw error;
    }
  }

  async updateMonthlyContract(id: number, data: Partial<InsertMonthlyContract>): Promise<MonthlyContract | undefined> {
    // Build update object with only fields that exist in the database
    const updateData: Record<string, any> = {};
    
    if (data.plannerId !== undefined) updateData.planner_id = data.plannerId;
    if (data.templateId !== undefined) updateData.template_id = data.templateId;
    if (data.name !== undefined) updateData.name = data.name;
    if (data.month !== undefined) updateData.month = data.month;
    if (data.year !== undefined) updateData.year = data.year;
    if (data.status !== undefined) updateData.status = data.status;
    
    // Add updated_at field
    updateData.updated_at = new Date();
    
    const [updated] = await db.update(monthlyContracts)
      .set(updateData)
      .where(eq(monthlyContracts.id, id))
      .returning();
    
    if (updated) {
      // Log activity
      await this.createActivity({
        entityType: 'monthlyContract',
        entityId: id,
        action: 'update',
        userId: 1, // Assuming admin user
        timestamp: new Date(),
        details: JSON.stringify({
          message: `Monthly contract updated`,
          status: data.status || updated.status
        })
      });
    }
    
    return updated;
  }

  async deleteMonthlyContract(id: number): Promise<boolean> {
    // First delete all associated musicians and dates
    const musicians = await this.getMonthlyContractMusicians(id);
    for (const musician of musicians) {
      await this.deleteMonthlyContractMusician(musician.id);
    }
    
    // Delete the contract
    const result = await db.delete(monthlyContracts)
      .where(eq(monthlyContracts.id, id));
    
    if (result.rowCount > 0) {
      // Log activity
      await this.createActivity({
        entityType: 'monthlyContract',
        entityId: id,
        action: 'delete',
        userId: 1, // Assuming admin user
        timestamp: new Date(),
        details: JSON.stringify({
          message: `Monthly contract deleted`
        })
      });
    }
    
    return result.rowCount > 0;
  }

  // Monthly Contract Musicians management implementation
  async getMonthlyContractMusicians(contractId: number): Promise<MonthlyContractMusician[]> {
    return await db.select()
      .from(monthlyContractMusicians)
      .where(eq(monthlyContractMusicians.contractId, contractId))
      .orderBy(asc(monthlyContractMusicians.musicianId));
  }

  async getMonthlyContractMusician(id: number): Promise<MonthlyContractMusician | undefined> {
    const [musician] = await db.select()
      .from(monthlyContractMusicians)
      .where(eq(monthlyContractMusicians.id, id));
    
    return musician;
  }
  
  async getMonthlyContractMusicianByToken(token: string): Promise<MonthlyContractMusician | undefined> {
    const [musician] = await db.select()
      .from(monthlyContractMusicians)
      .where(eq(monthlyContractMusicians.token, token));
    
    return musician;
  }

  async createMonthlyContractMusician(contractMusician: InsertMonthlyContractMusician): Promise<MonthlyContractMusician> {
    // Generate a unique token if not provided
    if (!contractMusician.token) {
      contractMusician.token = `mcm-${Math.random().toString(36).substring(2, 15)}-${Date.now().toString(36)}`;
    }
    
    try {
      const result = await db.execute(`
        INSERT INTO monthly_contract_musicians (
          contract_id, musician_id, status, token, notes, musician_notes, 
          company_signature, musician_signature, created_at, updated_at
        ) VALUES (
          ${contractMusician.contractId}, 
          ${contractMusician.musicianId}, 
          '${contractMusician.status || 'pending'}', 
          '${contractMusician.token}',
          ${contractMusician.notes ? `'${contractMusician.notes}'` : 'NULL'},
          ${contractMusician.musicianNotes ? `'${contractMusician.musicianNotes}'` : 'NULL'},
          ${contractMusician.companySignature ? `'${contractMusician.companySignature}'` : 'NULL'},
          ${contractMusician.musicianSignature ? `'${contractMusician.musicianSignature}'` : 'NULL'},
          NOW(), 
          NOW()
        )
        RETURNING *
      `);
      
      console.log("SQL insert result:", result);
      
      if (result.rows && result.rows.length > 0) {
        const newMusician = result.rows[0];
        console.log("Created new contract musician:", newMusician);
        
        // Get musician name for activity log
        const musician = await this.getMusician(contractMusician.musicianId);
        const musicianName = musician ? musician.name : `Musician ID ${contractMusician.musicianId}`;
        
        // Log activity
        await this.createActivity({
          entityType: 'monthlyContractMusician',
          entityId: newMusician.id,
          action: 'create',
          userId: 1, // Assuming admin user
          timestamp: new Date(),
          details: JSON.stringify({
            message: `${musicianName} added to monthly contract`,
            status: newMusician.status,
            token: newMusician.token
          })
        });
        
        return newMusician;
      } else {
        throw new Error("No contract musician was returned from insert operation");
      }
    } catch (error) {
      console.error("Error in createMonthlyContractMusician:", error);
      throw error;
    }
  }

  async updateMonthlyContractMusician(id: number, data: Partial<InsertMonthlyContractMusician>): Promise<MonthlyContractMusician | undefined> {
    try {
      // First get the existing record to merge with updates
      const [existingRecord] = await db.select()
        .from(monthlyContractMusicians)
        .where(eq(monthlyContractMusicians.id, id));
      
      if (!existingRecord) {
        return undefined;
      }
      
      // Build SET clause string for SQL query
      const setClauses = [];
      
      if (data.contractId !== undefined) setClauses.push(`contract_id = ${data.contractId}`);
      if (data.musicianId !== undefined) setClauses.push(`musician_id = ${data.musicianId}`);
      if (data.status !== undefined) setClauses.push(`status = '${data.status}'`);
      if (data.respondedAt !== undefined) {
        if (data.respondedAt) {
          setClauses.push(`responded_at = '${data.respondedAt.toISOString()}'`);
        } else {
          setClauses.push(`responded_at = NULL`);
        }
      }
      if (data.token !== undefined) setClauses.push(`token = '${data.token}'`);
      if (data.notes !== undefined) {
        if (data.notes) {
          setClauses.push(`notes = '${data.notes}'`);
        } else {
          setClauses.push(`notes = NULL`);
        }
      }
      if (data.musicianNotes !== undefined) {
        if (data.musicianNotes) {
          setClauses.push(`musician_notes = '${data.musicianNotes}'`);
        } else {
          setClauses.push(`musician_notes = NULL`);
        }
      }
      if (data.companySignature !== undefined) {
        if (data.companySignature) {
          setClauses.push(`company_signature = '${data.companySignature}'`);
        } else {
          setClauses.push(`company_signature = NULL`);
        }
      }
      if (data.musicianSignature !== undefined) {
        if (data.musicianSignature) {
          setClauses.push(`musician_signature = '${data.musicianSignature}'`);
        } else {
          setClauses.push(`musician_signature = NULL`);
        }
      }
      // Don't add fields that might not exist in the database yet
      // These need to be added via migrations
      
      // Always update the updated_at timestamp
      setClauses.push(`updated_at = NOW()`);
      
      if (setClauses.length === 0) {
        return existingRecord; // Nothing to update
      }
      
      const result = await db.execute(`
        UPDATE monthly_contract_musicians
        SET ${setClauses.join(', ')}
        WHERE id = ${id}
        RETURNING *
      `);
      
      console.log("SQL update result:", result);
      
      if (result.rows && result.rows.length > 0) {
        const updated = result.rows[0];
        console.log("Updated contract musician:", updated);
        
        // Get musician name for activity log
        const musician = await this.getMusician(updated.musician_id);
        const musicianName = musician ? musician.name : `Musician ID ${updated.musician_id}`;
        
        // Log activity
        await this.createActivity({
          entityType: 'monthlyContractMusician',
          entityId: id,
          action: 'update',
          userId: 1, // Assuming admin user
          timestamp: new Date(),
          details: JSON.stringify({
            message: `Monthly contract for ${musicianName} updated`,
            status: data.status || updated.status
          })
        });
        
        return updated;
      } else {
        throw new Error("No updated record was returned");
      }
    } catch (error) {
      console.error("Error in updateMonthlyContractMusician:", error);
      throw error;
    }
  }

  async deleteMonthlyContractMusician(id: number): Promise<boolean> {
    // First get the musician to use in activity log
    const [musician] = await db.select()
      .from(monthlyContractMusicians)
      .where(eq(monthlyContractMusicians.id, id));
    
    if (musician) {
      // First delete all associated dates
      const dates = await this.getMonthlyContractDates(id);
      for (const date of dates) {
        await this.deleteMonthlyContractDate(date.id);
      }
      
      // Delete the musician contract
      const result = await db.delete(monthlyContractMusicians)
        .where(eq(monthlyContractMusicians.id, id));
      
      if (result.rowCount > 0) {
        // Get musician name for activity log
        const musicianData = await this.getMusician(musician.musicianId);
        const musicianName = musicianData ? musicianData.name : `Musician ID ${musician.musicianId}`;
        
        // Log activity
        await this.createActivity({
          entityType: 'monthlyContractMusician',
          entityId: id,
          action: 'delete',
          userId: 1, // Assuming admin user
          timestamp: new Date(),
          details: JSON.stringify({
            message: `${musicianName} removed from monthly contract`
          })
        });
      }
      
      return result.rowCount > 0;
    }
    
    return false;
  }

  // Monthly Contract Dates management implementation
  async getMonthlyContractDates(musicianContractId: number): Promise<MonthlyContractDate[]> {
    console.log(`[DatabaseStorage] Getting monthly contract dates for musician contract ${musicianContractId}`);
    
    // Use direct SQL to ensure proper date formatting
    const result = await pool.query(`
      SELECT * FROM monthly_contract_dates 
      WHERE musician_contract_id = $1
      ORDER BY date ASC
    `, [musicianContractId]);
    
    console.log(`[DatabaseStorage] Found ${result.rows.length} dates for musician contract ${musicianContractId}`);
    
    // Convert column names from snake_case to camelCase and format dates
    return result.rows.map(row => ({
      id: row.id,
      musicianContractId: row.musician_contract_id,
      date: new Date(row.date),
      status: row.status,
      fee: row.fee,
      notes: row.notes,
      responseNotes: row.response_notes,
      eventId: row.event_id,
      venueId: row.venue_id,
      venueName: row.venue_name,
      startTime: row.start_time,
      endTime: row.end_time,
      responseTimestamp: row.response_timestamp,
      ipAddress: row.ip_address,
      signatureData: row.signature_data,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  }

  async getMonthlyContractDate(id: number): Promise<MonthlyContractDate | undefined> {
    // Use direct SQL for consistent date handling
    const result = await pool.query(`
      SELECT * FROM monthly_contract_dates 
      WHERE id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return undefined;
    }
    
    const row = result.rows[0];
    
    // Convert column names from snake_case to camelCase and format dates
    return {
      id: row.id,
      musicianContractId: row.musician_contract_id,
      date: new Date(row.date),
      status: row.status,
      fee: row.fee,
      notes: row.notes,
      responseNotes: row.response_notes,
      eventId: row.event_id,
      venueId: row.venue_id,
      venueName: row.venue_name,
      startTime: row.start_time,
      endTime: row.end_time,
      responseTimestamp: row.response_timestamp,
      ipAddress: row.ip_address,
      signatureData: row.signature_data,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
  
  // Helper method to create monthly contract dates from planner assignments
  async createMonthlyContractDatesFromAssignments(
    musicianContractId: number, 
    assignments: PlannerAssignment[]
  ): Promise<MonthlyContractDate[]> {
    console.log(`[DatabaseStorage] Creating contract dates for musician contract ${musicianContractId} from ${assignments.length} assignments`);
    
    const dates: MonthlyContractDate[] = [];
    
    // Process each assignment
    for (const assignment of assignments) {
      try {
        // Get the slot details for this assignment
        const slot = await this.getPlannerSlot(assignment.slotId);
        if (!slot) {
          console.error(`[DatabaseStorage] No slot found for assignment ${assignment.id} with slot ID ${assignment.slotId}`);
          continue;
        }
        
        console.log(`[DatabaseStorage] Processing assignment ${assignment.id} for slot ${slot.id} on ${format(slot.date, 'yyyy-MM-dd')}`);
        
        // Get venue details if available
        let venueName = "Venue not specified";
        let venueId = null;
        
        if (slot.venueId) {
          try {
            const venue = await this.getVenue(slot.venueId);
            if (venue) {
              venueName = venue.name;
              venueId = venue.id;
            }
          } catch (venueError) {
            console.error(`[DatabaseStorage] Error fetching venue for slot ${slot.id}:`, venueError);
          }
        }
        
        // Format time information
        const timeInfo = slot.time || "";
        
        // Use direct SQL since it's more reliable for dates
        const query = `
          INSERT INTO monthly_contract_dates 
            (musician_contract_id, date, status, fee, notes, venue_id, venue_name, start_time, created_at, updated_at)
          VALUES 
            ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
          RETURNING *
        `;
        
        const result = await pool.query(query, [
          musicianContractId,
          new Date(slot.date),
          'pending',
          assignment.actualFee || assignment.fee || 0,
          `${slot.description || ''} ${timeInfo}`.trim() || null,
          venueId,
          venueName,
          timeInfo || null
        ]);
        
        if (result.rows && result.rows.length > 0) {
          const newDate = result.rows[0];
          console.log(`[DatabaseStorage] Successfully created contract date ${newDate.id} for ${format(new Date(newDate.date), 'yyyy-MM-dd')}`);
          
          // Convert to camelCase format for return
          dates.push({
            id: newDate.id,
            musicianContractId: newDate.musician_contract_id,
            date: new Date(newDate.date),
            status: newDate.status,
            fee: newDate.fee,
            notes: newDate.notes,
            responseNotes: newDate.response_notes,
            eventId: newDate.event_id,
            venueId: newDate.venue_id,
            venueName: newDate.venue_name,
            startTime: newDate.start_time,
            endTime: newDate.end_time,
            responseTimestamp: newDate.response_timestamp,
            ipAddress: newDate.ip_address,
            signatureData: newDate.signature_data,
            createdAt: newDate.created_at,
            updatedAt: newDate.updated_at
          });
        }
      } catch (error) {
        console.error(`[DatabaseStorage] Error creating contract date for assignment ${assignment.id}:`, error);
      }
    }
    
    console.log(`[DatabaseStorage] Created ${dates.length} contract dates for musician contract ${musicianContractId}`);
    return dates;
  }

  async createMonthlyContractDate(contractDate: InsertMonthlyContractDate): Promise<MonthlyContractDate> {
    console.log("Creating monthly contract date with data:", contractDate);
    
    // Before attempting insertion, check if the musician contract exists
    const musicianContract = await this.getMonthlyContractMusician(contractDate.musicianContractId);
    console.log("Found musician contract:", musicianContract);
    
    const insertData = {
      musician_contract_id: contractDate.musicianContractId,
      date: contractDate.date,
      fee: contractDate.fee,
      status: contractDate.status || 'pending',
      notes: contractDate.notes || null,
      created_at: new Date(),
      updated_at: new Date()
    };
    console.log("Insert data:", insertData);
    
    // Try direct SQL insertion as a fallback if necessary
    try {
      const [newDate] = await db.insert(monthlyContractDates)
        .values(insertData)
        .returning();
    
      console.log("New date created:", newDate);
    
      // Get musician information for activity log
      let musicianName = "Unknown";
      if (musicianContract) {
        const musician = await this.getMusician(musicianContract.musician_id); // Use snake case
        if (musician) {
          musicianName = musician.name;
        }
      }
      
      // Format date for the log
      const dateStr = format(contractDate.date, 'yyyy-MM-dd');
      
      // Log activity
      await this.createActivity({
        entityType: 'monthlyContractDate',
        entityId: newDate.id,
        action: 'create',
        userId: 1, // Assuming admin user
        timestamp: new Date(),
        details: JSON.stringify({
          message: `Date ${dateStr} added to monthly contract for ${musicianName}`,
          status: newDate.status
        })
      });
      
      return newDate;
    } catch (error) {
      console.error("Error in createMonthlyContractDate:", error);
      
      // Try direct SQL as a fallback if ORM fails
      console.log("Attempting direct SQL insert as fallback");
      
      try {
        const result = await db.execute(sql`
          INSERT INTO monthly_contract_dates (musician_contract_id, date, status, fee, notes, created_at, updated_at)
          VALUES (${insertData.musician_contract_id}, ${insertData.date}, ${insertData.status}, ${insertData.fee}, ${insertData.notes}, ${insertData.created_at}, ${insertData.updated_at})
          RETURNING *
        `);
        
        if (result && result.rows && result.rows.length > 0) {
          console.log("Direct SQL insert succeeded:", result.rows[0]);
          return result.rows[0];
        } else {
          throw new Error("Direct SQL insert returned no results");
        }
      } catch (sqlError) {
        console.error("Direct SQL insert also failed:", sqlError);
        throw error; // Throw the original error
      }
    }
  }

  async updateMonthlyContractDate(id: number, data: Partial<InsertMonthlyContractDate>): Promise<MonthlyContractDate | undefined> {
    // Build update object with only fields that exist in the database
    const updateData: Record<string, any> = {};
    
    if (data.musicianContractId !== undefined) updateData.musician_contract_id = data.musicianContractId;
    if (data.date !== undefined) updateData.date = data.date;
    if (data.fee !== undefined) updateData.fee = data.fee;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.notes !== undefined) updateData.notes = data.notes;
    
    // Add updated_at field
    updateData.updated_at = new Date();
    
    const [updated] = await db.update(monthlyContractDates)
      .set(updateData)
      .where(eq(monthlyContractDates.id, id))
      .returning();
    
    if (updated) {
      // Get musician contract and musician for activity log
      const musicianContract = await this.getMonthlyContractMusician(updated.musician_contract_id); // Use snake case field
      let musicianName = "Unknown";
      
      if (musicianContract) {
        const musician = await this.getMusician(musicianContract.musician_id); // Use snake case field
        if (musician) {
          musicianName = musician.name;
        }
      }
      
      // Format date for the log
      const dateStr = format(updated.date, 'yyyy-MM-dd');
      
      // Log activity
      await this.createActivity({
        entityType: 'monthlyContractDate',
        entityId: id,
        action: 'update',
        userId: 1, // Assuming admin user
        timestamp: new Date(),
        details: JSON.stringify({
          message: `Date ${dateStr} updated in monthly contract for ${musicianName}`,
          status: data.status || updated.status
        })
      });
    }
    
    return updated;
  }

  async deleteMonthlyContractDate(id: number): Promise<boolean> {
    // First get the date info to use in activity log
    const [contractDate] = await db.select()
      .from(monthlyContractDates)
      .where(eq(monthlyContractDates.id, id));
    
    if (contractDate) {
      // Get musician contract and musician for activity log
      const musicianContract = await this.getMonthlyContractMusician(contractDate.musician_contract_id); // Use snake case field
      let musicianName = "Unknown";
      
      if (musicianContract) {
        const musician = await this.getMusician(musicianContract.musician_id); // Use snake case field
        if (musician) {
          musicianName = musician.name;
        }
      }
      
      // Format date for the log
      const dateStr = format(contractDate.date, 'yyyy-MM-dd');
      
      // Delete the date
      const result = await db.delete(monthlyContractDates)
        .where(eq(monthlyContractDates.id, id));
      
      if (result.rowCount && result.rowCount > 0) {
        // Log activity
        await this.createActivity({
          entityType: 'monthlyContractDate',
          entityId: id,
          action: 'delete',
          userId: 1, // Assuming admin user
          timestamp: new Date(),
          details: JSON.stringify({
            message: `Date ${dateStr} removed from monthly contract for ${musicianName}`
          })
        });
      }
      
      return result.rowCount ? result.rowCount > 0 : false;
    }
    
    return false;
  }
}