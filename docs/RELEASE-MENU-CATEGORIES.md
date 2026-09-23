# Menu categories and larger cake inquiries

## Changes
- Five menu filters: All Items, Savory Buns, Sweet Buns & Rolls, Specialty Items, Custom Cakes.
- Custom Cakes shows a highlighted link to /custom-cakes and Requires 3-5 Days Notice. At the owner's direction this notice is not applied to specialty items.
- Buns/breads show Same-Day Pickup / Fresh Daily. Other products show Call to confirm availability.
- Three-column desktop product grid, responsive mobile layout, and shared tracks aligning titles, descriptions, badges, prices and actions.
- Online cake choices now include only 2- and 3-tier cakes. Four- and five-tier options are removed from the guide, form and server allowlist; customers are directed to call 702-889-9887 for 4+ tiers.

## Classification
lib/menu.ts owns display grouping. Buns and breads with ham, sausage, pork, hot dog, scallion, tuna or cheese in their name appear in Savory Buns; remaining buns/breads and roll cakes appear in Sweet Buns & Rolls. Other catalog categories appear in Specialty Items, except an explicit Custom Cakes category. Review classification when adding products. Stripe catalog data is unchanged.

## Verification
Local browser checks passed for category filtering, Custom Cakes link, specialty notice policy, aligned card rows, and mobile overflow at 320/390/768px. Server tests cover rejection of removed tier sizes and existing inquiry validation. No real inquiry email was sent. Production build passed (30 routes); existing type/lint bypass settings and previously documented errors remain unchanged.

## Deployment and rollback
No environment changes, database migrations, or catalog writes. Verify /menu category switching and /custom-cakes tier options after Vercel reports ready. Roll back by restoring the previous Vercel production deployment or reverting this release commit.
