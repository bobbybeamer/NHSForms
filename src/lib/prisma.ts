import { PrismaClient } from '@prisma/client';

// Connection string comes from DATABASE_URL (set by the Vercel Prisma Postgres
// integration, or a local .env). If DATABASE_URL_POOLED is set — the optional
// pooled string from the Prisma Console — the app uses it instead; the Prisma
// CLI (migrations, seed) always uses DATABASE_URL.
//
// Prisma Postgres caps DIRECT connections (5 usable on the free plan), and each
// serverless function instance opens its own pool, so unless the URL already
// says otherwise we cap every instance at one connection.
function databaseUrl(): string | undefined {
  const raw = process.env.DATABASE_URL_POOLED || process.env.DATABASE_URL;
  if (!raw) return undefined;
  try {
    const url = new URL(raw);
    if (!url.searchParams.has('connection_limit')) url.searchParams.set('connection_limit', '1');
    return url.toString();
  } catch {
    return raw;
  }
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasourceUrl: databaseUrl(),
    log: ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
