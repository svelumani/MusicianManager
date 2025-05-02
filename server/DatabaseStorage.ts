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
    if (categoryIds.length > 0) {
      query = query.where(inArray(musicians.categoryId, categoryIds));
    }
    
    // Execute query and order results
    const availableMusicians = await query.orderBy(musicians.name);
    
    // Return just the musician objects
    return availableMusicians.map(({ musicians }) => musicians);
  }

  // The remaining methods from IStorage would be implemented here, but I'm 
  // focusing only on the planner-related methods for this implementation
}