// ─── Email template functions ────────────────────────────────────────────────
// Each function returns a complete email draft (To, Cc, Subject, Body).
// Body text is derived from the MERG SOP documents (purchasing, leasing, and
// supplier-quote templates). Placeholders that must be filled at send time are
// marked [like this].
//
// Assumption: body wording approximated from spec description — confirm exact
// phrasing against the original SOP .docx files before going live.

import type { Recipient } from './recipients';

export interface EmailDraft {
  to: Recipient[];
  cc: Recipient[];
  subject: string;
  body: string;
}

function gbp(n: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency', currency: 'GBP', minimumFractionDigits: 0,
  }).format(n);
}

// ─── Approval notification (MERG) ────────────────────────────────────────────

export interface NotificationContext {
  ref: string;
  formTypeName: string;
  stepSequence: number;
  stepRoleLabel: string;
  approver: Recipient;
  requester: Recipient;
  dept: string;
  description: string;
  supplier: string;
  totalValue: number;
  approvalChain: string;
  trust: string;
  to: Recipient[];
  cc: Recipient[];
}

export function buildNotificationEmail(ctx: NotificationContext): EmailDraft {
  const subject = `MERG ${ctx.ref} – ${ctx.description || ctx.supplier} – Step ${ctx.stepSequence} ${ctx.stepRoleLabel} Approval Required`;

  const body = `Dear ${ctx.approver.name},

A MERG Equipment Request application has been submitted and requires your approval as Step ${ctx.stepSequence} (${ctx.stepRoleLabel}).

MERG Reference:      ${ctx.ref}
Description:         ${ctx.description}
Proposed Supplier:   ${ctx.supplier}
Department / Trust:  ${ctx.dept}, ${ctx.trust}
Total Estimated Cost: ${gbp(ctx.totalValue)}
Submitted by:        ${ctx.requester.name} (${ctx.requester.email})

Approval Chain:      ${ctx.approvalChain}

Please review this application and take the appropriate action via the Procurement Forms system. Each step must be approved in order — no step can be skipped.

If you have any questions, please contact the requester directly or the MERG Applications inbox at yhs-tr.merg.applications@nhs.net.

Regards,
MERG Applications
yhs-tr.merg.applications@nhs.net`;

  return { to: ctx.to, cc: ctx.cc, subject, body };
}

// ─── Approval notification (SFI Waiver) ──────────────────────────────────────

export function buildWaiverNotificationEmail(ctx: NotificationContext): EmailDraft {
  const subject = `SFI Waiver ${ctx.ref} – ${ctx.description} – ${ctx.stepRoleLabel} Approval Required`;

  const body = `Dear ${ctx.approver.name},

An SFI Waiver has been submitted and requires your approval as ${ctx.stepRoleLabel} (Step ${ctx.stepSequence}).

Reference:              ${ctx.ref}
Description:            ${ctx.description}
Proposed Supplier:      ${ctx.supplier}
Department:             ${ctx.dept}
Trust:                  ${ctx.trust}
Total Value (inc VAT):  ${gbp(ctx.totalValue)}
Submitted by:           ${ctx.requester.name} (${ctx.requester.email})

Approval Chain:         ${ctx.approvalChain}

Please review the waiver documentation and take the appropriate action. Note that steps must be approved in order — it is not possible to approve out of sequence.

Regards,
Procurement
${ctx.trust}`;

  return { to: ctx.to, cc: ctx.cc, subject, body };
}

// ─── Request for Quote (to supplier) ─────────────────────────────────────────

export interface QuoteRequestContext {
  ref: string;
  description: string;
  model: string;
  supplier: string;
  qty: string;
  productLink: string;
  dept: string;
  trust: string;
  requester: Recipient;
  to: Recipient[];
  cc: Recipient[];
}

export function buildQuoteRequestEmail(ctx: QuoteRequestContext): EmailDraft {
  // Subject format from SOP: "MERG <ref> – <item> – Request for Quote"
  const subject = `MERG ${ctx.ref} – ${ctx.model || ctx.description} – Request for Quote`;

  const body = `Dear [contact at ${ctx.supplier}],

York and Scarborough Teaching Hospitals NHS Foundation Trust
MERG Application ${ctx.ref} – Request for Quote

We are seeking a formal quotation for the following item(s) on behalf of the Trust's Medical Equipment Resource Group (MERG).

Equipment Details
  Description:    ${ctx.description}
  Model/Product:  ${ctx.model}
  Quantity:       ${ctx.qty}${ctx.productLink ? `\n  Product link:   ${ctx.productLink}` : ''}
  Department:     ${ctx.dept}

Please include the following in your quotation:
  ☐ Formal written quotation (valid for a minimum of 90 days)
  ☐ Itemised breakdown of capital purchase price (ex VAT and inc VAT)
  ☐ Installation costs (if applicable)
  ☐ First-year service / maintenance included or optional
  ☐ Annual maintenance contract cost (for years 2 onwards)
  ☐ Lead time for delivery and installation
  ☐ Warranty terms and duration
  ☐ Applicable NHS Supply Chain framework reference and lot number (if available)
  ☐ Any relevant product specification sheets or brochures

Replies
Please address your quotation to the MERG Applications inbox, quoting reference MERG ${ctx.ref}:
  yhs-tr.merg.applications@nhs.net

Yours sincerely,

${ctx.requester.name}
${ctx.dept}
York and Scarborough Teaching Hospitals NHS Foundation Trust`;

  return { to: ctx.to, cc: ctx.cc, subject, body };
}

// ─── Application Concluded – Purchasing ───────────────────────────────────────

export interface ConcludedContext {
  ref: string;
  description: string;
  model: string;
  supplier: string;
  capitalCost: number;
  totalCost: number;
  fundingSource: string;
  fundName?: string;
  fundNo?: string;
  careGroup: string;
  dept: string;
  site: string;
  requester: Recipient;
  maint: string;
  isShyps: string;
  to: Recipient[];
  cc: Recipient[];
}

export function buildConcludedPurchasingEmail(ctx: ConcludedContext): EmailDraft {
  const subject = `MERG ${ctx.ref} – ${ctx.model || ctx.description} – Application Concluded`;

  const charitySection = ctx.fundingSource === 'Charity'
    ? `\nCharity Funding\n  Fund name:   ${ctx.fundName || '[fund name — confirm]'}\n  Fund number: ${ctx.fundNo || '[fund number — confirm]'}\n`
    : '';

  let maintSection = '';
  if (ctx.maint === 'Medical Engineering') {
    if (ctx.isShyps === 'Yes') {
      maintSection = `\nMaintenance (SHYPS)\nThis equipment is for SHYPS. Please contact Luke Poskitt and Gareth Williams to arrange a planned maintenance schedule prior to delivery. Helen Greenley and Matt Coulson should also be copied in for the maintenance element.\n`;
    } else {
      maintSection = `\nMaintenance (Medical Engineering)\nPlease contact Medical Engineering (yhs-tr.eme.admin@nhs.net) to arrange a planned maintenance schedule prior to delivery.\n`;
    }
  }

  const body = `Dear All,

MERG ${ctx.ref} – ${ctx.model || ctx.description} – Application Concluded

Please be advised that the above MERG application has been approved and the purchase may now proceed.

Application Summary
  MERG Reference:          ${ctx.ref}
  Equipment:               ${ctx.model || ctx.description}
  Proposed Supplier:       ${ctx.supplier}
  Capital Cost (ex VAT):   ${gbp(ctx.capitalCost)}
  Total Estimated Cost:    ${gbp(ctx.totalCost)}
  Funding Source:          ${ctx.fundingSource}${charitySection}
  Care Group:              ${ctx.careGroup}
  Department:              ${ctx.dept}
  Site:                    ${ctx.site}
  Requested by:            ${ctx.requester.name} (${ctx.requester.email})

Purchase Order
Please raise a purchase order for the above equipment:
  Supplier:       ${ctx.supplier}
  PO Value:       ${gbp(ctx.capitalCost)} + VAT
  PO Reference:   [PO number — to be completed by Finance]

A copy of the purchase order should be forwarded to the MERG Applications inbox:
  yhs-tr.merg.applications@nhs.net
${maintSection}
If you have any questions, please contact the MERG Applications inbox.

Regards,
MERG Applications
yhs-tr.merg.applications@nhs.net`;

  return { to: ctx.to, cc: ctx.cc, subject, body };
}

// ─── Application Completed – Leasing ─────────────────────────────────────────

export function buildConcludedLeasingEmail(ctx: ConcludedContext): EmailDraft {
  const subject = `MERG ${ctx.ref} – ${ctx.model || ctx.description} – Application Completed`;

  const charitySection = ctx.fundingSource === 'Charity'
    ? `\nCharity Funding\n  Fund name:   ${ctx.fundName || '[fund name — confirm]'}\n  Fund number: ${ctx.fundNo || '[fund number — confirm]'}\n`
    : '';

  let maintSection = '';
  if (ctx.maint === 'Medical Engineering') {
    if (ctx.isShyps === 'Yes') {
      maintSection = `\nMaintenance (SHYPS)\nThis equipment is for SHYPS. Please contact Luke Poskitt and Gareth Williams to arrange a planned maintenance schedule prior to delivery. Helen Greenley and Matt Coulson should also be copied in for the maintenance element.\n`;
    } else {
      maintSection = `\nMaintenance (Medical Engineering)\nPlease contact Medical Engineering (yhs-tr.eme.admin@nhs.net) to arrange a planned maintenance schedule prior to delivery.\n`;
    }
  }

  const body = `Dear All,

MERG ${ctx.ref} – ${ctx.model || ctx.description} – Application Completed (Leasing)

Please be advised that the above MERG application has been approved. This application is to proceed via the lease route.

Application Summary
  MERG Reference:          ${ctx.ref}
  Equipment:               ${ctx.model || ctx.description}
  Proposed Supplier:       ${ctx.supplier}
  Capital Cost (ex VAT):   ${gbp(ctx.capitalCost)}
  Total Estimated Cost:    ${gbp(ctx.totalCost)}
  Funding Source:          ${ctx.fundingSource}${charitySection}
  Care Group:              ${ctx.careGroup}
  Department:              ${ctx.dept}
  Site:                    ${ctx.site}
  Requested by:            ${ctx.requester.name} (${ctx.requester.email})

Leasing
This application is to proceed via the RTT lease route.
  RTT Lease Document Reference: [RTT lease document reference — to be completed]

Please raise the appropriate lease documentation and forward a copy to the MERG Applications inbox:
  yhs-tr.merg.applications@nhs.net
${maintSection}
If you have any questions, please contact the MERG Applications inbox.

Regards,
MERG Applications
yhs-tr.merg.applications@nhs.net`;

  return { to: ctx.to, cc: ctx.cc, subject, body };
}
