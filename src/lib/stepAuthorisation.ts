// Per-step authorisation: is this user the intended approver for this step?
//
// Enforcement is against the approver snapshotted on the ApprovalStep row at
// submission time (assignedToId / approverRole) — never a live recompute.
//
//   - Step has a specific assigned person (e.g. MERG step 1's care-group
//     Finance Manager): only that user may act. Holding the role is NOT enough.
//   - Step is role-only (assignedToId is null): the user must hold approverRole.
//
// Plain module (no Prisma, no 'use client') so the API routes and the
// submission detail page share exactly the same rule.

export interface StepApprover {
  approverRole: string;
  assignedToId?: string | null;
}

export interface Actor {
  id: string;
  role: string;
}

export function isIntendedApprover(step: StepApprover, user: Actor): boolean {
  if (step.assignedToId) {
    return user.id === step.assignedToId;
  }
  return user.role === step.approverRole;
}

// Returns null if the user may act on the step, otherwise a 403 error message.
export function approverCheckError(step: StepApprover, user: Actor): string | null {
  if (isIntendedApprover(step, user)) return null;
  if (step.assignedToId) {
    return 'You are not the assigned approver for this step. Only the person assigned to it can act on it.';
  }
  return `You are not the assigned approver for this step. It requires role ${step.approverRole} but you are ${user.role}.`;
}
