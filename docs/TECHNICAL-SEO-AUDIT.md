# Technical SEO and accessibility audit

Audited September 23–24, 2026. Initial findings were verified locally; release integration is documented in RELEASE-2026-09-24.md. Scope: all public routes, shared components, private-route indexability, metadata and crawl handlers, image delivery, catalog loading, and chatbot removal.

## Findings and fixes

| Severity | Finding | Implemented fix and source |
|---|---|---|
| HIGH | Maintenance checking replaced all server-rendered content with “Loading…” until hydration and an API request. | `components/maintenance-check.tsx:5`, `app/layout.tsx`: use a server-provided maintenance flag; render actual public content immediately. Admin access remains available. Corrected the maintenance phone number. |
| HIGH | Menu products arrived only after hydration; the API also stopped at 100 products. | `app/menu/page.tsx:1`, `lib/menu-products.ts:6`, `components/menu-page.tsx:31`, `app/api/products/route.ts`: server-render paginated Stripe data; cache only public product fields for 60 seconds; retain the error/retry UI. Each Stripe request has an eight-second timeout and no retries. |
| HIGH | Pages inherited generic homepage metadata and canonicals; the origin could fall back to an obsolete Vercel hostname. | `lib/seo.ts:2–18`, `app/layout.tsx`, public route layouts: unique titles/descriptions, production HTTPS canonicals, route-specific OpenGraph and Twitter metadata. Query parameters do not change canonicals. |
| MEDIUM | Logo was declared as a 1200×630 social image without matching dimensions. | `app/og/route.tsx:1`: actual 1200×630 PNG branded social card using ImageResponse. |
| MEDIUM | Generic H1s omitted local topics; several pages placed navigation/footer inside main. Menu item titles were spans. | Public page components and `components/hero-section.tsx:16`: one local-topic H1 per public page; public header/footer outside main; menu cards use article/H2 with accessible buttons. About remains an H2 on the homepage. |
| MEDIUM | No skip link; the contact form heading disappeared from the mobile accessibility tree. | `app/layout.tsx`, end of `app/globals.css`, `app/contact/page.tsx:147`: keyboard-visible skip link, focusable main targets, and a visually hidden mobile form heading. |
| MEDIUM | Founder and logo images lacked intrinsic dimensions. | `components/about-section.tsx:26`, `components/navigation.tsx:30`, `components/footer.tsx:32`: actual founder 486×1000 and logo 600×204 dimensions. Founder stays uncropped; other public photo frames reserve geometry. |
| MEDIUM | Next image optimization was disabled; large gallery originals used raw image delivery. | `next.config.mjs:21`, hero/gallery/featured-gallery components: responsive Next Image, AVIF/WebP, explicit sizes, priority hero and lazy below-fold photos. Only existing Yelp/ImgBB gallery hosts are allowed for remote optimization. |
| MEDIUM | Gallery descriptions were generic; images were invisible until client onLoad. | `lib/gallery-images.ts`, gallery components: descriptions based on visual inspection of all 14 images; named thumbnail buttons with redundant empty image alt; descriptive full-size image alt; images visible before hydration. No invented flavors/event categories. |
| MEDIUM | Incomplete Bakery schema; no breadcrumb or cake offer markup. | `lib/seo.ts:20`, `components/structured-data.tsx:1`, `components/cake-structured-data.tsx:1`: full address, geo, phone, hours, menu and price range; BreadcrumbList on secondary public pages; ItemList of 23 cake Products with Offer/AggregateOffer from the owner-supplied catalog. JSON-LD escapes `<` and uses the CSP nonce. |
| MEDIUM | Many cake prices were only available after JS category selection. | `components/cake-serving-guide.tsx`: existing collapsed comparison disclosure now contains all 23 sizes and price ranges in server HTML. Schema and UI share `lib/cake-catalog.ts`. Four-plus tiers remain phone inquiries. |
| MEDIUM | Sitemap omitted contact and invented current-date modification timestamps; robots could reference the wrong domain; private pages inherited indexable metadata. | `app/sitemap.ts`, `app/robots.ts`, `app/admin/layout.tsx`, `app/checkout/layout.tsx`: five public URLs, stable correct domain, no artificial dates, private noindex/nofollow and no canonical. Private pages remain crawlable so bots can read noindex. APIs are disallowed. Noindex is not authentication. |
| MEDIUM | Chatbot added third-party scripts, a greeting overlay, tracking/network requests and an unnecessary identity API. | Removed per owner request September 24: layout scripts/config, `lib/chatbase.ts`, `app/api/chatbase/identify/route.ts`, widget CSS, obsolete setup document, CSP host permissions, and local/example environment entries. No chatbot dependency was present. Existing historical release notes remain historical. |
| LOW | Clear filters selected the nonexistent category `All`. | `components/menu-page.tsx`: reset to `All Items`. |

Navigation/footer links already use crawlable anchors or Next Link. Filter and lightbox actions correctly remain buttons. Fonts already use next/font with swap. Security nonces, Turnstile, inquiry validation, attachment restrictions, delivery rules and analytics remain intact.

## Verification

The September 23 final production build passed in an isolated directory. Browser checks against that production build passed:

- Five public pages with JavaScript disabled: HTTP 200, exactly one local H1, one main, unique metadata, canonical unaffected by UTM parameters, parseable JSON-LD, image alt attributes. Menu contained 51 products; cake schema contained 23 specs.
- Private pages had noindex; sitemap/robots URLs were correct; social PNG dimensions were 1200×630.
- At 390px and 1280px: no horizontal page overflow; keyboard skip link, menu filtering, product dialog and Escape dismissal worked.
- axe-core 4.10.3, WCAG 2 A/AA and 2.1 AA: zero violations in the default state of all five public pages at both widths. This is not full assistive-technology or third-party iframe certification.
- Visually inspected mobile hero and gallery photos; above-fold optimized hero/gallery images loaded.

September 24 chatbot removal verification is recorded below after execution. The repeatable test is `scripts/test-seo.cjs`; it now also checks the removed endpoint returns 404, no widget config/CSP references remain, and no chatbot requests occur during navigation.

```powershell
$env:PLAYWRIGHT_PATH = '<absolute path to playwright package>'
$env:AXE_PATH = '<absolute path to axe.min.js>'
$env:BASE_URL = 'http://127.0.0.1:3001'
node scripts/test-seo.cjs
```

## Remaining limitations and follow-up

- Full TypeScript checking previously failed on existing admin gallery FormData handling and Stripe API-version literals. The removed chatbot utility's Window typing errors are resolved by deleting that integration. The build configuration still skips type/lint validation; build success is not a clean typecheck.
- Cold menu responses wait on Stripe. Cached catalog data may remain stale during revalidation/outages; admin writes are not immediately cache-invalidated. This behavior is limited to public catalog data.
- Nonced HTML stays private/no-store and dynamically rendered. Measure deployed TTFB before changing this deliberate security tradeoff.
- Arbitrary catalog image URLs retain native lazy loading within fixed frames. Do not enable unrestricted remote image optimization; standardize approved catalog hosts first.
- A September 23 single warm, unthrottled local mobile sample reported LCP 168 ms home, 172 ms menu, 148 ms gallery. Observed sums of layout shifts without recent input were 0, 0.00032, 0. These are diagnostic observations, not field CWV, session-window CLS, Lighthouse scores or before/after comparisons. INP was not measured. Confirm deployed mobile 75th-percentile LCP/INP/CLS using Search Console/CrUX or existing Speed Insights after release.
- Offer markup represents guide prices, not guaranteed availability or final quotes. No reviews/ratings/stock claims were invented. Google primarily recommends product snippets on individual-product pages, so category-page schema does not guarantee rich results.
- Coordinates 36.1261111, -115.1938889 were verified against the named bakery's Waze listing and address; phone/hours match current site information.
- No live deployment, Search Console submission, remote account deletion, or subscription cancellation occurred. After deployment, remove any unused CHATBASE_SECRET_KEY from Vercel and cancel a paid chatbot subscription separately if desired; no website runtime references remain.
- The production release worktree contains newer managed-gallery/Blob functionality. A future release must merge these SEO changes into that worktree while preserving its managed gallery and adding only approved Blob hosts/captions. Do not overwrite it wholesale with development files.

## Sources

- [Next.js metadata and inheritance](https://nextjs.org/docs/app/api-reference/functions/generate-metadata)
- [Next.js generated social images](https://nextjs.org/docs/app/getting-started/metadata-and-og-images)
- [Google LocalBusiness structured data](https://developers.google.com/search/docs/appearance/structured-data/local-business)
- [Google Product snippet guidelines](https://developers.google.com/search/docs/appearance/structured-data/product-snippet)
- [Sunville Bakery map listing](https://www.waze.com/live-map/directions/us/nv/las-vegas/sunville-bakery?to=place.ChIJlx4ZZKbGyIARGidK3kMuhtM)

## September 24 final verification

- Clean isolated production build: **passed**, with the removed identity endpoint absent from the route manifest.
- Updated `scripts/test-seo.cjs` against the production build: **passed**. The deleted identity endpoint returns 404; public HTML/CSP contains no widget configuration/host permissions; browser navigation generated zero chatbot requests.
- All five public pages again passed SSR/metadata/schema checks, mobile/desktop overflow checks, keyboard and menu interactions. axe-core again reported zero violations for the ten page/viewport combinations.
- After development route types regenerated, TypeScript reports only the existing admin gallery FormData and Stripe-version errors listed above; the deleted endpoint and chatbot utility no longer cause diagnostics.
- Local development preview is running at http://127.0.0.1:3000. No live deployment was performed.

## Release integration — September 24

These changes are included in `RELEASE-2026-09-24.md`. The production release integration preserves managed Blob gallery loading and admin upload behavior. Unknown upload hosts retain standard image delivery; the fixed gallery hosts use optimization. The unified editor now immediately invalidates the catalog cache on save, superseding the earlier cache-invalidation limitation for that editor.
