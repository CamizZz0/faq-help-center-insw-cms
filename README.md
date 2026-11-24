# CMS Pusat Bantuan INSW + Server API

Aplikasi pengelolaan konten Help Center (kategori, subkategori, topik, FAQ, panduan, tutorial), dashboard feedback, dan **server API** yang melayani CMS maupun Help Center publik
(repository tampilan publik: https://github.com/CamizZz0/help-center-insw).

```
client/   CMS (React + Vite + Tailwind + TipTap)
server/   API (Express 5 + Drizzle ORM + PostgreSQL), unggah ke Supabase Storage
```

## Prasyarat
Docker + Docker Compose (atau Node.js 24 + PostgreSQL 16), proyek **Supabase** (alamat + secret key) dengan bucket `guides` dan `help-center-icons`.

## Menjalankan (Docker)
```bash
cp .env.docker.example .env
# edit .env: POSTGRES_PASSWORD, SUPABASE_URL, SUPABASE_SECRET_KEY, VITE_API_BASE_URL
docker compose up -d --build
```
> **Perhatian (CORS):** `compose.yaml` belum meneruskan `CLIENT_URL` dan `CLIENT_URL_CMS` ke layanan `api`. Tambahkan pada `api.environment`, mis.
> `CLIENT_URL: ${CLIENT_URL:-http://localhost:5173}` dan `CLIENT_URL_CMS: ${CLIENT_URL_CMS:-http://localhost:5174}`.

Layanan: `postgres` (5433), `db-init` (`npm run db:push`), `api` (5001), `cms` (5174).
Periksa: `http://localhost:5001/api/health` dan `/api/health/storage`.

## Mengisi data awal (dari folder `server`, atau `docker compose exec api ...`)
```bash
npm run db:seed        # kategori/subkategori/topik awal
npm run import:faqs    # impor FAQ dari server/src/data/import (idempoten)
npm run seed:popular   # tandai FAQ populer awal
npm run seed:resources # contoh panduan & tutorial
# HANYA DEMO, jangan di produksi:
npm run seed:demo-visibility
```
Bucket ikon dapat dibuat dengan `node src/scripts/ensureIconsBucket.js`.

## Menjalankan tanpa Docker
```bash
cd server && cp .env.example .env && npm install && npm run db:push && npm run dev
cd client && cp .env.example .env && npm install && npm run dev
```

## Pengujian
`npm test` belum diisi. Jalankan dari `server`:
```bash
node --test tests/*.test.js     # butuh DATABASE_URL (PostgreSQL berisi data seed) dan Supabase
```
Hasil uji 20 Nov 2026: 58 lulus, 25 gagal (21 karena tanpa Supabase, 2 header 429, 2 tes usang). Lihat dokumen *Rencana dan Laporan Pengujian*.

## Variabel lingkungan
| Variabel | Fungsi |
|---|---|
| `DATABASE_URL` | Koneksi PostgreSQL |
| `PORT` | Port API (5001) |
| `CLIENT_URL`, `CLIENT_URL_CMS`, `CLIENT_URLS` | Asal yang diizinkan CORS |
| `SUPABASE_URL`, `SUPABASE_SECRET_KEY` | Akses Supabase (rahasia) |
| `SUPABASE_GUIDES_BUCKET`, `SUPABASE_ICONS_BUCKET` | Nama bucket |
| `VITE_API_BASE_URL` (client) | Alamat API untuk CMS (ditanam saat build) |
