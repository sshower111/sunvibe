# Occasions release — September 25, 2026

Deploys the admin-managed campaigns, reservation page and inbox, encrypted JSON storage, presets, draft preview and the mobile UI redesign. Admin > Occasions replaces Banners. Scheduling and reservation availability remain separate; the editor now explains when an active banner has a passed cutoff or no remaining future pickup dates.

Existing dates and pickup rules are unchanged. The current Mid-Autumn campaign ends September 25 with a September 24 cutoff, so reservations remain closed until the owner changes dates. Deployment does not reopen ordering automatically.

See OCCASIONS.md for storage configuration, workflow, security and validation. Production uses existing Blob, Resend, Turnstile and admin environment variables. Optional SMS is disabled unless SMS_GATEWAY_EMAIL is set. Cloud JSON encryption uses CAMPAIGN_STORAGE_SECRET or the existing admin secret; preserve that secret.

Validation: pnpm build, mocked reservation/storage tests and 390px browser matrix including accessibility, preview, active/empty/closed states and admin actions. Real email/SMS delivery is not exercised. Existing unrelated TypeScript errors remain documented.

Rollback: redeploy 317460a. Do not delete stored campaigns or orders.
