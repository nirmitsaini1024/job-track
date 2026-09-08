-- Persist Analyse ghost marks
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "ghosted" boolean DEFAULT false NOT NULL;
