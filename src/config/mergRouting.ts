import { Role } from '@/types/enums';
import { pa23ExVatProxy } from './thresholds';

// ─── MERG APPROVAL ROUTING ───────────────────────────────────────────────────
// All threshold values are stored in the database (Threshold model) and
// editable via the Admin screen (/admin). NO hardcoded threshold values here.
// Routing functions receive values as parameters fetched from DB at request time.
//
// VALUE DEFINITIONS — TO CONFIRM WITH CLIENT:
//   Business-case trigger: total estimated project cost (capital + maint over
//   life + consumables). MERG form captures this ex-VAT.
//   STA trigger: capital cost ex VAT (direct award only).
//   PA23 threshold: inc VAT. MERG compares against an ex-VAT proxy (÷ 1.2).

// Compute the full approval chain for a MERG submission.
// businessCaseThreshold comes from DB key "merg_business_case_ex_vat".
export function computeMergApprovalChain(
  totalProjectCostExVat: number,
  businessCaseThreshold: number
): Role[] {
  const chain: Role[] = [
    Role.FINANCE_MANAGER,
    Role.DIVISIONAL_LEAD,
    Role.MERG_COMMITTEE,
  ];
  if (totalProjectCostExVat > businessCaseThreshold) {
    chain.push(Role.EXEC_COMMITTEE);
  }
  return chain;
}

// Derive the ex-VAT procurement threshold proxy used in MERG UI flags.
// pa23IncVat comes from DB key "pa23_inc_vat".
export function getMergProcThresholdExVat(pa23IncVat: number): number {
  return pa23ExVatProxy(pa23IncVat);
}
