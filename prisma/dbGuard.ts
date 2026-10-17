// Guard for the scripts in this folder (seed, seed-if-empty, add-admin-user).
// Same rule as the app: outside Vercel they may only touch a database on this
// computer, so a local seed can never wipe the hosted demo. No override.
import { existsSync } from 'node:fs';
import { assertSafeDatabase } from '../src/lib/dbTarget';

// Returns the checked URL; callers MUST pass it to PrismaClient as datasourceUrl
// so the database that was checked is exactly the database that gets used.
export function guardDatabase(context: string): string {
  // When run directly with tsx (not via the Prisma CLI), load .env ourselves so
  // we check the same DATABASE_URL Prisma Client is about to use.
  if (!process.env.DATABASE_URL && existsSync('.env')) process.loadEnvFile('.env');
  const target = assertSafeDatabase(process.env.DATABASE_URL, context);
  console.log(`[${context}] Database: ${target?.label ?? '(unknown)'} — ${process.env.VERCEL ? 'HOSTED (Vercel)' : 'LOCAL (this computer)'}`);
  return process.env.DATABASE_URL as string;
}
