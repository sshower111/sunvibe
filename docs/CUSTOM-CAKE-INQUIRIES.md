# Custom cake inquiries

Local page: `/custom-cakes`. API: `POST /api/custom-cakes` (multipart/form-data).

## Customer experience

- One page, `/order-cake`, runs the order (`/custom-cakes` redirects there) (`components/cake-order-flow.tsx`): party size (best-fit size suggested, `lib/cake-finder.ts`) → flavor and filling → classic look or custom cake → pickup or delivery and date → "Here's your cake" summary with an estimated price → contact (and card, when paying). Contact fields appear only after the customer presses "Order & pay" or "Request a quote" on the summary.
- It ends as a paid online order (`docs/CAKE-ORDERS.md`) for an everyday size, listed flavor and filling, classic look and pickup at an offered time (this is the only way to get a cake the same day, and the design step says so). Everything else is sent here as an inquiry for a quote, with at least 3 days' notice.
- In the flavor lists, "Not sure" is the last choice, after the real flavors and fillings.
- Custom cake asks for inspiration photos first ("Have a picture? We'd love to see it"), then design/dietary notes; the summary shows how many photos were added, or "None yet, add one?". Delivery adds the address. Occasion is sent as "Other" and budget as "Not sure — please advise".
- The email to the bakery has a Traditional Chinese copy under the English (labels and options translated, customer text as written). Contact and pre-order emails do the same. To change a translation, edit `lib/email-zh.ts`.
- Problems (missing or invalid fields, unticked acknowledgement, could not send) are listed in one box right above the Continue / Send button, and the fields with problems turn red, the same as the contact form. A photo that cannot be added shows its message under the photo picker.
- Event date uses Las Vegas calendar time and requires at least three days' notice. The visible guidance requests 3–5 days and explains that availability must be confirmed.
- Event time is optional (customers may not have decided). Blank is sent to the bakery as "Not decided yet" / 未定.
- Optional reference images: up to ten photos; any phone photo (including iPhone HEIC) is converted to JPEG, 1400px and at most 400 KB, in the browser before sending; preview and removal controls.
- An explicit acknowledgement explains that inquiries do not confirm orders, pricing, or availability.
- Navigation, mobile navigation, footer, sitemap, and page metadata include the new page.

## Owner-approved specification source

The owner supplied Bakery Cake Pricing & Specs.pdf (five pages). All 26 catalog rows were cross-checked against extracted source figures: 8 round sizes, 3 sheet sizes, and 15 tier combinations. `lib/cake-catalog.ts` holds the prices, party/wedding servings, and delivery options. `lib/cake-inquiry.ts` holds the six cake flavors and eight fillings, plus a custom-filling request option. The guide preserves the four price-group labels from the PDF and does not infer an automatic price for combinations not explicitly priced. Local delivery within 10 miles is $30; casino/hotel delivery is $50. The form captures serving count, cake size, and an optional delivery destination. Preferred portion style is intentionally omitted; the guide still explains serving estimates.

The owner has no approved photos categorized by event. The page therefore links to the existing gallery; a filterable portfolio is deferred until real categorized photos are supplied. No generic images are represented as actual custom-cake work. Pickup is available as a request; delivery is explicitly subject to confirmation.

## Delivery and security

Uses existing `RESEND_API_KEY`, `NOTIFICATION_EMAIL`, and Turnstile environment configuration. No additional provider or public storage bucket is required. The CAPTCHA action is `custom_cake`; existing contact requests retain `contact`. Attachments are sent to the bakery email, not placed at public URLs. The server validates fields, dates, image MIME/signatures, photo count/size, and actual streamed request size (3 MB plus 64 KB form overhead). SVG/HTML files are rejected, attachment names are generated, and all user fields are escaped in HTML email. This is signature validation, not antivirus scanning.

Turnstile is required before email delivery. The process-local rate limiter is best-effort per instance and is not a distributed abuse-control service. A stable per-submission UUID supplies the email provider's idempotency key on retries. Changing the inquiry generates a new identifier. Provider failures are reported as failures, preserve form content, and require a fresh CAPTCHA token.

## Checks performed

`tests/unit/cake-inquiry.test.cjs` (`pnpm test`) uses isolated mocked email/CAPTCHA providers: date boundaries, invalid dates/fields/acknowledgement, spoofed/large/excess files, failed CAPTCHA, escaped email, safe filenames, reply-to, idempotency key, provider failures, rate limiting, and stream-size rejection.

Browser checks use mocked external providers and verify the full four-step flow, invalid-field focus, blocked file formats, previews, review, failure recovery, and success. Responsive checks cover 320/390/768/1440px. No real email was sent. TypeScript reports only the existing admin/Stripe/Chatbase errors after Next regenerated route types.

PDF-based content has been integrated and validated. See RELEASE-CUSTOM-CAKES.md for deployment details. To roll back, remove the page/API and navigation links; no database migration or catalog changes are involved.

PDF update validation: every catalog price and serving figure matched the source; browser tests passed for round/sheet/tier pricing selection, Pandan/Durian preferences, casino delivery destination, review, and mocked submission. No live email was sent.

## Larger tier cakes

The online guide and inquiry accept 2- and 3-tier combinations only. Four- and five-tier options from the PDF are intentionally excluded at the owner’s request. Customers are directed to call 702-889-9887 for 4+ tiers. The public catalog now has 23 entries (8 round, 3 sheet, 12 tiered); server validation also rejects the removed sizes.

Tier labels use "+" between the sizes ("2-Tier · 8" + 12"").

**Your own tiers** (Oct 31, 2026): in the party-size step, "Build your own tiered cake" (or "Your own tiers" under all sizes) lets the customer pick 2 or 3 tiers and a round size (6"–20") for each, top to bottom; each tier must be smaller than the one below. A combination on the price sheet is that catalog cake with its price; any other (e.g. 8" + 10") serves the sum of its rounds and is always a quote request ("price quoted"). Size value: `tier-8-10` (`tierSizes`, `findCake` in `lib/cake-catalog.ts`).

**A flavor per tier**: for any tiered cake the flavor step asks "Same in every tier" or "Different for each tier". With different tiers, the inquiry stores `tierFlavors` (top tier first) and keeps the top tier in flavor/filling. The bakery email shows one line per tier ("Top tier (8"): Vanilla / Mango", Chinese 頂層／中層／底層), as do the customer copy and the admin inquiry card; "Create order" fills flavor and filling as "Top: Vanilla · Bottom: Chocolate".

## Writing on the cake and custom fillings

- Optional "Writing on the cake" field (60 characters) in the cake step, shown on the review step and in both the English and Chinese email. It is customer text, so it is never translated.
- The last filling option is "Something else (e.g., passion fruit)"; choosing it asks the customer to describe the filling in the notes.
- Strawberry and Banana are separate filling choices, priced in the Mixed Fruit / Strawberry / Banana / Tiramisu group (owner, Oct 2026). "Strawberry Banana" was removed on Oct 31, 2026: customers who want it pick "Something else" and describe it. Old inquiries and orders that say Strawberry Banana still display and translate.

## Inquiry tracker (admin → Cake inquiries)

Every inquiry that is emailed is also saved to `bakery_cake_inquiries` (schema: `db/002-cake-inquiries.sql`; run it once in Supabase before deploying). The email stays the primary record: if saving fails, the customer still sees success and the error is logged. Photos stay in the email only.

- Statuses: New → Awaiting customer / Under bakery review → Confirmed & paid → Completed, or Cancelled. Filters: Open, Confirmed & paid, Completed / cancelled, All.
- Reference photos show as small thumbnails on the inquiry; hover one to see the whole photo, tap to open it full size. They are saved encrypted (same key as customer details) under `cake-inquiries/<id>/` in the existing storage bucket, so the public bucket URL shows nothing, and are served only to a signed-in admin by `GET /api/admin/cake-inquiries/photo`. A photo that fails to save is still in the email. Inquiries sent before this change show the photo count only.
- Private notes per inquiry for the agreed design, final price and payment.
- Inquiries from the same email or phone are flagged on each other, so a second "correction" form is easy to spot and cancel.
- After a delivered inquiry the customer gets a copy (their choices only, no notes or address) with reply-to set to the bakery inbox, so corrections come as replies. A failed copy is logged and does not fail the inquiry.
- Customer details and private notes are encrypted at rest like pre-orders; RLS has no browser policies. API: `POST /api/admin/cake-inquiries` (admin session required).
