# Sunville Bakery — application security audit

Date: 2026-09-23. Baseline: production release commit `da1a0db`.
Repository: https://github.com/sshower111/sunvibe
Source root: `C:/Users/Keith/porjects/sunville-release-20260922`.
All line references below are relative to this root and commit, before remediation.

## Scope and evidence

Reviewed the tracked application, API routes, admin interfaces, helpers, scripts, manifests, lockfiles, Next configuration, and deployment/security documentation. Scanned 85 tracked text files for credential patterns. Reviewed local environment variable names only, not secret values. Executed npm and pnpm advisory scans. Inspected public response headers on https://sunvillebakerylv.com/contact. Confirmed two defects using isolated transpiled-source tests with mocked Stripe; no production mutations, purchases, email sends, credential guessing, or exploit requests were made.

This is a code audit, not proof that the application is free of other defects. Full Git-history secret scanning, Vercel environment/WAF settings, Stripe account configuration, real-device testing, and runtime penetration testing were not performed. Dependency findings are version matches, not proof every vulnerable code path is reachable. Proposed patches below have not been applied, built, or deployed. Some require new infrastructure and explicitly identify that dependency.

## Priority summary

1. [CRITICAL] Fail-open product administration plus client-public password design.
2. [CRITICAL] Next.js dependency advisories, with platform-specific applicability.
3. [HIGH] Persistent admin password in browser storage and no real sessions.
4. [HIGH] Password checks bypass login throttling; limiter is process-local.
5. [HIGH] Chatbase identity-signing oracle.
6. [MEDIUM] Checkout accepts client-selected prices without product eligibility checks.
7. [MEDIUM] Price mutation does not verify price/product ownership and archives first.
8. [MEDIUM] Order email HTML injection.
9. [MEDIUM] Webhook payment/idempotency/delivery integrity gaps.
10. [MEDIUM] Missing anti-framing and other response defenses.
11. [MEDIUM] Gallery accepts unvalidated URLs and declared upload MIME types.
12. [LOW] Unsafe constant-time comparison error handling.
13. [LOW] Diagnostics/error/PII leakage.
14. [MEDIUM] Build gates and dependency-management ambiguity.
15. [LOW] Documentation publishes an example admin credential as login instructions.
16. [LOW] Checkout success page confirms unverified payments.

## 1. [CRITICAL] Fail-open admin access and public credential namespace

**Locations:** `app/api/admin/products/route.ts:4,12,74,148`; `app/admin/gallery/page.tsx:20,39,76,95,135,164`. Related fail-open checks: `app/api/admin/products/list/route.ts:4,11`, `app/api/admin/products/toggle/route.ts:4,11`, `app/api/admin/products/price/route.ts:4,11`, `app/api/admin/maintenance/route.ts:12-15`.

The product CRUD route authenticates against NEXT_PUBLIC_ADMIN_PASSWORD. If that variable is absent and a request omits password, both sides are undefined and authorization succeeds. In an isolated test, DELETE returned 200 and invoked mocked stripe.products.update without a password. This is conditional on server configuration; live exploitability was not tested. The local environment name inventory does not contain NEXT_PUBLIC_ADMIN_PASSWORD.

If that variable IS set at build time, the legacy client gallery page references it, so its value is eligible for inclusion in public JavaScript. Setting it is not a safe fix. Missing ADMIN_PASSWORD similarly opens the list/toggle/price handlers; maintenance POST currently only returns instructions, so it does not itself change maintenance state.

**Immediate patch:** add `lib/admin-password.ts` and use it on EVERY password-authenticated route until session migration is complete:

```ts
import 'server-only'
import { createHash, timingSafeEqual } from 'node:crypto'

export function validAdminPassword(candidate: unknown): boolean {
  const expected = process.env.ADMIN_PASSWORD
  if (!expected || typeof candidate !== 'string' ||
      candidate.length === 0 || candidate.length > 1024) return false
  const digest = (value: string) => createHash('sha256').update(value).digest()
  return timingSafeEqual(digest(candidate), digest(expected))
}
```

Replace each password comparison, including POST/PUT/DELETE:

```ts
if (!validAdminPassword(password)) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

Remove all NEXT_PUBLIC_ADMIN_PASSWORD references. Retire the obsolete gallery screen by replacing `app/admin/gallery/page.tsx` with:

```tsx
import { redirect } from 'next/navigation'
export default function LegacyGalleryAdmin() {
  redirect('/admin')
}
```

Unset the public password variable, rotate any credential ever stored there, and rebuild. Old bundles/caches can retain previously embedded credentials; a redeploy alone is insufficient without rotation.

## 2. [CRITICAL] Vulnerable dependencies; qualify by reachable features

**Locations:** `package.json:41,48,52,55,76`; `pnpm-lock.yaml:1663` (Next 15.5.18), `1652` (nanoid 3.3.12), `1704,1708` (PostCSS 8.4.31/8.5.14), `1715` (qs 6.15.1), `1825` (sharp 0.34.5), `1920` (undici 6.25.0).

`pnpm audit --json` returned **32 advisory entries: 2 critical, 12 high, 16 moderate, 2 low**. Counts are scanner entries, not 32 independently exploitable application vulnerabilities. Full machine-readable evidence is in `audit-pnpm.json`; npm's alternate-lockfile report is `audit-dependencies.json`.

- Windows-hosted Next RCE, GHSA-p293-qw3h-jr36: installed 15.5.18 is affected; patched 15.5.24. Relevant to the Windows development environment; this is not evidence of Windows RCE on Vercel. The development server was bound to loopback, which limits direct network exposure.
- AVIF image-optimization RCE, GHSA-2xp9-vwfh-vxw4: patched 15.5.24. Image optimization is disabled in this repository; that limits the relevant exposure. Do not report confirmed production RCE solely from this match.
- Next Server Action DoS/SSRF advisories: no application Server Actions or custom server were found; do not assume those exploit paths are present.
- Other matches include PostCSS, undici, sharp, qs, nanoid, browserslist, baseline-browser-mapping, and csv-parse. Several require attacker-controlled build inputs, specific client features, or image processing not currently used by these routes.

Primary Next advisories:
https://github.com/vercel/next.js/security/advisories/GHSA-p293-qw3h-jr36
https://github.com/vercel/next.js/security/advisories/GHSA-2xp9-vwfh-vxw4
https://github.com/vercel/next.js/security/advisories/GHSA-m99w-x7hq-7vfj

**Patch plan (commands to run in a remediation branch, not executed here):**

```sh
pnpm add --save-exact next@15.5.24 @vercel/analytics@2.0.1 geist@1.7.0
pnpm add --save-exact csv-parse@7.0.2
pnpm add -D --save-exact postcss@8.5.23
```

Merge these overrides into package.json, regenerate the pnpm lockfile, and test compatibility (especially sharp and csv-parse major upgrades):

```json
{
  "pnpm": {
    "overrides": {
      "postcss@<8.5.23": "8.5.23",
      "undici@<6.28.0": "6.28.0",
      "qs@<6.16.0": "6.16.0",
      "nanoid@<3.3.18": "3.3.18",
      "browserslist@<4.28.7": "4.28.7",
      "baseline-browser-mapping@<2.11.0": "2.11.0",
      "sharp@<0.35.4": "0.35.4"
    }
  }
}
```

These are minimum patched targets derived from today's audit; they are not a guarantee against future advisories. Re-run pnpm audit, production build, gallery upload tests, and CSV-import parsing tests. Prefer upstream dependency upgrades over permanent overrides where possible.

## 3. [HIGH] Reusable admin credential stored in localStorage; no server session

**Locations:** `app/admin/page.tsx:41-46,85-95,100-105`; `app/api/admin/verify/route.ts:28-29`; `app/layout.tsx:93-110,157-158`.

Login returns a boolean, not a session. The actual reusable password is persisted in localStorage and sent with subsequent requests. Any same-origin script can read it; the root layout loads third-party Chatbase code on admin pages as well. This is an exposure risk, not evidence Chatbase is malicious or an XSS exploit has occurred. The localStorage auth flag alone is NOT server authorization, but stealing the stored password grants the single shared administrator privilege. No user accounts, MFA, per-person roles, expiration, or revocation are implemented.

**Refactor:** use a server-side identity/session provider with MFA, or a persisted opaque-session store. The following is an exact integration pattern; `sessions` must be implemented using a shared database/Redis with TTL and revocation, NOT an in-memory Map:

```ts
// After verifying the password (or an OIDC callback) on the server:
import { randomBytes, createHash } from 'node:crypto'
const token = randomBytes(32).toString('base64url')
const tokenHash = createHash('sha256').update(token).digest('hex')
await sessions.insert({ tokenHash, role: 'admin', expiresAt: Date.now() + 3600000 })
const response = NextResponse.json({ success: true })
response.cookies.set('__Host-admin', token, {
  httpOnly: true, secure: true, sameSite: 'strict', path: '/', maxAge: 3600,
})
return response
```

```ts
// Every admin API, gallery write/upload included; after migration do not
// keep the password-body fallback, or this protection can be bypassed.
const token = request.cookies.get('__Host-admin')?.value
const tokenHash = token && createHash('sha256').update(token).digest('hex')
const session = tokenHash ? await sessions.find(tokenHash) : null
if (!session || session.role !== 'admin' || session.expiresAt <= Date.now()) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method) &&
    request.headers.get('origin') !== process.env.APP_ORIGIN) {
  return NextResponse.json({ error: 'Invalid origin' }, { status: 403 })
}
```

Use a fixed APP_ORIGIN such as https://sunvillebakerylv.com, not the request Host header. Add logout that deletes the stored session and expires the cookie. For local development use HTTPS or a separate non-__Host development cookie. Remove password storage and password JSON/form fields from clients; clear old storage once during migration:

```ts
localStorage.removeItem('sunville-admin-password')
localStorage.removeItem('sunville-admin-auth')
```

Do not infer multiple roles are required for this single-owner app; the real defects are reusable credential exposure and lack of revocable server authorization. Exclude chatbot/analytics scripts from the admin route group when refactoring the root layout.

## 4. [HIGH] Authentication attempts bypass throttling

**Locations:** `lib/security.ts:7-29,41-45,125-129`; `app/api/admin/verify/route.ts:7-14`; password checks at finding 1; `app/api/admin/products/description/route.ts:12-15`; `app/api/gallery/route.ts:41-45`.

Only the login-verification route is throttled consistently. An attacker can guess the same password against product list or description endpoints instead. Existing limits also reset with process restarts/serverless instances. The first x-forwarded-for value is trusted without a documented ingress contract; spoofability depends on Vercel/proxy behavior and was not established live.

**Patch:** migrate to sessions so only login checks passwords; apply a shared atomic limiter to login, contact, checkout, and uploads. For example, with new @upstash/redis and @upstash/ratelimit dependencies and managed credentials:

```ts
import { Redis } from '@upstash/redis'
import { Ratelimit } from '@upstash/ratelimit'
const authLimit = new Ratelimit({
  redis: Redis.fromEnv(), limiter: Ratelimit.slidingWindow(5, '15 m'),
  prefix: 'sunville:admin-login',
})
const result = await authLimit.limit(trustedIngressIp)
if (!result.success) {
  return NextResponse.json({ error: 'Too many attempts' }, {
    status: 429, headers: { 'Retry-After': String(Math.max(1, Math.ceil((result.reset - Date.now()) / 1000))) },
  })
}
```

`trustedIngressIp` must come from the verified hosting ingress header contract; do not copy arbitrary forwarded headers. Until migration, run the same shared limiter before ALL password checks. Add bounded request parsing and phone length validation to contact (`app/api/contact/route.ts:18,49`); Content-Length checking alone is not a reliable body limit. Configure gateway body limits as well.

## 5. [HIGH] Chatbase endpoint signs identities supplied by anonymous callers

**Location:** `app/api/chatbase/identify/route.ts:6-14,17-35`.

Any caller can submit any userId and obtain its valid HMAC. Keeping the HMAC secret server-side does not help when a public endpoint signs arbitrary identities. This undermines identity verification and could expose identity-bound conversation data depending on Chatbase settings. No authenticated customer identity exists in this app, and no direct call site beyond the helper was found.

**Safe exact patch for the current app:** disable identity signing until authenticated customer accounts exist:

```ts
import { NextResponse } from 'next/server'
export async function POST() {
  return NextResponse.json({ error: 'User identification is unavailable' }, { status: 403 })
}
```

An anonymous chatbot can remain enabled. If authenticated accounts are added, derive the ID and metadata from the verified server session; ignore caller-provided identity fields.

## 6. [MEDIUM] Checkout accepts arbitrary account prices and incomplete quantities

**Location:** `app/api/checkout/route.ts:17,34-56,58-72,100-109`.

The request chooses Stripe price IDs. Stripe prevents arbitrary client amounts, so this is NOT a demonstrated free-price manipulation. However, this route does not verify product.active, price.active, default price membership, currency, or integer quantity. Hidden products/obsolete active prices can remain purchasable if their IDs are known. Public IDs are not authorization. No tenant boundary exists here; the risk is catalog/business-rule bypass rather than confirmed cross-user IDOR.

**Patch before session creation:** normalize legacy single-item input, validate with existing zod, and check every price against Stripe:

```ts
import { z } from 'zod'
const schema = z.array(z.object({
  priceId: z.string().regex(/^price_[A-Za-z0-9]+$/),
  quantity: z.number().int().min(1).max(99),
})).min(1).max(50)
const parsed = schema.safeParse(items ?? [{ priceId, quantity: 1 }])
if (!parsed.success) return NextResponse.json({ error: 'Invalid items' }, { status: 400 })
for (const item of parsed.data) {
  const price = await stripe.prices.retrieve(item.priceId, { expand: ['product'] })
  const product = price.product
  if (!price.active || price.currency !== 'usd' || price.type !== 'one_time' ||
      typeof product === 'string' || product.deleted || !product.active ||
      (typeof product.default_price === 'string' ? product.default_price : product.default_price?.id) !== price.id) {
    return NextResponse.json({ error: 'Item is unavailable' }, { status: 400 })
  }
}
const lineItems = parsed.data.map(item => ({ price: item.priceId, quantity: item.quantity }))
```

Use the validated fixed APP_ORIGIN for success/cancel URLs, retain configured tax handling, aggregate duplicate price IDs before applying quantity limits, and validate pickup dates against Pacific-time business rules. Invalid pickup values currently silently become ASAP (`lib/security.ts:102-119`).

## 7. [MEDIUM] Product price updates accept unrelated price IDs and mutate first

**Locations:** `app/api/admin/products/price/route.ts:15-42`; `app/api/admin/products/route.ts:84-124`.

An authenticated request can pair product A with product B's price ID, archiving the wrong price. The old price is archived before the replacement is successfully created. Invalid numbers/downstream failures can disrupt ordering. This is a relationship validation/business-integrity issue, not a demonstrated cross-tenant exploit.

**Patch core:**

```ts
if (typeof price !== 'string' || !/^\d{1,6}(\.\d{1,2})?$/.test(price))
  return NextResponse.json({ error: 'Invalid price' }, { status: 400 })
const cents = Math.round(Number(price) * 100)
if (!Number.isSafeInteger(cents) || cents < 1)
  return NextResponse.json({ error: 'Invalid price' }, { status: 400 })
const product = await stripe.products.retrieve(productId)
const currentId = typeof product.default_price === 'string' ? product.default_price : product.default_price?.id
if (currentId !== priceId) return NextResponse.json({ error: 'Price changed; refresh and retry' }, { status: 409 })
const oldPrice = await stripe.prices.retrieve(priceId)
const owner = typeof oldPrice.product === 'string' ? oldPrice.product : oldPrice.product.id
if (owner !== product.id) return NextResponse.json({ error: 'Price mismatch' }, { status: 400 })
const replacement = await stripe.prices.create({ product: product.id, unit_amount: cents, currency: 'usd' })
await stripe.products.update(product.id, { default_price: replacement.id })
await stripe.prices.update(priceId, { active: false })
```

Use a persisted operation/idempotency key and serialize updates per product for concurrent admin requests. Stripe calls are not one database transaction; failures still need reconciliation. Validate all other product-edit fields before the first write.

## 8. [MEDIUM] Unescaped HTML in order emails

**Locations:** `app/api/webhooks/stripe/route.ts:57-59,99,103,107,116,159,165,173`.

Customer name and product names are interpolated directly into HTML email templates. A valid Stripe signature authenticates the event, not the safety of customer-controlled strings. HTML injection can spoof order details or links. Email clients commonly block scripts, so this is NOT proven browser JavaScript execution.

**Patch:** keep recipient addresses raw for the email API, escape every value only where inserted into HTML:

```ts
import { escapeHtml } from '@/lib/security'
const customerEmail = session.customer_details?.email || ''
const safeCustomerName = escapeHtml(session.customer_details?.name || 'Customer')
const safeCustomerEmail = escapeHtml(customerEmail)
const safePickupTime = escapeHtml(session.metadata?.pickupTime || 'ASAP')
```

Replace template `${customerName}`, `${customerEmail}`, `${pickupTime}`, and `${item.name}` with `${safeCustomerName}`, `${safeCustomerEmail}`, `${safePickupTime}`, and `${escapeHtml(item.name)}` respectively. Do not HTML-encode the `to` address. Remove CR/LF from values used in mail subjects as defense in depth.

## 9. [MEDIUM] Webhook processing lacks payment guard and durable delivery semantics

**Locations:** `app/api/webhooks/stripe/route.ts:38,208-239`.

checkout.session.completed is treated as paid without checking payment_status. This matters for delayed payment methods. There is no persisted deduplication, so retries can send duplicate notifications. Provider errors returned as result.error are ignored; caught exceptions still lead to 200, preventing retries for lost emails. Signature verification itself is correctly present at line 28.

**Patch integration pattern:** add a transactional event/outbox store with unique event IDs. The persistence API below is an explicit new dependency, not an existing helper:

```ts
if (!['checkout.session.completed', 'checkout.session.async_payment_succeeded'].includes(event.type)) {
  return NextResponse.json({ received: true })
}
const session = event.data.object as Stripe.Checkout.Session
if (session.payment_status !== 'paid') return NextResponse.json({ received: true })
// Atomic transaction: unique event.id + unique (session.id, recipientKind).
// Store the two email jobs durably before acknowledging the webhook.
await outbox.enqueuePaidOrderOnce(event.id, session.id)
return NextResponse.json({ received: true })
```

A retrying worker sends each job, checks result.error, and marks success only afterwards. Use a stable provider idempotency key per job. Never mark an event processed before its durable work exists. Keep existing signature verification on the raw body. If all payment checkout is intentionally disabled, disable the checkout route instead of leaving an unused purchase surface open.

## 10. [MEDIUM] Missing response hardening and third-party admin isolation

**Locations:** `next.config.mjs:2-11`; `app/layout.tsx:93-110,157-158`.

Public GET /contact returned HSTS `max-age=63072000`, but no CSP, X-Frame-Options, nosniff, Referrer-Policy, or Permissions-Policy. It returned Access-Control-Allow-Origin: *. The latter on a public HTML page does not by itself prove credentialed API CORS exposure; browser credentials cannot be used with wildcard ACAO. Authenticated API CORS behavior was not tested.

**Immediate compatible patch:** merge into next.config.mjs:

```js
async headers() {
  return [{ source: '/:path*', headers: [
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
    { key: 'Content-Security-Policy', value: "base-uri 'self'; object-src 'none'; frame-ancestors 'none'" },
  ] }]
}
```

This limited CSP deliberately does NOT claim to stop script XSS. A full script-src policy needs per-request nonces for Next hydration, extraction/noncing of the inline Chatbase bootstrap, JSON-LD handling, and an audited external-origin inventory. Roll it out in report-only mode, then enforce after testing. Keep HSTS on HTTPS. Remove unnecessary wildcard CORS at its actual hosting/config source; none is defined in repository code. Put third-party widgets only in public-page layouts.

## 11. [MEDIUM] Insufficient gallery URL/upload validation

**Locations:** `app/api/gallery/route.ts:41,49-53`; `app/api/gallery/upload/route.ts:17-35,39-46`.

Gallery add accepts arbitrary JSON values/URLs and writes them into public storage. Non-string entries can break older consumers; arbitrary external images permit tracking and unsuitable URLs. The server fetches the Blob manifest URL, not the submitted image URL, so this is NOT a demonstrated SSRF. Uploaded file.type is client-declared and not image-content verification. Blob delivery is a separate origin; no same-origin stored-XSS exploit was demonstrated.

**Patch URL validation before read/write:**

```ts
if (!['add', 'remove'].includes(action) || typeof url !== 'string' || url.length > 2048)
  return NextResponse.json({ error: 'Invalid gallery request' }, { status: 400 })
const parsed = new URL(url)
const allowedHosts = new Set((process.env.GALLERY_IMAGE_HOSTS || '').split(',').filter(Boolean))
if (parsed.protocol !== 'https:' || parsed.username || parsed.password || !allowedHosts.has(parsed.hostname))
  return NextResponse.json({ error: 'Image host is not allowed' }, { status: 400 })
```

Populate the explicit host list with the existing reviewed gallery hosts and your exact Blob hostname. Catch invalid URL construction as 400. Cap gallery item count. For uploads, after authentication and the existing 5 MB check:

```ts
import sharp from 'sharp' // declare direct dependency, patched >=0.35.4
import { randomUUID } from 'node:crypto'
if (!(file instanceof File)) return NextResponse.json({ error: 'File required' }, { status: 400 })
const output = await sharp(Buffer.from(await file.arrayBuffer()), {
  limitInputPixels: 20000000, animated: false,
}).rotate().resize({ width: 2000, height: 2000, fit: 'inside', withoutEnlargement: true }).webp().toBuffer()
const blob = await put('gallery/' + randomUUID() + '.webp', output, {
  access: 'public', contentType: 'image/webp',
})
```

Decode failures must return 400. Enforce upload request limits before multipart buffering at the gateway. Do NOT introduce the vulnerable sharp version identified in finding 2 while fixing this.

## 12. [LOW] Constant-time helper can throw for malformed inputs

**Location:** `lib/security.ts:51-65`; callers `app/api/gallery/route.ts:43`, `app/api/gallery/upload/route.ts:21`.

Type assertions do not validate multipart values. Null passwords crash on a.length; some unequal Unicode inputs produce buffers of different byte lengths and throw outside the try/catch. The result is a 500, not an auth bypass. An isolated test reproduced the Unicode exception.

**Exact replacement:**

```ts
export function constantTimeCompare(a: unknown, b: unknown): boolean {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length > 1024 || b.length > 1024) return false
  const digest = (v: string) => crypto.createHash('sha256').update(v).digest()
  return crypto.timingSafeEqual(digest(a), digest(b))
}
```

Still fail closed on missing/empty configured passwords at callers; comparing empty values alone is not authorization.

## 13. [LOW] Public diagnostics and unnecessarily detailed errors/logs

**Locations:** `app/api/check-env/route.ts:3-10`; `app/api/gallery/route.ts:62-63`; `app/api/gallery/upload/route.ts:56-59`; `app/api/webhooks/stripe/route.ts:63-64,231`; `app/checkout/success/page.tsx:35`.

check-env discloses configuration presence and notification email, NOT raw API keys. Gallery endpoints return underlying exception text. Webhook logs contain customer email/metadata. These increase reconnaissance and privacy exposure but do not constitute a demonstrated secret-key leak.

**Patch:** remove the diagnostic route, or replace it with a minimal public health result:

```ts
export async function GET() {
  return NextResponse.json({ ok: true })
}
```

Replace client-facing dynamic exception messages with generic 500 messages. Keep structured server logs with request IDs and event IDs; remove customerEmail, session metadata, and sessionId from browser logs. Limit retention and access to hosting logs.

## 14. [MEDIUM] Build checks disabled and package manager not pinned

**Locations:** `next.config.mjs:3-7`; `package.json:5-9,41,52`; root `package-lock.json` and `pnpm-lock.yaml`.

Builds skip TypeScript/lint failures, so a successful build is not a clean validation result. Both npm and pnpm lockfiles exist and produce different audit views; no packageManager pins selection. `latest` tags can change on lockfile regeneration. No evidence of a compromised package was found.

**Patch:** remove eslint.ignoreDuringBuilds and typescript.ignoreBuildErrors after fixing baseline errors. Add a typecheck script and pin the tested package manager:

```json
{
  "packageManager": "pnpm@11.0.9",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "typecheck": "tsc --noEmit"
  }
}
```

Configure ESLint explicitly before claiming lint coverage; existing next lint is not a verified gate. Choose pnpm as the sole installer, remove the npm lockfile in the remediation commit, and configure Vercel/CI to run `pnpm install --frozen-lockfile`, typecheck, tests, audit, and build. Do not hand-edit lockfiles. Baseline Stripe API-version types must be reconciled with the installed SDK rather than hidden by casts.

## 15. [LOW] Documentation publishes a password-like login value

**Locations:** `README.md:183,288`; misleading assurance `docs/ADMIN_GUIDE.md:9`.

The README gives a concrete password-like example and later tells readers to log in using it. Its validity was not tested or compared to production credentials. The admin guide's claim that the password never reaches the browser conflicts with localStorage usage. No credential-shaped private API key was found in the tracked text scan; placeholder Stripe keys and public chatbot IDs are not private secrets. No tracked .env or .env.example exists; README's copy-example instructions therefore reference a missing file. The local .env.local is ignored by `.gitignore:20`.

**Patch text:** replace concrete password instructions with `ADMIN_PASSWORD=<unique password from your password manager>` and “Obtain administrator access from the site owner.” Replace the guide assurance with the actual session behavior after finding 3 is fixed. Add a blank template and explicitly permit it:

```gitignore
.env*
!.env.example
```

```dotenv
# .env.example — no usable credentials
ADMIN_PASSWORD=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
RESEND_API_KEY=
NOTIFICATION_EMAIL=
BLOB_READ_WRITE_TOKEN=
CHATBASE_SECRET_KEY=
NEXT_PUBLIC_SITE_URL=https://sunvillebakerylv.com
```

Rotate the documented value if it was ever used. A full history scan with a secret scanner is still necessary before asserting no historical leaks.

## 16. [LOW] Success page confirms payment based on URL alone

**Location:** `app/checkout/success/page.tsx:27-36,67-76`.

Any session_id query value triggers cart clearing, and the page says Order Confirmed even without a verified payment. This does not itself create a Stripe payment/order, but can mislead customers or support staff.

**Refactor pattern:** verify payment server-side before showing confirmation. Bind the created session ID to a short-lived HttpOnly checkout cookie so guessing another customer's session ID does not disclose their order:

```ts
// In checkout response, after creating the Stripe session:
const response = NextResponse.json({ url: session.url })
response.cookies.set('__Host-checkout', session.id, {
  httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 3600,
})
return response
```

In a server success page, require equality between query session_id and the cookie, retrieve the session using the server Stripe client, and render success only when payment_status === 'paid'. Render a pending/unverified state otherwise; pass only the verified boolean to a client component that clears the cart. Do not expose customer data in an unauthenticated session-lookup API. Never use this page as fulfillment authority; that remains the verified webhook/outbox.

## Coverage notes and positive controls

- No SQL, NoSQL, ORM, or database-query sink was found. Stripe and Blob are the persistence integrations; inventing SQL injection findings would be inappropriate.
- React renders menu/product descriptions as text. No direct attacker-input-to-dangerouslySetInnerHTML path was identified in those views.
- Root dangerouslySetInnerHTML blocks are static Chatbase configuration and JSON-LD from configured site values, not submitted contact/menu strings. Escape `<` in JSON serialization as future-proofing if dynamic content is introduced.
- Contact email text is HTML-escaped, and input type/length checks exist; phone length and whole-body limits still need tightening.
- Stripe webhook verifies signatures using the raw body; retain it.
- Description update uses a server-only password variable, fail-closed checks, ID format and length validation. It still inherits missing rate limits/session weaknesses and the helper defect. These limitations include code added during the recent work.
- Uploads enforce a declared type allowlist and 5 MB file limit, but not decoded image validation.
- No explicit wildcard credentialed CORS configuration, server-action endpoint, raw shell execution of request input, or confirmed SSRF path was found in application code.
- HSTS is present on the inspected live response.

## Remediation order and acceptance criteria

Immediately close the product CRUD bypass, remove public password references, disable arbitrary Chatbase signing, rotate potentially exposed administrator credentials, and update Next/dependencies. Then migrate authentication and shared throttling, fix checkout and email integrity, and apply headers/upload validation.

Regression checks must include: missing env + missing password rejected on every admin method; wrong/null/Unicode passwords fail safely; authentication expiry/logout/revocation; unauthorized product writes denied; old/hidden/mismatched prices rejected; HTML payload rendered as text in both email templates; duplicate webhook events enqueue once; provider failure retries; delayed payments not fulfilled; missing/invalid uploads and URL schemes rejected; CSP tested with required assets; no private credentials in emitted client bundles; fresh dependency audit and clean build/typecheck.
