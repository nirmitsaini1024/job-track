-- Persist screenshots uploaded to ImageKit
CREATE TABLE IF NOT EXISTS "application_attachments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "application_id" uuid NOT NULL,
  "url" text NOT NULL,
  "file_id" text NOT NULL,
  "name" text NOT NULL,
  "mime_type" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "application_attachments" ADD CONSTRAINT "application_attachments_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "application_attachments_application_id_idx" ON "application_attachments" USING btree ("application_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "application_attachments_created_at_idx" ON "application_attachments" USING btree ("created_at");
