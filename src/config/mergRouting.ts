import { Role } from '@/types/enums';
import { PA23_THRESHOLD_INC_VAT } from './thresholds';

// ─── MERG APPROVAL ROUTING ───────────────────────────────────────────────────
// Base chain (always): Finance Manager → Divisional Lead → MERG Committee
// Conditional: if total project value > £50,000 → add Exec Committee (business case)
//
// VALUE DEFINITIONS — TO CONFIRM WITH CLIENT:
//   £50,000 business-case trigger: total estimated project cost (capital + maint
//   over life + consumables over life). The MERG form computes this ex-VAT.
//
//   £25,000 STA trigger: capital cost ex VAT (direct award only).
//
//   £135,018 procurement threshold: total value inc VAT. Since the MERG financial
//   section captures costs ex-VAT without a separate VAT field, the form compares
//   the ex-VAT total against 135,018 / 1.2 = ~£112,515 as a proxy. Confirm with
//   procurement whether total project cost or capital cost only applies.

// Business case threshold (total project cost ex VAT)
// TO CONFIRM WITH CLIENT: exact value and what "total" includes
export const MERG_BUSINESS_CASE_THRESHOLD = 50_000;

// STA (Single Tender Action) trigger (capital cost ex VAT, direct award only)
// TO CONFIRM WITH CLIENT
export const MERG_STA_THRESHOLD_EX_VAT = 25_000;

// Procurement threshold as ex-VAT proxy (PA23_THRESHOLD_INC_VAT / 1.2)
// TO CONFIRM WITH CLIENT: confirm this is the right comparison for MERG
export const MERG_PROCUREMENT_THRESHOLD_EX_VAT = Math.round(PA23_THRESHOLD_INC_VAT / 1.2);

export function computeMergApprovalChain(totalProjectCostExVat: number): Role[] {
  const chain: Role[] = [
    Role.FINANCE_MANAGER,
    Role.DIVISIONAL_LEAD,
    Role.MERG_COMMITTEE,
  ];
  if (totalProjectCostExVat > MERG_BUSINESS_CASE_THRESHOLD) {
    chain.push(Role.EXEC_COMMITTEE);
  }
  return chain;
}
