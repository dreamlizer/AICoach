# Page Refactor Map

This document explains why `app/page.tsx` is still a key refactor target and how to split it without breaking behavior.

## Why This Matters

`app/page.tsx` is no longer a giant JSX-only file, but it is still the main application coordinator.

The problem is no longer view size alone.
The problem is that the page still owns too much:

- feature-mode switching
- conversation lifecycle
- URL synchronization
- greeting and slogan orchestration
- assessment quota handling
- modal and toast coordination
- cross-feature reset rules

This means every new feature tends to add:

- one more boolean state
- one more open/close handler
- one more reset branch
- one more `useEffect`

That is why this file now affects future module velocity.

## Current Responsibility Buckets

Status note:

- Phase 1 completed: top-level app mode unification
- Phase 2 completed: conversation workspace extraction
- Phase 3 completed: bootstrap and conversation effects extraction
- Phase 4 completed: assessment entry and home presentation extraction
- Phase 5 completed: coordinator-layer stabilization and guardrails

### 1. App mode / feature routing

Original states:

- `conversationLabOpen`
- `ocrWorkbenchOpen`
- `dictionaryOpen`
- `assessmentHubOpen`
- `solarSystemOpen`
- `superMapOpen`

Problem:

- feature navigation is represented as many booleans instead of one app mode
- resets are manual and duplicated

Result:

- replace these booleans with one app-level mode state
- example shape:
  - `home`
  - `conversation`
  - `ocr`
  - `dictionary`
  - `assessmentHub`
  - `solarSystem`

Note:

- `superMapOpen` can remain modal state if it is truly overlay-only

### 2. Conversation session orchestration

Original states:

- `currentConversationId`
- `activeToolId`
- `activeToolPlaceholder`
- `pendingToolTitle`
- `targetMessageId`
- `sidebarOpen`
- `searchOpen`
- `toolsPanelOpen`
- `assessmentPanelOpen`
- `activeAssessmentTool`

Problem:

- these states collectively define a conversation workspace
- but they are mixed with home page, feature hub, and other app states

Result:

- move them into a dedicated coordinator hook such as `useConversationWorkspace`

That hook should own:

- opening a conversation
- opening a new chat
- restoring a chat from history
- entering tool sessions
- search-result jump behavior
- panel resets

### 3. Home shell presentation

Original states:

- `greeting`
- `sloganLines`
- `randomQuestions`
- `showReleaseNotes`
- `showMagicZone`

Problem:

- presentation personalization is mixed with conversation lifecycle logic

Result:

- move these into a lighter home or shell hook such as `useHomePresentation`

### 4. Assessment flow

Original logic:

- local daily quota helpers
- whitelist handling
- assessment entry dispatch
- assessment modal open/close

Problem:

- assessment policy and assessment UI entry logic are mixed into the page

Result:

- move quota and start logic into `useAssessmentEntry`

### 5. Bootstrapping and URL side effects

Original effects:

- initial safety timer
- release notes check
- URL `c` param resolution
- mobile sidebar initialization
- greeting initialization
- URL write-back
- tool state hydration from history
- conversation merge after login
- scroll-to-target behavior

Problem:

- this is the clearest sign the page is acting as an app controller

Result:

- split by concern:
  - `usePageBootstrap`
  - `useConversationUrlSync`
  - `useConversationHydration`
  - `useConversationMergeOnLogin`
  - `useScrollToMessage`

## Practical Refactor Order

This was the applied order:

1. Introduce one app mode state to replace multiple feature booleans
2. Extract conversation workspace hook
3. Extract page bootstrap and URL sync hooks
4. Extract assessment entry hook
5. Extract home presentation hook
6. Reduce `page.tsx` to:
   - context reads
   - top-level hook composition
   - final conditional rendering

## What Should Stay In `page.tsx`

After refactor, `page.tsx` should still do three things:

- compose the top-level hooks
- choose which top-level view to render
- wire a small number of shared overlays

It should not remain the place where detailed reset logic lives.

## Refactor Success Criteria

The refactor is successful when:

- adding a new top-level feature does not require adding another reset cascade
- adding a new conversation tool does not require editing many unrelated handlers
- URL sync logic is isolated from rendering logic
- assessment behavior is not mixed into home routing
- `page.tsx` reads like a coordinator, not a control tower
