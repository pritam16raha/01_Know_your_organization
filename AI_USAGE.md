# AI Usage Log

## Tool and timebox

- Assistant: OpenAI Codex
- Timebox started: 2026-08-08 12:40:21 IST
- Final implementation and real LAN-browser verification completed: 2026-08-08 13:38:26 IST (58 minutes)
- Candidate retained final responsibility for architecture, security, and verification.

## Important prompts

### Initial implementation brief

The candidate asked Codex to read the assessment completely, follow every stated criterion, avoid guessing, integrate the supplied HTML design into a production-structured Next.js/TypeScript application, use real Supabase Auth and PostgreSQL RLS, manage migrations and demo data through project tooling, keep this log and a TODO current, and commit each logical change.

This prompt influenced the decision to pause implementation until the assessment, prototype, repository, credentials, timer state, and empty Auth project had been checked.

### Refined prompt after clarification

The candidate clarified that the two-hour timer began at implementation time, the current `Frontend/.env` contains the required Supabase credentials, and Supabase Auth is empty. They requested fresh demo users created through an appropriate project workflow.

This refinement removed the earlier ambiguity about whether identities already existed and established the implementation start time.

### Evaluator usability refinement

After reviewing the login page, the candidate requested two demo-user tabs above the form so an evaluator can select either tenant, populate its generated email/password, and then sign in without searching local files. This changed the earlier decision to keep demo passwords entirely outside the browser; the implementation limits the behavior to throwaway credentials loaded from an ignored local file and documents that it must not be used for production identities.

## Suggestions and decisions

| Suggestion | Decision | Reason / verification plan |
| --- | --- | --- |
| Use a separate backend service | Rejected | Next.js route handlers satisfy the required backend operations with less timebox overhead. |
| Use browser-provided `organization_id` | Rejected | Tenant context must come from the authenticated identity and database-enforced membership. |
| Use a service-role key for application requests | Rejected | Normal requests will use the authenticated user's cookie session so RLS remains authoritative. |
| Use PostgreSQL RLS plus composite tenant foreign keys | Accepted | This provides database enforcement even if an account UUID is tampered with. |
| Use a client-generated UUID idempotency key backed by a unique constraint | Accepted | The database becomes the concurrency-safe duplicate boundary. |
| Insert demo identities directly into `auth.users` with SQL | Rejected | Real users will be created through the supported Supabase Auth Admin API; the temporary service key is fetched at runtime and never persisted. |
| Allow independent account and organization foreign keys | Rejected | A composite `(organization_id, account_id)` foreign key makes tenant inconsistency impossible at the relational layer. |
| Treat Next.js Proxy as the authorization boundary | Rejected | Version-local Next.js guidance says Proxy is appropriate only for optimistic checks; every route authenticates again and PostgreSQL RLS remains authoritative. |
| Expose generated demo passwords in documentation | Rejected | Random passwords remain in a local ignored file, while setup remains reproducible through the seed command. |
| Add one-click demo identity selection to the login form | Accepted after candidate request | The server reads the ignored generated credential file at request time and passes only the two throwaway demo identities to the login UI; no credential is committed. |

## Verification of AI output

Verification completed so far: the Supabase database linter returned no findings; both demo users authenticated; the tenant-A activity read and create succeeded; results were newest-first; a retry returned the same entry with `was_duplicate: true`; and tenant A's read and create attempts against tenant B's account both failed with PostgreSQL code `42501`. TypeScript, ESLint, and the production build pass. End-to-end HTTP checks confirmed both demo selectors rendered and returned `401` unauthenticated, `200` read, `201` create, `200` idempotent retry with the same entry ID, and `403` for cross-tenant read and write.

## Corrections

The initial tooling plan assumed the latest Supabase CLI could complete `supabase link`. CLI 2.112.0 rejected a valid management API timestamp while parsing project API-key metadata. An attempted older CLI was also rejected because its configuration format was obsolete and its dependency chain emitted a security warning, so it was not used. The corrected approach retained CLI 2.112.0 and used the documented IPv4 session-pooler connection with `supabase db push --db-url`; the database password remained local and was percent-encoded in process memory.

The first generated React data-loading helper changed loading state synchronously when invoked from an effect. The React 19 lint rule correctly rejected this because it can cause cascading renders. The code was changed so effect-triggered helpers update state only after asynchronous I/O; event handlers own immediate loading transitions for retries and account changes.

Manual testing through the candidate's LAN URL exposed another incorrect assumption: `crypto.randomUUID()` is not available to browser JavaScript on an insecure non-localhost origin. Because key creation occurred before the guarded request, submission stopped without a network call or feedback. The corrected implementation uses `randomUUID()` when available, falls back to RFC 4122 version/variant bits over `crypto.getRandomValues()`, resets the key when the draft changes, and generates it inside the handled submission path so any remaining failure produces visible feedback.

When the candidate still observed the old behavior, code-level validation alone was insufficient. Process inspection showed port 3000 was served by a `next start` process created before the corrected production build. Unlike the development server, it could not hot-reload the fix. The stale process was replaced, and a Playwright Core test using the installed Edge browser verified the complete insecure-LAN workflow: demo selection, authentication, Globex submission, visible green feedback, cleared textarea, and one rendered note.
