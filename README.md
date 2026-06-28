# NHS Procurement Forms Platform

A prototype NHS SFI (Standing Financial Instructions) Waiver request and approval management platform. Built to demonstrate a complete multi-step approval workflow for NHS procurement waivers.

> **Prototype only** — This is not a production system. Authentication is not secure. Do not enter real NHS patient or staff data.

---

## What this is

The platform allows NHS staff to:

1. **Submit SFI Waiver requests** — A structured form capturing all required fields (supplier, value, justification, conflict of interest, etc.)
2. **Route for approval** — Automatically computes a multi-step approval chain based on the total value inc VAT
3. **Review and decide** — Approvers can approve, reject, or request more information at their step
4. **Track progress** — Full audit trail on every submission

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

Log in as any of the following demo accounts (click their name on the login page):

| Name | Role | Use case |
|---|---|---|
| Reqi Requester | Requester | Submit new waiver forms |
| Pat Procurement | Procurement BP | Step 1 approver for all waivers |
| Fiona Finance | Finance | Step 2 approver for all waivers |
| Derek Director | Director of Procurement | Final approver for waivers under £135,018 |
| Cara CFO | CFO | Final approver for waivers £135,018–£500,000 |
| Eli Exec | Exec Committee | Final approver for waivers £500,000–£2,500,000 |
| Trudy Board | Trust Board | Final approver for waivers over £2,500,000 |

### Pre-seeded data

- **APPROVED waiver** (£40,000) — fully approved through Director of Procurement
- **IN_APPROVAL waiver** (£200,000) — currently at Pat Procurement's desk (Procurement BP step)

To test the approval flow:
1. Log in as **Pat Procurement**
2. Go to **Approvals Queue** — you'll see the £200,000 waiver
3. Review and approve it
4. Log in as **Fiona Finance** — the waiver will now be in her queue
5. Continue through to **Cara CFO** to complete the chain

---

## Approval routing configuration

The approval chain thresholds and roles are defined in one place:

**`src/config/waiverRouting.ts`**

```typescript
export const PA23_THRESHOLD = 135_018;  // Update when PA23 threshold changes

export const VALUE_BANDS = [
  { maxValue: 135_018,   finalApprover: Role.DIRECTOR_OF_PROCUREMENT },
  { maxValue: 500_000,   finalApprover: Role.CFO },
  { maxValue: 2_500_000, finalApprover: Role.EXEC_COMMITTEE },
  { maxValue: Infinity,  finalApprover: Role.TRUST_BOARD },
];
```

All waivers go through **Procurement BP → Finance** first. The final approver depends on the total value inc VAT. Change the thresholds here and they take effect immediately for all new submissions.

The PA23 threshold warning on the waiver form is also driven by `PA23_THRESHOLD`.

---

## Project structure

```
src/
  app/
    api/
      auth/login|logout|me/   # Session management (cookie-based)
      users/                  # List all demo users
      submissions/            # Create and list waiver submissions
      submissions/[id]/       # Get submission detail
      submissions/[id]/decide/ # Approve / reject / request info
      approvals/              # Submissions waiting for current user
    dashboard/                # Home screen
    login/                    # Demo user selection
    waivers/new/              # Waiver submission form
    my-requests/              # Requester's own submissions
    approvals/                # Approver's queue
    submissions/[id]/         # Submission detail + decision panel
  config/
    waiverRouting.ts          # EDITABLE — thresholds and chain logic
  lib/
    prisma.ts                 # Prisma client singleton
    auth.ts                   # Client-side auth helpers
  types/
    enums.ts                  # Role/Status TypeScript enums
prisma/
  schema.prisma               # Database schema
  seed.ts                     # Demo data
  dev.db                      # SQLite database (created on migrate)
```

---

## What is NOT yet built

The following features are out of scope for this prototype:

- **Real authentication** — No passwords, SSO, or NHS Login integration
- **Email notifications** — No emails sent when submissions advance or are rejected
- **MERG form** — Only the SFI Waiver form is implemented
- **Multi-trust rules** — All demo users are in one trust; cross-trust logic is not implemented
- **PDF generation** — No PDF export of submitted waivers
- **File uploads** — No ability to attach supporting documents
- **Re-submission after INFO_REQUESTED** — Requester cannot formally respond via the app; must contact the approver directly
- **User management** — No admin interface to add/manage users or trusts
- **Accessibility audit** — Basic WCAG effort has been made but a full audit has not been done
