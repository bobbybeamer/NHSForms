// Build 7 upgrade for an EXISTING database: adds the demo administrator
// without touching any other data. Safe to run more than once.
//   npx tsx prisma/add-admin-user.ts
// (A fresh database set up with `npx prisma migrate reset` gets the admin user
// from seed.ts instead.)
import { PrismaClient } from '@prisma/client';
import { ADMIN_USER } from './build7Data';

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.user.findUnique({ where: { email: ADMIN_USER.email } });
  if (existing) {
    console.log(`Admin user already present: ${existing.name} (${existing.email}) — nothing to do.`);
    return;
  }
  const admin = await prisma.user.create({ data: ADMIN_USER });
  console.log(`Added admin user: ${admin.name} (${admin.email}). No other data was changed.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
