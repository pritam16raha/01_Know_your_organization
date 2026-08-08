# AI Usage

AI use was required for this assessment. It was used as an engineering tool for requirements analysis, architecture, implementation support, security review, testing, debugging, and submission documentation. The candidate retained responsibility for every architectural and security decision and verified generated work before including it.

## Tools used

- **ChatGPT:** pre-implementation assignment discussion, architecture and security planning, and preparation of the standalone HTML UI prototype used to reduce integration time.
- **OpenAI Codex:** repository inspection, Next.js/TypeScript implementation, Supabase migration and seed workflow, automated verification, debugging, and documentation.
- **Shared ChatGPT record:** <https://chatgpt.com/share/6a771f5f-3f8c-83ee-9a30-e969e5791a6f>

## Timebox and responsibility

- Timebox started: 2026-08-08 12:40:21 IST
- Final implementation and real LAN-browser verification completed: 2026-08-08 13:38:26 IST (58 minutes)
- Candidate retained final responsibility for architecture, security, and verification.

## Important prompts

### Initial implementation brief

The candidate asked Codex to read the assessment completely, follow every stated criterion, avoid guessing, integrate the supplied HTML design into a production-structured Next.js/TypeScript application, use real Supabase Auth and PostgreSQL RLS, manage migrations and demo data through project tooling, keep this log and a TODO current, and commit each logical change.

Representative prompt excerpt: "Follow every single step and criterion mentioned in the document ... don't make any features based on guessing."

This prompt influenced the decision to pause implementation until the assessment, prototype, repository, credentials, timer state, and empty Auth project had been checked.

### Architecture and tenant-security prompt themes

The initial brief and assignment review were converted into these concrete engineering questions before implementation:

1. Design a minimal Supabase/PostgreSQL schema for a multi-tenant account activity feed with tenant enforcement through RLS.
2. Review the RLS and relational constraints for any path that could leak or create cross-tenant activity.
3. Implement tests proving Organization A cannot read or write Organization B's account, including direct database and HTTP-layer evidence.

These are concise paraphrases of the architecture and verification work requested through the broader assessment discussion; they are not presented as verbatim candidate messages.

### Authentication and timebox clarification

The candidate clarified that the two-hour timer began at implementation time, the current `Frontend/.env` contains the required Supabase credentials, and Supabase Auth is empty. They requested fresh demo users created through an appropriate project workflow.

Representative refined prompt excerpt: "It is starting now ... nothing is present in Supabase Auth; seed fresh demo users in the proper way."

The first planning exchange was incomplete because the timer state and whether Auth identities already existed were not yet settled. This refinement supplied both missing facts, removed the ambiguity, and established the implementation start time.

### Evaluator usability refinement

After reviewing the login page, the candidate requested two demo-user tabs above the form so an evaluator can select either tenant, populate its generated email/password, and then sign in without searching local files. This changed the earlier decision to keep demo passwords entirely outside the browser; the implementation limits the behavior to throwaway credentials loaded from an ignored local file and documents that it must not be used for production identities.

Representative prompt excerpt: "Add both demo users at the top of the login page so the investigator can click a tab, fill the respective credentials, and then sign in."

### Hosted demo-access correction

The candidate reported that the quick-access tabs were present locally but absent from the Vercel deployment. Inspection showed that the server-rendered login page read only the ignored local credential file, which is correctly excluded from deployments. The candidate added four server-only Vercel variables for the two throwaway users and requested the deployment flow be completed. The loader was changed to prefer a complete environment configuration, fall back to the local file only when no demo variables are present, and fail closed when the environment is partial.

### Submission-report refinement

The candidate requested an email-ready report covering architecture, tenant security, evidence, trade-offs, incomplete work, and the next two hours. They also required complete manual procedures for tampered cross-tenant reads and writes, identical retries, and the relationship between PostgreSQL `42501` and HTTP `403`, with screenshots and a short video to be attached separately. The report keeps the core narrative within approximately 2-3 pages and places the complete reproducible procedures in an appendix.

### PDF packaging refinement

The candidate asked for the finalized Markdown report to be converted into a PDF suitable for an email attachment. Because no Markdown-to-PDF package was installed, a dependency-free Markdown renderer and the already-installed headless Microsoft Edge browser were used. The generated A4 document keeps the concise report first and begins the manual verification appendix on a new page.

### Public conversation evidence refinement

The candidate asked whether the ChatGPT shared-conversation URL should be included in the emailed report to demonstrate that requirements and architecture were discussed before application code was written and that the standalone HTML prototype intentionally reduced UI implementation time. The link was included as supporting process evidence after a read-only check confirmed that the current shared snapshot did not contain either supplied demo-password fragment or the local Windows project path. The candidate was warned not to update the snapshot after later messages introduced demo credentials, because shared snapshots are publicly accessible to anyone with the link.

### Copy-ready verification appendix refinement

The candidate requested copy controls on the PDF test snippets so the evaluator could paste them directly into DevTools and the Supabase SQL Editor. A PDF button would not behave consistently across viewers, so the commands were retained as selectable PDF text and each test received a deep link to the GitHub-rendered Markdown block, where a native copy button is available. This preserves email-attachment readability while providing a reliable copy workflow.

## Refined prompt

**First prompt:** "Follow every single step and criterion mentioned in the document ... don't make any features based on guessing."

**Why refinement was required:** The first planning exchange did not yet settle whether the implementation timer had begun or whether Supabase Auth already contained identities. Those facts affected both the workflow and the safe demo-data approach.

**Refined prompt:** "It is starting now ... nothing is present in Supabase Auth; seed fresh demo users in the proper way."

**Result:** The refinement established the timebox, ruled out assumptions about existing users, and led to creating real demo identities through the supported Supabase Auth Admin API rather than inserting directly into `auth.users`.

## Suggestions accepted, modified, and rejected

The decision column explicitly records whether each suggestion was accepted, changed, or rejected and why.

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
| Add one-click demo identity selection to the login form | Accepted after candidate request | The server loads complete server-side deployment variables first and otherwise reads the ignored generated credential file; only throwaway demo identities are passed to the login UI, and no credential is committed. |
| Commit demo passwords so Vercel can render the tabs | Rejected | Hosted evaluator credentials are supplied through server-side environment variables; no password is added to source control. |
| Read quick-access credentials only from a local file | Changed after deployment evidence | Vercel correctly omitted the ignored file, so the server loader was extended to prefer a complete hosted environment and fail closed when configuration is partial. |
| Put all manual commands inside the 1-3 page narrative | Changed for readability | The concise report contains the results table; exact browser and SQL reproduction steps are retained in a clearly labeled appendix. |
| Install a new PDF conversion dependency | Rejected | The existing Edge installation and a small auditable renderer produced the attachment without expanding the project dependency surface. |
| Include the public ChatGPT conversation without reviewing it | Changed for security | The current snapshot was checked for the supplied password fragments and local project path before its URL was added; updating the snapshot after credential-bearing messages must be avoided. |
| Add JavaScript copy buttons directly inside the PDF | Changed for compatibility | PDF viewers handle interactive scripts inconsistently. The final document uses selectable text plus deep links to GitHub's native code-block copy controls. |

## Verification

Verification completed so far: the Supabase database linter returned no findings; both demo users authenticated; the tenant-A activity read and create succeeded; results were newest-first; a retry returned the same entry with `was_duplicate: true`; and tenant A's read and create attempts against tenant B's account both failed with PostgreSQL code `42501`. TypeScript, ESLint, and the production build pass. End-to-end HTTP checks confirmed both demo selectors rendered and returned `401` unauthenticated, `200` read, `201` create, `200` idempotent retry with the same entry ID, and `403` for cross-tenant read and write.

A production-server check with sentinel deployment variables confirmed environment credentials take precedence over the local file and render both tabs. A partial-variable check confirmed the tabs remain hidden without leaking local fallback credentials. Report claims, account UUIDs, response fields, and expected error text were checked directly against the migration, seed script, route handlers, and executable verification scripts before inclusion.

The latest copy-ready PDF was checked for a valid PDF header, non-zero size, a seven-page page tree, all five appendix/test deep links, balanced Markdown code fences, and absence of supplied demo passwords. A rendered HTML preview was visually inspected for typography, table layout, links, and code-block readability before the PDF was generated.

The shared-conversation URL returned HTTP `200`. The retrieved snapshot contained neither supplied demo-password fragment nor the local Windows project path at verification time; this check does not authorize updating the public snapshot with later messages.

## AI corrections

The initial tooling plan assumed the latest Supabase CLI could complete `supabase link`. CLI 2.112.0 rejected a valid management API timestamp while parsing project API-key metadata. An attempted older CLI was also rejected because its configuration format was obsolete and its dependency chain emitted a security warning, so it was not used. The corrected approach retained CLI 2.112.0 and used the documented IPv4 session-pooler connection with `supabase db push --db-url`; the database password remained local and was percent-encoded in process memory.

The first generated React data-loading helper changed loading state synchronously when invoked from an effect. The React 19 lint rule correctly rejected this because it can cause cascading renders. The code was changed so effect-triggered helpers update state only after asynchronous I/O; event handlers own immediate loading transitions for retries and account changes.

Manual testing through the candidate's LAN URL exposed another incorrect assumption: `crypto.randomUUID()` is not available to browser JavaScript on an insecure non-localhost origin. Because key creation occurred before the guarded request, submission stopped without a network call or feedback. The corrected implementation uses `randomUUID()` when available, falls back to RFC 4122 version/variant bits over `crypto.getRandomValues()`, resets the key when the draft changes, and generates it inside the handled submission path so any remaining failure produces visible feedback.

When the candidate still observed the old behavior, code-level validation alone was insufficient. Process inspection showed port 3000 was served by a `next start` process created before the corrected production build. Unlike the development server, it could not hot-reload the fix. The stale process was replaced, and a Playwright Core test using the installed Edge browser verified the complete insecure-LAN workflow: demo selection, authentication, Globex submission, visible green feedback, cleared textarea, and one rendered note.

The first quick-access implementation assumed the ignored local credential file would exist wherever the application ran. Vercel correctly deployed neither that file nor its secrets, so the tabs disappeared. The corrected server loader accepts all four explicitly configured deployment variables, gives them precedence over the development file, and disables quick access when only part of the environment is configured. Complete and partial configurations were both exercised against an optimized production server before inclusion.
