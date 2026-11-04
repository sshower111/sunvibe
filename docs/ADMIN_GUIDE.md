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

What you get (tapping a notification opens that order or inquiry in the side panel):

- **New cake order**: "Needs approval", e.g. `🎂 8" vanilla/strawberry · Sat 2 PM · Jane D`. **URGENT** when pickup is today or tomorrow.
- **New custom cake inquiry**: e.g. `🎂 Birthday · Sun, Nov 8 · 20 servings · Linda P`.
- **Custom cake paid**: when a customer pays a pay link (full price or deposit).
- **Reminders** (each sent once): an urgent order still waiting halfway to its answer time, and again 15 minutes before it is cancelled; any other held order 24 hours before its card hold ends; an order "Checking with kitchen" every 3 hours (9 AM–8 PM). For every paid order (or paid deposit), by the calendar: **9 AM two days before** pickup or delivery when it was ordered 2 or more days ahead, otherwise **9 AM the day before**; and **3 hours before**, but never before 8 AM (8 AM instead). Same-day orders placed within 3 hours get no extra reminder.
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

### Discord notifications

Every notification above (new orders, inquiries, paid pay links, reminders before pickup) is also posted to a Discord channel, with the full details: customer, phone, pickup time, cake, writing, notes, address and total. The title links to the order or inquiry in admin. **Send test notification** in Settings posts to Discord too ("Discord got it too.").

One-time setup (owner):

1. In Discord, make a server (or use yours) and a channel such as `#orders`. Channel → **Edit Channel → Integrations → Webhooks → New Webhook**, name it Sunville Bakery, **Copy Webhook URL**. Treat it like a password: anyone with it can post to the channel.
2. In Vercel → Settings → Environment Variables (Production), add `DISCORD_WEBHOOK_URL` (type Secret) with that URL. Optional: `DISCORD_MENTION` = `@everyone` so every message pings phones. Redeploy.
3. On each phone with Discord: long-press the channel → **Notification Settings → All Messages**, and allow Discord notifications in the phone's settings.
4. In admin → Settings → Notifications, press **Send test notification** and check the channel.

To stop, delete the webhook in Discord or remove `DISCORD_WEBHOOK_URL` in Vercel. A Discord problem never stops an order or inquiry.

#### One card per order

Each order has one card in the orders channel. Its first line says what kind it is: **🛒 Online order** (from the cake order page) or **🎨 Custom cake · from inquiry #3F42** (made from an inquiry; the link opens the inquiry in admin). The first notification about it is the card; everything after (paid, approved, reminders, customer email replies, the kitchen text) goes in the card's thread, and the card itself always shows the current status, its buttons and a short history ("✅ Approved by Keith", "🎉 Picked up"). What you do in the admin app (approve, decline, ask kitchen, paid in store, picked up, refund, resend pay link) updates the card too, without a ping.

Orders made from a custom cake inquiry: when you create the order in admin and the pay link is emailed, its card appears as **📨 Awaiting payment** without a ping (there is nothing to approve: it waits for payment). The inquiry's card turns green with **✅ Became order #1050 → open the order**, and the inquiry needs nothing more; replies to its old emails still go in its thread. When the customer pays, **💰 Custom cake paid** (or Deposit paid) goes in the order's thread with a ping and the card gets **👍 Acknowledge** for the kitchen text.

#### Buttons on order messages (Discord bot)

When the Discord bot is set up, the site posts as the bot instead of the webhook, and order messages get buttons:

- **👍 Acknowledge**: opens a thread under the order with the Chinese kitchen text, ready to copy. An order that needs approval becomes **Checking with kitchen** (same as Ask kitchen in admin, with the same extra hour for urgent orders). Paid orders get this button too.
- **✅ Approve & charge**: first asks "Charge Jane Doe $45 for #1042?" (only you see it); **Yes, charge** charges the card and emails the customer, like Approve in admin. After the card hold ended it reads **Approve (send pay link)** and emails a pay link instead.
- **❌ Decline**: asks first; **Yes, decline** releases the card hold and emails the customer.

The order message then shows the new status and who did what ("👍 Acknowledged by Keith", "✅ Approved by Keith · charged $45"), and its buttons change to match. If the order was already answered in admin, the button says so and changes nothing. Only the Discord users listed in `DISCORD_ADMIN_IDS` can use the buttons; anyone else gets "Not allowed". Test orders work the same and never charge a card.

One-time setup (owner):

1. At <https://discord.com/developers/applications> → **New Application** (Sunville Bakery). On **General Information** copy the **Application ID** and **Public Key**.
2. **Installation** → Install Link: **None**. **Bot** → **Reset Token**, copy it (shown once; treat it like a password); turn off **Public Bot**. Leave the Privileged Gateway Intents off.
3. **OAuth2 → URL Generator**: scope **bot**; permissions View Channels, Send Messages, Embed Links, Read Message History, Create Public Threads, Send Messages in Threads, Manage Threads (so deleting an order or inquiry in admin also removes its thread). Open the link and add the bot to the bakery server.
4. In the Discord app: **User Settings → Advanced → Developer Mode** on. Right-click the channel → **Copy Channel ID**; right-click each person allowed to approve → **Copy User ID**.
5. In Vercel (Production) add `DISCORD_BOT_TOKEN` (Secret), `DISCORD_APP_ID`, `DISCORD_PUBLIC_KEY`, `DISCORD_CHANNEL_ID` (the orders channel), `DISCORD_INQUIRY_CHANNEL_ID` (the inquiries channel; without it inquiries go to the orders channel) and `DISCORD_ADMIN_IDS` (user IDs, comma separated). Redeploy.
   In Supabase → SQL Editor, run `db/012-discord-messages.sql` once (it remembers each order's and inquiry's Discord message, for email replies).
6. Back on **General Information**, set **Interactions Endpoint URL** to `https://sunvillebakerylv.com/api/discord/interactions` and **Save** (Discord checks it right away; it only saves once step 5 is deployed).
7. In admin → Settings → Notifications press **Send test notification**, then make an admin **Test order** to try the buttons.

`DISCORD_WEBHOOK_URL` can stay as a fallback: the site uses the bot whenever `DISCORD_BOT_TOKEN` and `DISCORD_CHANNEL_ID` are set. The Gmail replies script no longer uses a webhook, so an email-replies channel is not needed.

#### Customer email replies → Discord

Customers reply to the bakery's Gmail directly, so the website never sees those emails on its own. A small Google Apps Script in the bakery Gmail account sends each new customer reply to the website (`/api/discord/email-reply`), which posts it **in the thread under that inquiry's Discord message** (or the order's, for order emails), pinging the people in `DISCORD_ADMIN_IDS` (or `DISCORD_MENTION`). The post shows the sender, the subject, the new part of the reply, and links to the Gmail thread. The script watches threads with `[Inquiry]` or `[Order]` subjects, "cake inquiry", "cake order" or "custom cake", and skips drafts and the bakery's own emails. Only customer replies are posted, each one with a ping; the bakery's own emails are skipped. For inquiries and orders from before the bot, the first email brings their card into the channel once (no ping) and the thread starts there. If the website can't be reached, the script tries again 5 minutes later.

1. In Vercel (Production) add `EMAIL_REPLY_SECRET` (type Secret, 32+ random characters, e.g. `openssl rand -base64 32`). Redeploy.
2. Signed in as the bakery Gmail, open <https://script.google.com> → **New project** (or the existing "Replies to Discord").
3. Replace the code with `scripts/gmail-replies-to-discord.gs` from this repo and put the same secret in `SECRET`. Save.
4. Pick `setUp` in the function list and press **Run**. Allow access to Gmail when Google asks (it shows a warning because the script is your own and not published; choose Advanced → Go to project). From then on it checks every 5 minutes.

If a reply doesn't show up: pick `showWhatItSees` in the function list and press **Run**. The log lists every matching email from the last 2 days with **NEW** (sends on the next run), **already sent** or **skipped**, and says whether the 5-minute timer is set up. To send the last hour's replies again (for example ones marked already sent that never arrived), run `resendLastHour`. **Executions** (list icon) shows each run's log, including the website's answer for every reply sent (200 = posted, 401 = `SECRET` doesn't match `EMAIL_REPLY_SECRET`). Only emails whose subject has the inquiry code (#1A2B) or order number (#1042) are sent, so other mail such as Amazon or Uber Eats never reaches Discord; the website ignores anything else too. Running `setUp` again is safe: it keeps its place. The script skips emails sent from the bakery Gmail itself, so test with another email account.

To stop it: in the script, **Triggers** (clock icon) → delete the trigger.

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

Online orders from the menu's **Cakes** chip (`/menu` → `/order-cake`, paid by card through Square). Details and setup: `docs/CAKE-ORDERS.md`.

### Approving an order

The **8" round** is a display cake: it is charged when ordered (4 hours' notice) and goes straight to **To make**, so just **Send to kitchen**. Every other size (6", 10", 12", sheets) shows "Requires Kitchen Confirmation (4h Lead Time)" when chosen, also needs 4 hours' notice, and is only **held** on the customer's card until you approve it. A notification and an email arrive; tap it (or the order in the list) to open it in the side panel. It shows the answer deadline and time left, the cake, the customer (tap to call or email), the Chinese kitchen text and the order's history.

| Pickup | Answer by | If not answered |
| --- | --- | --- |
| Today (URGENT) | 1 hour after ordering, and at least 2 hours before pickup | Cancelled, card released, customer emailed |
| Tomorrow (URGENT) | 8 PM tonight (or 3 hours before pickup if sooner) | Cancelled, card released, customer emailed |
| Later | When the card hold ends (up to 7 days) or 3 hours before pickup | Waits as **Card hold ended** |

The buttons in the order's panel:

- **Approve & charge**: charges the card and emails the customer. Then **Send to kitchen** opens Messages to the kitchen with the Chinese order text (and marks it sent). On a computer, where texts can't be sent, **Mark sent** only marks it.
- **Ask kitchen**: opens Messages to the kitchen with the order and "請問呢個蛋糕做唔做到？". The order moves to **Checking with kitchen**; an urgent order gets one more hour to answer if the pickup time allows. When the kitchen replies, come back and **Approve & charge** or **Decline**.
- **Decline**: asks to confirm, releases the card hold, and emails the customer unless you untick **Email … that we can't make it**.
- **Card hold ended** (later orders only): **Approve & send pay link** emails the customer a link to pay online (`/pay/<id>`, valid 3 days or until pickup). **Decline** closes it.

Tapping a button twice never charges or emails twice. Pickup times on `/order-cake`: any size from 10 AM with 4 hours' notice; tomorrow never before 9:30 AM, or 12 PM if ordered after noon.

The kitchen's number is the Vercel environment variable `KITCHEN_PHONE` (digits only, e.g. `7025550123`). Without it, Messages opens with no recipient.

### The list

Orders are a compact list: on a computer a table (pickup, customer and order number, cake, amount, status, ordered); on a phone two lines per order (name and amount, then pickup and status). The tabs at the top filter it (All, Needs approval, To make, Awaiting payment, Picked up, Declined / expired, each with a count); click **Pickup** or **Ordered** to sort, again to reverse. **URGENT** marks an order waiting for your answer with pickup today or tomorrow; TEST and CUSTOM orders are marked too. A paid order whose details haven't gone to the kitchen yet shows **Send to kitchen** as its status (orders paid before Oct 31, 2026 count as already sent).

Click (or tap) an order to open it in a panel on the right (full screen on a phone). Everything is done there: the next step as buttons (**Approve & charge** / **Ask kitchen** / **Decline**, **Send to kitchen** / **Mark sent** / **Mark picked up**, or **Resend pay link**), the details, the Chinese kitchen text and the history. The panel's **⋯** has the rest: Copy for kitchen, Text kitchen (phones), Call, Email, Copy pay link, Paid in store / by phone, Undo picked up and **Delete order**. Deleting removes the order, its history and its Discord card (and the thread under it) for good; nothing is refunded and the customer isn't emailed, so refund first if needed. An order whose card is still on hold must be declined first. **×**, Escape or the phone's back gesture closes it; on a computer you can click another order in the list while it is open. The address shows the open order (`/admin/orders?open=<id>`), so a refresh keeps it open. The ↻ icon at the top refreshes the list, and the **⋯** next to it has the test orders.

- **Needs approval**: new online orders for any size but the 8" (see Approving an order above).
- **To make**: paid orders, soonest pickup first. **Mark picked up** when collected.
- **Declined / refunded**: declined, expired and refunded orders. If a declined or expired order's customer pays you another way afterwards (Square terminal, cash, by phone), press **Paid in store / by phone** to move the order back to To make. No email is sent, so let the customer know yourself.
- **⋯ → Copy for kitchen** copies the order in Chinese (phone, size, flavor, filling, pickup time, pickup, writing). On a phone, **Text kitchen** opens Messages with it filled in.
- **⋯ → Test order (urgent, tomorrow)** adds a sample 10" order for tomorrow at its first pickup time; **Test order (in 3 days)** adds a 6" order 3 days out. Both are held so Approve, Ask kitchen and Decline can be tried. Test orders have a TEST badge, send every email to the bakery inbox with `[TEST]` subjects, and can be deleted. In Square sandbox they use Square's test card (they show in the sandbox dashboard); in production no card is used, so nothing is charged.
- **⋯ → Refund** (paid, deposit-paid or picked-up orders): asks to confirm, refunds what was paid online (the deposit for deposit orders) to the customer's card through Square, moves the order to **Declined / refunded** (status Refunded) and emails the customer unless you untick **Email … about the refund**. Tapping it twice refunds once. Orders marked **Paid in store / by phone** weren't paid online, so refund those where they were paid. Partial refunds and changes to paid orders: Square Dashboard → Transactions, search by the order number (e.g. `#1001`). Orders are numbered in sequence; a failed payment can leave a gap.

## Cake inquiries

**Turning a confirmed inquiry into an order:** once the design and price are agreed with the customer (and the bakery), press **Approve & send pay link** in the inquiry's panel. Check the details (size, flavor, filling, writing, pickup or delivery, date and time, design notes), enter the total price (including any delivery fee) and choose **Full amount** or **Deposit** (enter the deposit). The customer is emailed the details and a link to pay online, valid for 3 days. The order appears in **Cake orders** (marked CUSTOM, "Awaiting payment") and the inquiry changes to "Awaiting customer"; when they pay, the order becomes **Paid** or **Deposit paid** and the inquiry **Confirmed & paid** automatically. For deposits, Cake orders shows the balance to collect at pickup or delivery. If the link runs out, open the order in Cake orders and use **Resend pay link** (another 3 days); **⋯ → Copy pay link** copies it for a text or your own email. Details: `docs/CAKE-ORDERS.md`.

- Every custom cake inquiry from `/custom-cakes` appears here, with the design style, reference link and "OK to text" when given (the inquiry email still arrives as before). Reference photos show as small thumbnails: hover one to see it full size, or tap it to open it in a new tab.
- Inquiries are a compact list (received, customer, event, cake, budget, status; two lines per inquiry on a phone). Click one to open it in the side panel: the status picker and **Approve & send pay link** at the top, then private notes and the details (event, cake, flavors, writing, pickup or delivery, budget, notes, photos, customer). The panel's **⋯** has Call, Email, Add/Edit private notes and **Delete inquiry** (removes the inquiry, its photos and its Discord card with the thread under it, for good; an order made from it stays in Cake orders).
- Set the status as it moves along: New → Awaiting customer / Under bakery review → Confirmed & paid → Completed, or Cancelled. "Open" shows everything still in progress.
- Use the private notes for the agreed design, final price and how it was paid. Customers never see them.
- A yellow note in the panel means the same email or phone sent another inquiry (usually a correction); click its date to open it. Keep one and cancel the other.
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
