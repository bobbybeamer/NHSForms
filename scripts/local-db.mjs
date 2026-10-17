// Local development database: a private Postgres that runs on THIS computer,
// stored in .local-postgres/ (git-ignored). It has no connection to the hosted
// Vercel demo database. Used by:
//   npm run dev            start the local DB, apply migrations, seed if empty, run the app
//   npm run db:reset-local wipe the LOCAL database and re-seed the demo data
//   npm run db:which       show which database .env points at (no secrets printed)
import EmbeddedPostgres from 'embedded-postgres';
import { existsSync, readFileSync } from 'node:fs';
import { spawn, execSync } from 'node:child_process';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const DATA_DIR = path.join(ROOT, '.local-postgres');
const LOCAL = { user: 'nhs_local', password: 'nhs_local', port: 5433, database: 'nhsforms_dev' };
const LOCAL_URL = `postgresql://${LOCAL.user}:${LOCAL.password}@localhost:${LOCAL.port}/${LOCAL.database}`;
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

function readEnvUrl(file) {
  const p = path.join(ROOT, file);
  if (!existsSync(p)) return undefined;
  const m = readFileSync(p, 'utf8').match(/^\s*DATABASE_URL\s*=\s*"?([^"\n]+)"?/m);
  return m?.[1];
}

function describe(url) {
  try {
    const u = new URL(url);
    return { label: `${u.hostname}:${u.port || '5432'}${u.pathname}`, isLocal: LOCAL_HOSTS.has(u.hostname) };
  } catch {
    return { label: '(unreadable)', isLocal: false };
  }
}

// Next.js gives .env.local priority over .env, so check both.
function checkEnvFiles() {
  const problems = [];
  for (const file of ['.env', '.env.local']) {
    const url = readEnvUrl(file);
    if (url && !describe(url).isLocal) problems.push(`${file} points DATABASE_URL at ${describe(url).label}`);
  }
  if (!readEnvUrl('.env')) problems.push('.env has no DATABASE_URL (copy .env.example to .env)');
  return problems;
}

function which() {
  const envUrl = readEnvUrl('.env');
  const localUrl = readEnvUrl('.env.local');
  const effective = localUrl ?? envUrl;
  console.log(`.env        DATABASE_URL → ${envUrl ? describe(envUrl).label : '(not set)'}`);
  if (localUrl) console.log(`.env.local  DATABASE_URL → ${describe(localUrl).label}  (takes priority in npm run dev)`);
  if (!effective) return console.log('\nNot pointed at any database.');
  const d = describe(effective);
  console.log(d.isLocal
    ? `\nLOCAL — your private database on this computer (${d.label}). The hosted demo cannot be affected.`
    : `\nNOT LOCAL (${d.label}). The app and seed scripts will refuse to run until this points at localhost.`);
}

async function startDb() {
  const pg = new EmbeddedPostgres({
    databaseDir: DATA_DIR, user: LOCAL.user, password: LOCAL.password, port: LOCAL.port,
    persistent: true, onLog: () => {}, onError: () => {},
  });
  const fresh = !existsSync(path.join(DATA_DIR, 'PG_VERSION'));
  if (fresh) {
    console.log('Creating your local database (first run only)...');
    await pg.initialise();
  }
  await pg.start();
  if (fresh) await pg.createDatabase(LOCAL.database);
  console.log(`Local database running at localhost:${LOCAL.port}/${LOCAL.database}`);
  return pg;
}

function run(cmd) {
  execSync(cmd, { cwd: ROOT, stdio: 'inherit', env: { ...process.env, DATABASE_URL: LOCAL_URL } });
}

async function main() {
  const mode = process.argv[2];
  if (mode === 'which') return which();

  const problems = checkEnvFiles();
  if (problems.length) {
    console.error('Refusing to start — local development must use your LOCAL database:\n  - ' + problems.join('\n  - '));
    console.error(`\nPut this line in .env:\nDATABASE_URL="${LOCAL_URL}"`);
    process.exit(1);
  }

  const pg = await startDb();
  let stopping = false;
  const stop = async (code = 0) => {
    if (stopping) return;
    stopping = true;
    await pg.stop().catch(() => {});
    process.exit(code);
  };
  process.on('SIGINT', () => stop(0));
  process.on('SIGTERM', () => stop(0));

  try {
    const prismaCli = 'node node_modules/prisma/build/index.js';
    // Regenerate the client every start so it always matches the Postgres schema
    // (a stale client can carry an old built-in database address).
    run(`${prismaCli} generate`);
    run(`${prismaCli} migrate deploy`);
    if (mode === 'reset') {
      run('node node_modules/tsx/dist/cli.mjs prisma/seed.ts');
      return stop(0);
    }
    run('node node_modules/tsx/dist/cli.mjs prisma/seed-if-empty.ts');
  } catch {
    return stop(1);
  }

  console.log('\nStarting the app against your LOCAL database. Press Ctrl+C to stop both.\n');
  const next = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev'], {
    cwd: ROOT, stdio: 'inherit', env: { ...process.env, DATABASE_URL: LOCAL_URL },
  });
  next.on('exit', (code) => stop(code ?? 0));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
