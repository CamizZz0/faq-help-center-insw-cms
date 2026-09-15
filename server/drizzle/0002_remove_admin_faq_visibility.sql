-- Admin visibility lama dipetakan ke pengguna login agar konten tidak
-- mendadak menjadi publik setelah role admin dihapus.
UPDATE "faqs"
SET "visibility" = 'authenticated'
WHERE "visibility" = 'admin';
