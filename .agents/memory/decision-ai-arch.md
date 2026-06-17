---
name: DecisionAI Architecture
description: Key architectural decisions, Groq integration pattern, and routing for this project.
---

## Groq API Integration
- `groq-sdk` installed in `@workspace/api-server`.
- Routes: `POST /api/ai/analyze` (TruthLayer product analysis) and `POST /api/ai/smarty` (MasterScan Smarty).
- File: `artifacts/api-server/src/routes/ai.ts`, registered at `router.use("/ai", aiRouter)` in `routes/index.ts`.
- Model: `llama-3.3-70b-versatile` for both routes.
- Response parsing: `extractJSON()` strips markdown fences from Groq responses before `JSON.parse`.

**Why:** Groq is the only available AI key; responses are returned as raw JSON matching the existing `TruthLayerResult` TypeScript interface so no display code needed changing.

## Vite Proxy
- `/api` in `artifacts/decision-ai/vite.config.ts` is proxied to `http://localhost:8080`.
- This means frontend calls `fetch("/api/ai/analyze")` — no hardcoded port needed.
- The API server always runs on port 8080 (set in its workflow).

**Why:** Avoids CORS issues and keeps URLs relative so they work the same in dev and after publish.

## No Mock Data
- `MOCK_RESULT` from `mockData.ts` is no longer imported anywhere — only the `TruthLayerResult` type is kept.
- TruthLayer starts at `"input"` state (product name form) → `"analyzing"` → `"results"`.
- MasterScan SMARTY_QUICK demo chips removed; replaced with `SMARTY_SUGGESTIONS` (template starters, not auto-submitting).

## Pink AI Theme (Popup.tsx)
- Neon Pink: `#FF4FD8`, Soft Pink: `#FF80DF`, Purple: `#8A5CFF`, Deep Violet: `#6B3DFF`.
- Truth Layer card accent changed from blue `#6c8dfa` to neon pink `#FF4FD8`.
- Background blobs changed from blue/green to pink/purple.
- MasterScan purple accent kept as-is.
