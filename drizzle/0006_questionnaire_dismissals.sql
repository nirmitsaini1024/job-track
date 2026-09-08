CREATE TABLE IF NOT EXISTS "user_questionnaire_dismissals" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "question_id" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_questionnaire_dismissals" ADD CONSTRAINT "user_questionnaire_dismissals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_questionnaire_dismissals" ADD CONSTRAINT "user_questionnaire_dismissals_question_id_questionnaire_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questionnaire_questions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "user_questionnaire_dismissals_user_question_idx" ON "user_questionnaire_dismissals" USING btree ("user_id","question_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_questionnaire_dismissals_user_id_idx" ON "user_questionnaire_dismissals" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_questionnaire_dismissals_question_id_idx" ON "user_questionnaire_dismissals" USING btree ("question_id");
