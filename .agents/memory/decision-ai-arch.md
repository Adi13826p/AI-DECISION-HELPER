---
name: DecisionAI Architecture
description: Key architectural decisions, Groq integration pattern, inline panel routing, and MasterScan features.
---

## Groq API Integration
- `groq-sdk` installed in `@workspace/api-server`.
- Routes in `artifacts/api-server/src/routes/ai.ts`:
  - `POST /api/ai/analyze` — TruthLayer product analysis, returns `TruthLayerResult`-shaped JSON
  - `POST /api/ai/smarty` — Article/YouTube/Planner analysis, returns sections JSON
  - `POST /api/ai/resume` — Resume auto-fill from profile + job context, returns fields/aiAnswers/coverLetter
- Registered at `router.use("/ai", aiRouter)` in `routes/index.ts`.
- Model: `llama-3.3-70b-versatile` for all routes.
- Response parsing: `extractJSON()` strips markdown fences from Groq responses before `JSON.parse`.

**Why:** Groq is the only available AI key.

## Vite Proxy
- `/api` in `artifacts/decision-ai/vite.config.ts` is proxied to `http://localhost:8080`.
- Frontend calls `fetch("/api/ai/...")` — no hardcoded port needed.

## Inline Panel Pattern (no routing)
- Both TruthLayer and MasterScan render as inline overlays INSIDE the popup card, not as separate routes.
- `Popup.tsx` manages `view` state: `"home" | "truth-layer" | "masterscan"`.
- Clicking a feature card → `setView("truth-layer")` / `setView("masterscan")`.
- Overlay rendered as `position: absolute, inset: 0, zIndex: 10` inside the popup div (which has `position: relative, overflow: hidden`).
- Both panels export `TruthLayerPanel({ onClose })` and `MasterScanPanel({ onClose })` — the default exports are kept only for the `/truth-layer` and `/masterscan` routes (route fallbacks).

**Why:** Chrome extension popup UX — panels should slide in within the same frame, not navigate away.

## normalizeResult() in TruthLayer
- API sometimes returns `loves`/`hates` as `string[]` instead of `{text,source}[]`.
- `analysisStats.dataPoints` comes as `"38,204"` string → need `parseInt` with comma stripping.
- `sourcePlatforms` may be missing → defaults to `["Reddit","YouTube","Quora","Amazon","Google"]`.
- Applied to raw API response BEFORE setting state in `TruthLayerPanel`.

## MasterScan — 5 Real AI Modes
Modes (each with its own prompt/API call):
1. **Product** → `/api/ai/analyze` with product name
2. **Article** → `/api/ai/smarty` with URL or text
3. **YouTube** → `/api/ai/smarty` with YouTube URL
4. **Planner** → `/api/ai/smarty` with "Create a detailed step-by-step action plan..." prefix
5. **Resume** → `/api/ai/resume` with profile string + job context

## MasterScan User Profile
- Stored in `localStorage` under key `masterscan_profile`.
- Fields: name, email, phone, address, linkedin, github, portfolio, skills, qualifications, experience, summary.
- Accessible via the profile icon (top-right of MasterScan header) → ProfileView form.
- Used for resume auto-fill: profile serialized to string and sent to `/api/ai/resume`.

## Pink AI Theme
- `--accent: #ec4899`, `--accent-scan: #f43f5e`, `--bg-base: #fff0f7`.
- Truth Layer accent: `#FF4FD8`, MasterScan accent: `#a374ff`.
