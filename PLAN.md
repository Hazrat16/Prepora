# Govt Job Preparation BD: Project Plan

A local-first preparation platform, starting with the Bangladesh Primary School
Assistant Teacher Recruitment Examination. BCS, Bank, NTRCA and other exams can
be added later.

Status: Stage 1 usable. Plan written 2026-10-31.

## Project rules

1. **Claude is the only paid item.** No paid APIs, hosting, OCR, email, fonts,
   templates, databases or books. If a feature needs a paid service, use a free
   alternative or leave the feature out.
2. **Never fabricate historical data.** That covers questions, answers, years,
   dates, source URLs and statistics.
3. Every historical question stays traceable to its source and keeps its
   verification status: Verified Official, Verified Secondary, Unverified or
   Needs Review.
4. When sources disagree on an answer, flag it for review. Never pick silently.
5. Do not bypass paywalls, access controls or copyright restrictions.
6. Exam marks, duration, negative marking and question counts live in the
   database, not in code. Check them against the latest official circular.
7. Previous-year, model and practice questions stay separate and clearly labelled.
8. All statistics come from real records. No fake numbers anywhere.
9. Correct answers never reach the browser during an active exam.
10. A feature is complete only after it has been tested and works.

## Free stack

| Need | Tool | Replaces |
|---|---|---|
| Framework | Next.js, TypeScript, Tailwind CSS | |
| Components | shadcn/ui, Lucide React | Paid UI kits |
| Database, login, files | Supabase CLI running in Docker | Hosted Supabase plans |
| Email in development | Supabase local test inbox | Paid email services |
| Fonts | Hind Siliguri or Noto Sans Bengali via `next/font` | Paid fonts |
| Charts, forms, tables | Recharts, React Hook Form, Zod, TanStack Table | |
| Excel and CSV import | ExcelJS, Papa Parse | |
| PDF to images | Poppler | Paid PDF APIs |
| OCR | Tesseract with Bangla and English data | Google Vision and similar |
| Subject and topic suggestions | Keyword rules | Paid AI APIs |
| Duplicate detection | PostgreSQL `pg_trgm` | Paid vector services |
| Tests | Vitest, Playwright | |

Lessons, explanations and transcription are written during Claude Code sessions
and saved as files. The app makes no AI API calls and needs no API key, so there
is no in-app AI chat.

## Run locally

Requirements: Node, Docker, Poppler, Tesseract.

```bash
sudo apt install tesseract-ocr tesseract-ocr-ben tesseract-ocr-eng
make dev
```

Open http://localhost:3000. Press Ctrl+C to stop the app and Supabase together.
Your data is kept. `make stop` is only needed if Supabase was left running.

- Unused Supabase services stay off to save memory.
- Progress lives in a Docker volume, so add a one-command backup in Phase 2.
- Keep lessons, questions and the source register in `content/` so they can be
  imported again.
- Installing the PWA on a phone needs HTTPS. Use the optional free deployment
  below for that.

## Optional free online deployment

Only if needed later: Vercel Hobby, the Supabase free tier and a free
`*.vercel.app` address. Check the current free-tier limits first. Supabase free
projects can pause when idle, and scanned PDFs may need to stay local to fit
storage limits. Never upgrade to a paid plan to work around a limit.

## Project structure

```text
src/app/{(public),(app),admin}   pages
src/components                   ui, exam, charts, layout
src/lib                          scoring, spaced repetition, duplicates, Supabase
supabase/migrations              database schema
supabase/seed.sql                seed data
content/                         lessons, questions, source register
scripts/                         OCR and import tools
tests/                           Vitest and Playwright tests
```

## Timeline

Estimates are working days with active daily work. At 2 to 3 hours a day, the
whole project takes about 3 months. Claude usage limits may stretch this.

| Stage | Result | Days |
|---|---|---|
| 1 | Usable study app | 8 to 10 |
| 2 | Complete software | 8 to 12 |
| 3 | Archive, first pass | 7 to 10, then ongoing |
| 4 | Beginner lessons for all 83 topics | 10 to 15 |

Total: 30 to 40 working days, because stages 2 to 4 can overlap.

## Stage 1: Usable study app

### Phase 1: Foundation (1 day)
- [x] Set up Git, Next.js, TypeScript, Tailwind CSS and shadcn/ui
- [x] Build the design system: navy and green, light and dark themes, Bangla fonts
- [ ] Add a Bangla and English interface switch (the interface is Bangla for now)
- [x] Build sidebar, mobile navigation and header
- [x] Build landing page, dashboard layout, and empty and loading states

### Phase 2: Backend (2 days)
- [x] Set up local Supabase and `.env.local.example`
- [x] Add registration, login, logout, password reset and profile
- [x] Write schema migrations for Stage 1 tables (later phases add their own)
- [x] Add Row Level Security and test that users cannot read each other's data
- [x] Add seed data and the backup command

### Phase 3: Learning system (2 days)
- [x] Build subject, topic and lesson pages
- [x] Add Beginner, Intermediate and Advanced levels
- [x] Add progress tracking, unlocking and next-lesson recommendations
- [x] Write 5 complete beginner lessons

### Phase 4: Question bank and practice (2 days)
- [x] Build search, filters, bookmarks and incorrect-question reports
- [x] Build the practice engine with palette, mark for review and saved answers
- [x] Build results with explanations, and save every attempt
- [x] Write 144 labelled practice MCQs with Bangla explanations

### Phase 6: Mock exams (2 days)
- [x] Verify the current exam pattern against official sources
- [x] Build editable exam templates and sections
- [x] Run timer, auto-save, auto-submit and marking on the server
- [x] Build results, subject breakdown, weak topics and exam history

## Stage 2: Complete software

### Phase 5: Archive tools (3 to 4 days)
- [ ] Build the source register and coverage report
- [ ] Build the Previous Year Questions pages and filters
- [ ] Build Previous Year Exam Mode, labelling incomplete papers
- [ ] Build CSV, Excel, JSON and PDF import, plus OCR
- [ ] Build duplicate detection and classification suggestions
- [ ] Build repeated question analysis, separating exact repeats from similar concepts

### Phase 7: Personal learning tools (2 days)
- [ ] Build My Mistakes with retry, resolve and repeat tracking
- [ ] Add spaced repetition at 1, 3, 7 and 14 days, adjusted by performance
- [ ] Build the planner, calendar, daily targets, streaks and editable routine

### Phase 8: Analytics (1 day)
- [ ] Build subject, topic and time-based analytics
- [ ] Add mock history and recommendations from real data
- [ ] Add the readiness indicator, labelled as an estimate

### Phase 9: Admin (2 to 3 days)
- [ ] Add content management for subjects, topics, lessons and questions
- [ ] Build OCR review, verification and publishing
- [ ] Add exam, paper, source and user management
- [ ] Build the collection progress dashboard and audit log

### Phase 10: Finalization (2 days)
- [ ] Add PWA support and improve mobile layouts
- [ ] Check accessibility and performance on slow connections
- [ ] Complete the security review
- [ ] Run the full test suite and fix bugs

## Stage 3: Historical archive

- [ ] Search papers year by year, and record every source and result
- [ ] Mark each year verified, partial, unverified or not found
- [ ] Import only legally accessible material
- [ ] Review OCR, confirm answers and add Bangla explanations
- [ ] Publish reviewed questions and keep the coverage report current

Use free, openly accessible sources only. Do not buy question books or papers.

## Stage 4: Lessons

- [ ] Write Beginner lessons for all 83 topics
- [ ] Label lessons as AI-written until reviewed
- [ ] Check facts carefully, especially General Knowledge
- [ ] Write Intermediate and Advanced lessons after testing the Beginner format

## If a session ends early

Tick off completed items here and add a short note below with the exact next
step, so work continues without rewriting anything.

## Progress notes

- 2026-10-31: Plan created.
- 2026-10-31: Stage 1 built and tested: 10 unit tests and 13 browser tests pass.
  Practice and mock attempts share `attempts` and `attempt_questions` instead of
  the separate tables in the spec, so both use one exam engine. The mock exam
  structure follows press reports of the 2025 Recruitment Rules: 90 written
  marks (25/25/20/20), 90 minutes, 45 to pass. Negative marking is unconfirmed
  and set to 0. Until the admin panel exists, edit `content/mock-exams.json` and
  run `make seed`. `make backup` creates a dump, but restoring one is untested.
  Next step: start Phase 7, or Phase 5 if the exam is close.
