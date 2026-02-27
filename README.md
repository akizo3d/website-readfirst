# ReaderFirst

ReaderFirst is a minimalist reading-first web app that converts uploaded PDF and DOCX files into semantic, book-like HTML focused on comfort, legibility, and accessibility. The interaction model is intentionally simple: **Upload → Conversion → Reading Controls → pt-BR Translation → Print A4**.

## Architecture (short)

ReaderFirst is built with **Vite + React + TypeScript** and processes files mostly in the browser for privacy and speed. DOCX is converted with `mammoth`, PDF text is extracted with `pdfjs-dist`, and resulting HTML is sanitized with `DOMPurify` before rendering.

The reading system is centered around semantic HTML + typographic controls persisted locally. Translation uses a configurable provider (`OpenAI` or `DeepL`) via `.env`, with chunk-based processing, retry/backoff, IndexedDB cache (`idb`), and glossary-protected terminology to maintain consistency in 3D design vocabulary.

## Stack

- React + TypeScript + Vite
- `pdfjs-dist` for PDF text extraction
- `mammoth` for DOCX → HTML conversion
- `dompurify` for XSS-safe rendering
- `idb` for translation cache (IndexedDB)
- localStorage for reading preferences

## Folder structure

```txt
.
├─ .env.example
├─ index.html
├─ package.json
├─ src/
│  ├─ App.tsx
│  ├─ main.tsx
│  ├─ styles.css
│  └─ lib/
│     ├─ parser.ts
│     ├─ storage.ts
│     ├─ translation.ts
│     └─ types.ts
├─ tsconfig.app.json
├─ tsconfig.json
├─ tsconfig.node.json
└─ vite.config.ts
```

## Install and run

```bash
npm install
cp .env.example .env
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Translation configuration

Set environment variables in `.env`:

- `VITE_TRANSLATION_PROVIDER=openai` or `deepl`
- `VITE_TRANSLATION_API_KEY=...`
- `VITE_OPENAI_MODEL=gpt-4o-mini` (optional)

### Privacy disclosure behavior

The app sends **only chunk text content** required for translation. File binary metadata is not sent by the translator layer. Users can skip translation and continue fully local reading.

## Features implemented

- PDF + DOCX upload (drag-and-drop + file picker)
- Semantic rendering with headings, paragraphs, lists, blockquotes, links, images/tables when present from source conversion
- Auto-generated TOC with heading anchors
- Dark theme by default; light + sepia themes
- Reading controls (font size, line height, width measure, paragraph spacing, horizontal/vertical padding, letter spacing)
- Preferences persisted locally
- Translation toggle (Original / pt-BR)
- Glossary/protected terms (topology, retopology, edge loop, UV, rig, skinning, normal map, PBR)
- Translation chunking + progress + retry/backoff + local cache
- In-document search with highlights
- Reading progress bar
- A4 print stylesheet with cleaner page breaks and hidden UI
- Distraction-free mode (top bar auto-hide on scroll)

## Accessibility and performance notes

- Semantic heading hierarchy and landmark usage (`header`, `nav`, `main`, `article`)
- Strong focus styles for keyboard users (`:focus-visible`)
- High-contrast dark theme default
- Local-first parsing to reduce latency and protect user privacy
- Cached translations to reduce repeated API calls

## PDF limitations (important)

`pdfjs-dist` extracts text layers from digital PDFs. **Scanned PDFs** (image-only pages) may produce no text. In this case, ReaderFirst shows a message informing the user that OCR is required before import. This is expected behavior and not an app crash.

## Acceptance checklist

- [x] PDF and DOCX upload works (drag/drop and picker)
- [x] TOC generation and anchor navigation works
- [x] Dark mode default and reading controls persist locally
- [x] pt-BR translation works with toggle and glossary protection
- [x] Print A4 produces clean content-only output
- [x] Performance and accessibility are designed for strong Lighthouse outcomes (target 90+)

## Out of scope (intentionally)

- Authentication/accounts
- Social features/feed
- Heavy animation or dashboard-style UI


## Data schema migration note

ReaderFirst saved items now also persist `enhancedHtml`, `enhancedHeadings`, `flashcards`, and `quiz` fields in IndexedDB for each reading. Older records remain readable and will be upgraded lazily when reopened and saved again.
