import { Role } from "@/types/enums";
import { PA23_THRESHOLD_INC_VAT } from './thresholds';

// ─── EDITABLE THRESHOLDS ────────────────────────────────────────────────────
// £135,018 = PA23 goods/services threshold inc VAT, Jan 2026; revised every 2
// years; confirm with procurement before changing this value.
export const PA23_THRESHOLD = PA23_THRESHOLD_INC_VAT;

// Value bands that determine the final authoriser in the approval chain.
// To change, edit the 'maxValue' for each band (use Infinity for the top band).
export const VALUE_BANDS = [
  { maxValue: 135_018,   finalApprover: Role.DIRECTOR_OF_PROCUREMENT },
  { maxValue: 500_000,   finalApprover: Role.CFO                     },
  { maxValue: 2_500_000, finalApprover: Role.EXEC_COMMITTEE           },
  { maxValue: Infinity,  finalApprover: Role.TRUST_BOARD              },
] as const;

// The first two steps of the chain are always the same, regardless of value.
export const FIXED_CHAIN_PREFIX: Role[] = [
  Role.PROCUREMENT_BP,
  Role.FINANCE,
];

// Compute the full approval chain for a given total value (inc VAT).
export function computeApprovalChain(totalValueIncVat: number): Role[] {
  const band = VALUE_BANDS.find((b) => totalValueIncVat < b.maxValue)
    ?? VALUE_BANDS[VALUE_BANDS.length - 1];
  return [...FIXED_CHAIN_PREFIX, band.finalApprover];
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
