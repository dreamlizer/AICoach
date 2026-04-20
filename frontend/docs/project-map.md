# Project Map

This document is a working map for the active application under `frontend`.

## Active App Boundary

- Active app root: `frontend`
- Framework: `Next.js 14` with App Router
- Local persistence: `better-sqlite3`
- Core interaction style: chat + tool workbenches + assessments

## Main Runtime Areas

### UI entry

- `app/page.tsx`
  - Current top-level client entry
  - Owns homepage mode switching and a large amount of UI state

### API layer

- `app/api/**`
  - Chat
  - Auth
  - History
  - Assessment
  - Dictionary
  - OCR
  - Admin

### UI components

- `app/components/**`
  - Chat shell and shared UI
  - Heavy feature components such as map, OCR, assessments
  - Several files are already large enough to be refactor candidates

### Context and hooks

- `context/**`
  - Auth
  - Language
  - Preferences
- `hooks/**`
  - `useChat`
  - `useHistory`
  - `useMagicWord`

### Service and domain logic

- `lib/chat_service.ts`
  - Main chat orchestration
  - Streaming response flow
  - Message persistence and stats updates
- `lib/db.ts`
  - SQLite bootstrap
  - Schema creation
  - Migration logic
  - Conversation, auth, analytics, dictionary, assessment access
- `lib/stats_db.ts`
  - Stats aggregation helpers
- `lib/pipeline.ts`
  - AI call pipeline
- `lib/stage_settings.ts`
  - Model/provider configuration

### Data and scripts

- `data/**`
  - Imported dictionaries and example datasets
- `scripts/**`
  - Import utilities
  - Backup utility
  - World map sync scripts

## Current Structural Pain Points

1. `app/page.tsx` is acting as a large feature switchboard instead of a thin page shell.
2. `lib/db.ts` mixes schema, migration, and multiple domains in one file.
3. `lib/chat_service.ts` mixes request handling, orchestration, persistence, streaming, and debug assembly.
4. Several feature components are large enough to slow safe iteration.
5. Runtime data and generated artifacts were previously mixed into version control.

## Suggested Refactor Order

1. Keep repository and runtime artifacts separated
2. Split `lib/db.ts` by domain
3. Split `lib/chat_service.ts` by responsibility
4. Reduce `app/page.tsx` to a page shell plus feature coordinators
5. Break heavy feature components into container, view, and hook layers
6. Add minimal regression coverage for the core flows

## First Split Targets

### Database layer

- `lib/db.ts` -> consider:
  - `lib/server/db/core.ts`
  - `lib/server/db/auth.ts`
  - `lib/server/db/conversations.ts`
  - `lib/server/db/assessments.ts`
  - `lib/server/db/dictionary.ts`
  - `lib/server/db/analytics.ts`

### Chat layer

- `lib/chat_service.ts` -> consider:
  - request validation
  - identity/rate-limit resolution
  - chat pipeline orchestration
  - SSE response writer
  - persistence/statistics side effects

### Page layer

- `app/page.tsx` -> consider:
  - home shell
  - conversation lab coordinator
  - feature hub coordinator
  - assessment coordinator

## Notes

- Root-level folders outside `frontend` are currently treated as external references and are intentionally out of scope for cleanup unless explicitly requested.
