# Gallery uploads from a phone

Admin → Gallery → **Add photos**. Select one or several photos; uploads start automatically. Keep the page open until the result appears. Successful photos are added immediately; failed photos are listed individually and can be selected again.

- HEIC/HEIF is converted locally using the lazy-loaded CSP-compatible heic-to decoder. JPG, PNG, WebP, GIF and browser-supported AVIF are decoded locally.
- Photos are resized to a maximum 2,000 pixels on the longest side, encoded as JPEG, and capped at 3 MB before upload. Source files over 30 MB are rejected to limit mobile memory use. Originals on the phone are unchanged.
- Canvas output omits original EXIF/GPS metadata. Transparent areas become white; animation/Live Photo motion is not retained.
- Uploads run sequentially, preserving existing authenticated upload and gallery-save endpoints. Existing server upload rate limits still apply (20 requests/hour per IP).
- A failed gallery save after storage upload can leave an unlisted file; no automatic deletion is performed. No new public write permissions are introduced.
- Photo links remain available under the collapsed “Or add a photo link” control.

Validation: `pnpm build`; `node scripts/test-supabase-storage.cjs`; browser test `scripts/test-gallery-mobile.cjs` (set PLAYWRIGHT_PATH to an installed Playwright package). The browser test uses mocked API endpoints and expects `.local-data/upload-test/example.heic`, downloaded from https://github.com/strukturag/libheif/blob/master/examples/example.heic. It checks actual HEIC conversion, PNG resizing, partial batch failure, 390px layout and 48px button height. No test photos are uploaded to production. Physical iPhone/Android testing remains recommended; unsupported or damaged photos show a recovery message.
