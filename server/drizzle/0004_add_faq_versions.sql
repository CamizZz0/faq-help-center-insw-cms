CREATE TABLE IF NOT EXISTS "faq_versions" (
  "id" serial PRIMARY KEY NOT NULL,
  "faq_id" integer NOT NULL REFERENCES "faqs"("id") ON DELETE CASCADE,
  "question" text NOT NULL,
  "answer" text NOT NULL,
  "change_summary" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
