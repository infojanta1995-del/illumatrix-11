# ILLUMATRIX V.2 — Project Requirements Document (PRD)

> **Document Status:** Active Baseline  
> **Source of Truth:** `ILLUMATRIX_V2_GOOGLE_AI_STUDIO_PROJECT_BRIEF.md` & Existing Verified Codebase  
> **Last Verified:** 2026-10-23

---

## 1. Product Mission & Scope

### 1.1 Mission
ILLUMATRIX is an AI-assisted video production preparation workspace engineered to transform raw source material into a structured, reviewable, high-retention production bundle without hallucinations, stale outputs, or credential leaks.

### 1.2 Target Users
- **Solo Content Creators & Video Producers**: Creating YouTube Shorts, Instagram Reels, TikToks, and long-form explainers.
- **Documentary & Educational Writers**: Requiring strict source grounding, narrative pacing, and multi-scene continuity.
- **Visual Prompt Directors**: Using Google Flow, Midjourney, or Sora to generate cohesive scenes from approved scripts.

### 1.3 Scope Boundary
- **In-Scope**:
  - 7-stage guided content workflow (`01_SETUP` to `07_REVIEW_EXPORT`).
  - Strict grounding in user-provided ground-truth source text (zero fact fabrication).
  - Shorts pacing invariants (8-second scenes for 24s, 32s, 40s, 48s).
  - Script versioning, rollback, and upstream cascading invalidation matrix.
  - Multi-provider AI manager (Google GenAI, Groq, OpenRouter, custom OpenAI-compatible).
  - Prompt safety engine preventing deepfakes / recognizable likenesses of real public figures in generative video prompts.
  - Secret scrubbing and export safety.
- **Out-of-Scope**:
  - In-app video timeline rendering / NLE video editing (ILLUMATRIX prepares scripts, prompts, and assets for external video engines).
  - In-app audio synthesis (teleprompter text and sound design directions are prepared for external TTS/DAWs).
  - Chatbots, conversational copilots, or generic "Ask AI" widgets.

---

## 2. Functional Requirements

| Req ID | Domain | Requirement Statement | Status | Linked Feature | Tests |
|---|---|---|---|---|---|
| **REQ-01** | Setup | System shall support video formats `9:16_SHORTS` and `16:9_LONG_FORM`. | Verified in Code | `FEAT-SETUP-01` | `tests/system-integration.test.ts` |
| **REQ-02** | Setup | For `9:16_SHORTS`, system shall enforce exact durations: 24s (3 scenes), 32s (4 scenes), 40s (5 scenes), and 48s (6 scenes), where each scene represents exactly 8 seconds. | Verified in Code | `FEAT-SETUP-02` | `tests/system-integration.test.ts` |
| **REQ-03** | Setup | For `16:9_LONG_FORM`, system shall allow duration options [3, 4, 5, 8, 10] minutes pending resolution of minimum duration conflict. | Verified in Code (Unresolved Conflict) | `FEAT-SETUP-03` | `tests/system-integration.test.ts` |
| **REQ-04** | Setup | System shall provide 7 content modes (`documentary`, `explainer`, `breaking_news`, `horror_story`, `funny`, `scifi_explainer`, `detailed_explainer`). | Verified in Code | `FEAT-SETUP-04` | `tests/system-integration.test.ts` |
| **REQ-05** | Setup | System shall support English (`en`) and Hindi (`hi`), strictly mandating natural Devanagari Hindi when `hi` is selected. | Verified in Code | `FEAT-SETUP-05` | `tests/system-integration.test.ts` |
| **REQ-06** | Setup | System shall support 13 distinct visual styles (`cinematic`, `paper_craft`, `claymation`, etc.). | Verified in Code | `FEAT-SETUP-06` | `tests/system-integration.test.ts` |
| **REQ-07** | Sources | Source library shall preserve exact whitespace, line breaks, word counts, character counts, and versioning across reloads. | Verified in Code | `FEAT-SRC-01` | `tests/system-integration.test.ts` |
| **REQ-08** | Script | Script generation must strictly ground factual information in selected source story; zero invented statistics or fake news. | Verified in Code | `FEAT-SCRIPT-01` | `tests/phase9-release-readiness.test.ts` |
| **REQ-09** | Script | Script studio shall support side-by-side editing, word count pacing warnings, revision history, rollback, and explicit approval gating. | Verified in Code | `FEAT-SCRIPT-02` | `tests/review-export.test.ts` |
| **REQ-10** | Prompts | Scene prompt generation shall require approved script in Stage 03; changing upstream script increments version and marks downstream scene prompts as stale. | Verified in Code | `FEAT-PROMPT-01` | `tests/review-export.test.ts` |
| **REQ-11** | Prompts | Changing visual style in Stage 04 must preserve approved script narration byte-for-byte; only visual descriptors may be regenerated. | Verified in Code | `FEAT-PROMPT-02` | `tests/system-integration.test.ts` |
| **REQ-12** | Prompts | Prompt Safety Engine shall detect and neutralize prompts requesting synthetic face likenesses or digital clones of living prominent public figures. | Verified in Code | `FEAT-SAFETY-01` | `tests/prompt-safety-review.test.ts` |
| **REQ-13** | SEO | SEO Package shall generate 5 title variations, hook-optimized description, tags, and timestamped chapter markers based on approved script. | Verified in Code | `FEAT-SEO-01` | `tests/system-integration.test.ts` |
| **REQ-14** | Thumbnails | Thumbnail Studio shall generate two distinct concepts: Option A (Object of Enigma / Macro Focus) and Option B (Observer Discovery / Dramatic Tension). | Verified in Code | `FEAT-THUMB-01` | `tests/thumbnail-studio.test.ts` |
| **REQ-15** | Thumbnails | Real image rendering shall be offered only when an eligible image generation provider/model is active; otherwise prompt export is preserved. | Verified in Code | `FEAT-THUMB-02` | `tests/thumbnail-studio.test.ts` |
| **REQ-16** | Review | Review & Export stage shall display audit readiness checklist, block unapproved scripts, alert on stale downstream assets, and provide copyable/downloadable exports. | Verified in Code | `FEAT-EXPORT-01` | `tests/review-export.test.ts` |
| **REQ-17** | Review | Exports (JSON, Markdown, clipboard) shall undergo strict secret scrubbing and must never include API keys or private tokens. | Verified in Code | `FEAT-EXPORT-02` | `tests/phase10-master-compliance.test.ts` |
| **REQ-18** | Provider | Multi-provider manager shall support Google GenAI, Groq, OpenRouter, and custom OpenAI-compatible endpoints with separate connection records. | Verified in Code | `FEAT-PROV-01` | `tests/api-provider-manager.test.ts` |
| **REQ-19** | Provider | Credentials must be stored exclusively on the server and masked in all client APIs (`conn.apiKey` never returned in public payloads). | Partially Verified (Storage needs hardening) | `FEAT-PROV-02` | `tests/step1-provider-manager-discovery.test.ts` |
| **REQ-20** | Provider | Model compatibility engine shall separate text models from embeddings, audio, and rerankers. | Verified in Code | `FEAT-PROV-03` | `tests/step1-provider-manager-discovery.test.ts` |
| **REQ-21** | Provider | OpenRouter pricing classifier shall require prompt=0 AND completion=0 for `verified_free`; missing/ambiguous pricing must be classified as `unknown` (never assumed free). | Verified in Code | `FEAT-PROV-04` | `tests/step1-provider-manager-discovery.test.ts` |
| **REQ-22** | Provider | System shall provide cost policies (`Free Only`, `Prefer Free`, `Cost Controlled`, `Manual`) enforced at the server routing layer. | Planned (Target V.2) | `FEAT-ROUTER-01` | TBD |

---

## 3. Non-Functional Requirements

- **NFR-01 (Security)**: Zero cleartext API keys exposed to browser, console logs, error responses, JSON backups, or export artifacts.
- **NFR-02 (Reliability)**: Deterministic local fallback generator guarantees all 7 workflow stages function without network failure when no live AI key is provided.
- **NFR-03 (Performance)**: Fast stage transitions (<100ms client state transitions); bounded network requests with 30-45s timeout.
- **NFR-04 (Pacing Invariant)**: Narration word budget must comfortably match target duration (16–22 words per 8s scene for Shorts; 55–75 words per 30s block for Long-Form).
- **NFR-05 (Accessibility & Keyboard Navigation)**: Escape closes modals/drawers; `Alt+1` through `Alt+7` provide direct stage jumping.

---

## 4. Unresolved Product Decisions & Gaps

1. **DEC-01 (Long-form Minimum Duration)**:
   - *Conflict*: Code currently supports `[3, 4, 5, 8, 10]` minutes (allowing a 3-minute minimum in `src/types/hud.ts` and `SetupWorkspace.tsx`), whereas certain specification notes specify a 4-minute minimum.
   - *Status*: **UNRESOLVED / TBD**. Existing code behavior (3 min available) is preserved without silent change until product owner confirms.
2. **DEC-02 (Deployment Model)**:
   - *Question*: Is ILLUMATRIX strictly a single-user local tool or a network-accessible multi-user application?
   - *Impact*: Affects whether server-side session authentication, CSRF tokens, and user-isolated database storage are required.
   - *Status*: **UNRESOLVED / TBD**.
3. **DEC-03 (SEO Mandatory vs Optional Gate)**:
   - *Conflict*: SEO is marked as optional in Stage 05 descriptions, but Review & Export completeness checklist evaluates SEO status.
   - *Status*: **UNRESOLVED / TBD**. Current code allows export even if SEO is draft, but flags it in the audit checklist.
