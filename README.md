# NHS Procurement Forms Platform

A prototype NHS procurement forms platform supporting SFI (Standing Financial Instructions) Waiver requests and MERG (Medical Equipment Replacement Group) Equipment Requests, with multi-step approval workflows.

> **Prototype only** — This is not a production system. Authentication is not secure. Do not enter real NHS patient or staff data.

---

## What this is

The platform allows NHS staff to:

1. **Submit SFI Waiver requests** — A structured form capturing supplier, value, justification, conflict of interest, etc.
2. **Submit MERG Equipment Requests** — A 9-step wizard covering COI, requester details, environment & social value, equipment details, case of need, risk checks, legal procurement, and financial summary.
3. **Route for approval** — Automatically computes a multi-step approval chain based on form type and value
4. **Review and decide** — Approvers can approve, reject, or request more information at their step — and only the intended approver for that step can act
5. **Track progress** — Full audit trail on every submission
6. **Generate SOP emails** — Preview and open pre-filled email drafts (approval notifications and MERG SOP templates) without the system sending email itself

---

## Tech stack

- **Next.js 16** (App Router, Turbopack) with TypeScript
- **Tailwind CSS 4** for styling
- **Prisma ORM 5** with **Postgres** (from Build 8; Builds 1–7 used SQLite — see "Going back to SQLite")
- Hosted on **Vercel** with Vercel's **Prisma Postgres** storage integration
- No real authentication — demo role-switcher only. Every page shows a non-dismissable "PROTOTYPE — demo only" banner.

---

## Environment variables

| Name | Required | What it is | Where the value comes from |
|---|---|---|---|
| `DATABASE_URL` | Yes | Postgres connection string. Used by the app, migrations and the seed. | **Vercel:** set automatically when the Prisma Postgres database is connected to the project (the integration also sets `POSTGRES_URL` and `PRISMA_DATABASE_URL` with the same value — the app reads only `DATABASE_URL`). **Local:** already set in your `.env` to the private local database, `postgresql://nhs_local:nhs_local@localhost:5433/nhsforms_dev` (see `.env.example`). **Never** put the hosted value in `.env` or `.env.local` — the app and scripts refuse it. |
| `DATABASE_URL_POOLED` | No | Pooled connection string (host `pooled.db.prisma.io`) from the Prisma Console. If set **in Vercel**, the deployed app uses it instead; migrations and the seed still use `DATABASE_URL`. | Prisma Console → your database → Connect. Not needed for a low-traffic demo. |
| `RESET_DEMO_DATA` | No | Set to `true` **in Vercel** to wipe and re-seed the hosted demo on the next deploy. Delete it straight afterwards. | You type it — see "Resetting the hosted demo". |

No secret is committed: `.env` is git-ignored and `.env.example` holds placeholders only. Each app instance is capped at one database connection (`src/lib/prisma.ts`) because Prisma Postgres limits direct connections (5 usable on the free plan).

---

## How to run locally

**Local development uses its own private database, separate from the hosted demo.** It is a Postgres database that runs on your computer, stored in `.local-postgres/` in the project folder (git-ignored), and started automatically by `npm run dev`. It has no connection to the hosted Vercel database.

### How the two are kept apart

| | Hosted demo database | Your local database |
|---|---|---|
| Where it lives | Prisma Postgres, attached to the Vercel project | `.local-postgres/` on your computer |
| Address | Only in Vercel's environment variables | `localhost:5433/nhsforms_dev`, in your `.env` |
| Who can change it | Only Vercel deploys (migrations, first-time seed, `RESET_DEMO_DATA`) and the deployed app | `npm run dev`, `npm run db:reset-local`, `npx prisma db seed` on your machine |

Three safeguards make the separation hard to break by accident:

1. **The address isn't on your computer.** `.env` contains only the local address, and the hosted connection string stays in Vercel.
2. **Outside Vercel, the code refuses any database that isn't on this computer.** The app, the seed, `seed-if-empty` and `add-admin-user` all check the address before connecting. If it isn't `localhost`, they stop with "Refusing to connect…". There is no override switch. Vercel sets `VERCEL=1` on its servers, which is how the code knows it is allowed to use the hosted database there. See `src/lib/dbTarget.ts`.
3. **`npm run dev` checks `.env` and `.env.local` before it starts.** It refuses to start if either one names a non-local database. It also passes the local address to the app directly, and regenerates the Prisma client so it can't carry an old built-in address.

### How to tell which database you're using

- **In the browser:** when running locally, every page shows a black bar under the yellow PROTOTYPE banner: "LOCAL DEVELOPMENT — using your local database (localhost:5433/nhsforms_dev). Nothing here affects the hosted demo." The hosted site never shows this bar.
- **In the terminal:** `npm run dev` prints `Local database running at localhost:5433/nhsforms_dev`. Seed scripts print `Database: … — LOCAL (this computer)`.
- **Anytime:** `npm run db:which` prints where `.env` (and `.env.local`, if present) points, without showing any password.

### Commands

```bash
npm install            # first time only (also runs prisma generate)
npm run dev            # starts the local database, applies migrations, seeds it if empty, starts the app
                       # Ctrl+C stops both the app and the local database
npm run db:reset-local # wipe your LOCAL database and reload the standard demo data (stop npm run dev first)
npm run db:which       # show which database .env points at
```

The first `npm run dev` creates the local database and fills it with the demo data. Open [http://localhost:3000](http://localhost:3000). If `.env` is ever missing, copy `.env.example` to `.env`; it already contains the local address.

### Going back to SQLite

Your old `prisma/dev.db` is untouched (it is git-ignored and Build 8 never reads it). The last SQLite version of the app is tagged `sqlite-final`. Run `git checkout sqlite-final`, then **`npx prisma generate`**, then `npm run dev` to use it with `prisma/dev.db` as before. To return, run `git checkout main` and then `npx prisma generate` again. The `generate` step matters because the Prisma client is built for one database type at a time. (`npm run dev` on `main` regenerates it automatically.) The SQLite migrations are archived in `prisma/sqlite-migrations-archive/`.

---

## Hosting on Vercel

### How a deploy works

`vercel.json` tells Vercel to run `npm run vercel-build`, which does, in order:

1. `prisma generate` — builds the database client for Vercel's servers.
2. `prisma migrate deploy` — applies any new migrations in `prisma/migrations/` to the hosted database. This is how schema changes reach the hosted database: commit the migration, push, and the next deploy applies it. Already-applied migrations are skipped; it never resets data.
3. `tsx prisma/seed-if-empty.ts` — seeds the demo data **only if the database has no users** (i.e. the first deploy). On later deploys it does nothing, so redeploying never wipes demo activity.
4. `npm run build` — the normal Next.js production build.

Every push to `main` deploys to the production URL. Pushes to other branches create preview deployments (by default only visible to people logged in to your Vercel team).

### First-time setup

Done in the browser — follow the step-by-step walkthrough in [DEPLOY_VERCEL.md](DEPLOY_VERCEL.md). In short: import the GitHub repo into Vercel → add a Prisma Postgres database from the project's **Storage** tab and connect it to the project → redeploy. No environment variables need to be typed by hand.

### Resetting the hosted demo

The hosted database is only ever changed through Vercel, and so is a reset:

1. In Vercel, go to **Settings → Environment Variables → Add New**. Set the name to `RESET_DEMO_DATA`, the value to `true`, and tick **Production**. Click **Save**.
2. Go to **Deployments**, open the latest deployment's **⋯** menu and choose **Redeploy**. The build log shows `RESET_DEMO_DATA=true — wiping and re-seeding demo data...`.
3. **Delete the `RESET_DEMO_DATA` variable straight away.** Otherwise every later deploy will wipe the demo again.

This **deletes all hosted demo data** and re-creates the standard set: all roles including Alex Admin, the three care-group Finance Managers, the example submissions, and the five threshold and band settings. Running `npx prisma db seed` on your own computer only ever resets your **local** database.

### If a deploy fails

Open the failed deployment in Vercel → **Build Logs** and look for the first red error:

- `Environment variable not found: DATABASE_URL` — the database isn't connected to the project, or not for that environment. Storage → your database → connect it to the project for Production and Preview, then **Redeploy**.
- `P1001: Can't reach database server` or `too many connections` — wait a minute and **Redeploy**; check the database is active in the Storage tab.
- A TypeScript or build error — the same error appears locally with `npm run build`; fix, commit and push.

---

## Demo users

### SFI Waiver approvers

| Name | Role | Use case |
|---|---|---|
| Reqi Requester | Requester | Submit waiver and MERG forms |
| Pat Procurement | Procurement BP | Step 1 approver for all waivers |
| Fiona Finance | Finance | Step 2 approver for all waivers |
| Derek Director | Director of Procurement | Final approver for waivers under £135,018 |
| Cara CFO | CFO | Final approver for waivers £135,018–£500,000 |
| Eli Exec | Exec Committee | Final approver for waivers £500,000–£2,500,000 |
| Trudy Board | Trust Board | Final approver for waivers over £2,500,000 |

### Administrator (Build 7)

| Name | Email | Role | Use case |
|---|---|---|---|
| Alex Admin | alex.admin@nhs.net | Administrator | Only user who can open `/admin` and change thresholds/bands; never an approver |

### MERG approvers (Build 2)

| Name | Email | Role | Care Group |
|---|---|---|---|
| Fatima Manager (CG1) | fm.cg1@nhs.net | Finance Manager | Care Group 1 (and default for CGs 4–6) |
| Felix Manager (CG2) | fm.cg2@nhs.net | Finance Manager | Care Group 2 |
| Frances Manager (CG3) | fm.cg3@nhs.net | Finance Manager | Care Group 3 |
| Demi Divisional | demi.divisional@nhs.net | Divisional Lead | All MERG submissions |
| Marcus MERG | marcus.merg@nhs.net | MERG Committee | All MERG submissions |

### Pre-seeded data

- **APPROVED waiver** (£40,000) — fully approved through Director of Procurement
- **IN_APPROVAL waiver** (£200,000) — currently at Pat Procurement's desk (step 1)
- **IN_APPROVAL MERG** (£30,000, Cardiology / LINQ II monitor) — at Felix Manager (CG2)'s desk (step 1)

To test the MERG approval flow:
1. Log in as **Felix Manager (CG2)** (`fm.cg2@nhs.net`)
2. Go to **Approvals Queue** — you'll see the Cardiology MERG request
3. Review and approve it
4. Log in as **Demi Divisional** — the request will now be in her queue
5. Continue through to **Marcus MERG Committee** to complete the chain

---

## Approval routing

### SFI Waiver routing

Defined in `src/config/waiverRouting.ts`. All waivers follow: **Procurement BP → Finance → [final approver]**.

| Value inc VAT (seeded boundaries) | Final approver |
|---|---|
| < £135,018 (`pa23_inc_vat`) | Director of Procurement |
| £135,018 to < £500,000 (`waiver_band_cfo_upper_inc_vat`) | CFO |
| £500,000 to < £2,500,000 (`waiver_band_exec_upper_inc_vat`) | Exec Committee |
| ≥ £2,500,000 | Trust Board |

All three boundaries are read from the database since Build 7 — none are hardcoded.

### MERG Equipment Request routing

Defined in `src/config/mergRouting.ts`. Base chain: **Finance Manager → Divisional Lead → MERG Committee**.

If total estimated project cost > £50,000: **Exec Committee** is added at the end (business case required).

Step 1 (Finance Manager) is assigned to the specific FM for the requester's care group, looked up via `src/config/careGroups.ts`.

### Configurable thresholds (Build 3)

All routing threshold values are stored in the `Threshold` database table and editable via the `/admin` screen (ADMIN only since Build 7). The five seeded values are:

| DB key | Seeded value | Use |
|---|---|---|
| `pa23_inc_vat` | £135,018 | Waiver band boundary (Director vs CFO) and MERG ex-VAT proxy |
| `merg_business_case_ex_vat` | £50,000 | MERG: adds Exec Committee step |
| `merg_sta_ex_vat` | £25,000 | MERG: triggers STA/Waiver flag on direct award |
| `waiver_band_cfo_upper_inc_vat` | £500,000 | Waiver: CFO → Exec Committee boundary (Build 7) |
| `waiver_band_exec_upper_inc_vat` | £2,500,000 | Waiver: Exec Committee → Trust Board boundary (Build 7) |

No hardcoded threshold values exist in `waiverRouting.ts` or `mergRouting.ts`. Routing functions receive every boundary as a parameter fetched from the database at request time. If a required setting is missing, submission is refused with a clear 500 error rather than routed on a fallback value. The admin API rejects edits that would put the waiver bands out of order (PA23 < CFO upper < Exec upper).

---

## MERG routing thresholds

| Threshold | Value | Use |
|---|---|---|
| Business case | £50,000 ex VAT | Adds Exec Committee step |
| STA trigger | £25,000 ex VAT (capital, direct award only) | Flags need for SFI Waiver alongside MERG |
| Procurement threshold | ~£112,515 ex VAT (135,018 / 1.2 proxy) | Flags PA23 formal procurement rules |

**TO CONFIRM WITH CLIENT:** all three threshold values, care group definitions, and FM assignments for groups 4–6.

---

## Project structure

```
src/
  app/
    api/
      auth/login|logout|me/    # Session management (cookie-based)
      users/                   # List all demo users
      submissions/             # Create and list submissions (waiver + MERG)
      submissions/[id]/        # Get submission detail
      submissions/[id]/decide/ # Approve / reject / request info
      submissions/[id]/generate-email/ # Generate email draft + audit event
      submissions/[id]/respond/ # Requester responds to info request + resubmits
      thresholds/              # GET all settings (open); [key] PATCH (ADMIN only, audited)
      admin/audit/             # Recent admin changes (ADMIN only)
      approvals/               # Submissions waiting for current user
    dashboard/                 # Home screen (start new Waiver or MERG)
    login/                     # Demo user selection
    waivers/new/               # SFI Waiver submission form
    merg/new/                  # MERG Equipment Request 9-step wizard
    my-requests/               # Requester's own submissions (both types)
    approvals/                 # Approver's queue (both types)
    submissions/[id]/          # Submission detail + decision panel
    admin/                     # Server-side ADMIN gate (page.tsx) + AdminPanel (settings, recent changes)
  config/
    thresholds.ts              # pa23ExVatProxy helper (no constants — values in DB)
    waiverRouting.ts           # Waiver chain logic (parameterised)
    mergRouting.ts             # MERG chain logic (parameterised)
    careGroups.ts              # care group → FM email + CGM email/name
    recipients.ts              # SOP named contacts; recipient computation functions
    emailTemplates.ts          # Email template functions (To, Cc, Subject, Body)
  lib/
    prisma.ts                  # Prisma client singleton
    auth.ts                    # Client-side auth helpers
    adminAuth.ts               # Server-side ADMIN check (page + APIs)
    stepAuthorisation.ts       # Per-step approver rules (Build 5/6)
    dbTarget.ts                # Which DB are we on? Refuses non-local DB outside Vercel
  types/
    enums.ts                   # Role/Status TypeScript enums
prisma/
  schema.prisma                # Database schema
  seed.ts                      # Demo data (wipes and recreates)
  build7Data.ts                # Waiver band rows + admin user shared by seed and upgrade script
  add-admin-user.ts            # Adds Alex Admin to an existing DB without touching other data
  migrations/                  # Postgres migrations (applied by prisma migrate deploy)
  sqlite-migrations-archive/   # Builds 1–7 SQLite migrations (history only)
  seed-if-empty.ts             # Seeds only when the DB has no users (runs on every Vercel build)
  dev.db                       # Old local SQLite DB (git-ignored; used only by tag sqlite-final)
  dbGuard.ts                   # Seed/admin scripts: refuse non-local DB outside Vercel
scripts/
  local-db.mjs                 # npm run dev / db:reset-local / db:which — private local Postgres
```

---

## Admin access control and auditing (Build 7)

- **Role:** `ADMIN` (roles are plain strings, so adding it needed no schema change). Demo user: Alex Admin.
- **`/admin`** is a server component: it looks up the user from the login cookie and renders the admin panel only for `ADMIN`; everyone else gets a "Not authorised" page. The demo role-switcher login is unchanged — real NHS SSO is a later build.
- **`PATCH /api/thresholds/[key]`** — `ADMIN` only (403 otherwise, 401 if not logged in), enforced in the route regardless of UI. `GET /api/thresholds` stays open because the forms need it.
- **Auditing:** each successful edit writes an `AdminAuditEvent` (actor, setting key and label, old value, new value, timestamp) in the same transaction as the change. `GET /api/admin/audit` (`ADMIN` only) returns the 50 most recent; shown as "Recent admin changes" in `/admin`.
- **Why a separate table:** `AuditEvent` is submission-scoped (`submissionId` required). Admin changes belong to no submission; a separate `AdminAuditEvent` table keeps request histories' integrity intact and avoids nullable-FK special cases in every submission audit query. Values are stored as text so later admin edits (chains, care groups, users) can reuse the table.
- **In-flight protection** is unchanged: approval steps are snapshotted at submission, so changing a band affects only new submissions.

---

## Per-step authorisation (Build 5)

Every action on an approval step is checked against the approver snapshotted on the `ApprovalStep` row at submission time — never a live recompute. The rule lives in one place, `src/lib/stepAuthorisation.ts`, and is shared by the API and the submission detail page:

- If the step has an `assignedToId` (MERG step 1 — the care-group Finance Manager), only that user may act. Holding `FINANCE_MANAGER` is not enough.
- Otherwise (role-only steps, e.g. all waiver steps), the user must hold the step's `approverRole`.

| Endpoint | Gated actions |
|---|---|
| `POST /api/submissions/[id]/decide` | `approve`, `reject`, `info_request` — the step must also be `ACTIVE` |
| `POST /api/submissions/[id]/generate-email` | `notification` only — wider rule since Build 6: the active step's approver, the requester, or anyone who approved an earlier step (`canGenerateNotification`). MERG SOP templates are not tied to a step |
| `POST /api/submissions/[id]/respond` | Requester only — see below |

A failed check returns **403** (`"You are not the assigned approver for this step…"`) with no state change and no audit event.

### Request more information loop (Build 6)

`info_request` sets the step and submission to `INFO_REQUESTED` and writes `INFO_REQUESTED` + `RETURNED_TO_REQUESTER` audit events. The requester then calls `POST /api/submissions/[id]/respond` with `{ "response": "..." }` (required). The same `ApprovalStep` row goes back to `ACTIVE` — same sequence, same `assignedToId` / `approverRole` — and the submission returns to `IN_APPROVAL`, with `RESUBMITTED` + `STEP_REACTIVATED` audit events. Earlier approvals are untouched; the chain is not recomputed. Errors: 403 (not the requester), 400 (empty response), 409 (not waiting for information). Form fields are not editable on resubmit. No schema change was needed: statuses are plain strings.

---

## Email generation (Build 4)

The system **generates and previews** the emails that the trust's SOPs describe, but **never sends email itself**. Sending (SMTP/NHS mail relay) is a later, production-only step.

On any submission's detail page, a "Generate email" section offers:

### Approval notification email
Addressed to the approver of the **currently active step only** — it is architecturally impossible to address a later, still-pending approver. The route enforces this: it returns an error if there is no active step. Since Build 5, only the active step's intended approver can generate it (403 for anyone else). The UI labels the button with the step number and role. Cc: MERG Applications inbox (MERG) or Procurement BP (Waiver).

### MERG SOP email templates
Three templates, selectable from a dropdown:

| Template | To | Key body content |
|---|---|---|
| Request for Quote | Proposed supplier (placeholder email) | Quote checklist from SOP; replies to MERG Applications inbox |
| Application Concluded — Purchasing | Computed from submission fields (see below) | Purchase order instructions; [PO number] placeholder |
| Application Completed — Leasing | Same recipient logic (leasing variant) | RTT lease document reference placeholder |

### Recipient computation (MERG concluded/completed)
Recipients are computed from values stored on the submission at creation time:

**Always To:** requester, care-group Finance Manager, care-group Care Group Manager, Alastair Jakeman, Medical Engineering inbox, Stores inbox(es) matched to site (SGH for Scarborough/SGH, York for York Hospital, both if ambiguous).

**Conditional To:**
- `fundingSource = Charity` → Charity Finance inbox
- `urnRequested = Yes` → NHS Supply Chain
- `maint = Medical Engineering` AND `isShyps ≠ Yes` → EME Admin, David Steel, James Howes, Caroline Fisher (purchasing) or Daniel Webb, David Steel (leasing)
- `isShyps = Yes` → Luke Poskitt, Gareth Williams, Helen Greenley, Karen Awty, Matt Coulson; standard Medical Engineering maintenance names are **excluded**

**Always Cc:** Steve Bennison, Ed Pearson, MERG Applications inbox.

### Recipients config
`src/config/recipients.ts` — all named individuals and team inboxes from the SOP documents. Every email address is commented `// confirm with client`. **Confirm all addresses before any email is sent.**

`src/config/careGroups.ts` — now also holds `CARE_GROUP_MANAGER_EMAIL` and `CARE_GROUP_MANAGER_NAME`. All CGM entries are placeholder addresses — confirm with client. Note: the purchasing and leasing SOP documents may list slightly different FM/CGM assignments for some groups.

### New MERG form fields
Two fields added to the MERG wizard (both stored in fieldValues):
- **Step 3** — "Is this equipment for SHYPS?" (drives maintenance email route)
- **Step 8** — "Has a URN been requested from NHS Supply Chain?" (adds NHS Supply Chain to To list)

### Generate-not-send boundary
The `generate-email` API route (`POST /api/submissions/[id]/generate-email`) computes and returns the email draft, records an `EMAIL_GENERATED` audit event, and that is all it does. There is no SMTP call, no mail API, and no queue. The mailto link in the UI opens the user's local mail client; the system is not involved in what happens next.

---

## What is NOT yet built

The following features are out of scope for this prototype:

- **Real authentication** — No passwords, SSO, or NHS Login integration
- **Automatic email sending** — Emails are generated and previewed only; sending requires a later production build
- **Recipient address confirmation** — All named individuals and team inboxes in `src/config/recipients.ts` are derived from SOP documents; confirm all with client before live use
- **HUTH / NLAG process variants** — Only York & Scarborough Trust process is modelled
- **File uploads** — No ability to attach supporting documents (DTAC reports, physics sign-offs, etc.)
- **Lease / RTT form** — The form itself is not built; the leasing email template exists but references `[RTT lease document reference — to be completed]`
- **Multi-trust rules** — All demo users are in one trust; cross-trust logic is not implemented
- **PDF generation** — No PDF export of submitted forms
- **Re-submission after INFO_REQUESTED** — Requester cannot formally respond via the app; must contact the approver directly
- **Admin: approval chain / care-group / user editing** — Only the five threshold/band values are editable via `/admin`
- **Accessibility audit** — Basic WCAG effort has been made but a full audit has not been done

---

## Build history

| Build | What was added |
|---|---|
| Build 1 | SFI Waiver form, multi-step approval chain, audit trail, prototype auth |
| Build 2 | MERG Equipment Request 9-step wizard, FINANCE_MANAGER / DIVISIONAL_LEAD / MERG_COMMITTEE roles, care-group FM routing |
| Build 3 | Thresholds moved to database, `/admin` screen for live threshold editing, routing functions fully parameterised |
| Build 4 | Email generation: approval notification + MERG SOP templates (quote request, concluded purchasing, completed leasing); recipient engine with SHYPS/charity/URN/maintenance-route conditional logic; new MERG form fields (SHYPS, URN); `EMAIL_GENERATED` audit events |
| Build 5 | Per-step authorisation: decide and notification-email endpoints check the step's assigned approver (or role, for role-only steps), not just the role; USER_GUIDE corrections (MERG step list, care-group rule, leasing recipients) |
| Build 6 | Request-more-information loop: requester responds and resubmits to the same step (`/respond`), full audit trail; notification email can also be generated by the requester or a prior approver |
| Build 7 | ADMIN role (Alex Admin); `/admin` and threshold PATCH restricted to ADMIN; `AdminAuditEvent` table and "Recent admin changes" view; £500k/£2.5m waiver bands moved into the database and editable in `/admin` (migration `20261017000000_admin_audit_and_waiver_bands`) |
| Build 8 | Hosted demo: SQLite → Postgres (`DATABASE_URL` from Vercel's Prisma Postgres integration), Postgres baseline migration (SQLite migrations archived), Vercel build (`vercel.json` → generate, migrate deploy, seed-if-empty, build), non-dismissable PROTOTYPE banner, demo sign-in note |
