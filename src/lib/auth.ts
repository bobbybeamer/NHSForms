'use client';

export function getUserIdFromCookie(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|;\s*)nhs_user_id=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export async function fetchCurrentUser() {
  const res = await fetch('/api/auth/me');
  if (!res.ok) return null;
  return res.json();
}

export async function logout() {
  await fetch('/api/auth/logout', { method: 'POST' });
}
