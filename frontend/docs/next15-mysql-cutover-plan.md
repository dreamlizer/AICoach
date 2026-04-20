# Next 15 + MySQL Cutover Plan

## Goal
- Move runtime database from SQLite to MySQL with rollback safety.
- Upgrade framework baseline to Next 15 in a controlled way.

## Current State
- Data migration script exists: `scripts/migrate-sqlite-to-mysql.mjs`.
- Runtime DB access is still SQLite-only (`lib/server/db/core.ts`).
- `package.json` has been bumped to:
  - `next: ^15.0.0`
  - `eslint-config-next: ^15.0.0`

## Phase 1: MySQL First (No Framework Risk)
1. Backup SQLite:
   - `node scripts/backup-sqlite.mjs --source ./sqlite.db --target ./backups/sqlite-backup.db`
2. Migrate data to MySQL:
   - `node scripts/migrate-sqlite-to-mysql.mjs --sqlite ./sqlite.db --mysql-url "mysql://.../ai_coach" --truncate`
3. Add runtime DB switch (feature flag):
   - `DB_DRIVER=sqlite|mysql` (default `sqlite`)
   - Keep SQLite path as rollback.
4. Add smoke checks:
   - Auth login/register
   - Conversation create/read
   - Feature order save/load
   - Winlinez + Pikachu score APIs
   - Assessment history read/write
5. Canary release:
   - 5%-10% traffic (or internal users first)
   - Observe 24h error rate before full cutover.

## Phase 2: Next 15 Upgrade
1. Install and lock dependencies:
   - `npm install`
2. Run checks:
   - `npm run lint`
   - `npm run build`
3. Validate high-risk paths:
   - SSR/Route Handlers
   - Middleware/auth flow
   - Streaming chat API
   - Dynamic imports and iframes (map/game modules)
4. Deploy canary and monitor:
   - Error rate
   - TTFB/LCP on home page
   - API latency (`/api/chat`, `/api/dictionary/*`, `/api/auth/*`)

## Rollback
- Keep last stable image with Next 14 + SQLite path.
- Rollback order:
  1. Switch traffic back.
  2. Set `DB_DRIVER=sqlite`.
  3. Redeploy stable tag.

## Notes on Next 15
- Not mandatory immediately if current version is stable and secure.
- Recommended within your next 1-2 release cycles to avoid long-term maintenance lag.
