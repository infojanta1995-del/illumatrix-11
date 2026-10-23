# ILLUMATRIX — AI Content Preparation Workspace

> **Status:** Phase 0 Baseline Audit & V.2 Modernization Roadmap  
> **Target:** ILLUMATRIX V.2  
> **Source Repository:** `nitchart0-gif/illumatrix-10-1`

ILLUMATRIX is an AI-assisted video content preparation workspace. It guides users through a disciplined 7-stage pipeline from raw ground-truth source material to an exportable, high-retention production bundle containing scripts, scene-by-scene Google Flow video prompts, narration teleprompter scripts, continuity bibles, SEO packages, and thumbnail prompt/image concepts.

---

## 1. Verified Technology Stack

| Layer | Component | Version / Details (Verified in Code) |
|---|---|---|
| **Runtime** | Node.js | v22.x |
| **Frontend Framework** | React + ReactDOM | 19.0.1 |
| **Bundler & Dev Server** | Vite | 8.3.0 (`@vitejs/plugin-react` 6.1.1) |
| **Styling** | Tailwind CSS | 4.3.3 (`@tailwindcss/vite` 4.3.3) |
| **Animations** | Motion | 12.23.24 |
| **Icons** | Lucide React | 0.546.0 |
| **Backend Server** | Express | 4.21.2 (Full-stack dev via Vite middleware, port 3000) |
| **TypeScript / Runner** | TypeScript + tsx | TS 7.0.2 / tsx 4.21.0 |
| **AI SDK** | `@google/genai` | 2.4.0 (Official Google GenAI TypeScript SDK) |
| **Test Runner** | Node.js Test Runner | `tsx --test` (84 passing subtests across 8 test suites) |

---

## 2. Seven-Stage Content Workflow

1. **Stage 01 — Setup & Rules (`01_SETUP`)**: Video format constraint (`9:16_SHORTS` vs `16:9_LONG_FORM`), duration pacing, 7 content modes, language (`en` vs `hi`), and 13 visual styles.
2. **Stage 02 — Source Library (`02_SOURCES`)**: Ground-truth story intake preserving line breaks, paragraph formatting, word/character metrics, and versioning.
3. **Stage 03 — Script Studio (`03_SCRIPT_STUDIO`)**: Strict source-faithful script generation, side-by-side editing, word count pacing, revision history, and explicit approval gating.
4. **Stage 04 — Scene Prompts (`04_SCENE_PROMPTS`)**: Generation of self-contained Google Flow prompt packages (8-second pacing for Shorts), immutable narration preservation, and prominent-person safety reviews.
5. **Stage 05 — SEO Package (`05_SEO_PACKAGE`)**: 5 title variations, high-retention description, searchable tags, and timestamped chapter markers.
6. **Stage 06 — Thumbnail Studio (`06_THUMBNAIL_STUDIO`)**: Prompt A (Object of Enigma) and Prompt B (Observer Discovery) generation, prompt copying, and optional Gemini image rendering.
7. **Stage 07 — Review & Export (`07_REVIEW_EXPORT`)**: Completeness checklist, upstream stale artifact matrix, clipboard export, Master Markdown bundle, and secret-scrubbed JSON backup.

---

## 3. Verified Prerequisites & Installation

### Prerequisites
- Node.js 22+
- npm 10+ (AI Studio container standard; no yarn/pnpm/bun)

### Environment Variables
Configure environment variables using `.env.example`:
```bash
cp .env.example .env
```
Key variables:
- `PORT`: Server port (default: `3000`)
- `GEMINI_API_KEY`: Server-side API key for Google GenAI models (`gemini-3.1-flash-lite`, `gemini-3.8-flash`, `gemini-3.1-flash-lite-image`)
- `NODE_ENV`: `development` or `production`

*Security Rule:* Never store cleartext API keys, passwords, or tokens in source repositories or commit history.

---

## 4. Development, Build & Test Commands

All commands are verified against `package.json`:

```bash
# Install dependencies
npm install

# Start full-stack development server (Express on port 3000 with Vite middleware)
npm run dev

# Run full test suite (84 automated tests)
npm test

# Type-check TypeScript codebase without emitting JS
npm run lint

# Build production bundle (Vite client build to dist/)
npm run build

# Start production server
npm start
```

---

## 5. Repository Structure

```
├── .env.example              # Placeholder environment variable templates
├── .provider_connections.json# Server-side provider config (Requires credential isolation)
├── ARCHITECTURE.md           # System architecture, current vs target design
├── DESIGN_SYSTEM.md          # HUD theme tokens, components, and layout specs
├── FEATURES.md               # Feature inventory with implementation & verification status
├── IMPLEMENTATION_PLAN.md    # Phased roadmap, Phase 0 tasks, risk controls
├── PROJECT_MEMORY.md         # Living log of state, verified items, and next tasks
├── PROJECT_REQUIREMENTS.md   # Functional/non-functional specs & unresolved decisions
├── README.md                 # Project overview and operational guide
├── index.html                # Single-page HTML shell with HUD fonts & metadata
├── metadata.json             # AI Studio applet capabilities
├── package.json              # Project scripts and dependency manifest
├── server.ts                 # Full-stack Express server with AI proxy routes & Vite dev middleware
├── src/
│   ├── App.tsx               # Root application component with 3-zone HUD layout
│   ├── main.tsx              # React DOM 19 entrypoint
│   ├── index.css             # Tailwind v4 import & HUD CSS variables
│   ├── assets/               # Sample thumbnail preview images
│   ├── components/
│   │   ├── layout/           # TopStatusBar, WorkflowStepper, TaskWorkspace, ControlCenter, etc.
│   │   └── stages/           # 7 Stage Workspace components (01 through 07)
│   ├── context/
│   │   └── WorkflowContext.tsx# Central workflow state, navigation, stale invalidation
│   ├── data/
│   │   └── registries.ts     # Content modes, visual styles, stage definitions
│   ├── server/
│   │   ├── modelCompatibility.ts # Modality separation, OpenRouter pricing classifier
│   │   └── providerManager.ts    # Multi-provider connections, discovery, credentials
│   ├── services/
│   │   ├── aiService.ts      # Client HTTP API service for proxy endpoints
│   │   ├── promptSafetyEngine.ts # Prompt sanitization & prominent person protections
│   │   └── storage.ts        # LocalStorage persistence & default projects
│   └── types/
│       └── hud.ts            # Core TypeScript interfaces & domain models
└── tests/                    # 8 test suites (84 tests covering safety, providers, stages)
```

---

## 6. Current Status & Known Limitations

- **Build/Test Status**: Build succeeds (`vite build`), lint passes (`tsc --noEmit`), and all 84 test assertions pass (`npm test`).
- **Security Notice (HIGH)**: `.provider_connections.json` was detected containing plaintext API keys from previous sessions. These credentials must be rotated/revoked immediately. Credential storage must be hardened.
- **Unresolved Product Decision**: Long-form video duration allows 3, 4, 5, 8, and 10 minutes in UI and types, while some historical notes reference a 4-minute minimum. This remains documented as an unresolved decision pending product sign-off.
- **Unresolved Deployment Model**: Whether ILLUMATRIX is deployed as local single-user vs multi-user network applet is `TBD`.
