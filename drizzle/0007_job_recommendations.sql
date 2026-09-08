DO $$ BEGIN
  CREATE TYPE "public"."recommendation_status" AS ENUM('PENDING', 'DISMISSED', 'CONVERTED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "job_recommendations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "from_user_id" uuid NOT NULL,
  "to_user_id" uuid NOT NULL,
  "source_application_id" uuid,
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
  "application_url" text NOT NULL,
  "source" text,
  "skills" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "status" "recommendation_status" DEFAULT 'PENDING' NOT NULL,
  "converted_application_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "job_recommendations" ADD CONSTRAINT "job_recommendations_from_user_id_users_id_fk" FOREIGN KEY ("from_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "job_recommendations" ADD CONSTRAINT "job_recommendations_to_user_id_users_id_fk" FOREIGN KEY ("to_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "job_recommendations" ADD CONSTRAINT "job_recommendations_source_application_id_applications_id_fk" FOREIGN KEY ("source_application_id") REFERENCES "public"."applications"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "job_recommendations" ADD CONSTRAINT "job_recommendations_converted_application_id_applications_id_fk" FOREIGN KEY ("converted_application_id") REFERENCES "public"."applications"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "job_recommendations_to_user_id_idx" ON "job_recommendations" USING btree ("to_user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "job_recommendations_from_user_id_idx" ON "job_recommendations" USING btree ("from_user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "job_recommendations_status_idx" ON "job_recommendations" USING btree ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "job_recommendations_to_user_status_idx" ON "job_recommendations" USING btree ("to_user_id","status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "job_recommendations_application_url_idx" ON "job_recommendations" USING btree ("application_url");
