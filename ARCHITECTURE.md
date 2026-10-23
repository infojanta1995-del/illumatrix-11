# ILLUMATRIX Architecture Specification

> **Document Status:** Active Architecture Baseline  
> **Scope:** Current Implementation vs. Approved V.2 Target Architecture  
> **Last Verified:** 2026-10-23

---

## 1. System Overview

ILLUMATRIX is implemented as a full-stack web application hosted on Node.js / Express with Vite serving the React client. It is architected around a 7-stage sequential content pipeline with strict upstream/downstream invalidation, server-side credential isolation, and deterministic fallback engines.

```
+-----------------------------------------------------------------------------------------+
|                                    CLIENT BROWSER (React 19)                            |
|                                                                                         |
|  +--------------------+  +----------------------+  +---------------------------------+  |
|  | TopStatusBar       |  | WorkflowStepper      |  | ControlCenter & Quota Radar     |  |
|  +--------------------+  +----------------------+  +---------------------------------+  |
|                                                                                         |
|  +-----------------------------------------------------------------------------------+  |
|  | TaskWorkspace (Active Stage Canvas: 01_SETUP ... 07_REVIEW_EXPORT)               |  |
|  +-----------------------------------------------------------------------------------+  |
|                                         |                                               |
|                                         v                                               |
|  +-----------------------------------------------------------------------------------+  |
|  | WorkflowContext (React State + Stale Matrix + Client LocalStorage)                 |  |
|  +-----------------------------------------------------------------------------------+  |
+-----------------------------------------|-----------------------------------------------+
                                          | HTTP /api/* (Zero Client Secrets)
                                          v
+-----------------------------------------------------------------------------------------+
|                                  NODE.JS / EXPRESS SERVER                               |
|                                                                                         |
|  +-----------------------------------------------------------------------------------+  |
|  | Express REST Endpoints (server.ts)                                                |  |
|  | - /api/ai/health, /api/ai/generate-script, /api/ai/generate-scene-prompts        |  |
|  | - /api/ai/regenerate-style-prompts, /api/ai/generate-thumbnails                   |  |
|  | - /api/ai/render-thumbnail-image, /api/providers/*                               |  |
|  +-----------------------------------------------------------------------------------+  |
|         |                                                       |                       |
|         v                                                       v                       |
|  +-----------------------------+          +------------------------------------------+  |
|  | PromptSafetyEngine          |          | ProviderManager                          |  |
|  | - Prominent Person Scrubber |          | - Connection Registry                    |  |
|  | - Deepfake / Likeness Block |          | - Key Masking & Credential Protection   |  |
|  | - Devanagari Hindi Rules    |          | - Live Model Discovery & Catalog Cache   |  |
|  +-----------------------------+          +------------------------------------------+  |
|                                                                 |                       |
|                                           +---------------------+--------------------+  |
|                                           |                                          |  |
|                                           v                                          v  |
|                       +------------------------------+     +-------------------------+  |
|                       | Google GenAI (@google/genai) |     | OpenAI-Compatible Proxy |  |
|                       | - Gemini 3.1 Flash Lite      |     | - Groq / LPU (fetch)    |  |
|                       | - Gemini 3.8 Flash           |     | - OpenRouter (fetch)    |  |
|                       | - Gemini 3.1 Flash Lite Img  |     | - Custom Endpoint       |  |
|                       +------------------------------+     +-------------------------+  |
+-----------------------------------------------------------------------------------------+
```

---

## 2. Current Implementation vs. Target Design

### 2.1 Current Implementation State (Verified in Code)
- **Frontend State Management**: `src/context/WorkflowContext.tsx` holds current project state, active stage, script versions, scene packages, SEO, thumbnails, and stale matrix. State is serialized to browser `localStorage` via `src/services/storage.ts`.
- **API Routing**: `server.ts` exposes direct REST endpoints for each stage action (e.g. `/api/ai/generate-script`, `/api/ai/generate-scene-prompts`, `/api/ai/generate-seo`, `/api/ai/generate-thumbnails`, `/api/ai/render-thumbnail-image`).
- **Provider Manager**: `src/server/providerManager.ts` manages provider connections (`Google GenAI`, `Groq`, `OpenRouter`, `OpenAI Compatible`, `Local Mock Engine`), maintains catalog caches, and runs execution via `executeTextGeneration()`.
- **Deterministic Fallbacks**: Every AI endpoint in `server.ts` includes an in-memory deterministic fallback engine that synthesizes content directly from source story text if the AI provider returns 429, 403, 503, or when keys are unconfigured.
- **Safety Engine**: `src/services/promptSafetyEngine.ts` enforces non-negotiable prominent person protections, neutralizes likeness requests into original fictional characters or documentary instrumentation, and validates Devanagari Hindi fidelity.

### 2.2 Approved V.2 Target Architecture
- **Unified AI Execution Engine**: Rather than having each endpoint implement its own routing and fallback logic, all AI invocations flow through a shared execution pipeline:
  ```
  Workflow Stage
  -> Typed AI Execution Request
  -> Request and Schema Validation
  -> Task Classification (script_gen, prompt_gen, etc.)
  -> Cost Policy Enforcement (Free Only, Prefer Free, Cost Controlled, Manual)
  -> Eligible Model Selection (Modalities, Context, Quota Cooldown)
  -> Provider Adapter (Google GenAI, Groq, OpenRouter, Custom)
  -> Response & Error Classification
  -> Output Schema Validation & Safety Review
  -> Version/Revision Stamp & Invalidation
  -> Persist Result & Update UI Job Telemetry
  ```
- **Cost Policies**: Server-enforced policies ensuring `Free Only` never routes to paid or unknown-cost models; paid fallback requires explicit user authorization.
- **Unified Jobs & Quota Monitor**: Truthful telemetry strictly separating provider-reported quota, observed HTTP rate-limit headers, locally observed request counters, and calculated cost estimates.

---

## 3. Data Flow & Stage Dependency Invariants

The 7 workflow stages enforce a strict sequential dependency and upstream invalidation matrix:

```
[01_SETUP] 
   | Invariants: Format (Shorts vs Long-Form), Duration, Mode, Language, Visual Style
   v
[02_SOURCES]
   | Ground-truth stories with exact paragraph breaks & word counts
   v
[03_SCRIPT_STUDIO]
   | Faithful script generation; Narration word counts paced to duration
   | Explicit Approval Gate -> Sets scriptVersion (e.g. v1, v2)
   v
   +-------------------------------------------------------+
   | Cascading Downstream Invalidation                     |
   | (Editing approved script triggers Stale Warning on:)   |
   |  - 04_SCENE_PROMPTS (Script beat mismatch)            |
   |  - 05_SEO_PACKAGE (Content drift)                     |
   |  - 06_THUMBNAIL_STUDIO (Narrative drift)              |
   +-------------------------------------------------------+
   |
   +---> [04_SCENE_PROMPTS] (Google Flow Prompt Packages + Prompt Safety Engine)
   |
   +---> [05_SEO_PACKAGE] (Title variations, description, chapter markers)
   |
   +---> [06_THUMBNAIL_STUDIO] (Prompt A & Prompt B concepts + Optional Gemini Image)
   |
   v
[07_REVIEW_EXPORT]
   - Validates readiness checklist
   - Flags any stale deliverables
   - Exports Master Markdown Bundle & Clean JSON (Zero Secrets)
```

---

## 4. Security Architecture

### 4.1 Credential Isolation
- Server-side credentials must never be passed to the browser.
- Public connection DTOs (`PublicProviderConnection`) mask keys and omit the `apiKey` property entirely.
- Export engines (`ReviewExportWorkspace.tsx` and `server.ts`) redact any string matching `AIza*`, `Bearer *`, or `key=*`.

### 4.2 Security Findings & Vulnerabilities Under Phase 0 Triage
1. **Plaintext Credential Storage in `.provider_connections.json` (CONFIRMED)**:
   - *Observation*: The file `/.provider_connections.json` contained hardcoded API keys for `conn_gemini_primary` and `conn_gemini_flash`.
   - *Risk*: Exposure of credentials if committed or archived.
   - *Required Remediation*: Project owner must revoke/rotate these keys. Server must support environment variable injection and secure local isolation.
2. **Missing `.gitignore` (CONFIRMED)**:
   - *Observation*: No `.gitignore` existed at repository root.
   - *Risk*: Accidental commitment of `.env` or `.provider_connections.json`.
3. **SSRF Risk on Custom Provider Base URLs (CONFIRMED RISK)**:
   - *Observation*: `server.ts` and `providerManager.ts` accept arbitrary `baseUrl` values for OpenAI-compatible providers.
   - *Risk*: Server-Side Request Forgery against private network addresses (`localhost`, `127.0.0.1`, `169.254.169.254` cloud metadata endpoints).
   - *Required Remediation*: Add strict URL protocol and destination validation for custom endpoints.
4. **Vite `allowedHosts: true` (CONFIRMED)**:
   - *Observation*: Vite config permits all hosts for dev server compatibility. Acceptable in container dev preview, but requires caution if exposed publicly.

---

## 5. Storage Model

- **Client Persistence**: Browser `localStorage` with keys prefixed `illum_*_v1`.
- **Server Persistence**: In-memory connection map backed by `.provider_connections.json`.
- **Data Integrity**: Script versions track `version` number, `sourceStoryId`, `sourceVersionReference`, and `approvedAt` timestamp. Scene prompt packages record `scriptVersionReference`.
