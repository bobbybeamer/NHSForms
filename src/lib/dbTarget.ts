// Which database is this process pointed at, and is it allowed to use it?
//
// Rule: the HOSTED demo database may only be used by code running ON VERCEL
// (deploys and the deployed app). Anywhere else — `npm run dev`, a local
// seed, the admin script — the database MUST be on this computer (localhost).
// There is deliberately no override switch.
//
// Vercel always sets VERCEL=1 for builds and deployed functions; it is never
// set on a developer's machine.

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

export interface DatabaseTarget {
  host: string;
  port: string;
  database: string;
  isLocal: boolean;
  label: string; // safe to print: never includes the username or password
}

export function describeDatabase(url: string | undefined): DatabaseTarget | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    const host = u.hostname;
    const port = u.port || '5432';
    const database = u.pathname.replace(/^\//, '') || '(default)';
    const isLocal = LOCAL_HOSTS.has(host);
    return { host, port, database, isLocal, label: `${host}:${port}/${database}` };
  } catch {
    return null;
  }
}

export function isRunningOnVercel(): boolean {
  return !!process.env.VERCEL;
}

// Throws unless (a) we are on Vercel, or (b) the database is on this computer.
export function assertSafeDatabase(url: string | undefined, context: string): DatabaseTarget | null {
  const target = describeDatabase(url);
  if (isRunningOnVercel()) return target;
  if (!target || !target.isLocal) {
    throw new Error(
      `[${context}] Refusing to connect: outside Vercel, this app only uses a database on this ` +
      `computer (localhost), but DATABASE_URL points to ${target ? target.host : 'an unreadable address'}. ` +
      `The hosted demo database can only be changed by Vercel deploys. ` +
      `Check your .env (and .env.local, if present) — see README → "How to run locally".`
    );
  }
  return target;
}
