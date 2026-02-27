# ReaderFirst

ReaderFirst is now paginated as a **library with a librarian**:
- **Home** with two product cards: Reader and Markdown Converter.
- **Reader** for PDF/DOCX upload → conversion → reading (raw/enhanced + original/pt-BR).
- **Markdown Converter** as first-class reading flow with the same reading controls, TOC, search, print, and save.

## Tech
- Vite + React + TypeScript
- `pdfjs-dist`, `mammoth`, `dompurify`, `marked`
- IndexedDB (`idb`) for local cache/fallback
- Vercel serverless API routes for secure AI
- Supabase Auth + Postgres metadata + Vercel Blob payload storage

## Routes
- `/` Home
- `/reader` Reader flow
- `/markdown` Markdown converter flow

## Local run
```bash
npm ci
cp .env.example .env
npm run dev
```

## Build
```bash
npm run build
```

## Vercel/server env vars
Set these in Vercel project settings:
- `OPENAI_API_KEY`
- `AI_MODEL`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `BLOB_READ_WRITE_TOKEN`

Client public vars:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Database migration
Run SQL in `db/migrations/001_readings.sql` on Supabase Postgres.

## Cloud persistence model
Metadata in Postgres (`readings` table) + full reading JSON payload in Blob (`blob_url`).

## AI endpoints
- `POST /api/enhance`
- `POST /api/translate`
- `POST /api/vision-caption`
- `POST /api/study`

All keys stay server-side (no `VITE_*` for AI secrets).

## Basic import from old local storage to cloud
1. Login from top auth strip in Reader/Markdown routes.
2. Open each local saved reading and trigger a save operation (rename/open/update) to sync into cloud.
3. Search/library list will then return cloud records across devices.

## Notes
- Guest mode remains available via local IndexedDB fallback.
- Raw/Enhanced and Original/pt-BR are independent view toggles.
- UI language (EN/PT-BR) is independent from document language.
