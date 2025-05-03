-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TABLE "activities" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" integer NOT NULL,
	"timestamp" timestamp NOT NULL,
	"details" jsonb
);
--> statement-breakpoint
CREATE TABLE "availability" (
	"id" serial PRIMARY KEY NOT NULL,
	"musician_id" integer NOT NULL,
	"date" timestamp NOT NULL,
	"is_available" boolean DEFAULT false NOT NULL,
	"month" text NOT NULL,
	"year" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" integer NOT NULL,
	"musician_id" integer NOT NULL,
	"invitation_id" integer NOT NULL,
	"contract_sent" boolean DEFAULT false,
	"contract_sent_at" timestamp,
	"contract_signed" boolean DEFAULT false,
	"contract_signed_at" timestamp,
	"payment_amount" double precision,
	"payment_status" text DEFAULT 'pending',
	"advance_payment" double precision,
	"advance_paid_at" timestamp,
	"final_payment" double precision,
	"final_paid_at" timestamp,
	"contract_details" jsonb,
	"notes" text,
	"date" timestamp
);
--> statement-breakpoint
CREATE TABLE "musician_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text
);
--> statement-breakpoint
CREATE TABLE "collections" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" integer NOT NULL,
	"amount" double precision NOT NULL,
	"date" timestamp NOT NULL,
	"method" text,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "contract_links" (
	"id" serial PRIMARY KEY NOT NULL,
	"booking_id" integer NOT NULL,
	"event_id" integer NOT NULL,
	"musician_id" integer NOT NULL,
	"invitation_id" integer NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"responded_at" timestamp,
	"response" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"amount" double precision,
	"event_date" timestamp,
	"company_signature" text,
	"musician_signature" text,
	CONSTRAINT "contract_links_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "contract_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"content" text NOT NULL,
	"is_default" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	"created_by" integer,
	"variables" jsonb
);
--> statement-breakpoint
CREATE TABLE "email_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"subject" text NOT NULL,
	"html_content" text NOT NULL,
	"text_content" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	"is_default" boolean DEFAULT false NOT NULL,
	CONSTRAINT "email_templates_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "event_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" integer NOT NULL,
	"description" text NOT NULL,
	"amount" double precision NOT NULL,
	"date" timestamp NOT NULL,
	"category" text,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "improvement_plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"musician_id" integer NOT NULL,
	"plan_id" integer NOT NULL,
	"action" text NOT NULL,
	"added_at" timestamp DEFAULT now() NOT NULL,
	"due_date" timestamp,
	"status" text DEFAULT 'pending' NOT NULL,
	"completed_at" timestamp,
	"feedback" text
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"pax_count" integer NOT NULL,
	"venue_id" integer NOT NULL,
	"event_type" text NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp,
	"event_dates" timestamp[],
	"status" text DEFAULT 'pending' NOT NULL,
	"category_ids" integer[],
	"musician_type_id" integer,
	"total_payment" double precision,
	"advance_payment" double precision,
	"second_payment" double precision,
	"notes" text,
	"musician_category_ids" integer[] DEFAULT '{}'
);
--> statement-breakpoint
CREATE TABLE "invitations" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" integer NOT NULL,
	"musician_id" integer NOT NULL,
	"invited_at" timestamp NOT NULL,
	"responded_at" timestamp,
	"status" text DEFAULT 'invited' NOT NULL,
	"response_message" text,
	"email" text NOT NULL,
	"message_subject" text NOT NULL,
	"message_body" text NOT NULL,
	"reminders" integer DEFAULT 0,
	"last_reminder_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "monthly_invoices" (
	"id" serial PRIMARY KEY NOT NULL,
	"planner_id" integer NOT NULL,
	"musician_id" integer NOT NULL,
	"month" integer NOT NULL,
	"year" integer NOT NULL,
	"total_slots" integer DEFAULT 0 NOT NULL,
	"attended_slots" integer DEFAULT 0 NOT NULL,
	"total_amount" double precision DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"generated_at" timestamp DEFAULT now() NOT NULL,
	"paid_at" timestamp,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "monthly_planners" (
	"id" serial PRIMARY KEY NOT NULL,
	"month" integer NOT NULL,
	"year" integer NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "musician_pay_rates" (
	"id" serial PRIMARY KEY NOT NULL,
	"musician_id" integer NOT NULL,
	"event_category_id" integer NOT NULL,
	"hourly_rate" double precision,
	"day_rate" double precision,
	"event_rate" double precision,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "musician_skills" (
	"id" serial PRIMARY KEY NOT NULL,
	"musician_id" integer NOT NULL,
	"skill_id" integer NOT NULL,
	"level" integer,
	"added_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "musician_types" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"booking_id" integer NOT NULL,
	"amount" double precision NOT NULL,
	"date" timestamp NOT NULL,
	"method" text,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "performance_ratings" (
	"id" serial PRIMARY KEY NOT NULL,
	"musician_id" integer NOT NULL,
	"booking_id" integer,
	"rating" integer NOT NULL,
	"feedback" text,
	"rated_by" integer NOT NULL,
	"rated_at" timestamp DEFAULT now() NOT NULL,
	"category" text
);
--> statement-breakpoint
CREATE TABLE "musicians" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text NOT NULL,
	"type_id" integer NOT NULL,
	"category_id" integer NOT NULL,
	"instruments" text[],
	"profile_image" text,
	"bio" text,
	"rating" double precision,
	"category_ids" integer[] DEFAULT '{}'
);
--> statement-breakpoint
CREATE TABLE "planner_assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"slot_id" integer NOT NULL,
	"musician_id" integer NOT NULL,
	"assigned_at" timestamp DEFAULT now() NOT NULL,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"attendance_marked_at" timestamp,
	"attendance_marked_by" integer,
	"notes" text,
	"actual_fee" double precision
);
--> statement-breakpoint
CREATE TABLE "planner_slots" (
	"id" serial PRIMARY KEY NOT NULL,
	"planner_id" integer NOT NULL,
	"date" timestamp NOT NULL,
	"venue_id" integer NOT NULL,
	"category_ids" integer[],
	"start_time" text NOT NULL,
	"end_time" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'open' NOT NULL,
	"fee" double precision
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"data" jsonb NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "settings_type_unique" UNIQUE("type")
);
--> statement-breakpoint
CREATE TABLE "share_links" (
	"id" serial PRIMARY KEY NOT NULL,
	"token" text NOT NULL,
	"musician_id" integer NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "share_links_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "skill_tags" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	CONSTRAINT "skill_tags_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"role" text DEFAULT 'admin' NOT NULL,
	"profile_image" text,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "venue_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text
);
--> statement-breakpoint
CREATE TABLE "venues" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"location" text NOT NULL,
	"pax_count" integer NOT NULL,
	"address" text NOT NULL,
	"venue_pictures" text[],
	"opening_hours" text,
	"capacity" integer,
	"hourly_rate" double precision,
	"description" text,
	"rating" double precision
);
--> statement-breakpoint
CREATE TABLE "session" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" json NOT NULL,
	"expire" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "availability_share_links" (
	"id" serial PRIMARY KEY NOT NULL,
	"musician_id" integer NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"last_accessed_at" timestamp,
	CONSTRAINT "availability_share_links_token_key" UNIQUE("token")
);
--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "session" USING btree ("expire" timestamp_ops);
*/