# Custom cake inquiries

Local page: `/custom-cakes`. API: `POST /api/custom-cakes` (multipart/form-data).

## Customer experience

- Hero and direct inquiry/serving-guide links; four size cards; quote-based price guidance.
- Four steps: event, cake preferences, contact/photos, review and send. Previous entries survive back navigation and failed sends.
- The email to the bakery has a Traditional Chinese copy under the English (labels and options translated, customer text as written). Contact and pre-order emails do the same. To change a translation, edit `lib/email-zh.ts`.
- Problems (missing or invalid fields, unticked acknowledgement, could not send) are listed in one box right above the Continue / Send button, and the fields with problems turn red, the same as the contact form. A photo that cannot be added shows its message under the photo picker.
- Event date uses Las Vegas calendar time and requires at least three days' notice. The visible guidance requests 3–5 days and explains that availability must be confirmed.
- Event time is optional (customers may not have decided). Blank is sent to the bakery as "Not decided yet" / 未定.
- Optional reference images: up to five photos; any phone photo (including iPhone HEIC) is converted to JPEG and resized to 800 KB in the browser before sending; preview and removal controls.
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

## Writing on the cake and custom fillings

- Optional "Writing on the cake" field (60 characters) in the cake step, shown on the review step and in both the English and Chinese email. It is customer text, so it is never translated.
- The last filling option is "Something else (e.g., passion fruit)"; choosing it asks the customer to describe the filling in the notes.
- Strawberry, Banana and Strawberry Banana are separate filling choices, all priced in the Mixed Fruit / Strawberry / Banana / Tiramisu group (owner, Oct 2026).

## Inquiry tracker (admin → Cake inquiries)

Every inquiry that is emailed is also saved to `bakery_cake_inquiries` (schema: `db/002-cake-inquiries.sql`; run it once in Supabase before deploying). The email stays the primary record: if saving fails, the customer still sees success and the error is logged. Photos stay in the email only.

- Statuses: New → Waiting on customer / Checking with Mom → Confirmed & paid → Completed, or Cancelled. Filters: Open, Confirmed & paid, Completed / cancelled, All.
- Private notes per inquiry for the agreed design, final price and payment.
- Inquiries from the same email or phone are flagged on each other, so a second "correction" form is easy to spot and cancel.
- After a delivered inquiry the customer gets a copy (their choices only, no notes or address) with reply-to set to the bakery inbox, so corrections come as replies. A failed copy is logged and does not fail the inquiry.
- Customer details and private notes are encrypted at rest like pre-orders; RLS has no browser policies. API: `POST /api/admin/cake-inquiries` (admin session required).
