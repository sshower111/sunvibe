# Admin guide

Go to https://sunvillebakerylv.com/admin and sign in with the admin password. In a browser you stay signed in for 12 hours.

## iPhone app (Sunville Admin)

The admin pages install as an app on the Home Screen:

1. Open https://sunvillebakerylv.com/admin in **Safari** (not Chrome).
2. Tap **Share** → **Add to Home Screen** → **Add**. The red **Sunville Admin** icon appears.
3. Open it from the Home Screen and sign in once. The app keeps you signed in for 90 days, renewed every time you open it, so it won't ask again unless you sign out, don't open it for 90 days, or the admin password changes.

The app has four tabs at the bottom: **Orders**, **Inquiries**, **Menu** and **More** (Gallery, Occasions, Pre-orders, Settings, View website, Sign out). Pull down at the top of any screen to refresh it. On a computer the same sections are in the left sidebar.

Each section has its own address (`/admin/orders`, `/admin/inquiries`, `/admin/menu`, `/admin/more`, `/admin/gallery`, ...). Old links such as `/admin?tab=cake-orders` still open the right section.

### Notifications on the iPhone

iPhones only allow notifications for apps added to the Home Screen, so install the app first (above).

1. Open **Sunville Admin** from the Home Screen → **More** → **Settings** → **Notifications**.
2. Tap **Turn on notifications**, then **Allow**.
3. Tap **Send test notification**. It should arrive within a few seconds.

What you get (tapping an order notification opens that order's page; an inquiry opens the inquiries list, scrolled to it and outlined):

- **New cake order**: "Needs approval", e.g. `🎂 8" vanilla/strawberry · Sat 2 PM · Jane D`. **URGENT** when pickup is today or tomorrow.
- **New custom cake inquiry**: e.g. `🎂 Birthday · Sun, Nov 8 · 20 servings · Linda P`.
- **Reminders** (each sent once): an urgent order still waiting halfway to its answer time, and again 15 minutes before it is cancelled; any other held order 24 hours before its card hold ends; an order "Checking with kitchen" every 3 hours (9 AM–8 PM).
- Test orders and inquiries start with **TEST**.

Notifications are extra: the emails still go out as before, and a notification problem never stops a customer's order or inquiry. The device list under Notifications shows every phone or computer that turned them on; **Remove** stops them on that device. Devices that are reset or uninstall the app drop off the list on their own. If notifications were blocked, turn them on in iPhone **Settings → Notifications → Sunville Admin**.

#### One-time setup (owner)

1. Make the keys on any computer with Node: `npx web-push generate-vapid-keys`. Keep the private key secret; never put it in the repo.
2. In Vercel → Settings → Environment Variables (Production), add `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` (type Secret) and `VAPID_SUBJECT` = `mailto:` + the bakery email. Also add `CRON_SECRET` (32+ random characters, e.g. `openssl rand -base64 32`, type Secret). Redeploy.
3. In Supabase → SQL Editor, run `db/008-push-notifications.sql` once (and `db/009-cake-order-events.sql` for the order history).
4. Reminders: in Supabase → Database → Extensions, turn on **pg_cron** and **pg_net**. Then in the SQL Editor run this once, with your `CRON_SECRET` in place of `YOUR_CRON_SECRET` (it runs the reminder check every 15 minutes):

   ```sql
   select cron.schedule(
     'sunville-reminders',
     '*/15 * * * *',
     'select net.http_get(url := ''https://sunvillebakerylv.com/api/cron/reminders'', headers := jsonb_build_object(''Authorization'', ''Bearer YOUR_CRON_SECRET''))'
   );
   ```

   To check it right away, run the call by hand, then read the reply (200 = working, 401 = the secret doesn't match Vercel's `CRON_SECRET`):

   ```sql
   select net.http_get(url := 'https://sunvillebakerylv.com/api/cron/reminders', headers := jsonb_build_object('Authorization', 'Bearer YOUR_CRON_SECRET'));
   select status_code, content from net._http_response order by created desc limit 1;
   ```

   To stop it: `select cron.unschedule('sunville-reminders');`. If `CRON_SECRET` changes, unschedule and schedule again with the new value. The job also settles held orders whose answer time passed (as opening Cake orders does).

Changing the VAPID keys turns notifications off on every device; turn them on again in Settings.

## Menu

- Search items, filter Visible / Hidden. Each item is a compact card (photo, name, price, category, Visible/Hidden); its **⋯** (top-right) has **Edit item** and **Hide from menu** / **Show on menu**. The ↻ icon refreshes the list and the **⋯** next to it has **Add menu item**.
- Each item shows a small photo, or "No photo" if it has none. Photos marked **Blurry** are too small (under 600 pixels) to look sharp on the menu; replace them with a larger photo.
- The menu shows every photo as a square, so take photos with the whole item in the middle and some space around it.
- **Edit item**: photo, name, description, price. Changes appear on the public menu right away.
- **Photos**: in Edit item or Add menu item, tap **Add photo** (or **Change photo**) and pick one from your phone or computer. iPhone HEIC photos are converted and large photos resized automatically. It uploads straight away, but only shows on the menu after you press **Save changes** / **Add item**. **Remove photo** puts back the shelf label (the item's Chinese name in large red characters). A replaced photo is deleted from storage unless the gallery or an occasion still uses it.
- **Hide / Show**: removes an item from the public menu without deleting it.
- **Add menu item**: photo, name, price, category, description.

## Gallery

- **Add photos**: pick one or more photos from your phone; they are converted and resized automatically.
- **Or add a photo link** for an image hosted elsewhere.
- **Remove photo** (tap twice to confirm). Uploaded files are deleted from storage unless a menu item or occasion still uses them.

## Occasions (festival pre-orders)

- One campaign drives the site banner and the /pre-order page while it is active and published.
- **New occasion** → pick a preset, edit dates, banner text, page text and items → **Save & preview**, then **Publish**.
- **Save draft** unpublishes. Empty campaigns show a "call us" message.

## Pre-orders

- Reservation requests from /pre-order. Call the customer, then update the status.

## Cake orders

Online orders from `/order-cake` (paid by card through Square). Details and setup: `docs/CAKE-ORDERS.md`.

### Approving an order

Every online order is only **held** on the customer's card until you approve it. A notification and an email arrive; tap it (or **Review** in the list) to open the order's page. It shows the answer deadline and time left, the cake, the customer (tap to call or email), the Chinese kitchen text and the order's history.

| Pickup | Answer by | If not answered |
| --- | --- | --- |
| Today (URGENT) | 1 hour after ordering, and at least 2 hours before pickup | Cancelled, card released, customer emailed |
| Tomorrow (URGENT) | 8 PM tonight (or 3 hours before pickup if sooner) | Cancelled, card released, customer emailed |
| Later | When the card hold ends (up to 7 days) or 3 hours before pickup | Waits as **Card hold ended** |

The buttons on the order's page:

- **Approve & charge**: charges the card and emails the customer. Then **Send to kitchen** opens Messages to the kitchen with the Chinese order text (and marks it sent; **Mark sent** only marks it).
- **Ask kitchen**: opens Messages to the kitchen with the order and "請問呢個蛋糕做唔做到？". The order moves to **Checking with kitchen**; an urgent order gets one more hour to answer if the pickup time allows. When the kitchen replies, come back and **Approve & charge** or **Decline**.
- **Decline**: asks to confirm, releases the card hold, and emails the customer unless you untick **Email … that we can't make it**.
- **Card hold ended** (later orders only): **Approve & send pay link** emails the customer a link to pay online (`/pay/<id>`, valid 3 days or until pickup). **Decline** closes it.

Tapping a button twice never charges or emails twice. Pickup times on `/order-cake`: today from 10 AM with 3 hours' notice; tomorrow from 9:30 AM if ordered before noon, otherwise from 12 PM.

The kitchen's number is the Vercel environment variable `KITCHEN_PHONE` (digits only, e.g. `7025550123`). Without it, Messages opens with no recipient.

### The list

Orders show as a table (ordered, pickup, cake, customer, status, phone, email). The list starts on **All**; use the **Status** dropdown to filter, and click **Ordered** or **Pickup** to sort; click again to reverse. Cake writing and notes show under the cake when there are any.

Three lists are pinned at the top of **Orders** when they have anything in them:

- **Needs approval**: orders waiting for your answer, including **Card hold ended**. **URGENT** marks a pickup today or tomorrow; those come first. **Review** opens the order's page.
- **Checking with kitchen**: orders you have asked the kitchen about.
- **Approved — not sent to kitchen**: paid orders whose details haven't gone to the kitchen yet. On a phone, **Send to kitchen** opens Messages with the Chinese order text and marks it sent; **Mark sent** just marks it (for example after **Copy for kitchen**). Orders paid before Oct 31, 2026 count as already sent.

The full list follows underneath. Tap an order's date to open its page. Each order shows its main button (**Review**, **Mark picked up**, or **Resend pay link**); everything else is in the **⋯** menu (top-right corner of the order on phones): Text kitchen (phones), Copy for kitchen, Call, Email, Copy pay link, Paid in store / by phone, Undo picked up and Delete test order. The ↻ icon at the top refreshes the list, and the **⋯** next to it has the test orders.

- **Needs approval**: every new online order (see Approving an order above).
- **To make**: paid orders, soonest pickup first. **Mark picked up** when collected.
- **Declined / expired**: if the customer pays you another way afterwards (Square terminal, cash, by phone), press **Paid in store / by phone** to move the order back to To make. No email is sent, so let the customer know yourself.
- **Copy for kitchen** copies the order in Chinese (phone, size, flavor, filling, pickup time, pickup, writing). On a phone, **Text kitchen** opens Messages with it filled in.
- **⋯ → Test order (urgent, tomorrow)** adds a sample 10" order for tomorrow at noon; **Test order (in 3 days)** adds an 8" order 3 days out. Both are held so Approve, Ask kitchen and Decline can be tried. Test orders have a TEST badge, send every email to the bakery inbox with `[TEST]` subjects, and can be deleted. In Square sandbox they use Square's test card (they show in the sandbox dashboard); in production no card is used, so nothing is charged.
- Refunds and changes to paid orders: Square Dashboard → Transactions, search by the order number (e.g. `#1001`). Orders are numbered in sequence; a failed payment can leave a gap.

## Cake inquiries

**Turning a confirmed inquiry into an order:** once the design and price are agreed with the customer (and the bakery), press **Approve & send pay link** on the inquiry. Check the details (size, flavor, filling, writing, pickup or delivery, date and time, design notes), enter the total price (including any delivery fee) and choose **Full amount** or **Deposit** (enter the deposit). The customer is emailed the details and a link to pay online, valid for 3 days. The order appears in **Cake orders** (marked CUSTOM, "Awaiting payment") and the inquiry changes to "Awaiting customer"; when they pay, the order becomes **Paid** or **Deposit paid** and the inquiry **Confirmed & paid** automatically. For deposits, Cake orders shows the balance to collect at pickup or delivery. If the link runs out, use **Resend link** in Cake orders (another 3 days); **Copy pay link** copies it for a text or your own email. Details: `docs/CAKE-ORDERS.md`.

- Every custom cake inquiry from the order page (/order-cake, when it ends as a quote request) appears here (the inquiry email still arrives as before). Reference photos show as small thumbnails: hover one to see it full size, or tap it to open it in a new tab.
- Each inquiry is a compact card: event, cake, flavors, writing, pickup or delivery, budget and the customer's notes. The **⋯** in its top-right corner has Call, Email, Add/Edit private notes and (for tests) Delete test inquiry. The status picker and **Approve & send pay link** are at the bottom.
- Set the status as it moves along: New → Awaiting customer / Under bakery review → Confirmed & paid → Completed, or Cancelled. "Open" shows everything still in progress.
- Use the private notes for the agreed design, final price and how it was paid. Customers never see them.
- A yellow note means the same email or phone sent another inquiry (usually a correction). Keep one and cancel the other.
- Customers get an email copy of their inquiry; their replies come to the bakery inbox.
- **⋯ → Send test inquiry** sends a sample inquiry through the real email setup, so you can check what arrives without filling in the form. Both emails (the bakery one and the customer copy) go to the bakery inbox with subjects starting `[TEST]`. The sample is also added to this list with a TEST badge so you can try statuses and notes on it; use **⋯ → Delete test inquiry** to remove it.

## Bakery inbox (Gmail)

Every email the website sends to the bakery starts with a tag, so Gmail can sort it:

| Tag           | What                                                            |
| ------------- | --------------------------------------------------------------- |
| `[Order]`     | Online cake orders, including `APPROVE BY …` and `Paid:` emails |
| `[Inquiry]`   | Custom cake inquiries (name, event, date, time and `#code`)     |
| `[Contact]`   | Contact form messages                                           |
| `[Pre-order]` | Festival pre-orders                                             |

Test emails start with `[TEST]` before the tag. Pressing Reply on any of them answers the customer.

To give each kind its own label: in Gmail search, type `subject:[Order]`, open the search options, choose **Create filter**, tick **Apply the label**, and pick or make a label such as `Bakery/Orders`. Repeat for the other tags. Status (needs reply, waiting on customer, paid, done) is kept in admin → Cake inquiries and Cake orders, not in Gmail.

## Settings

- Maintenance mode is set in Vercel (`MAINTENANCE_MODE=true`, then redeploy). Admin keeps working while it is on.
- **Encryption key**: customer details are encrypted with `CAMPAIGN_STORAGE_SECRET`. Records saved before 2026-10-29 may still use a key made from the admin password. **Check** shows how many; **Re-encrypt old records** moves them to `CAMPAIGN_STORAGE_SECRET`. Both are safe to press again. Do this before changing the password.

## Changing the password

First, in admin → Settings → Encryption key, press **Check**; if it shows any old records, press **Re-encrypt old records** until it shows 0 (old records still need the current password to read). Then in Vercel set a new `ADMIN_PASSWORD` (type Secret) and redeploy. Never change `CAMPAIGN_STORAGE_SECRET`: it decrypts saved pre-orders, cake inquiries and cake orders.

## Google Analytics

1. In Google Analytics, open Admin > Data streams > the sunvillebakerylv.com web stream and copy the Measurement ID (starts with `G-`).
2. In Vercel set `NEXT_PUBLIC_GA_ID` to that ID (Production) and redeploy. Clear it and redeploy to turn Google Analytics off.
3. Check it works: open the site, then Google Analytics > Reports > Realtime should show your visit within a minute.
