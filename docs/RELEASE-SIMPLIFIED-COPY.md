# Simplified website copy and delivery-fee clarification

## Changes
- Shorter homepage subtitle; existing photo hero and both CTAs retained.
- Custom Cakes prioritizes sizes/prices and the inquiry form. Replaces explanatory cards with three concise process steps beside the form.
- Delivery details and allergy guidance use expandable disclosures. Relevant form guidance appears alongside the selected option.
- Renames the fee disclosure to Delivery fees and removes pickup wording. Pickup has no fee; listed delivery fees remain $30 local (within 10 miles) and $50 casino/hotel.
- Menu displays fresh-daily guidance once above the catalog instead of repeating badges on every card. Full descriptions and item-specific availability remain in detail dialogs; grid descriptions use one line.
- Menu grid tracks adjusted to retain aligned titles, descriptions, and prices after badge removal.

## Validation and operations
Local browser checks passed for homepage/menu/custom-cake rendering at mobile and desktop widths, expandable delivery/allergy guidance, inquiry progression, and menu row alignment. No pricing, API validation, CAPTCHA, or email-delivery logic changed. No new environment variables or migrations.

Production build passed with all 30 routes. Existing project configuration skips type/lint validation; previously documented errors remain outside this copy/layout release. Verify the live page and Delivery fees disclosure after deployment. Roll back via the previous Vercel production deployment or revert this release commit.
