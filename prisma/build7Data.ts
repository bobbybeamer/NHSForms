// Build 7 data shared by seed.ts and add-admin-user.ts.
// The two waiver band rows are ALSO inserted by the Build 7 migration
// (20261017000000_admin_audit_and_waiver_bands) so routing keeps working on an
// existing database — keep the values here and in that migration identical.
import { Role } from '../src/types/enums';

export const WAIVER_BAND_THRESHOLDS = [
  {
    key: 'waiver_band_cfo_upper_inc_vat',
    value: 500_000,
    label: 'Waiver band: CFO upper limit (inc VAT)',
    comment:
      'Waivers from the PA23 threshold up to (but not including) this value end with the CFO; ' +
      'at or above it, the Executive Committee. Must stay above the PA23 threshold and below the ' +
      'Executive Committee upper limit. Whether above-threshold waivers are permitted at all is ' +
      'still TO CONFIRM WITH CLIENT (User Guide section 10).',
  },
  {
    key: 'waiver_band_exec_upper_inc_vat',
    value: 2_500_000,
    label: 'Waiver band: Executive Committee upper limit (inc VAT)',
    comment:
      'Waivers from the CFO upper limit up to (but not including) this value end with the ' +
      'Executive Committee; at or above it, the Trust Board. Must stay above the CFO upper limit. ' +
      'TO CONFIRM WITH CLIENT.',
  },
];

export const ADMIN_USER = {
  name: 'Alex Admin',
  email: 'alex.admin@nhs.net',
  role: Role.ADMIN,
  trust: 'York & Scarborough',
};
