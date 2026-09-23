# Custom cake inquiry release

## Included
- New /custom-cakes page with a four-step inquiry: event, cake, contact/photos, review.
- Interactive pricing/serving guide: 26 cake sizes and tier combinations transcribed and cross-checked against the owner's Bakery Cake Pricing & Specs.pdf. Includes six flavors, eight fillings, custom-filling requests, and $30 local / $50 casino-hotel delivery guidance.
- Preferred portion style removed from inputs, review, server validation, and email. Guest count and preferred cake size remain; party/wedding estimates remain in the reference guide.
- Original homepage photo-background hero restored, with Inquire for Custom Cakes and Explore Daily Menu CTAs. No trust badges. Buttons are full-width on mobile.
- Custom Cakes links in navigation/footer, page metadata, and sitemap.

## Security and delivery
Uses existing production Resend and Turnstile settings; the CAPTCHA action is custom_cake. No new environment variables or database migrations. Up to three JPG/PNG/WebP references, 1 MB each, are validated and sent as email attachments without public storage. The server validates the streamed body limit, file signatures, date, and inquiry fields, escapes email HTML, and uses email-provider idempotency keys. See CUSTOM-CAKE-INQUIRIES.md for implementation and limitations.

## Validation
Server tests mock providers and cover invalid inputs, minimum notice in Pacific time, file limits/signatures, CAPTCHA enforcement, email escaping, provider errors, idempotency and rate limiting. Prior responsive flow tests covered 320/390/768/1440px. No real inquiry emails were sent. Production build passed and generated all 30 routes. A focused browser check confirmed the form proceeds without portion style. Existing Next configuration skips type/lint checks; previously documented admin, Stripe and Chatbase type errors remain outside this release.

## Operations
After publishing, verify the new route, all price-guide categories, mobile navigation, hero links, inquiry progression without portion style, and CAPTCHA loading. A missing token must not send email. No categorized custom-cake gallery is included because the owner has no approved photos; the existing gallery is linked instead. Roll back to the preceding Vercel production deployment or revert the release commit. No catalog data is modified.
