// Runs during every Vercel build (see "vercel-build" in package.json).
// Seeds the demo data ONLY when the database has no users — i.e. the very first
// deploy against a fresh Prisma Postgres database. On every later deploy it does
// nothing, so demo activity is never wiped by a redeploy.
// To deliberately reset the hosted demo, see RESET_DEMO_DATA below.
import { execSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';
import { guardDatabase } from './dbGuard';

const prisma = new PrismaClient({ datasourceUrl: guardDatabase('seed-if-empty') });

async function main() {
  const users = await prisma.user.count();
  await prisma.$disconnect();
  // Deliberate reset of the hosted demo, done THROUGH a Vercel deploy: set the
  // Vercel environment variable RESET_DEMO_DATA=true, redeploy, then delete the
  // variable (otherwise every deploy resets). See DEPLOY_VERCEL.md.
  if (process.env.RESET_DEMO_DATA === 'true') {
    console.log('seed-if-empty: RESET_DEMO_DATA=true — wiping and re-seeding demo data...');
    execSync('tsx prisma/seed.ts', { stdio: 'inherit' });
    return;
  }
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
