CREATE TYPE "application_status" AS ENUM('SAVED', 'APPLIED', 'SCREENING', 'INTERVIEW', 'OFFER', 'REJECTED', 'WITHDRAWN');
CREATE TYPE "remote_type" AS ENUM('REMOTE', 'HYBRID', 'ONSITE', 'UNKNOWN');
CREATE TYPE "salary_period" AS ENUM('YEAR', 'MONTH', 'HOUR', 'UNKNOWN');
CREATE TYPE "event_type" AS ENUM('APPLICATION_CREATED', 'STATUS_CHANGED', 'EMAIL_RECEIVED', 'INTERVIEW', 'OFFER', 'REJECTION', 'NOTE_ADDED');
CREATE TYPE "communication_type" AS ENUM('EMAIL', 'NOTE', 'OTHER');
CREATE TYPE "email_classification" AS ENUM('REJECTED', 'INTERVIEW', 'SCREENING', 'OFFER', 'OTHER');

CREATE TABLE "applications" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "owner_id" text,
  "company" text NOT NULL,
  "position" text NOT NULL,
  "location" text,
  "remote_type" "remote_type" DEFAULT 'UNKNOWN' NOT NULL,
  "employment_type" text,
  "salary_min" integer,
  "salary_max" integer,
  "salary_currency" text,
  "salary_period" "salary_period",
  "experience_min" integer,
  "experience_max" integer,
  "description" text DEFAULT '' NOT NULL,
  "application_url" text,
  "source" text,
  "status" "application_status" DEFAULT 'SAVED' NOT NULL,
  "applied_at" timestamp with time zone,
  "last_activity_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "application_skills" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "application_id" uuid NOT NULL REFERENCES "applications"("id") ON DELETE cascade,
  "skill" text NOT NULL
);

CREATE TABLE "application_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "application_id" uuid NOT NULL REFERENCES "applications"("id") ON DELETE cascade,
  "type" "event_type" NOT NULL,
  "description" text NOT NULL,
  "metadata" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "communications" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "application_id" uuid NOT NULL REFERENCES "applications"("id") ON DELETE cascade,
  "type" "communication_type" DEFAULT 'EMAIL' NOT NULL,
  "content" text NOT NULL,
  "ai_classification" "email_classification",
  "ai_confidence" integer,
  "ai_summary" text,
  "ai_reasoning" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX "applications_status_idx" ON "applications" ("status");
CREATE INDEX "applications_applied_at_idx" ON "applications" ("applied_at");
CREATE INDEX "applications_last_activity_at_idx" ON "applications" ("last_activity_at");
CREATE INDEX "applications_company_idx" ON "applications" ("company");
CREATE INDEX "applications_position_idx" ON "applications" ("position");
CREATE INDEX "applications_location_idx" ON "applications" ("location");
CREATE INDEX "applications_source_idx" ON "applications" ("source");
CREATE INDEX "applications_remote_type_idx" ON "applications" ("remote_type");
CREATE INDEX "applications_owner_id_idx" ON "applications" ("owner_id");
CREATE INDEX "applications_created_at_idx" ON "applications" ("created_at");
CREATE INDEX "application_skills_application_id_idx" ON "application_skills" ("application_id");
CREATE INDEX "application_skills_skill_idx" ON "application_skills" ("skill");
CREATE UNIQUE INDEX "application_skills_unique_idx" ON "application_skills" ("application_id", "skill");
CREATE INDEX "application_events_application_id_idx" ON "application_events" ("application_id");
CREATE INDEX "application_events_created_at_idx" ON "application_events" ("created_at");
CREATE INDEX "application_events_type_idx" ON "application_events" ("type");
CREATE INDEX "communications_application_id_idx" ON "communications" ("application_id");
CREATE INDEX "communications_created_at_idx" ON "communications" ("created_at");
