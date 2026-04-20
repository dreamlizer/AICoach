# Dictionary Architecture (2026 Refresh)

## Goals

- Stable cloud behavior: local and cloud should return consistent results.
- Source traceability: every imported dataset must be visible in DB metadata.
- Multi-stage fallback: no more common words with empty example area.

## Runtime Query Path

1. API `GET /api/dictionary/lookup`
2. Ensure local dictionary DB availability (bootstrap/hydrate when needed)
3. Query by language:
   - Chinese query -> `dictionary_zh_entries` first
   - English query -> `dictionary_entries` first
4. Example resolution order:
   - `dictionary_examples` exact word
   - related phrase-like entries from `dictionary_entries`
   - definition-based synthesized examples
5. If local data is not usable for this query type, use online fallback.

## DB Tables

- `dictionary_entries`: English-led entries
- `dictionary_zh_entries`: Chinese-led entries
- `dictionary_examples`: sentence examples
- `dictionary_sources`: source registry
  - `source_name` / `kind` / `version` / `imported_at` / `entry_count` / `note`

## Import Pipeline

- `npm run import:ecdict`
- `npm run import:cedict`
- `npm run import:examples`
- `npm run import:wiktionary` (new, JSONL input)

Each importer upserts `dictionary_sources` to record provenance.

## Artifact Build

- `npm run build:dictionary-artifact`

The artifact now includes `dictionary_sources` so cloud diagnostics can inspect source quality quickly.

## Health Endpoint

- `GET /api/dictionary/health`

Returns:
- active db path
- counts for english/chinese/examples
- latest source registry rows

## Runtime Profile Isolation

- `DICTIONARY_RUNTIME_PROFILE=local` (default)
  - Prefer local offline dictionary behavior.
  - Keep `DICTIONARY_ENABLE_ONLINE_FALLBACK=0`.
  - Keep `DICTIONARY_ENABLE_RUNTIME_BOOTSTRAP=0`.
  - Keep `DICTIONARY_ENABLE_REMOTE_HYDRATION=0`.

- `DICTIONARY_RUNTIME_PROFILE=cloud`
  - Use a fixed dictionary artifact file path for deployment.
  - Optionally allow remote hydration with `DICTIONARY_ENABLE_REMOTE_HYDRATION=1` and `DICTIONARY_DB_URL`.
  - Keep other runtime mutations disabled unless explicitly required.

## Release SOP

- For release/rollback/weekly update operations, use:
  - `docs/dictionary-release-ops.md`
