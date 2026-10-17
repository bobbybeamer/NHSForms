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

- **Next.js 14** (App Router) with TypeScript
- **Tailwind CSS** for styling
- **Prisma ORM 5** with SQLite (`prisma/dev.db`)
- No third-party authentication (demo only)

---

## How to run

### 1. Install dependencies

```bash
npm install
```

### 2. Set up the database

```bash
npx prisma generate
npx prisma migrate dev --name init
npx prisma db seed
```

This creates the SQLite database at `prisma/dev.db` and populates it with demo users and sample submissions.

### 3. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

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

| Value inc VAT | Final approver |
|---|---|
| < £135,018 | Director of Procurement |
| £135,018–£500,000 | CFO |
| £500,000–£2,500,000 | Exec Committee |
| > £2,500,000 | Trust Board |

### MERG Equipment Request routing

Defined in `src/config/mergRouting.ts`. Base chain: **Finance Manager → Divisional Lead → MERG Committee**.

If total estimated project cost > £50,000: **Exec Committee** is added at the end (business case required).

Step 1 (Finance Manager) is assigned to the specific FM for the requester's care group, looked up via `src/config/careGroups.ts`.

### Configurable thresholds (Build 3)

All routing threshold values are stored in the `Threshold` database table and editable via the `/admin` screen. The three seeded values are:

| DB key | Seeded value | Use |
|---|---|---|
| `pa23_inc_vat` | £135,018 | Waiver band boundary (Director vs CFO) and MERG ex-VAT proxy |
| `merg_business_case_ex_vat` | £50,000 | MERG: adds Exec Committee step |
| `merg_sta_ex_vat` | £25,000 | MERG: triggers STA/Waiver flag on direct award |

No hardcoded threshold values exist in `waiverRouting.ts` or `mergRouting.ts`. Both routing functions receive the threshold as a parameter fetched from the database at request time.

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
      approvals/               # Submissions waiting for current user
    dashboard/                 # Home screen (start new Waiver or MERG)
    login/                     # Demo user selection
    waivers/new/               # SFI Waiver submission form
    merg/new/                  # MERG Equipment Request 9-step wizard
    my-requests/               # Requester's own submissions (both types)
    approvals/                 # Approver's queue (both types)
    submissions/[id]/          # Submission detail + decision panel
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
  types/
    enums.ts                   # Role/Status TypeScript enums
prisma/
  schema.prisma                # Database schema
  seed.ts                      # Demo data
  dev.db                       # SQLite database (created on migrate)
```

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
- **Admin access control** — `/admin` is accessible to any logged-in user; role-based restriction is a later build
- **Admin: approval chain / care-group / user editing** — Only the three threshold values are editable via `/admin`
- **Admin audit trail** — Threshold changes are not recorded in the audit trail
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
