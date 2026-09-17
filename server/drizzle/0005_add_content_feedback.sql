CREATE TABLE IF NOT EXISTS "content_feedback" (
  "id" serial PRIMARY KEY NOT NULL,
  "content_type" varchar(20) NOT NULL,
  "content_id" integer NOT NULL,
  "is_helpful" boolean NOT NULL,
  "reason" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "content_feedback_type_check" CHECK ("content_type" IN ('faq', 'guide', 'tutorial'))
);

CREATE INDEX IF NOT EXISTS "content_feedback_type_id_idx"
  ON "content_feedback" ("content_type", "content_id");

CREATE INDEX IF NOT EXISTS "content_feedback_created_at_idx"
  ON "content_feedback" ("created_at");

/*
 * Memindahkan feedback FAQ lama dari tabel faq_feedback.
 *
 * Bersifat idempoten: baris yang sudah pernah tersalin tidak dimasukkan lagi,
 * jadi migrasi ini aman dijalankan berulang.
 *
 * Tabel faq_feedback sendiri sengaja tidak dihapus agar data lama tetap utuh.
 */
INSERT INTO "content_feedback" ("content_type", "content_id", "is_helpful", "reason", "created_at")
SELECT 'faq', f."faq_id", f."is_helpful", f."reason", f."created_at"
FROM "faq_feedback" f
WHERE NOT EXISTS (
  SELECT 1
  FROM "content_feedback" cf
  WHERE cf."content_type" = 'faq'
    AND cf."content_id" = f."faq_id"
    AND cf."is_helpful" = f."is_helpful"
    AND cf."created_at" = f."created_at"
);
