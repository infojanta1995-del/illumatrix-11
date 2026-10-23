# ILLUMATRIX V.2 — Feature Inventory & Traceability Matrix

> **Document Status:** Active Feature Catalog  
> **Status Conventions:** `Planned` | `In Progress` | `Implemented` | `Testing` | `Verified` | `Blocked` | `Deferred`  
> *Note:* In accordance with the project brief, `Implemented` is not the same as `Verified`. A feature is marked `Verified` only when automated tests or recorded manual verification validate it.

---

## 1. Core Workflow Stages (01–07)

| Feature ID | Feature Name | Priority | Status | Related Req | Dependencies | Verification Evidence |
|---|---|---|---|---|---|---|
| **FEAT-SETUP-01** | Aspect Ratio Selector | P0 | **Verified** | REQ-01 | None | `tests/system-integration.test.ts` (test 38) |
| **FEAT-SETUP-02** | Shorts Exact 8s Pacing | P0 | **Verified** | REQ-02 | FEAT-SETUP-01 | `tests/system-integration.test.ts` (test 39) |
| **FEAT-SETUP-03** | Long-Form Duration Selector | P1 | **Verified** (Unresolved Conflict) | REQ-03 | FEAT-SETUP-01 | UI verified; conflict documented (3m vs 4m) |
| **FEAT-SETUP-04** | 7 Content Modes Selector | P0 | **Verified** | REQ-04 | None | `tests/system-integration.test.ts` |
| **FEAT-SETUP-05** | Bilingual (EN/HI) Mode | P0 | **Verified** | REQ-05 | None | `tests/system-integration.test.ts` (test 42) |
| **FEAT-SETUP-06** | 13 Visual Styles Palette | P0 | **Verified** | REQ-06 | None | `tests/system-integration.test.ts` (test 40) |
| **FEAT-SRC-01** | Ground-Truth Story Intake | P0 | **Verified** | REQ-07 | FEAT-SETUP-01 | `tests/system-integration.test.ts` (test 38) |
| **FEAT-SRC-02** | Exact Text & Line Break Integrity | P0 | **Verified** | REQ-07 | FEAT-SRC-01 | `tests/phase9-release-readiness.test.ts` |
| **FEAT-SCRIPT-01** | Source-Faithful Script Generation | P0 | **Verified** | REQ-08 | FEAT-SRC-01 | `tests/phase9-release-readiness.test.ts` |
| **FEAT-SCRIPT-02** | Side-by-Side Editor & Approval Gate | P0 | **Verified** | REQ-09 | FEAT-SCRIPT-01 | `tests/review-export.test.ts` (test 25) |
| **FEAT-SCRIPT-03** | Script Revision & Rollback Engine | P0 | **Verified** | REQ-09 | FEAT-SCRIPT-02 | `tests/review-export.test.ts` (test 26) |
| **FEAT-SCRIPT-04** | Single Scene Regeneration | P1 | **Verified** | REQ-09 | FEAT-SCRIPT-01 | `tests/system-integration.test.ts` |
| **FEAT-PROMPT-01** | Google Flow Scene Prompt Gen | P0 | **Verified** | REQ-10 | FEAT-SCRIPT-02 | `tests/system-integration.test.ts` |
| **FEAT-PROMPT-02** | Style Regeneration Narration Invariant | P0 | **Verified** | REQ-11 | FEAT-PROMPT-01 | `tests/system-integration.test.ts` (test 40) |
| **FEAT-SAFETY-01** | Prominent-Person Likeness Neutralizer | P0 | **Verified** | REQ-12 | FEAT-PROMPT-01 | `tests/prompt-safety-review.test.ts` (10 tests) |
| **FEAT-SEO-01** | 5-Title & Hook Description Generator | P1 | **Verified** | REQ-13 | FEAT-SCRIPT-02 | `tests/review-export.test.ts` (test 31) |
| **FEAT-SEO-02** | Timestamped Chapter Marker Generator | P1 | **Verified** | REQ-13 | FEAT-SEO-01 | `tests/review-export.test.ts` (test 31) |
| **FEAT-THUMB-01** | Prompt A / Prompt B Concept Generator | P0 | **Verified** | REQ-14 | FEAT-SCRIPT-02 | `tests/thumbnail-studio.test.ts` (tests 44-50) |
| **FEAT-THUMB-02** | Optional Real Image Rendering (Gemini) | P1 | **Verified** | REQ-15 | FEAT-THUMB-01 | `tests/thumbnail-studio.test.ts` |
| **FEAT-EXPORT-01** | Master Markdown Production Export | P0 | **Verified** | REQ-16 | All Stages | `tests/review-export.test.ts` (test 27) |
| **FEAT-EXPORT-02** | Scrubbed JSON Backup Export | P0 | **Verified** | REQ-17 | All Stages | `tests/review-export.test.ts` (test 28) |
| **FEAT-EXPORT-03** | Stale Artifact Cascade Warning | P0 | **Verified** | REQ-10,16 | FEAT-SCRIPT-03 | `tests/review-export.test.ts` (test 26) |

---

## 2. Provider Management & AI Routing Features

| Feature ID | Feature Name | Priority | Status | Description | Verification Evidence |
|---|---|---|---|---|---|
| **FEAT-PROV-01** | Multi-Provider Connection Registry | P0 | **Verified** | Google GenAI, Groq, OpenRouter, Custom connections | `tests/api-provider-manager.test.ts` |
| **FEAT-PROV-02** | Credential Masking in API Responses | P0 | **Verified** | Omit cleartext keys from public JSON responses | `tests/step1-provider-manager-discovery.test.ts` |
| **FEAT-PROV-03** | Modality Compatibility Separation | P0 | **Verified** | Exclude embeddings, audio, and rerankers from text generation | `tests/step1-provider-manager-discovery.test.ts` |
| **FEAT-PROV-04** | OpenRouter Honest Pricing Engine | P0 | **Verified** | Strictly require prompt=0 & completion=0 for free; unknown otherwise | `tests/step1-provider-manager-discovery.test.ts` |
| **FEAT-PROV-05** | Credential Storage Isolation & Hardening | P0 | **In Progress** | Move from plaintext `.provider_connections.json` to encrypted/env config | Phase 0 Remediation |
| **FEAT-ROUTER-01** | Unified AI Execution Engine | P0 | **Planned** | Shared request pipeline with typed contracts across all stages | Target V.2 (Phase 3) |
| **FEAT-ROUTER-02** | Cost Policy Router (Free Only / Prefer Free) | P0 | **Planned** | Server-enforced cost boundaries with zero silent paid fallbacks | Target V.2 (Phase 4) |
| **FEAT-ROUTER-03** | Two-Pool Architecture (Auto Free vs BYOK) | P1 | **Planned** | Clean separation of verified free vs user-paid provider pools | Target V.2 (Phase 4) |
| **FEAT-TELEMETRY-01**| Usage & Jobs Telemetry Dashboard | P1 | **Planned** | Truthful job logs separating provider quota from local estimates | Target V.2 (Phase 5) |
