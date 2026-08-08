# AI Usage Log

## Tool and timebox

- Assistant: OpenAI Codex
- Timebox started: 2026-08-08 12:40:21 IST
- Candidate retained final responsibility for architecture, security, and verification.

## Important prompts

### Initial implementation brief

The candidate asked Codex to read the assessment completely, follow every stated criterion, avoid guessing, integrate the supplied HTML design into a production-structured Next.js/TypeScript application, use real Supabase Auth and PostgreSQL RLS, manage migrations and demo data through project tooling, keep this log and a TODO current, and commit each logical change.

This prompt influenced the decision to pause implementation until the assessment, prototype, repository, credentials, timer state, and empty Auth project had been checked.

### Refined prompt after clarification

The candidate clarified that the two-hour timer began at implementation time, the current `Frontend/.env` contains the required Supabase credentials, and Supabase Auth is empty. They requested fresh demo users created through an appropriate project workflow.

This refinement removed the earlier ambiguity about whether identities already existed and established the implementation start time.

## Suggestions and decisions

| Suggestion | Decision | Reason / verification plan |
| --- | --- | --- |
| Use a separate backend service | Rejected | Next.js route handlers satisfy the required backend operations with less timebox overhead. |
| Use browser-provided `organization_id` | Rejected | Tenant context must come from the authenticated identity and database-enforced membership. |
| Use a service-role key for application requests | Rejected | Normal requests will use the authenticated user's cookie session so RLS remains authoritative. |
| Use PostgreSQL RLS plus composite tenant foreign keys | Accepted | This provides database enforcement even if an account UUID is tampered with. |
| Use a client-generated UUID idempotency key backed by a unique constraint | Accepted | The database becomes the concurrency-safe duplicate boundary. |

## Verification of AI output

Planned verification includes TypeScript compilation, linting, a production build, real authenticated read/create requests, a cross-tenant denial, and a repeated idempotency-key request that returns one stored note. SQL policies and grants will be reviewed independently before being applied.

## Corrections

No AI-generated implementation has required correction yet. This section will be updated when code and live verification expose an incorrect or incomplete suggestion.

