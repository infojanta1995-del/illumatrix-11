# ILLUMATRIX V.2 — Implementation Plan & Phase Roadmap

> **Document Status:** Active Implementation Roadmap  
> **Approach:** Strict risk-ordered, phased execution; one scoped task at a time; verification before progression.

---

## Phase Overview

- **Phase 0 — Baseline Audit & Security Triage (CURRENT)**
- **Phase 1 — Stabilize the Existing Workflow & Unresolved Invariants**
- **Phase 2 — Harden Provider & Model Manager & Credential Isolation**
- **Phase 3 — Establish Shared AI Execution Engine Interface**
- **Phase 4 — Cost-Policy Router & Bounded Failover**
- **Phase 5 — Truthful Telemetry & Jobs Dashboard**
- **Phase 6 — Production Release Readiness & Final Certification**

---

## Phase 0: Baseline Audit & Security Triage Tasks

### Task 0.1: Repository & Baseline State Audit (Completed & Verified)
- **Objective**: Inspect the real repository tree, scripts, dependencies, server setup, and test runner.
- **Scope**: Codebase audit, runtime environment verification.
- **Affected Files**: `README.md`, `package.json`, `server.ts`.
- **Deliverables**: Comprehensive audit report, running dev server, passing tests.
- **Verification**: `npm test` (84 tests passing), `npm run lint` (clean), `npm run build` (clean).
- **Status**: **Verified**.

### Task 0.2: Project Documentation Foundation (Completed & Verified)
- **Objective**: Create and update the seven root documentation files required by the V.2 brief.
- **Scope**: `README.md`, `PROJECT_REQUIREMENTS.md`, `ARCHITECTURE.md`, `FEATURES.md`, `IMPLEMENTATION_PLAN.md`, `DESIGN_SYSTEM.md`, `PROJECT_MEMORY.md`.
- **Deliverables**: 7 synchronized, evidence-based documentation files distinguishing verified facts from unverified/planned items.
- **Verification**: Cross-file consistency review and path verification.
- **Status**: **Verified**.

### Task 0.3: Credential Security & Gitignore Hardening (Completed & Verified)
- **Objective**: Eliminate risk of plaintext secrets being committed or exposed; create `.gitignore`; quarantine existing credentials in `.provider_connections.json`; dynamically inject environment credentials.
- **Scope**: Added root `.gitignore` ignoring `.env*`, `.provider_connections.json`, `dist/`, `node_modules/`, with `!.env.example` exception. Sanitized `.provider_connections.json`. Added dynamic `resolveEffectiveApiKey()` in `providerManager.ts`. Added test coverage for dynamic loading and zero on-disk persistence.
- **Affected Files**: `/.gitignore`, `/.provider_connections.json`, `src/server/providerManager.ts`, `tests/api-provider-manager.test.ts`.
- **Verification**: 90/90 tests passing (`npm test`), clean lint (`tsc --noEmit`), clean build (`vite build`).
- **Status**: **Verified**.

### Task 0.4: Custom Endpoint SSRF Protection (Completed & Verified)
- **Objective**: Protect server against SSRF attacks through user-configured custom OpenAI-compatible `baseUrl` values.
- **Scope**: Centralized URL safety validator (`src/server/urlSafetyValidator.ts`) enforcing `http:`/`https:` protocols, forbidding URL credentials, blocking loopback IPv4/IPv6, cloud metadata (`169.254.169.254`, `metadata.google.internal`), private RFC 1918 and CGNAT ranges, and resolving hostnames against all DNS answers. Enforced in `providerManager.ts` (`testConnection` and `executeTextGeneration`), in `server.ts` (`app.post('/api/providers')`), with manual redirect re-validation (`safeSsrfFetch`).
- **Affected Files**: `src/server/urlSafetyValidator.ts`, `src/server/providerManager.ts`, `server.ts`, `tests/api-provider-manager.test.ts`.
- **Verification**: 103/103 tests passing (`npm test`), clean lint (`tsc --noEmit`), clean build (`vite build`).
- **Status**: **Verified**.

---

## Phase 1: Stabilize Existing Workflow Tasks

### Task 1.1: Long-Form Duration Decision Resolution
- **Objective**: Confirm or formalize the duration options for 16:9 Long-Form (3-minute vs 4-minute minimum).
- **Scope**: Maintain existing `[3, 4, 5, 8, 10]` minutes or update if product decision is provided.
- **Prerequisite**: Product owner decision.
- **Status**: **Blocked on Decision DEC-01**.

### Task 1.2: End-to-End Workflow Regression Suite
- **Objective**: Verify that all 7 stages transition smoothly in UI, preserve state across reloads, and honor the upstream invalidation matrix.
- **Status**: **Planned**.

---

## Phase 2: Harden Provider & Model Manager

### Task 2.1: Secure Key Storage Migration
- **Objective**: Decouple connection configuration from plaintext file storage; support `process.env` overrides for all default connections.
- **Status**: **Planned**.

### Task 2.2: Live Catalog Discovery Caching & Cooldowns
- **Objective**: Cache model discovery responses with configurable TTL to prevent rate-limiting third-party provider endpoints.
- **Status**: **Planned**.

---

## Phase 3: Establish Shared AI Execution Interface

### Task 3.1: Typed AI Execution Request/Response Contracts
- **Objective**: Introduce unified types for AI tasks (`script_generation`, `scene_prompt_generation`, `style_regeneration`, `thumbnail_prompt_generation`, `seo_generation`).
- **Status**: **Planned**.

### Task 3.2: Incrementally Route AI Endpoints Through Execution Engine
- **Objective**: Route Stage 03 (`generate-script`) through the shared execution engine with validation and structured error classification.
- **Status**: **Planned**.

---

## Phase 4: Cost-Policy Router & Bounded Failover

### Task 4.1: Cost Policy Engine (`Free Only`, `Prefer Free`, `Cost Controlled`, `Manual`)
- **Objective**: Guarantee server-side enforcement that `Free Only` rejects any model whose pricing is paid or unknown.
- **Status**: **Planned**.

### Task 4.2: Two-Pool Model Management (Verified Free vs BYOK)
- **Objective**: Keep user BYOK pool cleanly isolated from auto-verified free routes.
- **Status**: **Planned**.

---

## Phase 5: Truthful Telemetry & Jobs Dashboard

### Task 5.1: Observability & Jobs Console
- **Objective**: Provide detailed job history showing task type, status, duration, retries, and honest data source attribution.
- **Status**: **Planned**.

---

## Phase 6: Production Release Readiness

### Task 6.1: Full Release Checklist & Master Audit Certification
- **Objective**: Execute end-to-end certification, secret audit, bundle size checks, and build readiness.
- **Status**: **Planned**.
