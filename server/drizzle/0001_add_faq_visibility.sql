
ALTER TABLE "faqs" ADD COLUMN IF NOT EXISTS "visibility" varchar(20) NOT NULL DEFAULT 'public';

UPDATE "faqs" SET "visibility" = 'public' WHERE "visibility" IS NULL;