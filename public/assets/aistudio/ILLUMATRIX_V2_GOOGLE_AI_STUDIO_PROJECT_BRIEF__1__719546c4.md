# ILLUMATRIX V.2 — Google AI Studio Project Brief & Step-by-Step Update Instructions

> **Purpose:** Is file ko Google AI Studio mein project ke saath provide karein. AI Studio ko pehle existing project inspect karna hai, phir project ki actual state aur approved target plan ke mutabik documentation create/update karni hai, aur uske baad controlled, step-by-step implementation karni hai.
>
> **Critical rule:** Existing project ko scratch se rewrite mat karna. Pehle audit, phir plan, phir ek scoped change, phir verification. Kisi unverified feature ko implemented ya complete mat batana.

---

## 1. AI Studio ke liye primary instruction

You are the technical lead and implementation assistant for **ILLUMATRIX V.2**. Your job is to help evolve the existing ILLUMATRIX-10 project into the approved ILLUMATRIX V.2 target without destroying existing working functionality.

Before changing code:

1. Inspect the complete project tree and relevant source files.
2. Read the existing `README`, package configuration, source code, tests, provider configuration, and existing documentation.
3. Report what is **verified in code**, what is **reported but not yet verified**, what is **missing**, and what is **uncertain**.
4. Do not assume that a provider listed in a registry is fully integrated or that a test declaration means the test passes.
5. Create or update the project documentation listed in Section 3.
6. Present the audit findings, risks, unresolved decisions, and proposed Phase 0 tasks before implementing substantial changes.
7. Implement only one clearly scoped task at a time. After each task, run the most relevant available checks and update `PROJECT_MEMORY.md`.
8. Preserve existing work and backward compatibility wherever practical. Do not replace existing modules merely because a new architecture is preferred.

Use the project’s existing technology stack unless the code audit demonstrates a concrete reason to change it. Avoid adding dependencies without explaining their purpose and trade-offs.

## 2. Product mission: what we are building

**ILLUMATRIX** is an AI-assisted video-content production workspace. It should guide a user from source material to an organized, reviewable production package.

### Core content workflow

`Source Story / Source Library`
→ `Script Studio`
→ `Script Review and Approval`
→ `Scene Prompt Studio`
→ `SEO Package`
→ `Thumbnail Studio`
→ `Review & Export`

The application should help users create and manage scripts, scene-by-scene visual prompts, SEO metadata, thumbnail concepts/images where supported, and a final production package. Results should remain editable, traceable to their inputs, and protected against stale or mismatched outputs.

### Existing workflow to preserve and verify

The supplied source-code audit reported these seven stages. Verify each against the actual code before documenting it as confirmed:

1. Setup & Rules
2. Source Library
3. Script Studio
4. Scene Prompt Studio (may be named `Scene Prompts` in the current UI)
5. SEO Package
6. Thumbnail Studio
7. Review & Export

Preserve existing content modes, visual styles, approvals, rollback/version behavior, and current useful UI features. Do not remove or rename them without a documented reason and an explicit migration plan.

### Existing technical baseline reported by an earlier audit

The earlier audit report described the project as React + TypeScript + Vite + Tailwind on the frontend, with an Express server. It identified likely important files/modules such as:

- `src/App.tsx`
- `src/context/WorkflowContext.tsx`
- `src/data/registries.ts`
- `src/types/hud.ts`
- stage components
- `src/server/providerManager.ts`
- `src/server/modelCompatibility.ts`
- `src/services/aiService.ts`
- `src/services/storage.ts`
- `src/services/promptSafetyEngine.ts`
- `server.ts`
- `tests/`

**These are audit leads, not guaranteed current facts.** Inspect the real repository and revise this list if the actual structure differs. Do not invent files, APIs, functions, test results, package versions, or implementation status.

---

## 3. Required root documentation files

Create or update the following files in the project root, using the real codebase and this approved plan. If a file already exists, read it and update it instead of blindly replacing useful content.

### 3.1 `README.md`
Document the real project overview, actual technology stack, verified prerequisites, installation, environment configuration using placeholder variable names only, development/build/test commands, folder structure, current status, known limitations, and maintenance rules. Verify commands against `package.json` and actual scripts. Never put real API keys, tokens, or passwords in documentation.

### 3.2 `PROJECT_REQUIREMENTS.md`
Define the product mission, target users, scope, out-of-scope items, functional requirements with unique IDs, non-functional requirements, business rules, security requirements, success criteria, constraints, assumptions, and unresolved questions. Link major requirements to features, implementation tasks, and tests. Use `TBD` when a decision or measurement is unknown.

### 3.3 `ARCHITECTURE.md`
Document the actual architecture and approved target architecture, major components, inputs/outputs, dependencies, request/data flows, folder responsibilities, storage model, API/integration contracts, security architecture, error handling, deployment model, and architecture decisions. Clearly distinguish **current implementation** from **target design**.

### 3.4 `FEATURES.md`
Create a feature inventory with unique IDs, priorities, status, dependencies, related requirements, user workflow, inputs, validation, processing, outputs, UI states, edge cases, acceptance criteria, and testing approach. Use separate statuses such as `Planned`, `In Progress`, `Implemented`, `Testing`, `Verified`, `Blocked`, and `Deferred`. `Implemented` is not the same as `Verified`.

### 3.5 `IMPLEMENTATION_PLAN.md`
Create phased tasks with task IDs, objective, scope, prerequisites, likely affected files, dependencies, deliverables, verification commands/procedures, exit criteria, status, risks, and rollback considerations. Order work by risk and dependency, not by visual appeal. Keep the first phase focused on baseline verification and security risks.

### 3.6 `DESIGN_SYSTEM.md`
Inspect the actual UI before documenting it. Record existing visual style, colors/tokens, typography, spacing, layout, reusable components, interaction states, responsive behavior, accessibility, and motion rules. Do not invent a new design system or redesign the application unless that is explicitly approved. Prefer existing components and tokens.

### 3.7 `PROJECT_MEMORY.md`
Maintain a concise but useful handoff record containing current phase/task, last verified state, completed and verified work, in-progress work, known issues, important decisions, files changed, exact commands run and their results, blockers, and the next exact task. Never store secrets. Only mark work complete when verification evidence exists. Update this file after every meaningful task.

### Documentation consistency rules

- Label facts as `Verified`, `Reported—Not Verified`, `Planned`, `Assumption`, or `TBD` where useful.
- Keep the seven files consistent with one another and with the real code.
- Do not fill unknown gaps with invented facts.
- Keep implementation and verification separate.
- Update relevant docs when behavior or architecture changes.
- Avoid duplicate or unnecessary documentation.
- If a listed file is not relevant, explain why before omitting it.
- Include a short audit summary and an ordered next-step list in `PROJECT_MEMORY.md`.

---

## 4. Target architecture: shared AI Execution Engine

The main architectural goal is to avoid having every workflow stage implement its own unrelated provider integration. All AI-powered tasks should go through a shared **AI Execution Engine**, with provider adapters behind it.

Target flow:

`Workflow Stage`
→ `Typed AI Execution Request`
→ `Request and Schema Validation`
→ `Task Classification`
→ `Cost Policy Enforcement`
→ `Eligible Model Selection`
→ `Provider Adapter`
→ `Response/Error Classification`
→ `Output Validation`
→ `Version/Revision Check`
→ `Persist Result`
→ `Update UI and Job Status`

Do not implement this as a large rewrite. Map the existing `aiService`, provider manager, model compatibility code, and routes to this design first. Reuse existing code where safe; document any migration steps.

### Suggested typed task categories

Verify actual current names and map them to these task categories as appropriate:

- `script_generation`
- `script_scene_regeneration`
- `scene_prompt_generation`
- `style_regeneration`
- `scene_prompt_repair`
- `thumbnail_prompt_generation`
- `thumbnail_prompt_regeneration`
- `thumbnail_image_generation`
- `seo_generation`

A request should carry, where applicable, a project identifier, source/script revision identifier, task type, input payload, preferred model, cost policy, permission for paid fallback, and output schema/version. Do not force unnecessary fields into the existing system without reviewing current types and persistence.

### Execution lifecycle

Use an observable job lifecycle where it fits the application:

`queued` → `validating` → `selecting_model` → `running` → `retrying` / `failing_over` → `validating_output` → `persisting` → `completed`

Terminal alternatives include `failed` and `cancelled`.

The UI should expose useful status and error information without exposing secrets or sensitive provider responses. Retry limits must be bounded. Avoid duplicate submissions and stale output overwrites.

---

## 5. Provider & Model Manager

Build on the current provider manager rather than creating a parallel system. First verify which features already work, which are partial, and which are absent.

### Provider categories

Support the concept of:

- **Direct providers:** e.g. Google/Gemini, OpenAI, Anthropic, Groq, Mistral, DeepSeek, and others only where a real adapter is implemented and tested.
- **Gateway providers:** e.g. OpenRouter and compatible gateways.
- **Custom/OpenAI-compatible providers:** configurable base URL, protocol/adapter, authentication method, and model ID, subject to strict security validation.
- **Local providers:** e.g. Ollama, only where actual integration is present and verified.

The names above are target candidates, not proof that integrations exist. Preserve existing providers where they are functional. Do not advertise a provider as supported merely because it appears in a registry.

### Provider management capabilities

The intended manager should cover:

- Add/edit/remove a provider connection.
- Store API credentials securely on the server or in an appropriate protected secret store; never expose full keys to the browser, logs, exports, or documentation.
- Display masked credentials and connection status.
- Test a connection and return actionable error categories.
- Discover models automatically where the provider supports discovery.
- Permit manual model IDs where discovery is unavailable.
- Refresh the catalog without destroying valid user configuration.
- Record model capabilities and known limitations.
- Configure preferred models by task.
- Track recent jobs and their actual provider/model.
- Handle timeout, rate limit, provider outage, invalid credentials, and invalid request distinctly.

### Model capability catalog

Where known, record:

- Provider and model identifiers
- Display name
- Supported task/capabilities (text, image input, image generation, structured output, etc.)
- Context limits and output limits
- Pricing/cost status and source/timestamp
- Availability/health status
- Whether capability metadata is verified or unknown

Do not claim audio/video/tool-calling or image-generation capability unless supported by reliable provider metadata or a successful capability test.

### Pricing and free-model classification

Use explicit states such as:

- `verified_free`
- `paid`
- `unknown`
- `provider_managed_or_variable`

**Unknown must never be treated as free.** Record where cost information came from and when it was last checked. Do not claim that any free model has unlimited quota.

### Two separate model pools

Keep these concepts distinct:

1. **Verified Free Pool / Auto Free Pool:** models verified to be free for the applicable route and current terms, subject to real provider quotas and restrictions.
2. **BYOK Provider Pool:** the user's own provider keys and configured models, which can include free, paid, or unknown-cost models.

A user's own OpenRouter, Groq, Google, or other API key does **not** automatically give ILLUMATRIX access to a single universal free pool. Do not describe ILLUMATRIX's pool as Kilo-managed or imply that it has Kilo's proprietary routing service.

### Cost policies

Provide these policy concepts, with explicit UI choices and backend enforcement:

- `Free Only`: only eligible, verified-free models. If none are eligible, stop and explain.
- `Prefer Free`: try eligible free models first; paid fallback only if the user explicitly enabled it.
- `Cost Controlled`: use configured cost limits/allowed models; unknown pricing requires an explicit rule.
- `Manual`: use the user's selected provider/model and show any known cost caveats.

A UI setting alone is not sufficient; the server-side execution path must enforce the policy.

### Task-based routing

Allow a global default and optional per-task model/policy overrides. Select models using:

1. User's cost policy and paid-fallback permission
2. Required task capability
3. Explicit task preference
4. Provider/model health and cooldown
5. Known limits and current eligibility
6. User-configured priority
7. Quality/latency preferences, if measurable

Explain the selected provider/model and the reason for selection where practical. Do not silently switch to a paid model.

### Failure and failover rules

- Rate limit / quota limit: respect provider signals, apply cooldown, and try another eligible model only if policy permits.
- Temporary provider/network failure: bounded retry with backoff, then eligible fallback.
- Invalid key/authentication: mark the connection as needing attention; do not endlessly retry.
- Invalid request/schema: fix or report the request error; do not blindly cycle through providers.
- Unsupported capability: exclude that model and explain why.
- No eligible model: preserve the user's draft/input, show the reason, and provide recovery options.
- Output validation failure: use a bounded repair attempt only if safe and configured; otherwise preserve the failed result for diagnosis.
- Never repeat requests indefinitely or lose existing user work.

---

## 6. Quota, usage, jobs, and truthful telemetry

Create a Usage & Jobs view after the provider and execution foundations are reliable.

Keep these data sources separate:

1. **Provider-reported quota:** explicit provider API information, if available.
2. **Rate-limit headers:** actual headers observed from the provider response.
3. **Locally observed usage:** requests/tokens/latency/errors observed by ILLUMATRIX.
4. **Estimated cost:** calculation based on known pricing and observed usage, with its assumptions.
5. **Unknown / not reported:** when no trustworthy information is available.

Do not display a local request count as the provider's remaining quota. Do not invent remaining credits or reset times. Every metric should make its source clear and, where possible, show the last-updated time.

Useful job details include task type, timestamp, status, provider/model, duration, retry/failover history, error category, and usage/cost if reliably available. Redact credentials, private prompt data where inappropriate, and sensitive response content from logs.

---

## 7. Existing content workflow requirements

### Script Studio
- Preserve existing script-generation and editing behavior.
- Maintain clear links to source material and script revisions.
- Keep approval/version/rollback behavior if it exists.
- Avoid overwriting approved work with results generated from an older source/script revision.
- Validate generated output before marking it ready.

### Scene Prompt Studio
- Generate scene prompts from the approved script/revision.
- Preserve visual-style settings and existing content modes.
- Support targeted regeneration and repair without unintentionally replacing unrelated scenes.
- Track which script revision produced the prompts.
- Detect and mark stale prompts after relevant upstream changes.

### SEO Package
- SEO remains a first-class workflow module.
- SEO generation may be optional for a user who is not publishing, but if a complete publishing package is selected, readiness should require the required SEO fields.
- Do not silently conflict with existing registry/blueprint rules; inspect the current implementation and record the chosen behavior as an explicit decision.

### Thumbnail Studio
- Separate thumbnail prompt generation from actual image generation.
- Only offer image generation when a working adapter and supported model are configured.
- The earlier audit reported the current thumbnail image-rendering route was Google GenAI-specific; verify this in code before deciding how to generalize it.
- Preserve prompts and user inputs when rendering fails.
- Do not label a prompt as a rendered image.

### Review & Export
- Show package readiness and missing items clearly.
- Export only the appropriate project artifacts and never API keys or secrets.
- Verify export/import behavior and backward compatibility.
- Include revision/version metadata where useful.
- Make clear which outputs are final, draft, failed, or stale.

### Shorts timing rule reported by the audit

The prior audit reported this mapping; verify the current code and document it if confirmed:

- 24 seconds → 3 scenes
- 32 seconds → 4 scenes
- 40 seconds → 5 scenes
- 48 seconds → 6 scenes
- Each scene is 8 seconds

Do not silently invent or alter duration rules.

### Long-form minimum duration conflict

The prior notes identified a conflict between a 3-minute and a 4-minute minimum for long-form content. This is **UNRESOLVED**. Inspect current behavior, document the conflict, and ask for a product decision before changing it. Do not silently choose either value.

---

## 8. Security and stability: first priority

The earlier source audit raised the following potential issues. Treat them as **reported risks requiring verification**, not as confirmed vulnerabilities until inspected.

1. `.provider_connections.json` may contain credential-shaped values in plaintext.
2. Route-level authentication/authorization may not be visible or implemented.
3. The server may bind to `0.0.0.0` and Vite may have permissive `allowedHosts` configuration.
4. Custom provider URLs may create SSRF risk.
5. The production build/startup path may not be verified; the audit reported a Vite-only build script and `node server.ts` start command.
6. Tests were listed but reportedly not executed.
7. Provider errors/logging may expose sensitive information unless checked.

### Required security actions

- Inspect tracked files and local config for secrets. Do not print secrets in audit reports.
- If a real credential may have been committed or shared, tell the project owner to revoke/rotate it. Do not copy it into new files or logs.
- Ensure secret files are excluded from distributable artifacts and version control; verify the actual ignore/package rules.
- Prefer environment variables or a protected server-side secret store, with clear migration and backward-compatibility steps.
- Mask secrets in UI and logs; never send full provider keys to the frontend.
- Add appropriate authentication/authorization for the intended deployment model. If the app is local single-user, document that boundary; if network-accessible or multi-user, design access control accordingly.
- Validate custom endpoint schemes, hosts, DNS/IP resolution, redirects, ports, and private/link-local/loopback destinations as appropriate. Avoid SSRF and DNS-rebinding paths. Do not allow arbitrary server-side fetches to internal metadata or private network services.
- Apply request size limits, timeouts, safe error handling, and appropriate rate limiting.
- Restrict development-server host allowances to what is actually needed.
- Ensure exports and logs never contain credentials.
- Add tests for security boundaries and failure cases.
- Do not claim a security fix is complete until tests or a documented manual verification support it.

### Deployment model is unresolved

Determine whether ILLUMATRIX is intended for:
- **Local single-user use**, or
- **Network-accessible / multi-user use**.

Do not assume one. Record it as `TBD` and ask for the decision before making security-sensitive deployment changes that depend on it. You may still perform read-only audit and low-risk baseline checks.

---

## 9. Verification rules

Before any change, capture the baseline where practical:

- Current branch/working tree state, if Git is available.
- Project structure and package scripts.
- Existing tests and their actual status.
- Build/type-check/lint commands that are genuinely configured.
- Critical workflow smoke-test observations.
- Existing issues and warnings.

After each scoped implementation task:

1. State which files changed and why.
2. Run the relevant configured test(s).
3. Run type-check/lint/build only if commands exist and are feasible.
4. Report exact command and real result; do not fabricate output.
5. If a check fails, diagnose it and record the failure.
6. Verify that unrelated workflows still work to the extent possible.
7. Update `PROJECT_MEMORY.md` and affected specification files.
8. Mark the task `Verified` only when its acceptance criteria and verification are satisfied.

Do not run live API tests without valid, user-authorized credentials. Use mocked adapters for deterministic tests where appropriate. Never place real secrets in test fixtures or sample documentation.

---

## 10. Phased implementation roadmap

Use these phases as the target roadmap. Adjust the task details after the real audit, but explain every change in priority/order.

### Phase 0 — Baseline audit and security triage
- Inspect repository and existing docs.
- Confirm package scripts, runtime assumptions, tests, build behavior, and current workflow.
- Review secrets/config files without exposing their contents.
- Verify route protections, network binding, host configuration, custom endpoint validation, logging, and export behavior.
- Capture unresolved questions and establish a baseline.
- **Exit criteria:** audit is evidence-based; high-risk findings are documented; no unverified claim is called complete.

### Phase 1 — Stabilize the existing workflow
- Run existing tests and configured checks.
- Fix high-impact regressions with minimal changes.
- Verify each of the seven workflow stages.
- Verify state persistence, approvals, rollback, stale-artifact behavior, and import/export.
- Resolve or explicitly defer known conflicts, including the long-form duration rule.
- **Exit criteria:** current core workflow is demonstrably stable or remaining blockers are clearly documented.

### Phase 2 — Harden Provider & Model Manager
- Verify existing connection CRUD, key masking, connection tests, model discovery, catalog refresh, compatibility, pricing classification, quota/error state.
- Secure credential storage and migration.
- Add or strengthen provider adapters only where scoped and testable.
- Add custom-provider URL security checks.
- **Exit criteria:** provider settings are safe, observable, and covered by tests; unsupported capabilities are not falsely advertised.

### Phase 3 — Establish shared AI Execution interface
- Define/reuse typed execution request/result contracts.
- Map existing AI routes to the shared engine incrementally.
- Introduce mock adapters and deterministic tests.
- Add schema/output validation and source/revision metadata.
- **Exit criteria:** at least the first selected task goes through the shared execution path without breaking existing behavior; exact scope is recorded.

### Phase 4 — Add cost-policy router and bounded failover
- Implement Free Only, Prefer Free, Cost Controlled, and Manual policies.
- Separate verified-free and BYOK pools.
- Apply task capability eligibility, provider health, cooldowns, retries, and paid-fallback permission.
- Preserve drafts on failures.
- **Exit criteria:** tests prove that Free Only never selects paid/unknown-cost models and that paid fallback never happens without explicit permission.

### Phase 5 — Usage & Jobs dashboard
- Show job lifecycle, provider/model used, duration, retries/failover, error categories, and trustworthy usage/cost telemetry.
- Separate provider-reported quota from local observations and estimates.
- **Exit criteria:** displayed data is source-labeled and does not fabricate remaining quota or reset time.

### Phase 6 — Production readiness
- Validate build/startup and deployment configuration.
- Verify security boundaries, logging, secrets, exports, tests, error recovery, and documentation.
- Complete a release checklist and document known limitations.
- **Exit criteria:** release claims are backed by recorded verification evidence.

---

## 11. Acceptance criteria for the target system

The project should not be called complete until the applicable criteria below are verified.

### Provider and model management
- Provider connections can be added/edited/removed safely.
- Full API keys are never exposed in frontend responses, logs, exports, or docs.
- Model discovery works where supported; manual model IDs are possible where needed.
- Capability and pricing metadata clearly distinguish verified information from unknown values.
- Provider connection failures have actionable messages.

### Execution engine and routing
- AI tasks use the shared execution path rather than duplicating provider logic across stages.
- Every task checks capability and cost policy before execution.
- Free Only never routes to paid or unknown-cost models.
- Paid fallback is impossible unless explicitly authorized by the user's setting.
- Retry/failover is bounded and does not lose the user's draft.
- Output is validated and cannot overwrite newer approved work with stale results.
- Job records identify the actual provider/model when known.

### Content workflow
- Existing seven stages remain available and functional.
- Script, scene prompts, SEO, thumbnails, and exports preserve project/revision relationships.
- Failed generation does not erase previous valid content.
- Stale outputs are detectable.
- Export contains intended artifacts but no secrets.

### Quality and security
- Tests actually run and results are recorded.
- Build/startup commands are verified.
- Secrets are protected and any exposed credentials are flagged for rotation.
- Custom endpoints are validated against SSRF and unsafe-network access.
- Deployment assumptions are documented.
- Known limitations and unresolved product decisions remain visible.

---

## 12. Working rules for every future AI Studio session

At the start of each session:

1. Read `README.md`, `PROJECT_REQUIREMENTS.md`, `ARCHITECTURE.md`, `FEATURES.md`, `IMPLEMENTATION_PLAN.md`, `DESIGN_SYSTEM.md`, and `PROJECT_MEMORY.md` if present.
2. Check the actual source code for the current task rather than relying only on documentation.
3. Read the current `PROJECT_MEMORY.md` next-step section.
4. Summarize the current state briefly: verified completed work, open issues, and the exact next task.
5. Ask for clarification only when a decision is truly blocking or security/product behavior would otherwise be guessed.

For each task:

1. Pick one task from `IMPLEMENTATION_PLAN.md`.
2. State the goal, files likely affected, risk, and acceptance criteria.
3. Make the smallest coherent change.
4. Do not make unrelated refactors or UI redesigns.
5. Test the change and relevant regression paths.
6. Report the real result and any failures.
7. Update `PROJECT_MEMORY.md`, feature status, and requirements/architecture documentation as needed.
8. Stop at the task boundary and identify the next task; do not silently proceed into a broad rewrite.

### Prohibited behavior

- Do not rewrite the application from scratch.
- Do not delete or replace existing working features without approval and a migration plan.
- Do not invent test results, provider capabilities, model prices, quota remaining, API routes, or configuration values.
- Do not treat unknown pricing as free.
- Do not silently switch to a paid model.
- Do not claim provider support based only on a registry entry.
- Do not expose, reproduce, or commit real credentials.
- Do not mark implementation as verified without evidence.
- Do not resolve the 3-minute vs 4-minute long-form rule or the deployment model by guessing.
- Do not create duplicate modules or documentation just to satisfy a checklist.

---

## 13. Immediate first response requested from AI Studio

After reading this brief and inspecting the project, do **not** immediately start a broad code rewrite. First return:

1. **Repository facts:** actual stack, key folders/files, package scripts.
2. **Workflow audit:** status of all seven stages.
3. **Provider audit:** existing provider features, missing pieces, and evidence.
4. **Security findings:** confirmed issues vs risks requiring more investigation. Never print secret values.
5. **Test/build status:** exact checks run and actual results; if not run, say so.
6. **Documentation plan:** which of the seven root files exist and what needs creating/updating.
7. **Open decisions:** especially long-form minimum duration (3 vs 4 minutes) and deployment model (local single-user vs network/multi-user).
8. **Proposed Phase 0 tasks:** ordered by risk and dependency, with acceptance criteria.
9. **Next step:** recommend one smallest safe task and wait for approval before any high-impact or destructive change.

The first deliverable is an accurate project understanding and consistent documentation. The second deliverable is a verified, incremental implementation—not a speculative rewrite.

---

## 14. Project continuity update template

Use this structure at the end of every meaningful implementation session and maintain it in `PROJECT_MEMORY.md`:

```md
## Current State
- Current phase:
- Current task:
- Status:
- Last verified working state:

## Completed and Verified
- Item:
- Files changed:
- Verification command/procedure:
- Actual result:

## In Progress
- Item:
- Work completed:
- Remaining work:

## Known Issues / Risks
- ID:
- Evidence:
- Impact:
- Status:

## Decisions
- Decision:
- Reason:
- Date:
- Status: Confirmed / TBD

## Next Exact Task
- Task ID:
- Goal:
- Likely files:
- Acceptance criteria:
- Verification:
- If it fails:
```

**Final instruction:** Treat this brief as the approved product direction, but treat the actual repository as the source of truth for what currently exists. Preserve existing work, document discrepancies, make one controlled change at a time, and keep the project’s current state and next step accurate after every session.
