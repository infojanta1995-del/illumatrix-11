# ILLUMATRIX V.2 — Living Project Memory & Handoff Record

> **Purpose:** Living state record for ILLUMATRIX V.2. Updated after every meaningful task.  
> **Security Rule:** Never store cleartext secrets, passwords, or tokens in this file.

---

## 1. Current State
- **Current Phase**: Phase 0 — Baseline Audit and Security Triage (COMPLETED) $\rightarrow$ Ready for Phase 1
- **Current Task**: Task 0.4 Completed & Verified (Custom Endpoint SSRF Protection)
- **Status**: Complete server-side SSRF validation and safe fetch dispatch implemented; 103 automated tests passing.
- **Last Verified Working State**:
  - `npm test`: 103 passing tests across 8 suites (duration ~10s, 0 failures).
  - `npm run lint`: Clean TypeScript compile (`tsc --noEmit`, 0 diagnostics).
  - `npm run build`: Production bundle built cleanly via Vite (`vite build`).
  - Full-stack dev server: Running Express + Vite on `http://0.0.0.0:3000`.

---

## 2. Completed and Verified Work

### Task 0.1: Baseline Codebase Audit
- **Files Inspected**: `package.json`, `server.ts`, `src/App.tsx`, `src/context/WorkflowContext.tsx`, `src/data/registries.ts`, `src/types/hud.ts`, `src/server/providerManager.ts`, `src/server/modelCompatibility.ts`, `src/services/aiService.ts`, `src/services/storage.ts`, `src/services/promptSafetyEngine.ts`, `tests/*`.
- **Verification Commands & Real Results**:
  - `npm test`: 84 passing subtests.
  - `npm run lint`: Clean (`tsc --noEmit`).
  - `npm run build`: Clean (`vite build`).

### Task 0.2: Synchronization of Seven Root Documentation Files
- **Files Created / Synchronized**: `README.md`, `PROJECT_REQUIREMENTS.md`, `ARCHITECTURE.md`, `FEATURES.md`, `IMPLEMENTATION_PLAN.md`, `DESIGN_SYSTEM.md`, `PROJECT_MEMORY.md`.

### Task 0.3: Credential Security & Gitignore Hardening
- **Objective**: Eliminate hardcoded secrets from stored configuration, create root `.gitignore`, dynamically load Google GenAI credentials from `process.env.GEMINI_API_KEY`, prevent silent credential collision across Google connections, and test missing key states.
- **Files Changed**:
  - `/.gitignore` (Created: ignores `.env*`, `.provider_connections.json`, `dist/`, `node_modules/`, while allowing `!.env.example`).
  - `/.provider_connections.json` (Sanitized: all hardcoded API keys removed; stored `apiKey` set to empty string `""`).
  - `/src/server/providerManager.ts` (Updated: added `resolveEffectiveApiKey()`, updated `loadConnections()` to never write environment secrets to disk, updated `saveConnections()` to strip environment variables prior to serializing, updated `getPublicConnections()`, `getEffectiveCredentials()`, and `executeTextGeneration()` to read environment keys dynamically with safe `unconfigured` states when missing).
  - `/tests/api-provider-manager.test.ts` (Added 5 automated tests for dynamic environment key loading, independent Google connection credentials, missing credential error handling, zero on-disk environment secrets, and `.gitignore` integrity).
- **Verification Commands & Real Results**:
  - `npm test`: 90 passing tests, 0 failures (~3.5s).
  - `npm run lint`: 0 diagnostics (`tsc --noEmit`).
  - `npm run build`: Build succeeded (`vite build`).

### Task 0.4: Custom Provider SSRF Protection
- **Objective**: Implement comprehensive server-side SSRF validation and safe HTTP dispatch for user-configured custom provider endpoints (`baseUrl`).
- **Files Changed / Created**:
  - `/src/server/urlSafetyValidator.ts` (Created: implements `isRestrictedIpv4`, `parseIpv6Words`, `isRestrictedIpv6`, `isRestrictedIp`, `isRestrictedHostname`, `defaultDnsResolver`, `validateCustomProviderUrl`, and `safeSsrfFetch` with manual redirect handling and per-hop revalidation).
  - `/src/server/providerManager.ts` (Updated: imports SSRF tools, adds `SSRF_BLOCKED` to `errorCategory`, validates endpoints in `testConnection()` and `executeTextGeneration()`, dispatches via `safeSsrfFetch`, preserves built-in providers, and rethrows `SSRF_BLOCKED` errors).
  - `/server.ts` (Updated: validates `baseUrl` against SSRF in `app.post('/api/providers')`, returning HTTP 400 with `category: 'SSRF_BLOCKED'`).
  - `/tests/api-provider-manager.test.ts` (Added 12 comprehensive automated test cases covering public URLs, localhost/loopback IPv4 & IPv6, link-local & cloud metadata, private RFC 1918 & CGNAT ranges, IPv6 ULA & IPv4-mapped, protocol & credential rejections, DNS resolution, split-horizon/mixed DNS answers, redirect re-validation, `testConnection()`, `executeTextGeneration()`, and built-in integration preservation).
- **Verification Commands & Real Results**:
  - `npm test`: **103 passing tests across 8 suites, 0 failures, 0 skipped** (~10.0s).
  - `npm run lint`: **0 diagnostics** (`tsc --noEmit`).
  - `npm run build`: **Build succeeded** (`vite build`).
  - `curl -s http://localhost:3000/api/ai/health`: HTTP 200 OK.
- **Architectural Notes & Limitations**:
  - Node.js global `fetch` does not support custom socket dialers or per-request IP pinning without custom `undici.Agent` dispatchers.
  - ILLUMATRIX enforces the strongest safe solution for this architecture:
    1. Pre-flight multi-answer DNS lookup checking *every* resolved IP address.
    2. Forced `redirect: 'manual'` preventing automated unvalidated redirects.
    3. Per-hop URL parsing and SSRF re-validation before following any redirect (up to 3 hops).
    4. Origin-change Authorization header scrubbing on redirect.

---

## 3. In Progress
- **Item**: Transition from Phase 0 (Audit & Hardening) to Phase 1 (Workflow Stabilization).
- **Upcoming Work**:
  - Task 1.1 — Long-Form Duration Decision Resolution (awaiting product owner decision on DEC-01: 3-min vs 4-min minimum).
  - Task 1.2 — End-to-End Workflow Regression Suite.

---

## 4. Known Issues & Security Risks

| ID | Issue / Risk | Severity | Evidence / Source | Status |
|---|---|---|---|---|
| **SEC-01** | Historical plaintext credentials in previous git commits | **HIGH** | Keys existed in repository before Task 0.3. | **Project owner must revoke/rotate these credentials in Google AI Studio / GCP Console.** |
| **SEC-02** | Missing `.gitignore` at repository root | **RESOLVED** | `.gitignore` created in Task 0.3. | **Verified Resolved** |
| **SEC-03** | Unvalidated custom provider `baseUrl` (SSRF risk) | **RESOLVED** | Server-side validation and `safeSsrfFetch` implemented in Task 0.4. | **Verified Resolved** |
| **SEC-04** | Vite `allowedHosts: true` | **LOW** | `vite.config.ts` allows any host header. | Documented / Needed for container preview |

---

## 5. Architectural & Product Decisions

| Decision ID | Description | Status | Rationale |
|---|---|---|---|
| **DEC-01** | Long-Form duration: 3-min vs 4-min minimum | **UNRESOLVED / TBD** | Code allows `[3, 4, 5, 8, 10]` min; brief notes a 4-min spec conflict. Existing code is preserved without guessing until product decision. |
| **DEC-02** | Deployment Model (Single-user vs Multi-user) | **UNRESOLVED / TBD** | Affects session auth and multi-tenancy requirements. Preserved as local single-user baseline for now. |
| **DEC-03** | SEO Package Gate (Optional vs Mandatory) | **CONFIRMED IN CODE** | SEO is treated as optional in Stage 05, but flagged in Stage 07 completeness checklist. Export is permitted with warning. |

---

## 6. Next Exact Task

- **Task ID**: `TASK-1.2-WORKFLOW-REGRESSION` (or `TASK-1.1-DURATION-DECISION` if product decision is provided)
- **Goal**: Build comprehensive end-to-end regression tests verifying that all 7 workflow stages (Sources, Setup, Script Studio, Scene Prompts, SEO Package, Thumbnail Studio, Review & Export) transition smoothly, maintain state invariants, and correctly invalidate downstream deliverables when upstream changes occur.
- **Likely Files**:
  - `tests/system-integration.test.ts`
  - `src/context/WorkflowContext.tsx`
- **Acceptance Criteria**:
  - Workflow transitions across all 7 stages verified without broken transitions.
  - State invalidation logic (e.g., editing script invalidates scene prompts and thumbnails) verified by automated tests.
  - All existing 103 tests continue to pass.

