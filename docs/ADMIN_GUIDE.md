# Admin guide

Go to https://sunvillebakerylv.com/admin and sign in with the admin password. You stay signed in on that device for 12 hours. Works on phones.

## Menu

- Search items, filter Visible / Hidden.
- Each item shows a small photo, or "No photo" if it has none. Photos marked **Blurry** are too small (under 600 pixels) to look sharp on the menu; replace them with a larger photo.
- The menu shows every photo as a square, so take photos with the whole item in the middle and some space around it.
- **Edit item**: photo, name, description, price. Changes appear on the public menu right away.
- **Photos**: in Edit item or Add menu item, tap **Add photo** (or **Change photo**) and pick one from your phone or computer. iPhone HEIC photos are converted and large photos resized automatically. It uploads straight away, but only shows on the menu after you press **Save changes** / **Add item**. **Remove photo** puts back "Photo coming soon". A replaced photo is deleted from storage unless the gallery or an occasion still uses it.
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

Orders show as a table (ordered, pickup, cake, customer, status, phone, email). The list starts on **All**; use the **Status** dropdown to filter, and click **Ordered** or **Pickup** to sort; click again to reverse. Cake writing and notes show under the cake when there are any.


- **Needs approval**: same-day orders, and next-day orders for 6", 10", 12", 1/2 sheet and full sheet. The card is only held. Press **Approve & charge** or **Decline** before the time shown; otherwise the hold is released and the customer is told automatically.
- **To make**: paid orders, soonest pickup first. **Mark picked up** when collected.
- **Copy for kitchen** copies the order in Chinese (phone, size, flavor, filling, pickup time, pickup, writing). On a phone, **Text kitchen** opens Messages with it filled in.
- **Test order (paid)** adds a sample 8" order 3 days out; **Test order (needs approval)** adds a 10" order for tomorrow so Approve & charge / Decline can be tried. Test orders have a TEST badge, send every email to the bakery inbox with `[TEST]` subjects, and can be deleted. In Square sandbox they use Square's test card (they show in the sandbox dashboard); in production no card is used, so nothing is charged.
- Refunds and changes to paid orders: Square Dashboard → Transactions, search by the order number (e.g. `#1001`). Orders are numbered in sequence; a failed payment can leave a gap.

## Cake inquiries

**Turning a confirmed inquiry into an order:** once the design and price are agreed with the customer (and the bakery), press **Create order & send pay link** on the inquiry. Check the details (size, flavor, filling, writing, pickup or delivery, date and time, design notes), enter the total price (including any delivery fee) and choose **Full amount** or **Deposit** (enter the deposit). The customer is emailed the details and a link to pay online, valid for 3 days. The order appears in **Cake orders** (marked CUSTOM, "Awaiting payment") and the inquiry changes to "Awaiting customer"; when they pay, the order becomes **Paid** or **Deposit paid** and the inquiry **Confirmed & paid** automatically. For deposits, Cake orders shows the balance to collect at pickup or delivery. If the link runs out, use **Resend link** in Cake orders (another 3 days); **Copy pay link** copies it for a text or your own email. Details: `docs/CAKE-ORDERS.md`.

- Every custom cake inquiry from the order page (/order-cake, when it ends as a quote request) appears here (the inquiry email still arrives as before). Reference photos show as small thumbnails: hover one to see it full size, or tap it to open it in a new tab.
- Set the status as it moves along: New → Awaiting customer / Under bakery review → Confirmed & paid → Completed, or Cancelled. "Open" shows everything still in progress.
- Use the private notes for the agreed design, final price and how it was paid. Customers never see them.
- A yellow note means the same email or phone sent another inquiry (usually a correction). Keep one and cancel the other.
- Customers get an email copy of their inquiry; their replies come to the bakery inbox.
- **Send test inquiry** sends a sample inquiry through the real email setup, so you can check what arrives without filling in the form. Both emails (the bakery one and the customer copy) go to the bakery inbox with subjects starting `[TEST]`. The sample is also added to this list with a TEST badge so you can try statuses and notes on it; use "Delete test inquiry" to remove it.

## Settings

- Maintenance mode is set in Vercel (`MAINTENANCE_MODE=true`, then redeploy). Admin keeps working while it is on.

## Changing the password

In Vercel set a new `ADMIN_PASSWORD` (type Secret) and redeploy. Keep `CAMPAIGN_STORAGE_SECRET` unchanged: it decrypts saved pre-orders and cake inquiries.

## Google Analytics

1. In Google Analytics, open Admin > Data streams > the sunvillebakerylv.com web stream and copy the Measurement ID (starts with `G-`).
2. In Vercel set `NEXT_PUBLIC_GA_ID` to that ID (Production) and redeploy. Clear it and redeploy to turn Google Analytics off.
3. Check it works: open the site, then Google Analytics > Reports > Realtime should show your visit within a minute.
