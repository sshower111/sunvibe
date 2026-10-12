# Sunville Bakery website

Live site: https://sunvillebakerylv.com · Next.js 15 on Vercel · data in Supabase.

## Run locally

```
pnpm install
pnpm dev        # http://localhost:3000
pnpm build      # must pass before pushing (includes type checks)
pnpm format     # Prettier
```

Needs `.env.local` (never committed): `DATABASE_URL`, `SUPABASE_DB_CA`, `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `SUPABASE_STORAGE_BUCKET`, `ADMIN_PASSWORD`, `CAMPAIGN_STORAGE_SECRET`, `RESEND_API_KEY`, `NOTIFICATION_EMAIL`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`, `TURNSTILE_ALLOWED_HOSTNAMES`, optional `MAINTENANCE_MODE`, `SMS_GATEWAY_EMAIL`.

## Deploy


## Where things are

- Pages: `app/` (home, menu, custom-cakes, gallery, contact, pre-order, admin)
- Bakery phone/address/hours/email: `lib/site-info.ts`
- Database access: `lib/database*.ts` (schema in `db/001-bakery.sql`)
- Emails: `lib/email.ts` (Resend)
