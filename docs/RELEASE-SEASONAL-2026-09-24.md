# Seasonal banners and cake guide release — September 24, 2026

## Changes
- Homepage seasonal announcement with Las Vegas date scheduling, accessible links, and per-campaign dismissal.
- Admin > Banners: add, edit, enable/disable, remove, and save campaigns without another deployment. Dates still control visibility. Future TODO campaigns start disabled.
- Production uses the existing Vercel Blob credential and seasonal-banners.json. Local development uses a separate ignored .local-data file; local campaign edits are not published by this release. On first production load, code seeds apply until an admin saves.
- Gift-box link remains absent until a real Stripe product ID is configured. No product, price, cart, or checkout behavior was changed.
- Cake guide defaults to 8-inch round, uses a single serving count, and offers five tier combinations with bakery-confirmed estimates: 33, 53, 104, 79, 144. Existing flavor prices and delivery fees are retained.

## Operations
See SEASONAL-BANNERS.md for editing and Stripe setup. Save banners in production after signing in. Allow up to 60 seconds, then refresh the homepage. Existing visitor dismissals persist; create a new campaign to reset visibility for a new event. Stored campaigns supersede code defaults. No local content file or credentials are deployed.

## Validation
Production build, date-boundary and schema checks, mobile guide and mocked editor interactions passed. Unauthorized banner writes returned 401. Actual local authenticated storage load/save/read-back passed without changing content. Existing build configuration skips type checking and linting.

## Rollback
Redeploy previous commit 88c26bb to remove these features. The separate seasonal-banners.json object can remain for a later re-release; rollback does not delete content.
