# AICoach Frontend

`frontend` is the only active application in this repository.

## Scope

- Main app: `Next.js 14` app under `frontend`
- Runtime database: local SQLite file used during development
- Support code: `app`, `lib`, `context`, `hooks`, `scripts`, `data`, `public`

## Out Of Scope

The following root-level folders are treated as external reference material and are not part of the active app:

- `Solar-system`
- `wx-earth`
- `globe-final`
- `111`
- `ToolTemplate`

They may be deleted later and should not be included in current cleanup or refactor work unless explicitly requested.

## Local Development

```bash
npm install
cd frontend
npm install
npm run dev
```

## Windows Start

For a stable CMD window title on Windows, prefer launching the app with:

```bat
Launch-DreamLab.bat
```

This launcher sets the window title first, runs the runtime bootstrap directly, and then starts the final Next.js server process without going through `npm run start`.

For local development from the repository root, prefer:

```bat
..\Launch-DreamLab-Dev.bat
```

This BAT file is the recommended entry for the `start-dev.ps1` workflow and is easier to identify than launching PowerShell or npm commands manually.

## Current Cleanup Rules

- Do not commit build output such as `.next`
- Do not commit local databases or backup databases
- Do not mix reference prototypes into the `frontend` application structure
- Keep new docs for the active app inside `frontend` unless they are truly repo-level

## Suggested Next Refactor Order

1. Split database access by domain
2. Split chat orchestration/service logic
3. Break down large page and feature components
4. Add minimal regression checks for core flows
