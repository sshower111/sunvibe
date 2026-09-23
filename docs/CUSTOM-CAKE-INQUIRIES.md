# Custom cake inquiries

Local page: `/custom-cakes`. API: `POST /api/custom-cakes` (multipart/form-data).

## Customer experience
- Hero and direct inquiry/serving-guide links; four size cards; quote-based price guidance.
- Four steps: event, cake preferences, contact/photos, review and send. Previous entries survive back navigation and failed sends.
- Event date uses Las Vegas calendar time and requires at least three days' notice. The visible guidance requests 3–5 days and explains that availability must be confirmed.
- Optional reference images: at most three JPG/PNG/WebP files, 1 MB each; preview and removal controls.
- An explicit acknowledgement explains that inquiries do not confirm orders, pricing, or availability.
- Navigation, mobile navigation, footer, sitemap, and page metadata include the new page.

## Owner-approved specification source
The owner supplied Bakery Cake Pricing & Specs.pdf (five pages). All 26 catalog rows were cross-checked against extracted source figures: 8 round sizes, 3 sheet sizes, and 15 tier combinations. `lib/cake-catalog.ts` holds the prices, party/wedding servings, and delivery options. `lib/cake-inquiry.ts` holds the six cake flavors and eight fillings, plus a custom-filling request option. The guide preserves the four price-group labels from the PDF and does not infer an automatic price for combinations not explicitly priced. Local delivery within 10 miles is $30; casino/hotel delivery is $50. The form captures serving count, cake size, and an optional delivery destination. Preferred portion style is intentionally omitted; the guide still explains serving estimates.

The owner has no approved photos categorized by event. The page therefore links to the existing gallery; a filterable portfolio is deferred until real categorized photos are supplied. No generic images are represented as actual custom-cake work. Pickup is available as a request; delivery is explicitly subject to confirmation.

## Delivery and security
Uses existing `RESEND_API_KEY`, `NOTIFICATION_EMAIL`, and Turnstile environment configuration. No additional provider or public storage bucket is required. The CAPTCHA action is `custom_cake`; existing contact requests retain `contact`. Attachments are sent to the bakery email, not placed at public URLs. The server validates fields, dates, image MIME/signatures, photo count/size, and actual streamed request size (3 MB plus 64 KB form overhead). SVG/HTML files are rejected, attachment names are generated, and all user fields are escaped in HTML email. This is signature validation, not antivirus scanning.

Turnstile is required before email delivery. The process-local rate limiter is best-effort per instance and is not a distributed abuse-control service. A stable per-submission UUID supplies the email provider's idempotency key on retries. Changing the inquiry generates a new identifier. Provider failures are reported as failures, preserve form content, and require a fresh CAPTCHA token.

## Checks performed
`node scripts/test-cake-inquiry.cjs` uses isolated mocked email/CAPTCHA providers: date boundaries, invalid dates/fields/acknowledgement, spoofed/large/excess files, failed CAPTCHA, escaped email, safe filenames, reply-to, idempotency key, provider failures, rate limiting, and stream-size rejection.

Browser checks use mocked external providers and verify the full four-step flow, invalid-field focus, blocked file formats, previews, review, failure recovery, and success. Responsive checks cover 320/390/768/1440px. No real email was sent. TypeScript reports only the existing admin/Stripe/Chatbase errors after Next regenerated route types.

PDF-based content has been integrated and validated. See RELEASE-CUSTOM-CAKES.md for deployment details. To roll back, remove the page/API and navigation links; no database migration or catalog changes are involved.

PDF update validation: every catalog price and serving figure matched the source; browser tests passed for round/sheet/tier pricing selection, Pandan/Durian preferences, casino delivery destination, review, and mocked submission. No live email was sent.
