> Superseded by the admin-managed Occasions system. See [OCCASIONS.md](./OCCASIONS.md) for the current workflow. The notes below describe the previous banner-only implementation.

# Seasonal festival banners

Configuration: `lib/seasonal.ts`. Copy an entry, choose a unique ID, fill in its copy and CTA, set inclusive dates, and redeploy. The first matching date range wins, evaluated in America/Los_Angeles. Homepage requests evaluate the date on the server. An already-open page updates on reload/navigation.

Christmas 2026 and Lunar New Year 2027 contain TODO copy: replace it before those campaigns start. Dismissals are stored per ID in this browser's localStorage. If storage is blocked, dismissal works for the current visit.

## Gift box setup

In Stripe Dashboard > Product catalog > Add product:

- Name: **Mooncake Gift Box (4-pack)**
- Metadata: key **category**, value **Traditional Pastries & Mooncakes**
- Price: the approved one-time USD price, set as default
- Description: actual contents and ordering details
- Photo: actual gift-box photo

Save and paste the real `prod_...` ID into the Mid-Autumn entry's optional `productId`, then redeploy. Until then, no gift-box link appears. The link targets `/menu#<productId>`; menu cards have matching HTML IDs and scroll clearance. Catalog, cart, and checkout logic are unchanged.

## Validation

- `pnpm build` passed in an isolated copy; the existing build configuration skips type checking and linting.
- Nine date-boundary checks passed, covering both PDT and PST, inclusive end dates, and inactive periods.
- Browser checks verified mobile rendering, persistent dismissal, and absence of an unconfigured gift-box link.
- No Stripe product was created and no production deployment was performed.

## Admin editing

Open `/admin`, sign in, and select **Banners**. Edit headline, message, button text/link, inclusive dates, or optional Stripe product ID. Toggle **Enabled** and click **Save banners**. Add a new campaign with **Add banner**. An enabled banner still only appears during its dates in America/Los_Angeles. First matching entry wins. Christmas and Lunar New Year start disabled; TODO copy cannot be enabled.

Changes use the existing Vercel Blob store (`BLOB_READ_WRITE_TOKEN`), under `seasonal-banners.json`, and require no redeployment after this feature is released. Allow up to 60 seconds for storage caching, then refresh the homepage. The file contains public marketing copy only; never enter secrets. Stored configuration supersedes code seeds, including an empty list or all-disabled banners. On storage failure the homepage omits the banner, and the admin reports an error rather than claiming a save succeeded. Concurrent edits use last-save-wins.

Visitor dismissals remain per campaign ID. Editing an existing campaign does not reset dismissals; add a new campaign to show it again. Admin save requests require the existing server admin password, validate dates and safe internal/telephone links, and reject duplicate IDs and unfinished enabled campaigns.

## Cake guide revision

Bakery confirmed tier serving estimates: 33, 53, 104, 79, 144. The five retained tier combinations preserve their listed prices. Round defaults to 8-inch (including when returning from another tab); 6-inch remains available. All cards use one Servings count, with no wedding-serving split. Flavor pricing, delivery fees, and final-pricing note are preserved. Compare all remains collapsed.

Validation: production build passed; schema checks rejected unsafe links, invalid dates, and enabled TODO copy; mobile browser checks confirmed defaults and five tiers; mocked admin edits/toggle/save passed; an unauthenticated real API request returned 401. No production banner settings were written during tests.

### Local development storage

`next dev` outside Vercel reads/writes `.local-data/seasonal-banners.json` (gitignored), with code seeds on the first load. Local edits persist across restarts and do not update live campaigns. Production still requires Vercel Blob and never falls back to the filesystem. Invalid saved data raises an error rather than silently resetting campaigns.

## Dismissal update — September 24, 2026

Supersedes the permanent-dismissal behavior described above: closing a banner now stores an expiry 24 hours from dismissal. After expiry it can reappear on the next visit or reload, if the campaign is still active. Legacy permanent dismissal values are cleared. No production configuration or campaign dates are changed.
