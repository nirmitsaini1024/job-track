-- Add per-application AI question/answer drafts sourced from the user profile.
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "question_answers" jsonb DEFAULT '[]'::jsonb NOT NULL;
