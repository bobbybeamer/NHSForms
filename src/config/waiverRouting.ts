import { Role } from "@/types/enums";

// ─── EDITABLE THRESHOLDS ────────────────────────────────────────────────────
// Threshold values (including the PA23 band boundary below) are stored in the
// database and editable via the Admin screen (/admin). There is no hardcoded
// threshold in this file. The pa23ThresholdIncVat parameter must be passed in
// from the database at call time.

// Value bands that determine the final authoriser in the approval chain.
// The first band boundary is the PA23 threshold read from the database.
// Remaining bands are fixed policy; change them here if policy changes.
export function getValueBands(pa23ThresholdIncVat: number) {
  return [
    { maxValue: pa23ThresholdIncVat, finalApprover: Role.DIRECTOR_OF_PROCUREMENT },
    { maxValue: 500_000,             finalApprover: Role.CFO                     },
    { maxValue: 2_500_000,           finalApprover: Role.EXEC_COMMITTEE           },
    { maxValue: Infinity,            finalApprover: Role.TRUST_BOARD              },
  ] as const;
}

// Compute the full approval chain for a given total value (inc VAT).
// pa23ThresholdIncVat must come from the database — do not pass a hardcoded value.
export function computeApprovalChain(
  totalValueIncVat: number,
  pa23ThresholdIncVat: number
): Role[] {
  const bands = getValueBands(pa23ThresholdIncVat);
  const band = bands.find((b) => totalValueIncVat < b.maxValue) ?? bands[bands.length - 1];
  return [Role.PROCUREMENT_BP, Role.FINANCE, band.finalApprover];
}

// Justification reasons (options a–h from the SFI Waiver form).
export const JUSTIFICATION_REASONS = [
  { value: "a", label: "a – Chief Executive Directive" },
  { value: "b", label: "b – Continuity of Service" },
  { value: "c", label: "c – Legal Advice" },
  { value: "d", label: "d – Nationally Funded Programme" },
  { value: "e", label: "e – Only Supplier" },
  { value: "f", label: "f – Standardisation" },
  { value: "g", label: "g – Urgent Requirement" },
  { value: "h", label: "h – Prototype / Research" },
] as const;
