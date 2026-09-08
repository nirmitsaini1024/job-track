ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "questionnaire_context" jsonb DEFAULT '[]'::jsonb NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "questionnaire_questions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "question" text NOT NULL,
  "normalized_key" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "questionnaire_questions_normalized_key_idx" ON "questionnaire_questions" ("normalized_key");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "questionnaire_questions_created_at_idx" ON "questionnaire_questions" ("created_at");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_questionnaire_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "question_id" uuid NOT NULL REFERENCES "questionnaire_questions"("id") ON DELETE cascade,
  "answer" text DEFAULT '' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "user_questionnaire_items_user_question_idx" ON "user_questionnaire_items" ("user_id", "question_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_questionnaire_items_user_id_idx" ON "user_questionnaire_items" ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_questionnaire_items_question_id_idx" ON "user_questionnaire_items" ("question_id");
