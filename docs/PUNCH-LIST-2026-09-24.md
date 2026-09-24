# Menu and form punch list — September 24, 2026

Production release: menu and form usability improvements. Deployment is through main on Vercel; previous release is a5908c7.

## Completed

- Roll Cakes now maps to Specialty Items, including Chocolate Roll Cake and Japanese Cheese Cake. Daily bread/bun and custom-cake lead-time rules are unchanged.
- Menu summaries stop at a word boundary around 60 characters and append an ellipsis only when shortened. Removed CSS line-clamp so it cannot cut the last displayed word. Full descriptions remain in the dialog. Single long words are kept intact and may wrap visually.
- Search ranks name matches above description/category matches, without mutating catalog order. Both grid results and suggestions use relevance order. Removed the six-result limit; all matching suggestions are available in the scrollable keyboard-accessible list. Actual mooncake names precede category-only cookie matches; Lotus Mooncake is accessible.
- The sticky search/filter area includes a 48px-high Call to order link, visible while scrolling on mobile and desktop.
- Both gallery grids and lightboxes use galleryAlt(src), including managed-gallery fallback descriptions. No product photos were replaced.
- Invisible Turnstile runs on submit for both contact and cake inquiries. The owner confirmed changing the Cloudflare widget to Invisible. There are no loading/verifying/verified status messages and no token-dependent disabled Send state. The button shows its normal sending state while the request is processed. Verification still takes network time; invisible does not mean instantaneous.
- A fresh token is requested on each submit/retry. Verification errors, expiry and a 30-second challenge timeout block the message request and show a recoverable form error. Provider-script failure can be retried. Existing server-side action/hostname/token checks remain required and unchanged.
- Added a concise privacy notice and links in the forms/footer because Cloudflare requires its Privacy Addendum to be referenced for invisible widgets. The sitemap includes the notice.
- Forms explicitly use POST as their native method, preventing pre-hydration fallback submission from putting contact details into query strings.

## Verification

- `node scripts/test-menu-punchlist.cjs`: passed category, relevance ordering, all-match inclusion, non-mutating search, word-boundary/whitespace/long-word cases.
- `node scripts/test-cake-inquiry.cjs`: passed existing server validation and rejection paths with mocked email/CAPTCHA providers.
- `scripts/test-punchlist-browser.cjs`: passed touch-enabled Chromium/Edge emulation. Contact verification failure blocked all POSTs and retained the draft; retry succeeded. Cake inquiry completed all four steps and requested a token only on final submit. No real messages were sent.
- Mobile hamburger open/close, uncapped search, real bilingual cake names, visible sticky telephone link and its 48px height passed. No page-wide horizontal scrolling on `/`, `/menu`, `/gallery`, `/contact`, `/custom-cakes`, `/privacy` at widths 320, 390, 768 and 1280. Gallery thumbnails have nonempty descriptions.
- Visually inspected the mobile sticky menu and wrapping card descriptions.
- Isolated production build passed. Existing admin-gallery/Stripe API-version TypeScript errors remain; build configuration skips full type checking. No new diagnostics appeared for these changes.

Run browser checks with PLAYWRIGHT_PATH set to an installed Playwright package and BASE_URL set to the preview origin (default http://127.0.0.1:3003). Tests mock CAPTCHA callbacks and intercept message endpoints.

## Still requires a physical phone

Browser emulation is not a real iPhone/Android pass. On a physical device, check Safari/Chrome menu toggling, scroll and sticky controls, comfortable tap targets, the onscreen keyboard, and real Cloudflare verification. With a bakery-approved test message, check both forms over Wi-Fi and cellular, including retry after loss of connection. Actual message delivery and physical-device Turnstile behavior were not tested here.

## References

- [Cloudflare execution and appearance settings](https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/widget-configurations/)
- [Invisible mode and privacy-reference requirement](https://developers.cloudflare.com/turnstile/concepts/widget/)
- [Turnstile Privacy Addendum](https://www.cloudflare.com/turnstile-privacy-policy/)

## Deployment and rollback

No migrations or new environment variables. The owner confirmed Invisible mode on the existing Cloudflare widget; existing keys and hostname restrictions remain required. Preserve server-side verification. No real messages or product edits are performed by the release checks.

Verify live categories, mooncake autocomplete, sticky telephone link, thumbnail descriptions, /privacy, and the absence of verification-status messages before submission. Physical-phone and real-message delivery verification remain outstanding as described above.

To roll back, promote the Vercel deployment for a5908c7 or revert this release commit. If restoring the visible-widget experience, restore Managed mode in Cloudflare separately; widget mode is an external setting.
