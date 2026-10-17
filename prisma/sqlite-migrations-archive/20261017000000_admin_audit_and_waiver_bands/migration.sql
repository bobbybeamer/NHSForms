-- Build 7: system-level admin audit table + DB-backed waiver band boundaries.
-- Additive only: creates one table and inserts two settings rows. No existing
-- table is altered and no existing data is changed or deleted.

-- CreateTable
CREATE TABLE "AdminAuditEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "targetLabel" TEXT NOT NULL,
    "oldValue" TEXT NOT NULL,
    "newValue" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AdminAuditEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Waiver band boundaries, previously hardcoded in src/config/waiverRouting.ts.
-- Same values as before so routing is identical on day one. Required config:
-- the waiver routing refuses to run without them. Values must match
-- prisma/build7Data.ts. INSERT OR IGNORE leaves any existing row untouched.
-- updatedAt is stored as epoch milliseconds, matching Prisma's SQLite format.
INSERT OR IGNORE INTO "Threshold" ("key", "value", "label", "comment", "updatedAt") VALUES
  ('waiver_band_cfo_upper_inc_vat', 500000, 'Waiver band: CFO upper limit (inc VAT)',
   'Waivers from the PA23 threshold up to (but not including) this value end with the CFO; at or above it, the Executive Committee. Must stay above the PA23 threshold and below the Executive Committee upper limit. Whether above-threshold waivers are permitted at all is still TO CONFIRM WITH CLIENT (User Guide section 10).',
   CAST(strftime('%s', 'now') AS INTEGER) * 1000),
  ('waiver_band_exec_upper_inc_vat', 2500000, 'Waiver band: Executive Committee upper limit (inc VAT)',
   'Waivers from the CFO upper limit up to (but not including) this value end with the Executive Committee; at or above it, the Trust Board. Must stay above the CFO upper limit. TO CONFIRM WITH CLIENT.',
   CAST(strftime('%s', 'now') AS INTEGER) * 1000);
