# Architecture Guardrails

This file captures the rules we want future work to follow so the recent cleanup does not slowly collapse back into a giant coordinator file.

## Active App Boundary

- Only `frontend` is the active application.
- Root-level reference folders are not part of feature implementation unless explicitly promoted.

## Page Rules

- `app/page.tsx` is a composition layer.
- It may choose which top-level experience to render.
- It should not become the default home for feature logic, storage policy, or multi-step side effects.

Keep these out of `app/page.tsx` whenever possible:

- feature-specific reset logic
- quota logic
- URL synchronization internals
- conversation workspace orchestration
- persistence or API rules

## Hook Rules

- If a page owns more than one related state cluster, extract a hook.
- If a handler touches three or more states, it is a strong hook candidate.
- If a `useEffect` is about a specific concern, isolate it into a dedicated hook.

Current intended hooks:

- `useConversationWorkspace`
- `usePageBootstrap`
- `useConversationEffects`
- `useAssessmentEntry`
- `useHomePresentation`

## Feature Rules

- New top-level tools should plug into the app mode and workspace model instead of adding ad-hoc booleans.
- New conversation tools should integrate through workspace/tool flow, not through page-local one-off handlers.
- New assessments should extend the assessment entry hook or adjacent assessment modules, not duplicate quota logic in pages.

## State Rules

- Prefer one explicit mode enum over multiple mutually exclusive booleans.
- Keep overlay/modal state local only when it is truly UI-local.
- Keep conversation state together.
- Keep presentation state together.

## Data and Runtime Rules

- Build output, local DB files, caches, and backup artifacts should stay out of git tracking.
- Runtime data may exist locally, but should not be treated as source code.

## Refactor Thresholds

Refactor before adding more if any of these happen:

- a page gains another feature mode boolean
- a hook starts mixing unrelated concerns
- a component becomes a control hub instead of a view
- a file starts handling schema, domain logic, and app orchestration together

## Practical Rule Of Thumb

When adding a new feature, ask:

1. Is this a new app mode, a workspace behavior, a presentation behavior, or a data concern?
2. Which existing hook/module should own it?
3. If none fits, should a new hook/module be created instead of extending `page.tsx`?

If the answer ends with "just put it in `page.tsx` for now", pause and reconsider first.
