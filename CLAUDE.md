# Working on this project

- Live site: https://sunvillebakerylv.com (Vercel, deploys from GitHub `sshower111/sunvibe` branch `main`).
- Work in the `sunville-release-20260922` folder. Push with `git push origin claude/handoff-cleanup:main`.
- Data: Supabase only (menu, gallery, occasions, pre-orders, photos). No Stripe, no Vercel Blob.
- Bakery phone, address, hours and email: change them only in `lib/site-info.ts`.
- Before committing: `pnpm build` must pass (type checking is on) and run `pnpm format`.

## Documentation rule

Every pushed change must update docs in the same commit:
1. Add an entry at the top of `CHANGELOG.md` under today's date (what changed, in plain words, and the main files).
2. If behaviour, setup or an admin task changed, also update the matching doc in `docs/` (for example `docs/ADMIN_GUIDE.md`).
