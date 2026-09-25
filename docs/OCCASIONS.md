# Occasions and festival reservations

## Owner workflow

Open Admin > Occasions. New occasion starts a draft from a preset. Choose the year and preset, then Apply preset to replace the editor contents. Review all dates and copy; festivals with no supplied date for a year require manual dates. Optional second-language fields are owner-written, not automatically translated.

Add items with actual names, prices and optional quantity limits. Pick a photo from the existing gallery/menu collection, enter an HTTPS photo URL, or upload through the existing gallery upload service. Uploads require the existing Vercel Blob credential. Photos are not automatically added to the public gallery.

Save draft stores the campaign unpublished (and switches an existing published campaign off). Save & preview saves the current state and opens /pre-order?preview=ID; the preview requires the existing admin password and cannot submit orders. Publish / Unpublish applies your editor changes. Duplicate creates a separate saved draft with a new ID; update its dates before publishing. Delete asks for confirmation and retains historical orders.

The first published campaign whose inclusive date range contains today in America/Los_Angeles drives both the banner and /pre-order. Overlapping campaigns use list order. Status is derived: draft, scheduled, active, ended. The banner remains hidden on /admin paths and retains the existing per-ID, 24-hour localStorage dismissal and visual styling. Page refresh applies saved changes; the server revalidates dates at submission time.

## Seed and migration

The first store starts with the requested published Mid-Autumn 2026 campaign (September 24–25, order cutoff September 24), current mooncake copy, and Reserve mooncakes CTA. No products or prices were invented: the seed has no items and displays a call-to-reserve option until the owner adds them. Clearing all campaigns stays empty and does not recreate the seed.

Admin > Banners is replaced by Occasions. The old banner API returns 410 with a pointer to Occasions. Old seasonal-banners.json files are preserved for reference but no longer drive the site; they are not automatically imported into campaign items or prices. Local content does not deploy to production.

## Reservations

/pre-order is always a usable page: no active campaign shows a phone option; after cutoff, or when no valid future pickup day remains, the form is replaced with the closed message. Pickup is at least tomorrow in Las Vegas and within the campaign window. Prices and maximum quantities are read from the saved campaign on the server, never accepted from the browser. Totals use integer cents; delivery fees are confirmed by phone. This is a request, not payment or a confirmed order.

The invisible Turnstile component runs on submit with action pre_order. The request waits for a token; the server verifies hostname/action before storing. Each browser request has a UUID to avoid duplicate records on retry. Name, phone, date, acknowledgment, item selection and notes are validated server-side; email is optional.

Admin > Pre-orders shows the immutable customer/item details and permits status changes only: new, called, confirmed, picked_up, cancelled. Phone-width cards replace a wide table for easy operation. Refresh orders to see new requests.

## Storage and configuration

No database or dependency was added. Local development stores JSON in ignored .local-data/campaigns.json and .local-data/pre-orders.json. Local order data is plain JSON and should only contain test customers. Vercel uses the existing BLOB_READ_WRITE_TOKEN, storing encrypted JSON at occasions/campaigns.json and occasions/pre-orders.json. Both drafts and customer information are AES-256-GCM encrypted before entering the existing public Blob store.

CAMPAIGN_STORAGE_SECRET is optional but recommended as a stable encryption secret before first production use. If absent, ADMIN_PASSWORD is the encryption secret. Preserve whichever secret was used: changing it makes existing records unreadable unless they are migrated with the old key. Never put it in a NEXT_PUBLIC variable. No credentials are stored in campaign JSON.

Writes use ETag conditional updates with bounded retries and local process serialization to avoid overwriting concurrent requests; first writes use allowOverwrite: false. See [Vercel Blob SDK conditional writes](https://vercel.com/docs/vercel-blob/using-blob-sdk). Storage errors are surfaced; public banners fail closed. Allow for Blob cache propagation and refresh/retry after competing updates. This JSON store is intended for the bakery's modest reservation volume, not a POS.

Email reuses RESEND_API_KEY and NOTIFICATION_EMAIL (fallback sunvillebakerylv@gmail.com), plus the existing sender. TURNSTILE_SECRET_KEY, NEXT_PUBLIC_TURNSTILE_SITE_KEY, and TURNSTILE_ALLOWED_HOSTNAMES remain required. Optional SMS_GATEWAY_EMAIL enables a plain-text email-to-SMS notification. Gateway delivery depends on the carrier. The code has a Twilio migration note; no SMS provider was added.

An accepted request is stored before email is sent. If notification fails, the customer is told the request was saved and to call; the inbox still contains it. Email delivery uses a per-request Resend idempotency key. SMS failure does not discard a saved order. Staff should check the inbox regularly.

## Verification

- pnpm build: passed (existing repository configuration skips type checking and linting).
- Separate tsc check: no new errors; pre-existing admin-gallery optional-string and Stripe API-version errors remain.
- node scripts/test-occasions.cjs: LA midnight and year boundary, computed/manual dates, statuses, invalid input, server pricing/quantity limits, cutoff, CAPTCHA failure, successful mocked notifications, record deduplication, and inbox authorization/status validation.
- node scripts/test-occasion-storage.cjs: encrypted cloud round-trip, no plaintext customer details, conditional updates, retry and concurrent writes against a mock Blob provider.
- scripts/test-occasions-browser.cjs against an isolated production build: empty, draft/authorized preview, active, cutoff, phone-width create/edit/preview/publish/duplicate/delete and reservation form. Outgoing submissions are mocked; temporary local campaign/order files are restored.

No live campaigns, real reservations, email/SMS messages, or cloud uploads were created during verification. Live Turnstile and provider delivery must be checked with a deliberate test after deployment. Production release authorized September 25, 2026.

Final browser checks also verified persisted inbox status changes, no phone-width horizontal overflow, and zero automated WCAG A/AA violations in the reservation form and inbox. These are browser-emulated phone checks, not a physical-device certification.

## Customer and editor UI redesign

The customer page now uses a full-bleed campaign hero or theme-token gradient, an LA-local end-of-cutoff-day countdown refreshed each minute, a how-it-works section, product cards, a mobile running-total bar, pickup guidance, and grouped contact/pickup fields. Empty items use a call-to-reserve card. The campaign editor has collapsible item rows, schema-length character counters, a sticky save bar, and friendly Blob configuration errors.

Campaign model, pricing, schemas, API routes, CAPTCHA, request IDs, preview authentication, and storage behavior were unchanged by the UI redesign. Countdown checks cover summer/winter and both daylight-saving transitions. The 390px browser matrix covers active, no-items, no-campaign, cutoff, preview, editor and submission states; automated WCAG A/AA checks cover customer form, editor and inbox. pnpm build passed. Existing unrelated tsc errors remain documented above.

The previous production release (317460a) excluded Occasions. The September 25 release introduces Occasions, the reservation inbox and /pre-order. Rollback to 317460a removes these routes without deleting stored records.
