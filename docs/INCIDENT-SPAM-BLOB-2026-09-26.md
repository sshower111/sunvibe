# Contact spam and Blob quota remediation — September 26, 2026

## Cause and impact

Campaign reads in the site-wide layout used Blob list() on server renders, with additional reads on pre-order pages; gallery reads also listed on each request. list() counts as an Advanced Operation. This design unnecessarily consumed the Hobby quota. Vercel reported a suspension; live checks found a hidden banner, an incorrect no-campaign pre-order state, and a failing gallery endpoint.

Contact verification correctly called Turnstile Siteverify, but content validation accepted numbers-only messages. The in-memory rate limiter is per instance and is not a global abuse limit. The screenshot cannot establish how the sender passed CAPTCHA.

## Changes

- No list() calls remain in the campaign/order JSON and gallery read paths. Stable file URLs are discovered with head() (a Simple Operation), with successful locations cached for 24 hours and failure results for 15 minutes.
- Public campaign and gallery content, including outage results, is cached for 15 minutes. Public campaign reads are also deduplicated within a render. Successful admin edits invalidate relevant tags. Order submission still reads authoritative data rather than relying on public-page cache.
- Encrypted JSON, conditional writes and order privacy remain intact. Writes still use necessary put() operations. No database, subscription or plan change was introduced.
- During suspension, pre-orders display a temporary-unavailability phone message. Gallery falls back to the existing bundled photo list and exposes degraded:true; admin writes cannot overwrite stored content with fallback data.
- Contact forms reject numbers-only and link-only messages, check an optional hidden honeypot, and validate phone syntax. Unicode letters are accepted, including Chinese. Server verification remains mandatory.
- Resend idempotency keys suppress repeated identical contact email deliveries across instances for its 24-hour retention window. This is duplicate suppression, not a shared IP rate limit.

## Outstanding external action

The current Vercel management credential returned HTTP 403. A shared edge firewall rate limit could not be configured: configure POST /api/contact at 3 requests per IP per 10 minutes after reconnecting the account. Review existing rules before adding; no paid plan was enabled. The local in-memory limiter remains an additional best-effort layer.

Code changes do not lift an existing Blob suspension. Recovery requires the platform's allowance reset or a separately approved plan action. Cached outage results expire within 15 minutes after access is restored. Do not copy stale local campaigns over production to work around suspension.

## Verification

scripts/test-spam-and-blob.cjs covers numeric and URL-only spam, honeypots, CAPTCHA rejection, multilingual content, stable duplicate keys, cached URL lookup/failures, cached public data and invalidation. Existing order API and encryption/concurrency tests also pass. No real email was sent during verification. Production build and live outage checks are performed before/after release.

References: https://vercel.com/docs/vercel-blob/usage-and-pricing and https://resend.com/changelog/idempotency-keys.

Final validation: pnpm build passed. A clean-cache production-mode browser test at 390px confirmed the temporary-unavailability message, no dead reservation form, gallery fallback, and numeric-spam rejection before any request. Existing unrelated TypeScript errors remain in the admin-gallery and Stripe integration files.
