# Putting the demo online (Vercel + Prisma Postgres)

A step-by-step guide for someone who doesn't write code. Everything here happens in a web browser except Part A, which is two commands in the Terminal. Allow about 20 minutes.

**What you'll end up with:** a public web address (like `https://nhs-forms.vercel.app`) where the demo runs, backed by its own online database pre-filled with the demo users and example requests. It is a **prototype with dummy data only** — every page says so.

**What you need:** your GitHub login (account `bobbybeamer`, repository `NHSForms`) and an email address for a free Vercel account.

---

## Part A — Get the Build 8 code onto GitHub's main branch

Vercel publishes whatever is on the `main` branch. The Build 8 changes are on a separate branch, `build-8-vercel-postgres`, so you can review them first.

1. In the Terminal, in the project folder, run:
   ```
   git push -u origin build-8-vercel-postgres
   ```
   **Success looks like:** the last lines mention `build-8-vercel-postgres` and a link starting `https://github.com/bobbybeamer/NHSForms/pull/new/...`.
2. Open https://github.com/bobbybeamer/NHSForms in your browser. A yellow bar says **"build-8-vercel-postgres had recent pushes"**. Click **Compare & pull request**.
3. Check the box at the top says **base: main ← compare: build-8-vercel-postgres**. Click **Create pull request**.
4. Click the **Files changed** tab to review the changes if you want to. It includes the Build 7 commits too, because they were not on GitHub yet.
5. Go back to the **Conversation** tab, click **Merge pull request**, then **Confirm merge**.
   **Success looks like:** a purple **Merged** label.
6. Back in the Terminal, bring your own copy up to date:
   ```
   git checkout main
   git pull
   ```

---

## Part B — Create the Vercel project

1. Go to https://vercel.com and click **Sign Up** (or **Log In**). Choose **Continue with GitHub** and approve the access request.
2. On your Vercel dashboard click **Add New…** (top right) → **Project**.
3. Under **Import Git Repository**, find **NHSForms** and click **Import**.
   - If it isn't listed: click **Adjust GitHub App Permissions** (or **Configure GitHub App**), give Vercel access to the `NHSForms` repository, save, and come back.
4. On the **Configure Project** screen:
   - **Project Name:** anything you like, e.g. `nhs-forms-demo`. This becomes part of the web address.
   - **Framework Preset:** should already say **Next.js**. Leave it.
   - **Root Directory, Build and Output Settings, Environment Variables:** leave them all alone. The project's `vercel.json` file supplies the build command, and the database variable is added automatically in Part C.
5. Click **Deploy**.
6. **This first deploy is expected to FAIL**, because there's no database yet. The build log will show an error mentioning `DATABASE_URL`. That's fine — carry on to Part C.

---

## Part C — Add the database

1. Open your project in Vercel (dashboard → click the project name). Click the **Storage** tab at the top.
2. Click **Create Database** (or **Connect Database** → **Create New**). Choose **Prisma Postgres** and click **Continue**.
3. Fill in the form:
   - **Region:** pick one in Europe close to the UK, e.g. **Frankfurt** or **Paris**.
   - **Plan:** **Free** is enough for the demo.
   - **Database name:** e.g. `nhs-forms-demo-db`.
   Accept the terms and click **Create** (or **Continue**).
4. Vercel asks which environments to connect the database to. Make sure **Production**, **Preview** and **Development** are all ticked. Click **Connect**.
5. **Check the variable is there:** click the **Settings** tab → **Environment Variables**. You should see **`DATABASE_URL`**, and probably also `POSTGRES_URL` and `PRISMA_DATABASE_URL`. **You don't need to type or paste anything** — the app reads `DATABASE_URL`, which the integration created for you.
   - If you see `PRISMA_DATABASE_URL` but **no** `DATABASE_URL`: click **Add New**. Name: `DATABASE_URL`. Value: copy the value of `POSTGRES_URL` — it starts with `postgres://`. Don't use a value starting `prisma+postgres://`. Tick all three environments and click **Save**.
6. Keep the connection string private. It's a password to the database. Never paste it into email, chat or GitHub.

---

## Part D — Deploy for real

1. Click the **Deployments** tab. On the failed deployment from Part B, click the **⋯** (three dots) menu → **Redeploy** → **Redeploy**.
2. Click the new deployment to watch the **Build Logs**. Signs it's going well:
   - `Applying migration 20261017120000_postgres_baseline` — the database tables are being created.
   - `seed-if-empty: database is empty — seeding demo data...` followed by `Seeding complete.` — the demo users and example requests are being loaded. **You do not need to run a seed command yourself.**
   - The build finishes and the status turns to **Ready** (green).
3. Click **Visit** (or the address shown under **Domains**, e.g. `nhs-forms-demo.vercel.app`).

**Success looks like:**
- A yellow bar across the top of every page: **"PROTOTYPE — demo only. Do not enter real patient or procurement data."**
- The sign-in page lists 13 demo users, including **Alex Admin** and the three Finance Managers (CG1, CG2 and CG3).
- Signing in as **Reqi Requester** shows the dashboard, and **My requests** lists the example waivers and MERG request.
- Signing in as **Alex Admin** and clicking **Admin** shows the five thresholds and bands.

Send your client the address under **Domains** — the one ending `.vercel.app` without a long random part in the middle.

---

## If something goes wrong

| What you see | What to do |
|---|---|
| Build log: `Environment variable not found: DATABASE_URL` | The database isn't connected to the project, or not for that environment. Go to **Storage** → your database → connect it to the project with **Production** and **Preview** ticked. Check **Settings → Environment Variables** shows `DATABASE_URL` (see Part C step 5), then **Redeploy**. |
| Build log: `P1001: Can't reach database server` or `too many connections` | Wait a minute and **Redeploy**. Check the database shows as active under **Storage**. |
| Build log: `the URL must start with the protocol postgresql:// or postgres://` | `DATABASE_URL` holds a `prisma+postgres://` value. Edit it in **Settings → Environment Variables** to the `postgres://` value from `POSTGRES_URL`, then **Redeploy**. |
| Any other red error in the build log | Copy the first red error message and send it to whoever maintains the code. The same error will appear locally when they run `npm run build`. |
| Your client gets a Vercel login page instead of the app | They were sent a *preview* address. Send the **Production** domain from the project's main page instead, or check **Settings → Deployment Protection** — the production domain should not be protected. |
| The site works but pages feel slow | Optional: **Settings → Functions → Function Region**. Pick the region nearest the database you chose (e.g. Frankfurt), save and **Redeploy**. |

---

## Afterwards

- **Updating the demo:** every change merged into `main` on GitHub deploys automatically. New database migrations are applied automatically on deploy. The demo data is **not** wiped by a redeploy.
- **Resetting the demo data** back to the standard demo set: see README → "Resetting the hosted demo". It's one command, run from a computer that has the database address in its `.env` file.
- **Local development** uses the same database — see README → "How to run locally".
