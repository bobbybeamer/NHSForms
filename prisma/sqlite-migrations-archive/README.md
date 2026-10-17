# SQLite migrations (archived, Builds 1–7)

These are the migrations that built the original local SQLite database
(`prisma/dev.db`). They are kept for history only and are **not** applied any
more: from Build 8 the app uses Postgres, and `prisma/migrations/` starts from a
single Postgres baseline that produces the same schema.

To go back to the SQLite version of the app, check out the git tag
`sqlite-final` (the last commit before Build 8); your local `prisma/dev.db` is
untouched and still works with that version.
