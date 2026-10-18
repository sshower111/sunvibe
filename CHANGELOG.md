# Changelog

All notable changes to the Sunville Bakery website will be documented in this file.


## 2026-10-18

- **Phone and tablet layout**: the homepage hero photo is shorter on phones so the buttons show without scrolling, and its two buttons sit side by side from 360px. Phones and tablets get the photo above the red sign, and the story section shows the favorites before Johnny's photo. The red page bands are shorter on phones, and the menu band hides the street address there (the bottom bar has Directions). Menu card descriptions on phones stop at two lines (the pop-up shows all of it). Fixed the menu pop-up photo overlapping the text under it on phones. (`components/hero-section.tsx`, `components/about-section.tsx`, `components/page-band.tsx`, `components/menu-page.tsx`, `app/contact/page.tsx`)
- **New look: Hong Kong bakery counter**: the public pages now use pastry-box red, egg-wash gold, pink box paper and a dark brown footer instead of the old brown and off-white. New fonts: Young Serif for headings, Figtree for text, Noto Serif HK for Chinese. Chinese item names (菠蘿包, 叉燒包…) now show large in red under the English name on menu cards, item pop-ups and the homepage favorites. The homepage hero is a red sign beside the bakery photo and shows live open/closed status. Menu, custom cakes, gallery and contact pages open with the same red band. The contact page now lists hours, address and phone beside the form. The header shows the phone number on wide screens. (`app/globals.css`, `app/layout.tsx`, `components/hero-section.tsx`, `components/about-section.tsx`, `components/page-band.tsx`, `components/item-name.tsx`, `components/store-status.tsx`, `lib/bilingual.ts`, `components/menu-page.tsx`, `components/navigation.tsx`, `components/footer.tsx`, `app/contact/page.tsx`, `app/custom-cakes/page.tsx`, `components/gallery-view.tsx`, `docs/UI-DESIGN-SYSTEM.md`)
- **Menu photos no longer cut off**: menu card and item pop-up photos are now square instead of wide (16:10 / 4:3), so tall phone photos show the whole item instead of cutting off the top and bottom. The phone thumbnail is square too, and the loading placeholders match. (`components/menu-page.tsx`, `components/menu-grid-skeleton.tsx`)
- **Blurry photo warning**: the admin menu list marks photos smaller than 600 pixels as **Blurry**, and the photo picker warns when a chosen photo is that small. Twelve items currently use 300×300 photos that look soft when enlarged; they need new photos, since code cannot sharpen them. (`components/menu-photo-field.tsx`, `app/admin/page.tsx`, `docs/ADMIN_GUIDE.md`)
- **Menu photos in the admin portal**: menu items can now have a photo uploaded from a phone or computer. **Edit item** has a new photo section (Add / Change / Remove photo), and **Add menu item** uses the same picker instead of the old "Photo URL" box. Photos are converted from HEIC and resized on the device, upload to the `menu/` folder in Supabase storage, and only go live when the item is saved. Replacing or removing a photo deletes the old upload unless something else uses it. The admin menu list shows a thumbnail (or "No photo") for each item. (`components/menu-photo-field.tsx`, `components/admin-product-editor.tsx`, `components/admin-product-create.tsx`, `lib/database-product-api.ts`, `app/api/gallery/upload/route.ts`, `app/admin/page.tsx`, `docs/ADMIN_GUIDE.md`)
- **Email sender**: site emails now come from `orders@sunvillebakerylv.com` instead of Resend's shared `onboarding@resend.dev` test address, so they are less likely to land in spam. The domain is verified in Resend (DNS records in Vercel). `orders@` has no mailbox; replies go to the customer. (`lib/email.ts`)
- **Chinese copy in form emails**: the contact, cake inquiry and pre-order emails to the bakery now have a Traditional Chinese version right under the English one. Labels, headings and the site's own choices (event type, cake size, flavor, filling, budget, pickup/delivery) are translated; what the customer typed (name, message, notes, address) and menu item names stay as written. Translations live in the new `lib/email-zh.ts`; a test checks every form option has one. (`app/api/contact/route.ts`, `app/api/custom-cakes/route.ts`, `app/api/pre-orders/route.ts`, `tests/unit/email-zh.test.cjs`)

## 2026-10-16

- **Design system step 4d (header and phone menu)**: the header is flat white (card token) and gets a soft shadow only once the page scrolls under it. Desktop links have a little more room, turn brown on hover, and the current page has a thicker underline. The phone menu now slides in with large rows separated by lines, a chevron on each row and a brown bar next to the current page, plus **Call** and **Directions** buttons and the opening hours at the bottom. The page behind it is dimmed and does not scroll; tapping the dimmed area, pressing Escape or picking a link closes the menu. Component-level focus rings were removed so the global one is used. (`components/navigation.tsx`)
- **Design system step 4c (cake inquiry form)** and **cake form errors**: all problems now appear in one soft box with an icon right above **Continue** / **Send cake inquiry** (one message, or "Please check the highlighted fields" with a list), and the fields with problems turn red, the same as the contact form. This replaces the red lines under each field and the red box for send failures. Field hints ("at least 3 days away", pickup address, budget note) now sit under their field and are read out with it. The step label is a small uppercase "Step 1 of 4" above the title, upcoming step numbers are grey, the photo picker is a dashed "Choose photos" button with a count instead of the browser's "Choose Files", photo rows and the review summary use the design tokens, the acknowledgement box turns red when it is missed, and the sent message uses the success colors. The email suggestion list uses the popover tokens. (`components/cake-inquiry-form.tsx`, `components/email-input.tsx`)
- **Design system step 4b (menu grid)**: photos on the menu cards are larger (16:10) and zoom in slightly on mouse hover; the category is a small uppercase label and the price is dark, tabular text so it stands apart from the brown name. Category buttons, search suggestions, the hours panel, the Custom Cakes panel, the empty/error boxes, the item pop-up and the phone Call/Directions bar now use the design tokens instead of raw white, amber, green and gray. The open/closed dot uses the success color, and "(Las Vegas)" no longer wraps into its own column on phones. Loading placeholders match the real card shape (new `components/menu-grid-skeleton.tsx`, used by the menu page and `app/menu/loading.tsx`). (`components/menu-page.tsx`, `app/globals.css`)
- **Contact form email**: the notification now has Reply-To set to the customer's email, so pressing Reply in the bakery inbox answers the customer directly (the cake inquiry email already did this). (`app/api/contact/route.ts`)
- **Build setting**: `pnpm-workspace.yaml` now allows `sharp` to run its install script (`sharp: true`) instead of the placeholder text pnpm wrote, so installs no longer stop to ask about it.
- **Repository cleanup** (no visible change to the site):
  - `package.json`: renamed from the `my-v0-project` template name to `sunville-bakery` with a description. The scripts are now `typecheck`, `test`, `format` and `format:check`; the broken `lint` script is removed. `@vercel/analytics` is pinned to `^2.0.1` instead of `latest`, `server-only` is declared, `prettier` is a dev dependency, and the unused `dotenv` is removed. The lockfile is updated to match.
  - Renamed `lib/occasion-admin.ts` to `lib/admin-auth.ts` (it handles all admin sign-in, not just occasions) and `isOccasionAdmin` to `isAdminPassword`.
  - Public images now have descriptive names: `hero-bakery.jpg`, `logo-dark.png`, `logo-light.png` and `logo-mark.png`. `placeholder.svg` is kept because menu rows store that path.
  - Tests moved from `scripts/` to `tests/unit/*.test.cjs`, reformatted and fixed for the current code. They share a loader, `tests/helpers/load-ts.cjs`, and run with `pnpm test`. Removed four browser scripts that depended on the old admin login, local JSON data and a Windows-only Edge setup.
  - Removed dead code: the unused `constantTimeCompare` and the test-only `rankMenuSearch`. Helpers used in only one file are no longer exported. Rewrote outdated comments as plain documentation.
  - `.gitignore` now also covers OS and editor files, logs, test output and local audit files. Added `.env.example`, which lists every environment variable without values.

## 2026-10-13

- **Design system step 4a (home hero)**: taller edge-to-edge photo; the dark shade now sits only behind the text (left side on desktop, bottom on phones) so the cakes and buns stay bright; bigger `text-display` headline on two lines; small uppercase label above it; white "Inquire for Custom Cakes" button and a see-through "Explore Daily Menu" button; white focus ring on the photo. (`components/hero-section.tsx`)
- **Design system step 3 (responsive)**: paragraphs avoid a lonely last word and long emails/links wrap instead of overflowing; card and panel padding now scales smoothly from 16px on small phones to 32px on desktop (`card-pad`, `card-pad-lg`); home hero height follows the screen height; every nav, footer and Privacy link is at least 44×48px to tap; keyboard focus ring is white in the brown footer; the menu page's fixed Call/Directions bar clears the iPhone home bar; cake price/serving numbers shrink slightly on phones. Checked at 320, 390 and 768px with no sideways scrolling.
- **Contact form errors**: all messages (missing name/email/message, bad email or phone, could not send, sent) now appear in one soft box with an icon right above **Send Message**, and the fields with problems turn red. Replaced the browser's own pop-up bubbles (`noValidate`) and the large red box at the top. New `FormAlert` / `FieldError` in `components/ui/form-message.tsx`.
- **Design system step 2 (interactive states)**: one consistent keyboard focus ring site-wide (menu cards no longer show a double outline); buttons darken and press in slightly when tapped; menu cards lift on mouse hover; form fields darken on hover and look clearly disabled; `<Button loading>` spinner on the contact, cake inquiry and admin forms; new `Skeleton` placeholder used for the menu page while it loads (`app/menu/loading.tsx`) and the admin menu/photo lists. See `docs/UI-DESIGN-SYSTEM.md`.
- **Design system step 1 (tokens)**: the colors in `app/globals.css` are now named tokens (ink, brand brown, gold accent, surface, line, success/warning/danger) with the same original values, so nothing changes color. Added radius (6/10/16px), `shadow-pop`, motion, fluid spacing and type-scale tokens, plus `text-display`, `eyebrow`, `text-pretty-body`, `surface`, `badge` and `price` utilities. Cards are slightly rounder, sections space out fluidly with screen width, and touch targets are 44px. Removed the unused dark theme, chart/sidebar colors, six unused gradient/glass utilities, duplicate rules and the unused `styles/globals.css`. See `docs/UI-DESIGN-SYSTEM.md`.

## 2026-10-12

- **Contact & cake forms**: phone stops at 10 digits and formats as (702) 123-4567 while typing; email field shows a styled suggestion list of common domains (keith@ → keith@gmail.com, yahoo.com…; tap or arrow keys + Enter) via `components/email-input.tsx`. This replaced a short-lived inline grey completion. Shared helpers in `lib/form-helpers.ts`; server also rejects phones over 10 digits.
- **Contact page**: now just a centered "Contact us" form. Removed "For orders, please call", the "Visit or call us" box (details are in the footer) and the unused "* Required" note. (`app/contact/page.tsx`)
- **Cleanup phase 4**: Prettier formatting for all source (`pnpm format`); Occasions editor split into `components/admin-occasion-fields.tsx`; one seasonal banner component; maintenance mode handled in `middleware.ts` with a `/maintenance` page.
- **Cleanup phase 3**: shared `lib/site-info.ts` (phone, address, hours, email), `lib/email.ts`, `lib/request-body.ts`, `lib/admin-api.ts`; admin menu API merged into `/api/admin/menu`; pre-order status updates no longer reload every order; TypeScript build checking turned back on.
- **Cleanup phase 2**: removed Stripe checkout and all Vercel Blob code and packages; Supabase is the only data source; admin menu saves no longer load the whole menu first.
- **Cleanup phase 1**: removed unused routes, images, scripts, old docs and the `csv-parse` package.

## 2026-10-10

- **Cake inquiry form**: phone number limited to 10 digits and auto-formatted; step checkmarks removed; up to 5 inspiration photos (each resized to 800 KB to stay under Vercel's 4.5 MB request limit).

## 2026-10-07

- **Menu**: full item descriptions on cards; removed the "Details" link; badges shortened.
- **Copy trimmed site-wide** (home hero, Our story, gallery, menu, custom cakes, contact).
- **Gallery**: previous/next arrows on the photo itself, swipe and arrow keys.
- **Cake inquiry photos**: phone and iPhone (HEIC) photos converted and resized in the browser before sending.

## 2026-09-29

- **Home**: "A taste of Sunville" shows a random 6 photos each visit; Customer favorites cards under Our story; founder photo cropped; About link scroll position fixed.

## 2026-09-27


## 2026-05-16 (update 2)

### Fixed

- **Admin Gallery – Vercel Blob Storage**: Switched gallery storage from the local filesystem (which is read-only on Vercel) to Vercel Blob
  - Image files now upload to Vercel Blob instead of `public/gallery/` — works in production
  - Gallery URL list now stored as a `gallery-data.json` blob instead of `lib/gallery-images.ts` — persists across deployments
  - Existing Yelp/ImgBB images in `lib/gallery-images.ts` are used as the initial seed if no blob data exists yet
  - Requires `BLOB_READ_WRITE_TOKEN` env var (set automatically when Vercel Blob store is linked to the project)
  - **Files modified:** `app/api/gallery/route.ts`, `app/api/gallery/upload/route.ts`, `package.json`

- **Admin Gallery – File Upload**: Fixed uploaded images not appearing after upload
  - The gallery API was only returning external `https://` URLs; local uploads stored as `/gallery/...` paths were silently ignored
  - Updated URL extraction regex to also match local `/gallery/` paths
  - **File modified:** `app/api/gallery/route.ts`

- **Admin Gallery – Browse Button**: Replaced the unstyled raw file input with a clearly labeled dashed-border button showing an image icon and "Browse image files..." text
  - Selected filename and file size (MB) display next to the button once a file is chosen
  - **File modified:** `app/admin/page.tsx`

- **Admin Gallery – Upload & Add URL Buttons**: Both previously failed silently with no feedback
  - Upload button now shows "Uploading..." while in progress and is disabled until a file is selected
  - Add URL button now shows "Adding...", is disabled when the field is empty, and responds to the Enter key
  - Both actions now show a green success banner or a red error banner (with the exact error message) that auto-dismisses after 4 seconds
  - **File modified:** `app/admin/page.tsx`

## [Previous] - 2026-03-11

### Added

- **Menu Page – Image Hover Preview**: Hovering over any product card that has an image now shows a floating preview popup above the card
  - Displays a larger (280×192px) version of the product image
  - Shows the product name, description snippet, and price
  - Smooth fade + zoom-in animation on appear
  - 80ms delay to prevent accidental flickers when moving the mouse across cards
  - Downward arrow points from the popup to the card being hovered
  - `pointer-events-none` so the popup never blocks clicks
  - Only activates on cards with a valid image; text-only items are unaffected
  - **File modified:** `app/menu/page.tsx`

## [Previous] - 2025-10-06

### Fixed

- **Pickup Time Selector**: Past times are now hidden when today's date is selected
  - If it's 9:15 AM and you select today, only times from 9:30 AM onwards will show
  - Future dates still show all available times
  - Still respects Wednesday hours (8 AM - 3 PM) vs regular hours (8 AM - 8 PM)

- **Maintenance Mode on Vercel**: Updated to use environment variables instead of file system
  - To enable/disable maintenance mode on live site:
    1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
    2. Update `MAINTENANCE_MODE` to `true` or `false`
    3. Redeploy the site
  - Local development still works with `.env.local`

### Changed

- Removed product sync functionality (one-time sync already completed)
  - Removed sync button from admin panel
  - Removed sync API endpoint
  - Removed sync scripts
  - Products are now managed separately in test and live Stripe accounts

### Added

- Products synced from test to live Stripe account (51 products total)
  - All categories: Roll Cakes, Traditional Pastries & Mooncakes, Sponge Cakes, Breads, Buns
  - Both test and live accounts now have identical products

## [Previous] - 2025-10-05

### Added

- Product descriptions to menu page
- Fixed caching issues
- Pickup time in order emails
- Customer order confirmation emails
- Cart clearing after successful checkout

### Fixed

- Order email formatting
- Checkout flow

## Initial Release

### Features

- Homepage with bakery information
- Menu page with product catalog and shopping cart
- Gallery page with photo grid
- Admin panel for managing:
  - Products (show/hide, price updates)
  - Gallery images
  - Maintenance mode
- Stripe checkout integration
- Order confirmation emails via Resend
- Responsive design for mobile and desktop
