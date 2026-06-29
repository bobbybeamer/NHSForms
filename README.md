# NHS Procurement Forms Platform

A prototype NHS procurement forms platform supporting SFI (Standing Financial Instructions) Waiver requests and MERG (Medical Equipment Replacement Group) Equipment Requests, with multi-step approval workflows.

> **Prototype only** — This is not a production system. Authentication is not secure. Do not enter real NHS patient or staff data.

---

## What this is

The platform allows NHS staff to:

1. **Submit SFI Waiver requests** — A structured form capturing supplier, value, justification, conflict of interest, etc.
2. **Submit MERG Equipment Requests** — A 9-step wizard covering COI, requester details, environment & social value, equipment details, case of need, risk checks, legal procurement, and financial summary.
3. **Route for approval** — Automatically computes a multi-step approval chain based on form type and value
4. **Review and decide** — Approvers can approve, reject, or request more information at their step
5. **Track progress** — Full audit trail on every submission

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

### Shared threshold

`src/config/thresholds.ts` exports `PA23_THRESHOLD_INC_VAT = 135_018`. Both waiver and MERG configs import from here — update in one place.

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
      approvals/               # Submissions waiting for current user
    dashboard/                 # Home screen (start new Waiver or MERG)
    login/                     # Demo user selection
    waivers/new/               # SFI Waiver submission form
    merg/new/                  # MERG Equipment Request 9-step wizard
    my-requests/               # Requester's own submissions (both types)
    approvals/                 # Approver's queue (both types)
    submissions/[id]/          # Submission detail + decision panel
  config/
    thresholds.ts              # EDITABLE — shared PA23 threshold
    waiverRouting.ts           # EDITABLE — SFI Waiver chain logic
    mergRouting.ts             # EDITABLE — MERG chain logic and thresholds
    careGroups.ts              # EDITABLE — care group → Finance Manager email
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

## What is NOT yet built

The following features are out of scope for this prototype:

- **Real authentication** — No passwords, SSO, or NHS Login integration
- **Email notifications** — No emails sent when submissions advance or are rejected
- **HUTH / NLAG process variants** — Only York & Scarborough Trust process is modelled
- **File uploads** — No ability to attach supporting documents (DTAC reports, physics sign-offs, etc.)
- **Lease / RTT flow** — Lease and RTT-specific routing not yet modelled
- **Multi-trust rules** — All demo users are in one trust; cross-trust logic is not implemented
- **PDF generation** — No PDF export of submitted forms
- **Re-submission after INFO_REQUESTED** — Requester cannot formally respond via the app; must contact the approver directly
- **User management** — No admin interface to add/manage users, trusts, or care group FM assignments
- **Accessibility audit** — Basic WCAG effort has been made but a full audit has not been done

---

## Build history

| Build | What was added |
|---|---|
| Build 1 | SFI Waiver form, multi-step approval chain, audit trail |
| Build 2 | MERG Equipment Request 9-step wizard, FINANCE_MANAGER / DIVISIONAL_LEAD / MERG_COMMITTEE roles, care-group FM routing, shared thresholds config |
