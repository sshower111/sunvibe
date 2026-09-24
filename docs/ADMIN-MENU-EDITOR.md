# Unified menu item editor

Implemented September 24, 2026. Included in the production release documented in RELEASE-2026-09-24.md.

## Use

Open `/admin` (Menu tab) or `/admin/menu`, sign in, and select **Edit item**. Change the item name, description, and USD price in one dialog, then choose **Save changes**. Leave the description empty to remove it. Cancel discards the draft. Show/hide remains a separate action.

## Implementation

- `components/admin-product-editor.tsx` is shared by both admin pages, replacing the description-only editor and separate price controls. It uses the accessible shared dialog, labeled controls, mobile-width layout, progress/error feedback, preserved drafts after failure, and a stable request ID for retries of the same draft.
- `app/api/admin/products/update/route.ts` requires the server-only admin password, validates names (1–250 characters), descriptions (up to 2000), product IDs, request IDs, and decimal USD amounts (0–999999.99). Money is parsed into integer cents; malformed values and extra decimal places are rejected.
- The endpoint reads the product's real default price from Stripe rather than trusting a supplied price ID. Name-only or description-only edits reuse the current price. Price changes create a replacement first, then update name, description and default price in one product update. The old price remains intact for existing checkout/history. Unsupported currency, recurring, or tiered billing requires Stripe Dashboard editing.
- Stripe idempotency keys prevent duplicate operations when the same draft is retried. If replacement creation fails, no product update occurs. If a product update fails, the old product remains; an unused replacement price can remain in Stripe and is reused on retry. The UI keeps the draft.
- Successful updates invalidate the `menu-products` cache immediately and update the admin row from the server response. Already-open customer tabs need a reload/navigation to see the change.
- Legacy price/description API routes remain for compatibility, but neither admin screen calls them. This does not replace the application's existing password-based authentication system.

## Verification

- `node scripts/test-admin-product-update.cjs`: passed with mocked Stripe; covers authentication, malformed input, field limits, integer cents, combined saves, unchanged-price reuse, blank descriptions, missing prices, unsupported pricing, provider failures, idempotency keys, and cache invalidation.
- Browser checks at 390×844 for both admin pages: passed. Mocked APIs verified all three fields, failure/retry with the same request ID, row updates, cancel resetting the draft, dialog fit, and Escape dismissal. No real products/prices were changed.
- TypeScript: no new diagnostics in the editor/update route. Existing admin-gallery FormData and Stripe API-version errors remain elsewhere; build configuration still skips full type/lint validation.

Release integration: included in `RELEASE-2026-09-24.md`. Production checkout build and mobile browser checks on both admin entry points passed; managed gallery functionality was preserved.
