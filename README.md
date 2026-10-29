# Sunville Bakery website

Live site: https://sunvillebakerylv.com · Next.js 15 on Vercel · data in Supabase.

## Run locally

```
pnpm install
cp .env.example .env.local   # then fill in the values (never committed)
pnpm dev                     # http://localhost:3000
```

## Checks before pushing

```
pnpm build          # production build, includes type checking
pnpm typecheck      # TypeScript only (run after a build or dev run so next-env.d.ts exists)
pnpm test           # unit tests in tests/unit (providers mocked, in-memory PostgreSQL)
pnpm format         # Prettier; pnpm format:check to verify only
```

GitHub Actions (`.github/workflows/ci.yml`) runs `pnpm format:check`, `pnpm test` and `pnpm build` on every push and pull request to `main`. It needs no secrets.

All environment variables are listed with explanations in `.env.example`.

## Deploy

Vercel deploys `main` automatically: `git push origin handoff-cleanup:main`.

## Where things are

- Pages: `app/` (home, menu, order-cake, gallery, contact, pre-order, admin)
- Bakery phone/address/hours/email: `lib/site-info.ts`
- Database access: `lib/database*.ts` (schema in `db/001-bakery.sql`)
- Admin sign-in and sessions: `lib/admin-auth.ts`
- Tests: `tests/unit/*.test.cjs`, with `tests/helpers/load-ts.cjs` to load TypeScript modules and mock providers
- Emails: `lib/email.ts` (Resend)
- Admin guide: `docs/ADMIN_GUIDE.md` · Change history: `CHANGELOG.md` · Working rules: `CONTRIBUTING.md`
