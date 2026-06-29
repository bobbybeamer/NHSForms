// Threshold values are stored in the database (Threshold model) and editable
// via the Admin screen (/admin). This file contains NO runtime constants —
// all routing functions receive threshold values as parameters fetched from DB.
//
// The seed file (prisma/seed.ts) is the single source of initial values.
// To change a threshold in production: use the Admin screen, not this file.

// Helper used by both Waiver and MERG configs to derive the ex-VAT proxy from
// the inc-VAT PA23 threshold. MERG financial fields are captured ex-VAT, so
// we approximate: proxy = pa23IncVat / 1.2 (assumes standard 20% VAT rate).
// TO CONFIRM WITH CLIENT: whether this proxy is the right comparison for MERG.
export function pa23ExVatProxy(pa23IncVat: number): number {
  return Math.round(pa23IncVat / 1.2);
}
