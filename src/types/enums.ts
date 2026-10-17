// TypeScript enums mirroring the string values stored in SQLite via Prisma.
// SQLite does not support native enum columns — these are stored as plain strings.

export enum Role {
  REQUESTER = 'REQUESTER',
  PROCUREMENT_BP = 'PROCUREMENT_BP',
  FINANCE = 'FINANCE',
  DIRECTOR_OF_PROCUREMENT = 'DIRECTOR_OF_PROCUREMENT',
  CFO = 'CFO',
  EXEC_COMMITTEE = 'EXEC_COMMITTEE',
  TRUST_BOARD = 'TRUST_BOARD',
  FINANCE_MANAGER = 'FINANCE_MANAGER',
  DIVISIONAL_LEAD = 'DIVISIONAL_LEAD',
  MERG_COMMITTEE = 'MERG_COMMITTEE',
  ADMIN = 'ADMIN', // maintains thresholds/bands in /admin; never an approver
}

export enum SubmissionStatus {
  DRAFT = 'DRAFT',
  IN_APPROVAL = 'IN_APPROVAL',
  INFO_REQUESTED = 'INFO_REQUESTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum ApprovalStepStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  INFO_REQUESTED = 'INFO_REQUESTED',
}
