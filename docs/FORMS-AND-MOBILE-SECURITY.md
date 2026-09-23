# Form protection and mobile targets

Implemented locally on September 23, 2026. Not deployed.

## Turnstile setup
Create a Cloudflare Turnstile widget for sunvillebakerylv.com and www.sunvillebakerylv.com. Add localhost/127.0.0.1 to a development widget if needed. Configure:

- NEXT_PUBLIC_TURNSTILE_SITE_KEY: public widget site key (available to the browser).
- TURNSTILE_SECRET_KEY: private server secret; never use a NEXT_PUBLIC prefix.
- TURNSTILE_ALLOWED_HOSTNAMES: comma-separated exact permitted hostnames. Production example: sunvillebakerylv.com,www.sunvillebakerylv.com. Local example: localhost,127.0.0.1.

Set local values in ignored .env.local and production values in Vercel environment settings. Restart locally and rebuild/redeploy after setting the public key. Do not commit secrets. Missing configuration blocks sending; the form shows a phone fallback rather than silently bypassing CAPTCHA. Existing email credentials are still required.

The public contact endpoint verifies the token with Cloudflare, checks success, action=contact, and the hostname allowlist before calling Resend. Verification has an 8-second timeout. Tokens reset after submission; rejected, expired and reused tokens fail verification. Input is bounded to 32 KiB before JSON parsing, with existing field checks plus a 30-character phone limit. The existing process-local rate limiter remains defense in depth, not a distributed spam guarantee.

CAPTCHA covers /api/contact, the public message form. Existing admin authentication routes and legacy checkout are not claimed to be CAPTCHA-protected or remediated by this change. Outstanding audit findings remain separate.

## Headers
Middleware adds per-request nonces to CSP and request headers for Next's scripts; layout scripts carry the same nonce. HTML is dynamically rendered and marked private/no-store; this has a caching/performance cost. Production script-src does not permit unsafe-inline or unsafe-eval. Development permits unsafe-eval for Next development tooling. Inline styles remain permitted for existing UI components. CSP permits Turnstile and current Chatbase/analytics integrations; browser integration testing is still required before deployment.

Global headers include nosniff, DENY framing, strict-origin-when-cross-origin and restricted device permissions. Production emits HSTS max-age=63072000; HTTP localhost does not. HSTS deliberately omits includeSubDomains/preload. API responses receive a restrictive CSP. Existing API cache headers can override global defaults and should be reviewed as endpoints evolve.

## Touch controls
Customer-facing controls previously using 44px minimums now use 48px. Coarse-pointer/mobile CSS enforces 48px minimum width and height for buttons, summaries, role=button controls, phone/email links and Google Maps links. Menu filters retain 8px gaps. Icon graphics remain small inside larger interactive targets. Existing UI Button variants also inherit these mobile minimums.

## Validation
Mock checks passed: no token, successful verification, rejected token, wrong action, wrong hostname, and missing secret. Local response check confirms CSP plus matching nonces on 25 script instances and nosniff. Production configuration contains HSTS. Existing unrelated TypeScript errors remain. No real contact email was sent; end-to-end verification requires configured Turnstile keys.

References:
https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/

## Verification loading and recovery

The contact widget waits for Turnstile's script load event and attaches the current document CSP nonce to its script. Customers see loading, verifying, and verified states. Script failures and challenges taking longer than 45 seconds show a retry control; Send Message remains disabled until a token is received. Token expiration clears the token and allows re-verification. The server still validates every token.

Browser checks on September 23 covered delayed readiness, successful verification enabling Send, expiry disabling Send, retry, blocked scripts, hostname errors, and a 48px mobile retry target with mocked Cloudflare responses. These checks do not prove a real Cloudflare challenge succeeds on every network. No contact email was sent during testing.

