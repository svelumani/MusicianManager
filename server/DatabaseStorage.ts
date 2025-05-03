import { and, desc, eq, gte, lte, sql, inArray } from "drizzle-orm";
import { db } from "./db";
import { IStorage } from "./storage";
import {
  users, venues, musicianCategories, venueCategories, eventCategories,
  musicians, musicianPayRates, availability, events, bookings, payments, collections, expenses, 
  activities, monthlyPlanners, plannerSlots, plannerAssignments, monthlyInvoices,
  settings, emailTemplates, musicianTypes, contractLinks, contractTemplates,
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
  type ContractLink, type InsertContractLink,
  type ContractTemplate, type InsertContractTemplate,
} from "@shared/schema";
import crypto from "crypto";

export class DatabaseStorage implements IStorage {
  // User management methods
  async getUser(id: number): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    const result = await db.insert(users).values(user).returning();
    return result[0];
  }

  async updateUser(id: number, data: Partial<InsertUser>): Promise<User | undefined> {
    const result = await db.update(users)
      .set(data)
      .where(eq(users.id, id))
      .returning();
    return result[0];
  }

  // Monthly Planner management methods
  async getMonthlyPlanners(): Promise<MonthlyPlanner[]> {
    return await db.select().from(monthlyPlanners).orderBy(desc(monthlyPlanners.year), desc(monthlyPlanners.month));
  }

  async getMonthlyPlanner(id: number): Promise<MonthlyPlanner | undefined> {
    const result = await db.select().from(monthlyPlanners).where(eq(monthlyPlanners.id, id)).limit(1);
    return result[0];
  }

  async getMonthlyPlannerByMonth(month: number, year: number): Promise<MonthlyPlanner | undefined> {
    const result = await db.select()
      .from(monthlyPlanners)
      .where(and(
        eq(monthlyPlanners.month, month),
        eq(monthlyPlanners.year, year)
      ))
      .limit(1);
    return result[0];
  }

  async createMonthlyPlanner(planner: InsertMonthlyPlanner): Promise<MonthlyPlanner> {
    const result = await db.insert(monthlyPlanners)
      .values({
        ...planner,
        updatedAt: new Date()
      })
      .returning();
    return result[0];
  }

  async updateMonthlyPlanner(id: number, data: Partial<InsertMonthlyPlanner>): Promise<MonthlyPlanner | undefined> {
    const result = await db.update(monthlyPlanners)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(eq(monthlyPlanners.id, id))
      .returning();
    return result[0];
  }

  async deleteMonthlyPlanner(id: number): Promise<boolean> {
    // First, delete all associated slots
    const slots = await this.getPlannerSlots(id);
    for (const slot of slots) {
      await this.deletePlannerSlot(slot.id);
    }
    
    // Then delete the planner
    const result = await db.delete(monthlyPlanners)
      .where(eq(monthlyPlanners.id, id))
      .returning();
    return result.length > 0;
  }

  // Planner Slots management methods
  async getPlannerSlots(plannerId?: number): Promise<PlannerSlot[]> {
    if (plannerId) {
      return await db.select()
        .from(plannerSlots)
        .where(eq(plannerSlots.plannerId, plannerId));
    }
    return await db.select().from(plannerSlots);
  }

  async getPlannerSlot(id: number): Promise<PlannerSlot | undefined> {
    const result = await db.select()
      .from(plannerSlots)
      .where(eq(plannerSlots.id, id))
      .limit(1);
    return result[0];
  }

  async createPlannerSlot(slot: InsertPlannerSlot): Promise<PlannerSlot> {
    const result = await db.insert(plannerSlots)
      .values(slot)
      .returning();
    return result[0];
  }

  async updatePlannerSlot(id: number, data: Partial<InsertPlannerSlot>): Promise<PlannerSlot | undefined> {
    const result = await db.update(plannerSlots)
      .set(data)
      .where(eq(plannerSlots.id, id))
      .returning();
    return result[0];
  }

  async deletePlannerSlot(id: number): Promise<boolean> {
    // First, delete all related assignments
    const assignments = await this.getPlannerAssignments(id);
    for (const assignment of assignments) {
      await this.deletePlannerAssignment(assignment.id);
    }
    
    // Then delete the slot
    const result = await db.delete(plannerSlots)
      .where(eq(plannerSlots.id, id))
      .returning();
    return result.length > 0;
  }

  async getPlannerSlotsByDate(date: Date): Promise<PlannerSlot[]> {
    const dateStart = new Date(date);
    dateStart.setHours(0, 0, 0, 0);
    
    const dateEnd = new Date(date);
    dateEnd.setHours(23, 59, 59, 999);
    
    return await db.select()
      .from(plannerSlots)
      .where(and(
        gte(plannerSlots.date, dateStart),
        lte(plannerSlots.date, dateEnd)
      ));
  }

  // Planner Assignments management methods
  async getPlannerAssignments(slotId?: number, musicianId?: number): Promise<PlannerAssignment[]> {
    let query = db.select().from(plannerAssignments);
    
    if (slotId && musicianId) {
      query = query.where(and(
        eq(plannerAssignments.slotId, slotId),
        eq(plannerAssignments.musicianId, musicianId)
      ));
    } else if (slotId) {
      query = query.where(eq(plannerAssignments.slotId, slotId));
    } else if (musicianId) {
      query = query.where(eq(plannerAssignments.musicianId, musicianId));
    }
    
    return await query;
  }

  async getPlannerAssignment(id: number): Promise<PlannerAssignment | undefined> {
    const result = await db.select()
      .from(plannerAssignments)
      .where(eq(plannerAssignments.id, id))
      .limit(1);
    return result[0];
  }

  async createPlannerAssignment(assignment: InsertPlannerAssignment): Promise<PlannerAssignment> {
    const result = await db.insert(plannerAssignments)
      .values({
        ...assignment,
        assignedAt: new Date()
      })
      .returning();
    return result[0];
  }

  async updatePlannerAssignment(id: number, data: Partial<InsertPlannerAssignment>): Promise<PlannerAssignment | undefined> {
    const result = await db.update(plannerAssignments)
      .set(data)
      .where(eq(plannerAssignments.id, id))
      .returning();
    return result[0];
  }

  async deletePlannerAssignment(id: number): Promise<boolean> {
    const result = await db.delete(plannerAssignments)
      .where(eq(plannerAssignments.id, id))
      .returning();
    return result.length > 0;
  }

  async markAttendance(id: number, status: string, userId: number, notes?: string): Promise<PlannerAssignment | undefined> {
    const result = await db.update(plannerAssignments)
      .set({
        status,
        attendanceMarkedAt: new Date(),
        attendanceMarkedBy: userId,
        notes: notes || null
      })
      .where(eq(plannerAssignments.id, id))
      .returning();
    return result[0];
  }

  // Monthly Invoice management methods
  async getMonthlyInvoices(plannerId?: number, musicianId?: number): Promise<MonthlyInvoice[]> {
    let query = db.select().from(monthlyInvoices);
    
    if (plannerId && musicianId) {
      query = query.where(and(
        eq(monthlyInvoices.plannerId, plannerId),
        eq(monthlyInvoices.musicianId, musicianId)
      ));
    } else if (plannerId) {
      query = query.where(eq(monthlyInvoices.plannerId, plannerId));
    } else if (musicianId) {
      query = query.where(eq(monthlyInvoices.musicianId, musicianId));
    }
    
    return await query;
  }

  async getMonthlyInvoice(id: number): Promise<MonthlyInvoice | undefined> {
    const result = await db.select()
      .from(monthlyInvoices)
      .where(eq(monthlyInvoices.id, id))
      .limit(1);
    return result[0];
  }

  async createMonthlyInvoice(invoice: InsertMonthlyInvoice): Promise<MonthlyInvoice> {
    const result = await db.insert(monthlyInvoices)
      .values({
        ...invoice,
        generatedAt: new Date()
      })
      .returning();
    return result[0];
  }

  async updateMonthlyInvoice(id: number, data: Partial<InsertMonthlyInvoice>): Promise<MonthlyInvoice | undefined> {
    const result = await db.update(monthlyInvoices)
      .set(data)
      .where(eq(monthlyInvoices.id, id))
      .returning();
    return result[0];
  }

  async deleteMonthlyInvoice(id: number): Promise<boolean> {
    const result = await db.delete(monthlyInvoices)
      .where(eq(monthlyInvoices.id, id))
      .returning();
    return result.length > 0;
  }

  async generateMonthlyInvoices(plannerId: number): Promise<MonthlyInvoice[]> {
    // Get the planner
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
    const assignments = await Promise.all(slotIds.map(id => this.getPlannerAssignments(id)));
    const flatAssignments = assignments.flat();
    
    // Group assignments by musician
    const musicianAssignments = new Map<number, PlannerAssignment[]>();
    for (const assignment of flatAssignments) {
      if (!musicianAssignments.has(assignment.musicianId)) {
        musicianAssignments.set(assignment.musicianId, []);
      }
      musicianAssignments.get(assignment.musicianId)?.push(assignment);
    }
    
    // Generate invoices for each musician
    const invoices: MonthlyInvoice[] = [];
    for (const [musicianId, musicianAssignmentList] of musicianAssignments.entries()) {
      const totalSlots = musicianAssignmentList.length;
      const attendedSlots = musicianAssignmentList.filter(a => a.status === 'attended').length;
      
      // Calculate total amount
      let totalAmount = 0;
      for (const assignment of musicianAssignmentList) {
        if (assignment.status === 'attended' && assignment.actualFee) {
          totalAmount += assignment.actualFee;
        } else if (assignment.status === 'attended') {
          // If no actual fee is set, get the slot and use its fee
          const slot = await this.getPlannerSlot(assignment.slotId);
          if (slot && slot.fee) {
            totalAmount += slot.fee;
          }
        }
      }
      
      // Create invoice
      const invoice: InsertMonthlyInvoice = {
        plannerId,
        musicianId,
        month: planner.month,
        year: planner.year,
        totalSlots,
        attendedSlots,
        totalAmount,
        status: 'draft',
        notes: `Auto-generated invoice for ${planner.name}`
      };
      
      // Save it
      const savedInvoice = await this.createMonthlyInvoice(invoice);
      invoices.push(savedInvoice);
    }
    
    return invoices;
  }

  async finalizeMonthlyInvoice(id: number): Promise<MonthlyInvoice | undefined> {
    const result = await db.update(monthlyInvoices)
      .set({
        status: 'finalized'
      })
      .where(eq(monthlyInvoices.id, id))
      .returning();
    return result[0];
  }

  async markMonthlyInvoiceAsPaid(id: number, notes?: string): Promise<MonthlyInvoice | undefined> {
    const result = await db.update(monthlyInvoices)
      .set({
        status: 'paid',
        paidAt: new Date(),
        notes: notes || null
      })
      .where(eq(monthlyInvoices.id, id))
      .returning();
    return result[0];
  }

  async getMusicians(): Promise<Musician[]> {
    const result = await db.select().from(musicians).orderBy(musicians.name);
    return result;
  }
  
  async getMusician(id: number): Promise<Musician | undefined> {
    const result = await db.select().from(musicians).where(eq(musicians.id, id)).limit(1);
    return result[0];
  }
  
  async createMusician(musician: InsertMusician): Promise<Musician> {
    const result = await db.insert(musicians).values(musician).returning();
    return result[0];
  }
  
  async updateMusician(id: number, data: Partial<InsertMusician>): Promise<Musician | undefined> {
    const result = await db.update(musicians)
      .set(data)
      .where(eq(musicians.id, id))
      .returning();
    return result[0];
  }
  
  async deleteMusician(id: number): Promise<boolean> {
    const result = await db.delete(musicians)
      .where(eq(musicians.id, id))
      .returning();
    return result.length > 0;
  }
  
  async getCategories(): Promise<Category[]> {
    const result = await db.select().from(musicianCategories).orderBy(musicianCategories.title);
    return result;
  }
  
  async getMusicianCategories(): Promise<MusicianCategory[]> {
    const result = await db.select().from(musicianCategories).orderBy(musicianCategories.title);
    return result;
  }
  
  async getVenues(): Promise<Venue[]> {
    const result = await db.select().from(venues).orderBy(venues.name);
    return result;
  }
  
  async getVenue(id: number): Promise<Venue | undefined> {
    const result = await db.select().from(venues).where(eq(venues.id, id)).limit(1);
    return result[0];
  }
  
  async getEventCategories(): Promise<EventCategory[]> {
    const result = await db.select().from(eventCategories).orderBy(eventCategories.title);
    return result;
  }
  
  async getEventCategory(id: number): Promise<EventCategory | undefined> {
    const result = await db.select().from(eventCategories).where(eq(eventCategories.id, id)).limit(1);
    return result[0];
  }
  
  async getActivities(limit = 10): Promise<Activity[]> {
    const result = await db.select()
      .from(activities)
      .orderBy(desc(activities.timestamp))
      .limit(limit);
    return result;
  }
  
  async createActivity(activity: Partial<InsertActivity>): Promise<Activity> {
    const result = await db.insert(activities).values({
      ...activity,
      timestamp: new Date()
    }).returning();
    return result[0];
  }
  
  async getMusicianTypes(): Promise<MusicianType[]> {
    const result = await db.select().from(musicianTypes).orderBy(musicianTypes.title);
    return result;
  }
  
  async getMusicianType(id: number): Promise<MusicianType | undefined> {
    const result = await db.select().from(musicianTypes).where(eq(musicianTypes.id, id)).limit(1);
    return result[0];
  }
  
  async getVenueCategories(): Promise<VenueCategory[]> {
    const result = await db.select().from(venueCategories).orderBy(venueCategories.title);
    return result;
  }
  
  async getEvents(status?: string, start?: Date, end?: Date): Promise<Event[]> {
    let query = db.select().from(events);
    
    if (status) {
      query = query.where(eq(events.status, status));
    }
    
    if (start) {
      query = query.where(gte(events.startDate, start));
    }
    
    if (end) {
      query = query.where(lte(events.endDate, end));
    }
    
    const result = await query.orderBy(desc(events.startDate));
    return result;
  }
  
  async getBookings(eventId?: number): Promise<Booking[]> {
    let query = db.select().from(bookings);
    
    if (eventId) {
      query = query.where(eq(bookings.eventId, eventId));
    }
    
    const result = await query.orderBy(desc(bookings.date));
    return result;
  }
  
  async getPayments(invoiceId?: number): Promise<Payment[]> {
    let query = db.select().from(payments);
    
    if (invoiceId) {
      query = query.where(eq(payments.invoiceId, invoiceId));
    }
    
    const result = await query.orderBy(desc(payments.date));
    return result;
  }
  
  async getUpcomingEvents(limit = 5): Promise<Event[]> {
    const now = new Date();
    const result = await db.select()
      .from(events)
      .where(gte(events.startDate, now))
      .orderBy(events.startDate)
      .limit(limit);
    return result;
  }
  
  async getDashboardMetrics(): Promise<any> {
    // Calculate various metrics for the dashboard
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();
    
    // Get counts for various entities
    const musiciansCount = await db.select({ count: sql`count(*)` })
      .from(musicians);
      
    const activeEventsCount = await db.select({ count: sql`count(*)` })
      .from(events)
      .where(eq(events.status, 'active'));
      
    const pendingInvoicesCount = await db.select({ count: sql`count(*)` })
      .from(monthlyInvoices)
      .where(eq(monthlyInvoices.status, 'pending'));
    
    return {
      musiciansCount: Number(musiciansCount[0].count),
      activeEventsCount: Number(activeEventsCount[0].count),
      pendingInvoicesCount: Number(pendingInvoicesCount[0].count),
      currentMonth,
      currentYear
    };
  }
  
  async getAvailableMusiciansForDate(date: Date, categoryIds?: number[]): Promise<Musician[]> {
    // If categoryIds are provided, delegate to the specialized method
    if (categoryIds && categoryIds.length > 0) {
      return this.getAvailableMusiciansForDateAndCategories(date, categoryIds);
    }
    
    // Otherwise, get all available musicians for the date regardless of category
    const dateStart = new Date(date);
    dateStart.setHours(0, 0, 0, 0);
    
    const dateEnd = new Date(date);
    dateEnd.setHours(23, 59, 59, 999);
    
    // Base query to find all musicians who have availability for this date
    const query = db.select()
      .from(musicians)
      .innerJoin(
        availability,
        and(
          eq(musicians.id, availability.musicianId),
          eq(availability.isAvailable, true),
          gte(availability.date, dateStart),
          lte(availability.date, dateEnd)
        )
      )
      .orderBy(musicians.name);
    
    // Execute query
    const availableMusicians = await query;
    
    // Return just the musician objects
    return availableMusicians.map(({ musicians }) => musicians);
  }
  
  async getAvailableMusiciansForDateAndCategories(date: Date, categoryIds: number[]): Promise<Musician[]> {
    const dateStart = new Date(date);
    dateStart.setHours(0, 0, 0, 0);
    
    const dateEnd = new Date(date);
    dateEnd.setHours(23, 59, 59, 999);
    
    // Base query to find all musicians who have availability for this date
    let query = db.select()
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
    
    // If category filters are provided, add WHERE clause with IN operator
    // This allows selecting musicians that match ANY of the specified categories
    if (categoryIds.length > 0) {
      query = query.where(inArray(musicians.categoryId, categoryIds));
    }
    
    // Execute query and order results
    const availableMusicians = await query.orderBy(musicians.name);
    
    // Return just the musician objects
    // Using a Map to deduplicate musicians (in case they appear multiple times due to multiple availability records)
    const distinctMusicians = new Map<number, Musician>();
    availableMusicians.forEach(({ musicians: musician }) => {
      if (!distinctMusicians.has(musician.id)) {
        distinctMusicians.set(musician.id, musician);
      }
    });
    
    return Array.from(distinctMusicians.values());
  }

  // The remaining methods from IStorage would be implemented here, but I'm 
  // focusing only on the planner-related methods for this implementation

  // Musician Pay Rates Management Methods
  async getMusicianPayRates(): Promise<MusicianPayRate[]> {
    return await db.select().from(musicianPayRates);
  }

  async getMusicianPayRate(id: number): Promise<MusicianPayRate | undefined> {
    const result = await db.select().from(musicianPayRates).where(eq(musicianPayRates.id, id)).limit(1);
    return result[0];
  }

  async getMusicianPayRatesByMusicianId(musicianId: number): Promise<MusicianPayRate[]> {
    return await db.select().from(musicianPayRates).where(eq(musicianPayRates.musicianId, musicianId));
  }

  async createMusicianPayRate(payRate: InsertMusicianPayRate): Promise<MusicianPayRate> {
    const result = await db.insert(musicianPayRates).values(payRate).returning();
    
    // Add an activity log entry
    await this.createActivity({
      type: "pay-rate-created",
      message: `Pay rate added for musician ID ${payRate.musicianId}`,
      userId: 1, // Default to admin for now
      timestamp: new Date(),
      entityId: result[0].id,
      entityType: "musician-pay-rate"
    });
    
    return result[0];
  }

  async updateMusicianPayRate(id: number, data: Partial<InsertMusicianPayRate>): Promise<MusicianPayRate | undefined> {
    const existingPayRate = await this.getMusicianPayRate(id);
    if (!existingPayRate) {
      return undefined;
    }
    
    const result = await db.update(musicianPayRates)
      .set(data)
      .where(eq(musicianPayRates.id, id))
      .returning();
    
    if (result.length === 0) {
      return undefined;
    }
    
    // Add an activity log entry
    await this.createActivity({
      type: "pay-rate-updated",
      message: `Pay rate updated for musician ID ${result[0].musicianId}`,
      userId: 1, // Default to admin for now
      timestamp: new Date(),
      entityId: id,
      entityType: "musician-pay-rate"
    });
    
    return result[0];
  }

  async deleteMusicianPayRate(id: number): Promise<boolean> {
    const payRate = await this.getMusicianPayRate(id);
    if (!payRate) {
      return false;
    }
    
    const result = await db.delete(musicianPayRates)
      .where(eq(musicianPayRates.id, id))
      .returning();
    
    const deleted = result.length > 0;
    
    if (deleted) {
      // Add an activity log entry
      await this.createActivity({
        type: "pay-rate-deleted",
        message: `Pay rate deleted for musician ID ${payRate.musicianId}`,
        userId: 1, // Default to admin for now
        timestamp: new Date(),
        entityId: id,
        entityType: "musician-pay-rate"
      });
    }
    
    return deleted;
  }
}