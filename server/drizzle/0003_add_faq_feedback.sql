CREATE TABLE IF NOT EXISTS "faq_feedback" (
    "id" serial PRIMARY KEY NOT NULL,
    "faq_id" integer NOT NULL REFERENCES "faqs"("id") ON DELETE CASCADE,
    "is_helpful" boolean NOT NULL,
    "reason" text,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "faq_feedback_faq_id_idx" ON "faq_feedback" ("faq_id");
CREATE INDEX IF NOT EXISTS "faq_feedback_created_at_idx" ON "faq_feedback" ("created_at");
