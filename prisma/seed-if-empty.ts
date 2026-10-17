// Runs during every Vercel build (see "vercel-build" in package.json).
// Seeds the demo data ONLY when the database has no users — i.e. the very first
// deploy against a fresh Prisma Postgres database. On every later deploy it does
// nothing, so demo activity is never wiped by a redeploy.
// To deliberately reset the hosted demo, see README → "Resetting the hosted demo".
import { execSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.count();
  await prisma.$disconnect();
  if (users > 0) {
    console.log(`seed-if-empty: database already has ${users} users — not seeding.`);
    return;
  }
  console.log('seed-if-empty: database is empty — seeding demo data...');
  execSync('tsx prisma/seed.ts', { stdio: 'inherit' });
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
