-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ApprovalStep" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "submissionId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "approverRole" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "decisionNote" TEXT,
    "decidedById" TEXT,
    "decidedAt" DATETIME,
    "assignedToId" TEXT,
    CONSTRAINT "ApprovalStep_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ApprovalStep_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ApprovalStep_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ApprovalStep" ("approverRole", "decidedAt", "decidedById", "decisionNote", "id", "sequence", "status", "submissionId") SELECT "approverRole", "decidedAt", "decidedById", "decisionNote", "id", "sequence", "status", "submissionId" FROM "ApprovalStep";
DROP TABLE "ApprovalStep";
ALTER TABLE "new_ApprovalStep" RENAME TO "ApprovalStep";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
