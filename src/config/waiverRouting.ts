import { Role } from "@/types/enums";

// ─── EDITABLE THRESHOLDS ────────────────────────────────────────────────────
// ALL waiver band boundaries are stored in the database (Threshold model) and
// editable via the Admin screen (/admin). There are NO hardcoded boundary
// values in this file — every boundary is passed in from the database at call
// time. Comparisons are on total value INCLUDING VAT; a value equal to a
// boundary falls into the band above it.

// Database keys for the three waiver band boundaries.
export const WAIVER_SETTING_KEYS = {
  pa23: 'pa23_inc_vat',                       // below → Director of Procurement
  cfoUpper: 'waiver_band_cfo_upper_inc_vat',  // below → CFO
  execUpper: 'waiver_band_exec_upper_inc_vat', // below → Exec Committee; at/above → Trust Board
} as const;

export interface WaiverBandSettings {
  pa23ThresholdIncVat: number;
  cfoUpperIncVat: number;
  execUpperIncVat: number;
}

// Build the settings from Threshold rows (as returned by the DB or
// GET /api/thresholds). Returns null if any boundary is missing — callers must
// treat that as an error, never fall back to a hardcoded value.
export function waiverBandSettingsFromRows(
  rows: { key: string; value: number }[]
): WaiverBandSettings | null {
  const get = (key: string) => rows.find((r) => r.key === key)?.value;
  const pa23 = get(WAIVER_SETTING_KEYS.pa23);
  const cfoUpper = get(WAIVER_SETTING_KEYS.cfoUpper);
  const execUpper = get(WAIVER_SETTING_KEYS.execUpper);
  if (pa23 == null || cfoUpper == null || execUpper == null) return null;
  return { pa23ThresholdIncVat: pa23, cfoUpperIncVat: cfoUpper, execUpperIncVat: execUpper };
}

// Value bands that determine the final authoriser in the approval chain.
export function getValueBands(settings: WaiverBandSettings) {
  return [
    { maxValue: settings.pa23ThresholdIncVat, finalApprover: Role.DIRECTOR_OF_PROCUREMENT },
    { maxValue: settings.cfoUpperIncVat,      finalApprover: Role.CFO                     },
    { maxValue: settings.execUpperIncVat,     finalApprover: Role.EXEC_COMMITTEE          },
    { maxValue: Infinity,                     finalApprover: Role.TRUST_BOARD             },
  ] as const;
}

// Compute the full approval chain for a given total value (inc VAT).
// settings must come from the database — do not pass hardcoded values.
export function computeApprovalChain(
  totalValueIncVat: number,
  settings: WaiverBandSettings
): Role[] {
  const bands = getValueBands(settings);
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
