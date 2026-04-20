# Dictionary Release Ops

## 1. Pre-Release Checklist

1. Confirm runtime profile:
   - Local validation: `DICTIONARY_RUNTIME_PROFILE=local`
   - Cloud deploy target: `DICTIONARY_RUNTIME_PROFILE=cloud`
2. Confirm dictionary DB isolation:
   - Dictionary DB path must not point to user DB.
   - `SQLITE_DICTIONARY_DB_PATH` or profile default must resolve to dictionary-only file.
3. Run strict health gate:
   - `GET /api/dictionary/health?strict=1`
   - Must return HTTP 200.
4. Check health payload:
   - `ready` must be `true`
   - `issues` must be empty
   - `counts.englishCount >= 100000`
   - `counts.chineseCount >= 20000`
   - `counts.exampleCount >= 5000`
5. Spot-check query directions:
   - `GET /api/dictionary/lookup?q=promise&direction=en2zh`
   - `GET /api/dictionary/lookup?q=承诺&direction=zh2en`
   - `GET /api/dictionary/suggest?q=pro&direction=en2zh`
6. Spot-check explain diagnostics:
   - `GET /api/dictionary/explain?q=promise&direction=en2zh`
   - `result.hasEntry` should be true for common words.
7. Build verification:
   - Run `npm run build` in `frontend`.

## 2. Release Checklist

1. Lock runtime mutation switches to stable defaults:
   - `DICTIONARY_ENABLE_RUNTIME_BOOTSTRAP=0`
   - `DICTIONARY_ENABLE_ONLINE_FALLBACK=0`
   - `DICTIONARY_ENABLE_REMOTE_HYDRATION=0` (or `1` only if explicitly required)
2. Deploy fixed dictionary artifact with app version.
3. After deploy, run:
   - `GET /api/dictionary/health`
   - `GET /api/dictionary/health?strict=1`
4. Run live sanity queries:
   - high-frequency EN word
   - high-frequency ZH word
   - one phrase query
5. Record final DB path and counts from health payload.

## 3. Rollback Checklist

1. Trigger rollback when any of these happen:
   - `health?strict=1` returns 503
   - Common words miss repeatedly
   - p95 lookup latency exceeds accepted threshold
2. Rollback order:
   - App version rollback first
   - Dictionary artifact rollback second
   - Keep user DB untouched
3. Post-rollback validation:
   - `GET /api/dictionary/health?strict=1` returns 200
   - spot-check `lookup` and `suggest` for EN/ZH both directions
4. Incident note template:
   - bad artifact version
   - bad app version
   - trigger signal
   - rollback timestamp
   - validation evidence

## 4. Weekly Incremental Update Workflow

1. Prepare source updates:
   - English: ECDICT/Wiktionary snapshot
   - Chinese: CC-CEDICT snapshot
   - Examples: sentence corpus delta
2. Import to isolated build workspace DB.
3. Rebuild dictionary artifact.
4. Run gate checks:
   - `health?strict=1`
   - 20-word fixed smoke list (EN/ZH/morphology/phrases)
   - compare key counts with previous release
5. Only publish artifact if all gates pass.
6. Keep at least one previous artifact for fast rollback.

## 5. Recommended Fixed Smoke List

- EN words: `promise`, `utility`, `commit`, `develop`, `analysis`
- Morphology: `promised`, `committing`, `utilities`
- ZH words: `承诺`, `工具`, `人民`, `效率`
- Phrases: `keep in mind`, `as soon as`

## 6. Operational Rules

1. Never run runtime bootstrap in production by default.
2. Never overwrite user DB during dictionary release.
3. Never release without strict health gate pass.
4. Always keep rollback-ready artifact.
