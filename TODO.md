# Assessment TODO

Timebox start: **2026-08-08 12:40:21 IST**

## Planning and repository

- [x] Read the complete assessment and scoring rubric.
- [x] Inspect the supplied HTML prototype.
- [x] Confirm the Supabase environment keys without exposing values.
- [x] Record the implementation start time.
- [x] Scaffold the Next.js/TypeScript application.
- [ ] Commit each logical milestone.

## Data, authentication, and tenant security

- [ ] Add Supabase CLI project configuration and database migration.
- [ ] Create the minimum organizations, memberships, accounts, and activity schema.
- [ ] Add tenant-consistent foreign keys and database validation.
- [ ] Enable and test RLS on every tenant-owned table.
- [ ] Derive organization and author from `auth.uid()`, never browser input.
- [ ] Keep elevated credentials outside application requests and version control.
- [ ] Create two real demo Auth users in different organizations.
- [ ] Seed accounts and activities for positive and negative tests.

## Backend operations

- [ ] Add authenticated account-list/read operation.
- [ ] Add authenticated newest-first activity read operation.
- [ ] Add validated note-create operation.
- [ ] Make note creation idempotent with a database uniqueness constraint.
- [ ] Return understandable authentication, authorization, validation, and server errors.

## Frontend vertical slice

- [ ] Integrate the supplied visual design as Next.js components.
- [ ] Implement real email/password sign-in and sign-out.
- [ ] Add protected-route session refresh.
- [ ] Support account selection.
- [ ] Show loading, empty, success, and error states.
- [ ] Disable duplicate submissions while a request is active.

## Verification and submission

- [ ] Demonstrate successful read and create.
- [ ] Demonstrate Organization A cannot read or write Organization B's account.
- [ ] Demonstrate a retried create does not create a duplicate.
- [ ] Add at least one automated test.
- [ ] Run lint, type checking, and production build.
- [ ] Document a production failure mode and detection strategy.
- [ ] Complete README setup/schema/timebox instructions.
- [ ] Complete the 1-3 page Markdown report.
- [ ] Finalize `AI_USAGE.md`, including any corrections and verification.
- [ ] Record incomplete work and next steps honestly.
