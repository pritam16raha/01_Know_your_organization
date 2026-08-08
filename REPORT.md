# Engineering Report: Secure Multi-Tenant Activity Feed

## Summary

This submission implements the requested activity-feed vertical slice with Next.js 16, TypeScript, Supabase Auth, and PostgreSQL. A signed-in user can select one of their organization's accounts, read activity notes newest first, and add a note. The UI includes loading, empty, success, validation, authorization, and server-error behavior. Create retries are idempotent.

The design treats tenant isolation as a database invariant rather than a UI convention. The client never sends an organization identifier. Next.js authenticates each operation using Supabase session cookies, and the database independently derives access from `auth.uid()` and `memberships` under RLS.

## Architecture and data design

The frontend is a Next.js App Router application. Next.js `proxy.ts` refreshes Supabase sessions and performs only optimistic page redirects; every route handler repeats authoritative authentication before accessing data. Route handlers validate input with Zod and call three narrow PostgreSQL functions: workspace/account discovery, newest-first activity reads, and duplicate-safe note creation.

The schema is intentionally small:

- `organizations` owns tenant identity.
- `memberships` links real `auth.users` identities to organizations.
- `accounts` belongs to an organization.
- `activity_entries` records the account, derived organization, derived author, note, creation time, and idempotency key.

Composite foreign keys ensure an activity cannot claim an organization different from its account or author membership. The application role can insert only `account_id`, `body`, and `idempotency_key`. A trigger looks up the visible account and overwrites organization and author from authenticated database context. This remains safe even if a caller bypasses the UI and calls the Data API directly.

## Security approach

RLS is enabled on all four application tables. Selection policies call a non-recursive, security-definer membership helper based on `auth.uid()`. The helper has an empty `search_path`, explicit schema qualification, and narrowly granted execution. Read and create functions run as the invoker, so they cannot bypass RLS.

An inaccessible account and a missing account intentionally produce the same error, reducing account enumeration. The normal application never receives or uses a service-role key. Elevated access exists only in the local demo bootstrap: it retrieves the key transiently through the authenticated Supabase Management API, creates users via the supported Auth Admin API, seeds their memberships/accounts, and discards the key.

Note creation trims and validates 1–2,000 characters in both TypeScript and PostgreSQL. A caller-generated UUID represents the intended operation. PostgreSQL enforces one row per `(organization_id, idempotency_key)`. A retry with the same account, author, and body returns the original row; reuse for different request content is rejected.

## Tests and evidence

Two real Auth users were created in Northstar Labs and Rival Systems. Northstar owns Acme Corporation and Globex Retail; Rival owns a confidential account.

The live Supabase integration test verified authentication for both users, correct workspace filtering, a seeded activity read, newest-first ordering, duplicate-safe creation, and direct cross-tenant denial. The Supabase database linter reported no findings.

The HTTP integration test exercised the deployed Next.js boundary and observed:

- unauthenticated workspace: `401`;
- successful read: `200`;
- first create: `201`;
- identical retry: `200`, the same activity ID, and `wasDuplicate: true`;
- tenant-A read of tenant-B account: `403`;
- tenant-A write to tenant-B account: `403`.

Direct RPC denials returned PostgreSQL code `42501`. Type checking, ESLint, and the optimized Next.js production build all pass.

## Trade-offs, operations, and remaining work

The assessment models one active organization per identity. The database therefore has a unique membership constraint on `user_id`. A production system requiring multi-organization membership should add an explicit organization switcher and a server-maintained active-tenant context rather than infer a tenant from arbitrary client input.

For production, I would monitor authentication and authorization failure ratios (`401`, `403`, and PostgreSQL `42501`) by route and release. A sustained increase could identify expired-session problems, membership-sync failures, regressions, or account-ID probing. Logs must omit note bodies, credentials, cookies, tokens, and idempotency keys.

The required feature is complete within the timebox. Optional screenshots and recording were not produced. Pagination, browser-level Playwright coverage, generated database types, password recovery, CI, request tracing, and real telemetry wiring remain future improvements. These were deliberately deferred to keep the submitted slice small, secure, and verifiable.

