# Assessment TODO

Timebox start: **2026-08-08 12:40:21 IST**

Final implementation and real LAN-browser verification completed: **2026-08-08 13:38:26 IST** (58 minutes).

## Planning and repository

- [x] Read the complete assessment and scoring rubric.
- [x] Inspect the supplied HTML prototype.
- [x] Confirm the Supabase environment keys without exposing values.
- [x] Record the implementation start time.
- [x] Scaffold the Next.js/TypeScript application.
- [x] Commit each logical milestone.

## Data, authentication, and tenant security

- [x] Add Supabase CLI project configuration and database migration.
- [x] Create the minimum organizations, memberships, accounts, and activity schema.
- [x] Add tenant-consistent foreign keys and database validation.
- [x] Enable and live-test RLS on every tenant-owned table.
- [x] Derive organization and author from `auth.uid()`, never browser input.
- [x] Keep elevated credentials outside application requests and version control.
- [x] Create two real demo Auth users in different organizations.
- [x] Seed accounts and activities for positive and negative tests.

## Backend operations

- [x] Add authenticated account-list/read operation.
- [x] Add authenticated newest-first activity read operation.
- [x] Add validated note-create operation.
- [x] Make note creation idempotent with a database uniqueness constraint.
- [x] Return understandable authentication, authorization, validation, and server errors.

## Frontend vertical slice

- [x] Integrate the supplied visual design as Next.js components.
- [x] Implement real email/password sign-in and sign-out.
- [x] Add two quick-select demo-user tabs that populate the login form.
- [x] Add protected-route session refresh.
- [x] Support account selection.
- [x] Show loading, empty, success, and error states.
- [x] Disable duplicate submissions while a request is active.
- [x] Support idempotency-key generation from insecure LAN development origins.
- [x] Verify visible submission feedback in a real browser on the insecure LAN URL.

## Verification and submission

- [x] Demonstrate successful read and create.
- [x] Demonstrate Organization A cannot read or write Organization B's account.
- [x] Demonstrate a retried create does not create a duplicate.
- [x] Add an automated live Supabase integration test.
- [x] Run lint, type checking, and production build.
- [x] Document a production failure mode and detection strategy.
- [x] Complete README setup/schema/timebox instructions.
- [x] Complete the 1-3 page Markdown report.
- [x] Finalize `AI_USAGE.md`, including corrections and verification.
- [x] Record incomplete work and next steps honestly.
