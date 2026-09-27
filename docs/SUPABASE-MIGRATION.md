# Supabase migration — staged, not enabled in production

The menu currently comes from Stripe. Campaigns, reservations and gallery metadata currently come from Blob. New uploads can use Supabase Storage. Existing photo URLs are retained until their files have been copied and verified.

## Connection and switches

Create a Supabase project at https://supabase.com/dashboard. Copy the Transaction Pooler connection string from the project Connect dialog into server-only DATABASE_URL locally and in the intended Vercel environment. Use the actual database password, URL-encoded when necessary. The driver disables prepared statements and verifies TLS certificates. Never use NEXT_PUBLIC_ for this URL. Creating the connection alone does not change the website.

- MENU_DATA_SOURCE=supabase selects the verified database menu. Unset keeps Stripe.
- CONTENT_DATA_SOURCE=supabase selects verified database campaigns, reservations and gallery metadata. Unset keeps existing storage.
- Preserve CAMPAIGN_STORAGE_SECRET (or the current ADMIN_PASSWORD fallback). Existing encrypted reservation payloads need the same key.

Each scope requires a bakery_migrations readiness marker. Database errors never silently switch to an old source. Public gallery retains its existing outage fallback.

## Safe import and cutover

1. Freeze source admin edits and reservation intake during the final export/import/cutover window. The initial menu snapshot is preparation only; re-export immediately before cutover if source records changed. Archive the earlier snapshot rather than overwriting it.
2. Run `node scripts/migrate-supabase.cjs export-menu`. This reads all active AND inactive Stripe products and preserves their IDs, photos, categories, exact cent prices and order. It rejects unsupported pricing.
3. For content, run `node scripts/migrate-supabase.cjs export-content`. It reads authenticated production campaigns/orders and the gallery. A storage outage or degraded gallery aborts export. NEVER substitute .local-data development records or bundled gallery defaults for unavailable production data. Wait for Blob recovery first. Customer records are encrypted in the private snapshot.
4. Run `node scripts/migrate-supabase.cjs schema` against the intended Supabase branch.
5. Run `node scripts/migrate-supabase.cjs import-menu` and, when available, `import-content`. Inserts are transactional, refuse a populated destination, and never overwrite existing records. The script compares every imported record with the snapshot before adding a readiness marker. If interrupted after insert but before marking ready, stop and inspect; do not delete records to retry blindly.
6. Run `verify-menu` / `verify-content`. Confirm snapshot freshness and counts. Commands print no connection strings or customer records.
7. Enable the corresponding source switch in Preview, redeploy, and check public menu, hide/show, combined item edits, add item, campaigns, gallery, encrypted reservation saving/status updates and duplicate submissions. Use a separate Supabase branch for test writes.
8. Enable the verified scope in Production and deploy. Menu can migrate before content while Blob is paused. Confirm 51 source items (including hidden items) against the actual final export, prices, names and photos; verify caches refresh after edits. Release the source edit freeze only after verification.

## Stripe retirement

When MENU_DATA_SOURCE=supabase, all menu admin endpoints and public menu reads use Supabase. Legacy online checkout/webhook handlers return 410 without contacting Stripe. Existing Stripe implementation and SDK remain temporarily as a rollback path; remove them and obsolete payment UI/scripts only AFTER successful production cutover. No Stripe products are deleted or archived by migration.

Do not simply switch back to Stripe/Blob after accepting new database edits or orders: reverse-migrate those changes first under a write freeze. Keep encrypted backups private. .local-data/supabase-migration is gitignored and must never be deployed.

## Verification completed locally

- scripts/test-supabase.cjs uses PGlite (real local PostgreSQL): schema, readiness gates, admin auth, parameterized SQL, exact cents, menu CRUD/hide, encrypted reservation retries/conflicts, statuses, campaigns, gallery.
- Existing Stripe admin, Blob encryption, and spam/cache regression tests remain available.
- Cloud connection, final data migration and production cutover require Supabase access. No claim of cloud migration until those steps complete.

## Photo storage setup

Configure these server-only variables in .env.local and Vercel:
- SUPABASE_URL: project URL
- SUPABASE_SECRET_KEY: server secret key (legacy SUPABASE_SERVICE_ROLE_KEY also supported)
- SUPABASE_STORAGE_BUCKET: bakery-images
- PHOTO_STORAGE=supabase: enable Supabase uploads only after the bucket is ready

Never put secret keys or the database connection string in chat or NEXT_PUBLIC_ variables. They bypass public access controls. Keep the current campaign encryption secret unchanged.

Create a PUBLIC bucket named bakery-images for published bakery photos only, with a 5 MB size limit and allowed image/jpeg, image/png, image/webp, image/gif MIME types. Public means anyone with a photo URL can view it. Do not put customer information, exports, or private reference photos in this bucket. No public upload/update/delete policies are needed: the authenticated admin upload route uses a server-only secret. Never add anonymous write policies.

The SQL schema enables RLS on all five application tables with no browser policies. Database access is through the trusted server's Postgres connection; anonymous/authenticated Data API callers must not see menu administration, campaigns, migrations, or customer records.

The switches are independent: menu, content, and photo uploads can be verified and enabled separately. Supabase upload failures never fall back silently to Blob. The campaign editor uses the same upload endpoint as the gallery.

Existing images: export the authoritative URL inventory from gallery, menu and campaign records after source storage recovers. Copy the original files into Supabase; verify byte hashes/content type and that each public destination URL loads before replacing references. Preserve an old-to-new URL mapping privately and never delete source files during this migration. Keep external Yelp/ImgBB URLs until intentionally migrated; do not assume every photo belongs to Blob. A paused source cannot be recovered by creating Supabase. Existing Blob photos may remain unavailable until their source access returns.

Do not disconnect Stripe or delete Blob until the data and photo migration is verified and the rollback window has passed.


## Supabase CA certificate

The project requires its downloaded database CA certificate for TLS verification. Set SUPABASE_DB_CA to the complete PEM certificate in local and Vercel environments (actual newlines or escaped \n are supported). This is a public certificate, not a password. Never disable certificate verification. Local connection verified using the owner-provided prod-ca-2021.crt.

## Connection and migration progress

Supabase connection verified with the downloaded CA. Created public bakery-images bucket (5 MB, JPEG/PNG/WebP/GIF). Imported and verified all 51 Stripe menu records; menu readiness marker created. Fixed postgres.js RowList comparison by comparing plain arrays. The finalize-menu command rechecks the entire snapshot before adding a missing readiness marker; it never overwrites records. Production source switches remain unchanged. Campaign API returns 503; gallery is degraded; reservation API is reachable. Full content export therefore remains blocked. Vercel management credential returns 403, preventing production configuration.

Vercel management access restored. Owner explicitly approved encrypted server-only Supabase credentials for Sunville preview and production. Preview configuration is scoped to migration/supabase-menu-storage. Content source remains Blob until authoritative campaigns/gallery can be exported.

## Production cutover verified — 2026-09-27

Code release 544251b deployed successfully. Production MENU_DATA_SOURCE=supabase and PHOTO_STORAGE=supabase are enabled with encrypted server-only credentials. CONTENT_DATA_SOURCE remains unset (Blob). All 51 menu records were compared field-by-field with the source snapshot and the live admin endpoint confirmed Supabase. Home, menu, contact, custom cakes, gallery and pre-order returned 200. At 390px, the menu had no horizontal page overflow and the Add menu item dialog opened correctly. A temporary copy of the public bakery logo was uploaded through the live authenticated endpoint, downloaded byte-for-byte from Supabase, and removed afterward; gallery metadata was untouched.

Remaining: authoritative campaigns and gallery metadata are still unavailable from Blob, so full content migration is blocked. New uploads go to Supabase but saving gallery/campaign metadata can still fail until that source is recovered and migrated. Existing remote photo URLs are preserved. Stripe code is retained for recovery; the live menu no longer uses it. Do not roll back source flags after new Supabase edits without reconciling data.
