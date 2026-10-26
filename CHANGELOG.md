# Changelog

All notable changes to the Sunville Bakery website will be documented in this file.

Newest first. Every change that is pushed gets an entry here (see `CONTRIBUTING.md`).

## 2026-10-26

- **Cake size finder replaces Sizes & prices**: on `/custom-cakes`, customers now answer five quick questions (occasion, number of guests, shape, flavor and filling, pickup or delivery) and get the smallest cake that serves everyone, with a starting price (cake by filling, plus delivery). "Not sure" on shape picks the best value of round or sheet; if the chosen shape doesn't go that big, the closest other shape is suggested; past 144 guests it asks them to inquire or call. Other sizes that fit (other shapes and one size up) can be picked instead. "Use this for my inquiry" fills in the inquiry form (occasion, servings, size, flavor, filling, pickup/delivery), which stays editable. The full price table is under "See every size and price". The `#serving-guide` link still points to this section. (`lib/cake-finder.ts`, `components/cake-size-finder.tsx`, `components/cake-plan.tsx`, `components/cake-inquiry-form.tsx`, `app/custom-cakes/page.tsx`, removed `components/cake-serving-guide.tsx`, `tests/unit/cake-finder.test.cjs`, `docs/CUSTOM-CAKE-INQUIRIES.md`)

## 2026-10-25

- **Security: admin APIs accept only the sign-in cookie**: the admin password now works only on the sign-in form (`/api/admin/verify`, limited to 5 tries per 15 minutes). Other admin endpoints used to also accept the password in the request, with no limit, so they could be used to guess it. Nothing changes for signing in or using admin. (`lib/admin-auth.ts`, `app/api/admin/*/route.ts`, `app/api/gallery/route.ts`, `app/api/gallery/upload/route.ts`, `lib/database-product-api.ts`, `tests/helpers/admin-session.cjs`, `tests/unit/`)
- **Security: photo uploads checked by their contents**: admin photo uploads must really be JPEG, PNG, WebP or GIF (read from the file's first bytes, not its name or the type the browser reports), and are saved with the matching type and extension. Signed-out uploads are refused before the file is read. (`app/api/gallery/upload/route.ts`, `lib/image-type.ts`, `lib/photo-storage.ts`, `tests/unit/gallery-upload.test.cjs`)
- **Security: HTTPS enforced on subdomains too**: the HSTS header now includes `includeSubDomains`. (`next.config.mjs`)
- **Photos moved off ImgBB**: the 5 gallery photos and 10 menu photos that loaded from i.ibb.co were copied into Supabase storage (`gallery/ibb-*.jpg`, `menu/ibb-*.webp`) and the database now points at the copies. i.ibb.co is removed from the allowed image hosts, so the image optimizer only serves Supabase and Yelp photos. The built-in fallback gallery uses the Supabase copies in the same order, so captions still match. (`lib/gallery-images.ts`, `next.config.mjs`)

## 2026-10-23

- **Cake orders table fits the screen**: phone and email now sit under the customer's name (no separate columns), and the action buttons are smaller and stacked in a narrow column, so the whole row shows on a laptop without scrolling sideways. (`components/admin-cake-orders.tsx`)
- **Fix: admin lists sometimes never loaded (greyed-out buttons)**: after the server sat idle, a database connection could go dead and queries waited on it forever. Every database query now has a 10-second limit; on a timeout the connection pool is replaced, so the next try works (the page shows an error instead of hanging). Idle connections are also closed sooner (5 s) and replaced every 5 minutes. (`lib/database.ts`, `tests/unit/database-timeout.test.cjs`)
- **Admin remembers the open tab**: the tab is kept in the address (e.g. `/admin?tab=cake-inquiries`), so reloading the page stays on it instead of going back to Menu. Admin requests now give up after 60 seconds with a message, so buttons can't stay greyed out if a request hangs. On the pay page, test orders (from test inquiries) now say clearly that it's a test: the button reads "Record test payment" and the confirmation says no card was charged. (`app/admin/page.tsx`, `lib/admin-api.ts`, `components/pay-form.tsx`)
- **"Mom" renamed in admin and emails**: "Copy for Mom" / "Text Mom" are now "Copy for kitchen" / "Text kitchen", and the Chinese section in order emails is headed "Chinese copy for the kitchen". Mother's Day occasion text is unchanged. (`components/admin-cake-orders.tsx`, `lib/cake-order.ts`, `lib/cake-order-email.ts`, `docs/`)
- **Custom cake inquiries → orders with a pay link**: each inquiry in admin has "Create order & send pay link". Enter the agreed details and total, choose full payment or a deposit, and the customer is emailed the details and a link to pay online (valid 3 days, page `/pay/<id>`). The order shows in Cake orders as CUSTOM / Awaiting payment, with Copy pay link and Resend link; once paid it becomes Paid or Deposit paid (balance shown), and the inquiry changes to Confirmed & paid by itself. Delivery orders show the address in emails and in the Chinese text. Inquiry statuses renamed: "Waiting on customer" → "Awaiting customer", "Checking with Mom" → "Under bakery review". The Square card field is now one shared component. Needs `db/005-custom-cake-orders.sql`. (`lib/custom-cake-orders.ts`, `lib/cake-order.ts`, `lib/cake-orders-store.ts`, `lib/cake-inquiries-store.ts`, `lib/cake-order-email.ts`, `lib/cake-order-actions.ts`, `lib/cake-inquiry.ts`, `app/pay/[id]/page.tsx`, `app/api/pay/[id]/route.ts`, `app/api/admin/cake-inquiries/route.ts`, `app/api/admin/cake-orders/route.ts`, `components/admin-custom-order-form.tsx`, `components/admin-cake-inquiries.tsx`, `components/admin-cake-orders.tsx`, `components/pay-form.tsx`, `components/square-card.tsx`, `components/cake-order-form.tsx`, `middleware.ts`, `db/005-custom-cake-orders.sql`, `tests/unit/cake-order.test.cjs`, `docs/`)
- **Sequential order numbers**: cake orders are numbered #1001, #1002, ... instead of a random 4-character code. Existing orders are numbered in the order they were placed. The number is used in admin, the emails and Square's payment reference. A retried failed payment keeps its number; resending the same order doesn't use one up. Needs `db/004-cake-order-numbers.sql` run in Supabase before deploying. (`db/004-cake-order-numbers.sql`, `lib/cake-orders-store.ts`, `lib/cake-order.ts`, `app/api/cake-orders/route.ts`, `lib/cake-order-actions.ts`, `lib/cake-order-email.ts`, `components/admin-cake-orders.tsx`, `tests/unit/cake-order.test.cjs`, `docs/CAKE-ORDERS.md`, `docs/ADMIN_GUIDE.md`)
- **Cake orders as a table**: admin → Cake orders is now a compact table (ordered, pickup, cake, customer, status, phone, email) instead of large cards. A Status dropdown filters the list (All by default), and the Ordered and Pickup headers sort. The Chinese text for Mom is no longer shown on the page; Copy for Mom still copies it. Approve, decline and picked-up buttons are on each row. (`components/admin-cake-orders.tsx`, `docs/ADMIN_GUIDE.md`)
- **Order a cake is easier to find**: "Order a Cake" is in the top menu and footer, and "Custom Cakes" is renamed "Custom Cake Inquiry" there. The home hero's main button is now "Order a cake" (then "See the menu" and "Custom cake inquiry"). The custom cakes page has a "Need a cake sooner?" box with an Order a cake button instead of the small line, and the menu page's Custom Cakes card has an "Order an everyday cake" button. The header switches to the phone menu below 1024px, and the header phone button shows from 1280px, so the longer menu fits on one line. Failed payment attempts are now deleted after 2 days (they were only hidden). (`components/navigation.tsx`, `components/footer.tsx`, `components/hero-section.tsx`, `app/custom-cakes/page.tsx`, `components/menu-page.tsx`, `lib/cake-orders-store.ts`, `tests/unit/cake-order.test.cjs`, `docs/CAKE-ORDERS.md`)
- **Fix: online cake payments failed with VALUE_TOO_LONG**: the payment key sent to Square was 49 characters; Square allows 45. It is now a 43-character hash of the order and card token. Admin test orders were not affected. (`app/api/cake-orders/route.ts`, `tests/unit/cake-order.test.cjs`)
- **Clearer failed-payment errors**: when Square refuses an online cake payment for a reason other than a normal decline, the customer message now includes Square's error code, and the details are written to Vercel → Logs ("Square payment failed"). Added wording for expired cards, invalid card data and over-limit cards. (`app/api/cake-orders/route.ts`, `lib/square.ts`)
- **Cake order form tweaks**: phone formats as (702) 555-0123 while typing and email suggests common domains, like the other forms. Fillings no longer show prices (the total shows on the Pay button). Full sheet added as a size (needs approval for next-day pickup, like 1/2 sheet). A note under Size links to Sizes & prices. (`components/cake-order-form.tsx`, `lib/cake-order.ts`, `tests/unit/cake-order.test.cjs`, `docs/CAKE-ORDERS.md`, `docs/ADMIN_GUIDE.md`)
- **Test orders in admin**: admin → Cake orders has "Test order (paid)" and "Test order (needs approval)" buttons. They save a sample order marked TEST, send the real order emails (all to the bakery inbox, `[TEST]` subjects) and the Chinese text for Mom, and can be approved, declined and deleted. In Square sandbox they pay with Square's test card; in production no card is used. (`lib/cake-order-actions.ts`, `lib/cake-order-email.ts`, `lib/cake-orders-store.ts`, `lib/cake-order.ts`, `app/api/admin/cake-orders/route.ts`, `components/admin-cake-orders.tsx`, `tests/unit/cake-order.test.cjs`, `docs/ADMIN_GUIDE.md`, `docs/CAKE-ORDERS.md`)
- **Online cake orders with Square**: new `/order-cake` page where customers pick an everyday cake (6"–12" round, 1/4 or 1/2 sheet; flavor; filling; optional writing), a pickup time, and pay by card in Square's card field. Same-day orders (from 10 AM, 3 hours' notice) and next-day orders for 6", 10", 12" and 1/2 sheet only hold the card until approved in the new admin → Cake orders tab; unapproved holds are released automatically and the customer is emailed. Each order has a "Copy for Mom" button (Chinese text) and "Text Mom" on phones. The custom cakes page links to it. Needs Square environment variables and `db/003-cake-orders.sql`; until then the page says "coming soon". (`lib/cake-order.ts`, `lib/square.ts`, `lib/cake-orders-store.ts`, `lib/cake-order-email.ts`, `lib/cake-order-actions.ts`, `app/order-cake/page.tsx`, `components/cake-order-form.tsx`, `components/admin-cake-orders.tsx`, `app/api/cake-orders/route.ts`, `app/api/admin/cake-orders/route.ts`, `app/api/square/webhook/route.ts`, `middleware.ts`, `app/admin/page.tsx`, `app/custom-cakes/page.tsx`, `lib/seo.ts`, `tests/unit/cake-order.test.cjs`, `docs/CAKE-ORDERS.md`, `docs/ADMIN_GUIDE.md`)
- **Draft reply removed**: the "Draft reply" button in admin → Cake inquiries is gone; the drafts were too generic. Test inquiries still appear in the list (for trying statuses and notes). Removed `lib/inquiry-reply.ts` and its test. (`components/admin-cake-inquiries.tsx`, `app/api/admin/cake-inquiries/route.ts`, `docs/ADMIN_GUIDE.md`)
- **Test inquiries show up in the list**: "Send test inquiry" now also adds the sample to admin → Cake inquiries with a TEST badge, so Draft reply can be tried on it. Each press uses one of three samples (cake too small for the guests; open choices and missing details; a filling we don't list). Test cards have a "Delete test inquiry" button (only test entries can be deleted) and aren't flagged as repeat customers. (`app/api/admin/cake-inquiries/route.ts`, `lib/cake-inquiries-store.ts`, `lib/cake-inquiry.ts`, `components/admin-cake-inquiries.tsx`, `tests/unit/admin-test-inquiry.test.cjs`, `tests/unit/database.test.cjs`, `docs/ADMIN_GUIDE.md`)
- **Draft reply for cake inquiries**: each inquiry in admin → Cake inquiries has a "Draft reply" button. The draft skips what the customer already told us and only covers what's open: a size suggestion for their guest count, the starting price from the pricing sheet (plus delivery), a note if that's over their budget, flavor/filling choices when they asked for a recommendation, and questions for anything missing (delivery address, time, design). Parts that need the bakery's judgment (availability, design price, custom fillings) are left in [square brackets]. Edit it on the page, then "Open in Gmail" or "Copy". Nothing is saved or sent automatically. (`lib/inquiry-reply.ts`, `components/admin-cake-inquiries.tsx`, `tests/unit/inquiry-reply.test.cjs`, `docs/ADMIN_GUIDE.md`)
- **Send test inquiry button**: admin → Cake inquiries has a "Send test inquiry" button that sends a sample cake inquiry through the real email code. Both emails (bakery and customer copy) go to the bakery inbox with `[TEST]` subjects; nothing is added to the tracker. The inquiry emails now live in one shared file used by both the public form and the button; what customers and the bakery receive is unchanged. (`lib/cake-inquiry-email.ts`, `app/api/custom-cakes/route.ts`, `app/api/admin/cake-inquiries/route.ts`, `components/admin-cake-inquiries.tsx`, `tests/unit/admin-test-inquiry.test.cjs`, `docs/ADMIN_GUIDE.md`)

## 2026-10-22

- **Each cake inquiry gets its own email thread**: subjects now include the customer's name and a short code (e.g. `#4F2A`), so Gmail no longer merges different inquiries with the same event and date. The code also shows next to the name in admin → Cake inquiries. (`lib/cake-inquiry.ts`, `app/api/custom-cakes/route.ts`, `components/admin-cake-inquiries.tsx`)
- **Cake inquiries tracked in admin**: every custom cake inquiry is now also saved (encrypted) and listed in a new admin "Cake inquiries" tab with statuses (New, Waiting on customer, Checking with Mom, Confirmed & paid, Completed, Cancelled), filters, private notes, and a flag when the same email or phone sent another inquiry. The inquiry email is unchanged and stays the main record; if saving fails the customer still sees success. New table: `db/002-cake-inquiries.sql`. (`lib/cake-inquiries-store.ts`, `app/api/admin/cake-inquiries/route.ts`, `components/admin-cake-inquiries.tsx`, `app/admin/page.tsx`, `app/api/custom-cakes/route.ts`, `tests/unit/database.test.cjs`, `docs/ADMIN_GUIDE.md`)
- **Customer gets a copy of their cake inquiry**: after sending, the customer receives an email with their choices and "reply to this email to add or change something", so changes come as replies instead of a second form. Replies go to the bakery inbox. Notes and delivery address are not repeated in it. The thank-you screen says the same. (`app/api/custom-cakes/route.ts`, `components/cake-inquiry-form.tsx`)
- **Writing on the cake**: optional "Writing on the cake" field (60 characters) in the cake step, shown in the review and in both the English and Chinese bakery email, exactly as typed. (`components/cake-inquiry-form.tsx`, `lib/cake-inquiry.ts`, `lib/email-zh.ts`, `app/api/custom-cakes/route.ts`)
- **Fillings: Strawberry, Banana, Strawberry Banana**: three separate choices; Strawberry Banana (草莓香蕉) is new. The sizes & prices guide now reads "Mixed Fruit / Strawberry / Banana / Tiramisu" for that price column. The last filling option is now "Something else (e.g., passion fruit)". (`lib/cake-inquiry.ts`, `lib/cake-catalog.ts`, `lib/email-zh.ts`, `docs/CUSTOM-CAKE-INQUIRIES.md`)

- **Photo strip moved above the story**: on the home page the moving photo strip now comes right after the hero, before "A family bakery since 2002". (`components/about-section.tsx`)
- **Cake event date: past and too-soon days can't be picked**: the event date is now chosen from a calendar where days before the earliest allowed date (3 days out, Las Vegas time) are greyed out and can't be tapped. Phone browsers ignored the old date box's limit, so past dates could be picked. The 3-day check when sending is unchanged. (`components/event-date-picker.tsx`, `components/cake-inquiry-form.tsx`)
- **Cake inquiry: optional event time**: step 1 now has an "Event time (optional)" field next to the event date. Customers can leave it blank if it isn't decided; the bakery email then shows "Not decided yet" (未定 in the Chinese copy). When a time is given it shows as e.g. 2:30 PM in the review step, the email and its subject. (`components/cake-inquiry-form.tsx`, `lib/cake-inquiry.ts`, `app/api/custom-cakes/route.ts`, `lib/email-zh.ts`, `tests/unit/cake-inquiry.test.cjs`)

## 2026-10-21

- **Strip photos open enlarged in the gallery**: clicking a photo in the home page strip opens the gallery with that photo already showing in the large viewer (arrows and swipe still move to the others). (`components/bakery-marquee.tsx`, `components/gallery-view.tsx`)
- **Photo strip starts at a random photo**: the home page strip now begins at a different point on each visit instead of always on the same photo. (`components/bakery-marquee.tsx`)

## 2026-10-20

- **Google Analytics 4**: the site now loads the Google Analytics tag on every page when `NEXT_PUBLIC_GA_ID` (the G-… Measurement ID) is set in Vercel; with it empty, nothing loads. The security policy allows Google's tag and data hosts, and the privacy page now mentions Google Analytics and its cookies. (`app/layout.tsx`, `middleware.ts`, `app/privacy/page.tsx`, `.env.example`, `package.json`, `docs/ADMIN_GUIDE.md`)

## 2026-10-19

- **Bigger strip photos, simpler menu header, no size compare list**: home page strip photos are larger (up to 32rem). The menu page's red band now shows only the open/closed status (with the hours drop-down); the title, address and Call/Directions buttons are gone from it (phones keep the bottom Call/Directions bar). Removed "Compare … cake sizes" from Sizes & prices on the custom cakes page. (`components/bakery-marquee.tsx`, `components/menu-page.tsx`, `components/cake-serving-guide.tsx`)
- **Fuller "Our story" on the home page**: new story text (Johnny and May are from Toishan; Johnny has baked since he was 18, starting in San Francisco) and a "How we bake" section: made here every day, less sugar, char siu made in house. (`components/about-section.tsx`)
- **Simpler home page**: removed the open/closed line, address and phone from the hero, the "From our kitchen" heading and its buttons above the photo strip, and the "About" link from the header (the footer still links to the story). (`components/hero-section.tsx`, `components/about-section.tsx`, `components/navigation.tsx`)
- **Home page photo strip**: "Customer favorites", Johnny's photo and the "A taste of Sunville" grid are replaced by "From our kitchen", a slow, endless strip of every photo in the gallery (each opens the gallery page). It stops while the mouse is over it or a photo has keyboard focus; visitors who turn off motion get a still strip they can swipe. Photos added or removed in Admin > Gallery show up in it automatically. (`components/bakery-marquee.tsx`, `components/about-section.tsx`, `app/page.tsx`, `app/globals.css`; removed `components/featured-gallery.tsx`)
- **Home hero photo back as the background**: the bakery photo fills the hero again, with the words on a dark shade on the left (bottom on phones), instead of the red sign beside the photo. (`components/hero-section.tsx`)

## 2026-10-18

- **Phone and tablet layout**: the homepage hero photo is shorter on phones so the buttons show without scrolling, and its two buttons sit side by side from 360px. Phones and tablets get the photo above the red sign, and the story section shows the favorites before Johnny's photo. The red page bands are shorter on phones, and the menu band hides the street address there (the bottom bar has Directions). Menu card descriptions on phones stop at two lines (the pop-up shows all of it). Fixed the menu pop-up photo overlapping the text under it on phones. (`components/hero-section.tsx`, `components/about-section.tsx`, `components/page-band.tsx`, `components/menu-page.tsx`, `app/contact/page.tsx`)
- **New look: Hong Kong bakery counter**: the public pages now use pastry-box red, egg-wash gold, pink box paper and a dark brown footer instead of the old brown and off-white. New fonts: Young Serif for headings, Figtree for text, Noto Serif HK for Chinese. Chinese item names (菠蘿包, 叉燒包…) now show large in red under the English name on menu cards, item pop-ups and the homepage favorites. The homepage hero is a red sign beside the bakery photo and shows live open/closed status. Menu, custom cakes, gallery and contact pages open with the same red band. The contact page now lists hours, address and phone beside the form. The header shows the phone number on wide screens. (`app/globals.css`, `app/layout.tsx`, `components/hero-section.tsx`, `components/about-section.tsx`, `components/page-band.tsx`, `components/item-name.tsx`, `components/store-status.tsx`, `lib/bilingual.ts`, `components/menu-page.tsx`, `components/navigation.tsx`, `components/footer.tsx`, `app/contact/page.tsx`, `app/custom-cakes/page.tsx`, `components/gallery-view.tsx`, `docs/UI-DESIGN-SYSTEM.md`)
- **Menu photos no longer cut off**: menu card and item pop-up photos are now square instead of wide (16:10 / 4:3), so tall phone photos show the whole item instead of cutting off the top and bottom. The phone thumbnail is square too, and the loading placeholders match. (`components/menu-page.tsx`, `components/menu-grid-skeleton.tsx`)
- **Blurry photo warning**: the admin menu list marks photos smaller than 600 pixels as **Blurry**, and the photo picker warns when a chosen photo is that small. Twelve items currently use 300×300 photos that look soft when enlarged; they need new photos, since code cannot sharpen them. (`components/menu-photo-field.tsx`, `app/admin/page.tsx`, `docs/ADMIN_GUIDE.md`)
- **Menu photos in the admin portal**: menu items can now have a photo uploaded from a phone or computer. **Edit item** has a new photo section (Add / Change / Remove photo), and **Add menu item** uses the same picker instead of the old "Photo URL" box. Photos are converted from HEIC and resized on the device, upload to the `menu/` folder in Supabase storage, and only go live when the item is saved. Replacing or removing a photo deletes the old upload unless something else uses it. The admin menu list shows a thumbnail (or "No photo") for each item. (`components/menu-photo-field.tsx`, `components/admin-product-editor.tsx`, `components/admin-product-create.tsx`, `lib/database-product-api.ts`, `app/api/gallery/upload/route.ts`, `app/admin/page.tsx`, `docs/ADMIN_GUIDE.md`)
- **Email sender**: site emails now come from `orders@sunvillebakerylv.com` instead of Resend's shared `onboarding@resend.dev` test address, so they are less likely to land in spam. The domain is verified in Resend (DNS records in Vercel). `orders@` has no mailbox; replies go to the customer. (`lib/email.ts`)
- **Chinese copy in form emails**: the contact, cake inquiry and pre-order emails to the bakery now have a Traditional Chinese version right under the English one. Labels, headings and the site's own choices (event type, cake size, flavor, filling, budget, pickup/delivery) are translated; what the customer typed (name, message, notes, address) and menu item names stay as written. Translations live in the new `lib/email-zh.ts`; a test checks every form option has one. (`app/api/contact/route.ts`, `app/api/custom-cakes/route.ts`, `app/api/pre-orders/route.ts`, `tests/unit/email-zh.test.cjs`)

## 2026-10-19

- **Repository**: project working rules moved to `CONTRIBUTING.md`; tool-specific files are no longer tracked.

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
  - Stopped tracking `audit-*.json` and `docs/SECURITY-AUDIT-2026-09-23.md`. They are kept on disk only.

## 2026-10-13

- **Design system step 4a (home hero)**: taller edge-to-edge photo; the dark shade now sits only behind the text (left side on desktop, bottom on phones) so the cakes and buns stay bright; bigger `text-display` headline on two lines; small uppercase label above it; white "Inquire for Custom Cakes" button and a see-through "Explore Daily Menu" button; white focus ring on the photo. (`components/hero-section.tsx`)
- **Design system step 3 (responsive)**: paragraphs avoid a lonely last word and long emails/links wrap instead of overflowing; card and panel padding now scales smoothly from 16px on small phones to 32px on desktop (`card-pad`, `card-pad-lg`); home hero height follows the screen height; every nav, footer and Privacy link is at least 44×48px to tap; keyboard focus ring is white in the brown footer; the menu page's fixed Call/Directions bar clears the iPhone home bar; cake price/serving numbers shrink slightly on phones. Checked at 320, 390 and 768px with no sideways scrolling.
- **Contact form errors**: all messages (missing name/email/message, bad email or phone, could not send, sent) now appear in one soft box with an icon right above **Send Message**, and the fields with problems turn red. Replaced the browser's own pop-up bubbles (`noValidate`) and the large red box at the top. New `FormAlert` / `FieldError` in `components/ui/form-message.tsx`.
- **Design system step 2 (interactive states)**: one consistent keyboard focus ring site-wide (menu cards no longer show a double outline); buttons darken and press in slightly when tapped; menu cards lift on mouse hover; form fields darken on hover and look clearly disabled; `<Button loading>` spinner on the contact, cake inquiry and admin forms; new `Skeleton` placeholder used for the menu page while it loads (`app/menu/loading.tsx`) and the admin menu/photo lists. See `docs/UI-DESIGN-SYSTEM.md`.
- **Design system step 1 (tokens)**: the colors in `app/globals.css` are now named tokens (ink, brand brown, gold accent, surface, line, success/warning/danger) with the same original values, so nothing changes color. Added radius (6/10/16px), `shadow-pop`, motion, fluid spacing and type-scale tokens, plus `text-display`, `eyebrow`, `text-pretty-body`, `surface`, `badge` and `price` utilities. Cards are slightly rounder, sections space out fluidly with screen width, and touch targets are 44px. Removed the unused dark theme, chart/sidebar colors, six unused gradient/glass utilities, duplicate rules and the unused `styles/globals.css`. See `docs/UI-DESIGN-SYSTEM.md`.

## 2026-10-12

- **Contact & cake forms**: phone stops at 10 digits and formats as (702) 123-4567 while typing; email field shows a styled suggestion list of common domains (keith@ → keith@gmail.com, yahoo.com…; tap or arrow keys + Enter) via `components/email-input.tsx`. This replaced a short-lived inline grey completion. Shared helpers in `lib/form-helpers.ts`; server also rejects phones over 10 digits.
- **Docs**: rewrote `README.md` and `docs/ADMIN_GUIDE.md` for the current site; removed Stripe/Blob notes from other docs; added `CONTRIBUTING.md` (working rules).
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

- Security, caching and mobile admin overhaul, maintenance handoff. See `docs/HANDOFF-2026-09-27.md`.

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
