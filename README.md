# Wasl / وصل

Wasl is an original social product for moments, follows, stories, short clips, and messages. The interface, mark, and schema are written for this project. It does not reuse Instagram code, trademarks, or assets.

## Architecture

- `src/app` — Next.js App Router pages (desktop rail, mobile bottom nav, Arabic/English, RTL/LTR, light/dark).
- `src/app/api` — REST handlers. Each route authenticates, validates with Zod, and returns explicit HTTP statuses.
- `src/lib/db.ts` — PostgreSQL access. Uses `DATABASE_URL` with `pg` when set, otherwise embedded PostgreSQL via PGlite in `.data/`.
- `db/schema.sql` — tables, foreign keys, checks, indexes, and the `comment_replies` view.
- `src/lib/storage.ts` — local `public/uploads` or S3-compatible storage when `S3_*` is set.
- `server.mjs` — Next.js plus a WebSocket server on `/ws` for message and typing events.
- `public/manifest.json` and `public/sw.js` — installable PWA shell.

## Run locally

```bash
cd wasl
cp .env.example .env
npm install
npm run dev
```

Open http://localhost:3000

Accounts are created with a public display name, a unique username, a generated account id, and a password. Email and phone are not collected. Login uses the username.

Demo password for every seeded account: `WaslDemo!2026`

- `layla` — Arabic feed author
- `omar` — clips and coast notes
- `nour` — kitchen notes
- `admin` — moderation desk at `/admin`

## Production

```bash
docker compose up -d
# .env
# DATABASE_URL=postgres://wasl:wasl@localhost:5432/wasl
# S3_ENDPOINT=https://your-minio-or-s3
# S3_BUCKET=wasl
# S3_ACCESS_KEY=...
# S3_SECRET_KEY=...
# S3_PUBLIC_BASE=https://cdn.example/wasl
npm run build
NODE_ENV=production npm start
```

S3 uploads are enabled when `S3_BUCKET`, `S3_ACCESS_KEY`, and `S3_SECRET_KEY` are set. Install the client in that environment: `npm install @aws-sdk/client-s3`. Without those variables, files are stored in `public/uploads`.

## Security notes

Passwords are bcrypt hashes. Sessions are random tokens stored as SHA-256 hashes in `sessions`, sent only as an httpOnly SameSite cookie. Mutations reject cross-origin requests and are rate limited. Queries are parameterized. Uploads check MIME type and size.
