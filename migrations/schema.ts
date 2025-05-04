import { pgTable, serial, integer, text, timestamp, jsonb, boolean, doublePrecision, unique, index, varchar, json } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const activities = pgTable("activities", {
        id: serial().primaryKey().notNull(),
        userId: integer("user_id"),
        action: text().notNull(),
        entityType: text("entity_type").notNull(),
        entityId: integer("entity_id").notNull(),
        timestamp: timestamp({ mode: 'string' }).notNull(),
        details: jsonb(),
});

export const availability = pgTable("availability", {
        id: serial().primaryKey().notNull(),
        musicianId: integer("musician_id").notNull(),
        date: timestamp({ mode: 'string' }).notNull(),
        isAvailable: boolean("is_available").default(false).notNull(),
        month: text().notNull(),
        year: integer().notNull(),
});

export const bookings = pgTable("bookings", {
        id: serial().primaryKey().notNull(),
        eventId: integer("event_id").notNull(),
        musicianId: integer("musician_id").notNull(),
        invitationId: integer("invitation_id").notNull(),
        contractSent: boolean("contract_sent").default(false),
        contractSentAt: timestamp("contract_sent_at", { mode: 'string' }),
        contractSigned: boolean("contract_signed").default(false),
        contractSignedAt: timestamp("contract_signed_at", { mode: 'string' }),
        paymentAmount: doublePrecision("payment_amount"),
        paymentStatus: text("payment_status").default('pending'),
        advancePayment: doublePrecision("advance_payment"),
        advancePaidAt: timestamp("advance_paid_at", { mode: 'string' }),
        finalPayment: doublePrecision("final_payment"),
        finalPaidAt: timestamp("final_paid_at", { mode: 'string' }),
        contractDetails: jsonb("contract_details"),
        notes: text(),
        date: timestamp({ mode: 'string' }),
});

export const musicianCategories = pgTable("musician_categories", {
        id: serial().primaryKey().notNull(),
        title: text().notNull(),
        description: text(),
});

export const collections = pgTable("collections", {
        id: serial().primaryKey().notNull(),
        eventId: integer("event_id").notNull(),
        amount: doublePrecision().notNull(),
        date: timestamp({ mode: 'string' }).notNull(),
        method: text(),
        notes: text(),
});

export const contractLinks = pgTable("contract_links", {
        id: serial().primaryKey().notNull(),
        bookingId: integer("booking_id").notNull(),
        eventId: integer("event_id").notNull(),
        musicianId: integer("musician_id").notNull(),
        invitationId: integer("invitation_id").notNull(),
        token: text().notNull(),
        expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
        status: text().default('pending').notNull(),
        respondedAt: timestamp("responded_at", { mode: 'string' }),
        response: text(),
        createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
        amount: doublePrecision(),
        eventDate: timestamp("event_date", { mode: 'string' }),
        companySignature: text("company_signature"),
        musicianSignature: text("musician_signature"),
}, (table) => [
        unique("contract_links_token_unique").on(table.token),
]);

export const contractTemplates = pgTable("contract_templates", {
        id: serial().primaryKey().notNull(),
        name: text().notNull(),
        description: text(),
        content: text().notNull(),
        isDefault: boolean("is_default").default(false),
        isMonthly: boolean("is_monthly").default(false), // Flag to indicate if this is a monthly contract template
        createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
        updatedAt: timestamp("updated_at", { mode: 'string' }),
        createdBy: integer("created_by"),
        variables: jsonb(),
});

export const emailTemplates = pgTable("email_templates", {
        id: serial().primaryKey().notNull(),
        name: text().notNull(),
        subject: text().notNull(),
        htmlContent: text("html_content").notNull(),
        textContent: text("text_content").notNull(),
        description: text(),
        createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
        updatedAt: timestamp("updated_at", { mode: 'string' }),
        isDefault: boolean("is_default").default(false).notNull(),
}, (table) => [
        unique("email_templates_name_unique").on(table.name),
]);

export const eventCategories = pgTable("event_categories", {
        id: serial().primaryKey().notNull(),
        title: text().notNull(),
        description: text(),
});

export const expenses = pgTable("expenses", {
        id: serial().primaryKey().notNull(),
        eventId: integer("event_id").notNull(),
        description: text().notNull(),
        amount: doublePrecision().notNull(),
        date: timestamp({ mode: 'string' }).notNull(),
        category: text(),
        notes: text(),
});

export const improvementPlans = pgTable("improvement_plans", {
        id: serial().primaryKey().notNull(),
        musicianId: integer("musician_id").notNull(),
        planId: integer("plan_id").notNull(),
        action: text().notNull(),
        addedAt: timestamp("added_at", { mode: 'string' }).defaultNow().notNull(),
        dueDate: timestamp("due_date", { mode: 'string' }),
        status: text().default('pending').notNull(),
        completedAt: timestamp("completed_at", { mode: 'string' }),
        feedback: text(),
});

export const events = pgTable("events", {
        id: serial().primaryKey().notNull(),
        name: text().notNull(),
        paxCount: integer("pax_count").notNull(),
        venueId: integer("venue_id").notNull(),
        eventType: text("event_type").notNull(),
        startDate: timestamp("start_date", { mode: 'string' }).notNull(),
        endDate: timestamp("end_date", { mode: 'string' }),
        eventDates: timestamp("event_dates", { mode: 'string' }).array(),
        status: text().default('pending').notNull(),
        categoryIds: integer("category_ids").array(),
        musicianTypeId: integer("musician_type_id"),
        totalPayment: doublePrecision("total_payment"),
        advancePayment: doublePrecision("advance_payment"),
        secondPayment: doublePrecision("second_payment"),
        notes: text(),
        musicianCategoryIds: integer("musician_category_ids").array().default([]),
});

export const invitations = pgTable("invitations", {
        id: serial().primaryKey().notNull(),
        eventId: integer("event_id").notNull(),
        musicianId: integer("musician_id").notNull(),
        invitedAt: timestamp("invited_at", { mode: 'string' }).notNull(),
        respondedAt: timestamp("responded_at", { mode: 'string' }),
        status: text().default('invited').notNull(),
        responseMessage: text("response_message"),
        email: text().notNull(),
        messageSubject: text("message_subject").notNull(),
        messageBody: text("message_body").notNull(),
        reminders: integer().default(0),
        lastReminderAt: timestamp("last_reminder_at", { mode: 'string' }),
});

export const monthlyInvoices = pgTable("monthly_invoices", {
        id: serial().primaryKey().notNull(),
        plannerId: integer("planner_id").notNull(),
        musicianId: integer("musician_id").notNull(),
        month: integer().notNull(),
        year: integer().notNull(),
        totalSlots: integer("total_slots").default(0).notNull(),
        attendedSlots: integer("attended_slots").default(0).notNull(),
        totalAmount: doublePrecision("total_amount").default(0).notNull(),
        status: text().default('draft').notNull(),
        generatedAt: timestamp("generated_at", { mode: 'string' }).defaultNow().notNull(),
        paidAt: timestamp("paid_at", { mode: 'string' }),
        notes: text(),
});

export const monthlyPlanners = pgTable("monthly_planners", {
        id: serial().primaryKey().notNull(),
        month: integer().notNull(),
        year: integer().notNull(),
        name: text().notNull(),
        description: text(),
        status: text().default('draft').notNull(),
        createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
        updatedAt: timestamp("updated_at", { mode: 'string' }),
});

export const musicianPayRates = pgTable("musician_pay_rates", {
        id: serial().primaryKey().notNull(),
        musicianId: integer("musician_id").notNull(),
        eventCategoryId: integer("event_category_id").notNull(),
        hourlyRate: doublePrecision("hourly_rate"),
        dayRate: doublePrecision("day_rate"),
        eventRate: doublePrecision("event_rate"),
        notes: text(),
});

export const musicianSkills = pgTable("musician_skills", {
        id: serial().primaryKey().notNull(),
        musicianId: integer("musician_id").notNull(),
        skillId: integer("skill_id").notNull(),
        level: integer(),
        addedAt: timestamp("added_at", { mode: 'string' }).defaultNow().notNull(),
});

export const musicianTypes = pgTable("musician_types", {
        id: serial().primaryKey().notNull(),
        title: text().notNull(),
        description: text(),
});

export const payments = pgTable("payments", {
        id: serial().primaryKey().notNull(),
        bookingId: integer("booking_id").notNull(),
        amount: doublePrecision().notNull(),
        date: timestamp({ mode: 'string' }).notNull(),
        method: text(),
        notes: text(),
});

export const performanceRatings = pgTable("performance_ratings", {
        id: serial().primaryKey().notNull(),
        musicianId: integer("musician_id").notNull(),
        bookingId: integer("booking_id"),
        rating: integer().notNull(),
        feedback: text(),
        ratedBy: integer("rated_by").notNull(),
        ratedAt: timestamp("rated_at", { mode: 'string' }).defaultNow().notNull(),
        category: text(),
});

export const musicians = pgTable("musicians", {
        id: serial().primaryKey().notNull(),
        name: text().notNull(),
        email: text().notNull(),
        phone: text().notNull(),
        typeId: integer("type_id").notNull(),
        categoryId: integer("category_id").notNull(),
        instruments: text().array(),
        profileImage: text("profile_image"),
        bio: text(),
        rating: doublePrecision(),
        categoryIds: integer("category_ids").array().default([]),
});

export const plannerAssignments = pgTable("planner_assignments", {
        id: serial().primaryKey().notNull(),
        slotId: integer("slot_id").notNull(),
        musicianId: integer("musician_id").notNull(),
        assignedAt: timestamp("assigned_at", { mode: 'string' }).defaultNow().notNull(),
        status: text().default('scheduled').notNull(),
        attendanceMarkedAt: timestamp("attendance_marked_at", { mode: 'string' }),
        attendanceMarkedBy: integer("attendance_marked_by"),
        notes: text(),
        actualFee: doublePrecision("actual_fee"),
});

export const plannerSlots = pgTable("planner_slots", {
        id: serial().primaryKey().notNull(),
        plannerId: integer("planner_id").notNull(),
        date: timestamp({ mode: 'string' }).notNull(),
        venueId: integer("venue_id").notNull(),
        categoryIds: integer("category_ids").array(),
        startTime: text("start_time").notNull(),
        endTime: text("end_time").notNull(),
        description: text(),
        status: text().default('open').notNull(),
        fee: doublePrecision(),
});

export const settings = pgTable("settings", {
        id: serial().primaryKey().notNull(),
        type: text().notNull(),
        data: jsonb().notNull(),
        updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
        unique("settings_type_unique").on(table.type),
]);

export const shareLinks = pgTable("share_links", {
        id: serial().primaryKey().notNull(),
        token: text().notNull(),
        musicianId: integer("musician_id").notNull(),
        expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
        createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
        isActive: boolean("is_active").default(true).notNull(),
}, (table) => [
        unique("share_links_token_unique").on(table.token),
]);

export const skillTags = pgTable("skill_tags", {
        id: serial().primaryKey().notNull(),
        name: text().notNull(),
        description: text(),
}, (table) => [
        unique("skill_tags_name_unique").on(table.name),
]);

export const users = pgTable("users", {
        id: serial().primaryKey().notNull(),
        username: text().notNull(),
        password: text().notNull(),
        name: text().notNull(),
        email: text().notNull(),
        role: text().default('admin').notNull(),
        profileImage: text("profile_image"),
}, (table) => [
        unique("users_username_unique").on(table.username),
]);

export const venueCategories = pgTable("venue_categories", {
        id: serial().primaryKey().notNull(),
        title: text().notNull(),
        description: text(),
});

export const venues = pgTable("venues", {
        id: serial().primaryKey().notNull(),
        name: text().notNull(),
        location: text().notNull(),
        paxCount: integer("pax_count").notNull(),
        address: text().notNull(),
        venuePictures: text("venue_pictures").array(),
        openingHours: text("opening_hours"),
        capacity: integer(),
        hourlyRate: doublePrecision("hourly_rate"),
        description: text(),
        rating: doublePrecision(),
});

export const session = pgTable("session", {
        sid: varchar().primaryKey().notNull(),
        sess: json().notNull(),
        expire: timestamp({ precision: 6, mode: 'string' }).notNull(),
}, (table) => [
        index("IDX_session_expire").using("btree", table.expire.asc().nullsLast().op("timestamp_ops")),
]);

export const availabilityShareLinks = pgTable("availability_share_links", {
        id: serial().primaryKey().notNull(),
        musicianId: integer("musician_id").notNull(),
        token: text().notNull(),
        expiresAt: timestamp("expires_at", { mode: 'string' }),
        createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
        lastAccessedAt: timestamp("last_accessed_at", { mode: 'string' }),
}, (table) => [
        unique("availability_share_links_token_key").on(table.token),
]);
