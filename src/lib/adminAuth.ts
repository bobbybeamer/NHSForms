import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Role } from '@/types/enums';

// Server-side admin check shared by the /admin page and the admin APIs.
// The user is resolved from the demo login cookie (real NHS SSO is a later
// build); what matters here is that the ROLE is checked on the server.

export async function getUserById(userId: string | undefined) {
  if (!userId) return null;
  return prisma.user.findUnique({ where: { id: userId } });
}

export function isAdmin(user: { role: string } | null | undefined): boolean {
  return user?.role === Role.ADMIN;
}

type AdminCheck =
  | { ok: true; user: NonNullable<Awaited<ReturnType<typeof getUserById>>> }
  | { ok: false; status: 401 | 403; error: string };

export async function requireAdmin(request: NextRequest): Promise<AdminCheck> {
  const user = await getUserById(request.cookies.get('nhs_user_id')?.value);
  if (!user) return { ok: false, status: 401, error: 'Not authenticated' };
  if (!isAdmin(user)) {
    return { ok: false, status: 403, error: 'Not authorised: only administrators can change system settings.' };
  }
  return { ok: true, user };
}
