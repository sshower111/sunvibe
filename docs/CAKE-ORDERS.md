# Online cake orders (/order-cake)

Customers pick a cake on the menu (`/menu` → Cakes → **Order**), choose flavor and filling, pay by card through Square, and pick it up at the bakery. Custom designs, tiers and delivery are quote requests on `/custom-cakes` (`docs/CUSTOM-CAKE-INQUIRIES.md`).

## What customers can order

- Sizes: 6", 8", 10", 12" round, 1/4 sheet, 1/2 sheet, full sheet, listed on the menu (`components/menu-cakes.tsx`) with "from" prices. **Order** opens `/order-cake?size=…` (`components/cake-order-flow.tsx`): cake (size, flavor, filling, writing) → pickup → details & payment.
- Any listed flavor and filling. The price comes from the pricing sheet column for the filling (`lib/cake-catalog.ts`): Custard; Mixed Fruit / Strawberry / Banana; Mango / Taro; Coconut / Durian.
- Classic look only (cream finish, piped border, optional writing up to 60 characters).
- Pickup only. No tax is added.

## Display cakes and kitchen confirmation (Nov 1, 2026)

- **8" round** (`INSTANT_SIZES` in `lib/cake-order.ts`): a display cake. Any listed flavor and filling, ready with **4 hours' notice**, charged when ordered (status Paid, no approval). The menu shows "Ready in 4 hours".
- **Every other size**: shows "Requires Kitchen Confirmation (24h Lead Time)" on the menu and order page, needs **24 hours' notice**, and is held on the card until the bakery approves (below).
- To change which sizes are display cakes or the notice, edit `INSTANT_SIZES`, `INSTANT_NOTICE_HOURS` and `CONFIRM_NOTICE_HOURS`. If a display cake can't be made, use **⋯ → Refund** on the order (below).

## Apple Pay and Google Pay

The payment step (and the custom cake pay link, `/pay/<id>`) shows **Apple Pay** (Safari on iPhone, iPad and Mac) and **Google Pay** (Chrome, Android) buttons above the card form, only on devices that support them (`components/square-card.tsx`). They charge or hold the card exactly like a typed card, including approval holds. Samsung Pay isn't offered: Square doesn't support it online. Apple Pay needs the domain set up once (Setup step 5). The site's security policy allows `pay.google.com` and `google.com` for Google Pay (`middleware.ts`).

## Pickup times and approval (`lib/cake-order.ts`)

Pickup slots are every 30 minutes until 30 minutes before closing (7:30 PM; Wednesday 2:30 PM), up to 60 days ahead, Las Vegas time, with 4 hours' notice (8") or 24 hours' notice (other sizes).

Orders for any size but the 8" are only held on the card ("card held": Square authorizes the amount but doesn't charge it) until the bakery approves it on the order's admin page (`/admin/orders/<id>`, `components/admin-order-review.tsx`, `lib/cake-order-actions.ts`).

| Pickup | Earliest time | Answer by | Square hold | If not answered |
|---|---|---|---|---|
| Next day | 9:30 AM if ordered before noon, else 12 PM (and 24 hours' notice) | 8 PM tonight, or 3 hours before pickup if sooner (at least 1 hour) | deadline + 90 min | Cancelled, customer emailed |
| 2+ days ahead | 9:30 AM | 3 hours before pickup, at most 7 days | until the deadline (Square's maximum is 7 days) | "Card hold ended"; approving emails a pay link (`/pay/<id>`) |

The extra 90 minutes on short holds leave room for **Ask kitchen**, which moves a same-day or next-day deadline one hour later when the pickup time allows (still 2 or 3 hours before pickup). The site enforces the deadline itself (reminder job every 15 minutes, the Square webhook, and opening admin): it cancels the hold and tells the customer once. Orders placed before this change have no extra time and are never extended.

Approve, Ask kitchen and Decline are safe to repeat: Square's complete and cancel calls return the same result when repeated, and an order's status only moves once (`moveCakeOrder`), so the charge and the email happen once. Every status change is saved in `bakery_cake_order_events` (`db/009-cake-order-events.sql`) and shown as the order's history. Decline can skip the customer email.

If nobody approves a same-day or next-day order in time, the hold is released, the order shows as "Not approved in time", and the customer is emailed. If the customer then pays another way (Square terminal, cash, by phone), **Paid in store / by phone** on the order moves it to To make; no email is sent. The same button works on declined orders and expired pay links. This happens through the Square webhook, and also whenever admin → Cake orders is opened.

## Where customers find it

- Menu page: the **Cakes** category (also at the top of All items when not searching), each size with **Order**.
- Custom cakes page: "Need a cake sooner? Order from the menu" under the form.
- The top menu has no separate cake order link; **Custom cakes** there is the quote request.

## Refunds

Admin → the order → **⋯ → Refund** (`refundOrder` in `lib/cake-order-actions.ts`, `refundPayment` in `lib/square.ts`) for orders that are Paid, Deposit paid or Picked up. It checks the Square payment is completed, refunds the amount paid online (`amountDueNow`: the deposit for deposit orders) with the idempotency key `refund-<order id>` (so a repeat never refunds twice), sets the status to `refunded` and, unless unticked, emails the customer ("Your cake order #… has been refunded"). Orders paid in store / by phone are refused (no completed online payment). Square's refunds take a few days to reach the card. Needs `db/011-refunds.sql` (adds the `refunded` status) run in Supabase before deploying.

## Failed payments

The order is saved just before the card is charged, so a charge always has an order. If the payment fails, the order is marked "Payment failed" (Declined / expired list in admin) and deleted after 2 days.

## Custom cake orders (pay links)

Made in admin → Cake inquiries → **Approve & send pay link** (`lib/custom-cake-orders.ts`, `components/admin-custom-order-form.tsx`).

- The order stores the agreed cake, pickup or delivery (with address), design notes, total price and an optional deposit.
- The customer is emailed a link to `/pay/<order id>` (the random ID is the link's secret; the page isn't indexed). It works for 3 days; after that the order shows "Pay link expired" until **Resend link** gives it 3 more days.
- Paying charges the full price or the deposit straight away (Square Online API rate). Status: `awaiting_payment` → `paid` or `deposit_paid`; the inquiry becomes Confirmed & paid. Receipt to the customer, notice (with the Chinese copy for the kitchen) to the bakery.
- Test inquiries make test orders: emails go to the bakery inbox, and on the live site the pay page has a no-card test button.
- Needs `db/005-custom-cake-orders.sql` (adds the two statuses).

## Emails

- New order: to the bakery inbox (subject starts with `[Order] APPROVE BY …`, with the Chinese copy for the kitchen) and to the customer.
- Approved, declined or not approved in time: to the customer.

## Setup (Vercel environment variables)

1. In the Square Developer Dashboard, create an application. Use the **Sandbox** credentials first, then **Production**.
2. Set in Vercel:
   - `SQUARE_ENVIRONMENT` — `sandbox` or `production`
   - `NEXT_PUBLIC_SQUARE_APPLICATION_ID` — Application ID
   - `SQUARE_ACCESS_TOKEN` — Access token (secret)
   - `SQUARE_LOCATION_ID` — the bakery's location ID (Locations page)
3. Webhooks → add a subscription for `payment.updated` with URL `https://sunvillebakerylv.com/api/square/webhook`. Set:
   - `SQUARE_WEBHOOK_URL` — exactly that URL
   - `SQUARE_WEBHOOK_SIGNATURE_KEY` — the subscription's signature key
4. Run `db/003-cake-orders.sql`, then `db/004-cake-order-numbers.sql`, once in Supabase (SQL editor). 004 gives orders sequential numbers (#1001, #1002, ...); run it before deploying code that uses them. Then run `db/005-custom-cake-orders.sql` and `db/007-kitchen-tracking.sql` (in that order; 007 adds the `checking_kitchen` and `hold_expired` statuses and the kitchen asked/sent times, and must run before deploying the Oct 31, 2026 admin app). For notifications, also run `db/008-push-notifications.sql` (see `docs/ADMIN_GUIDE.md` → Notifications), and `db/009-cake-order-events.sql` for the order history (orders still work without it; history just stays empty), then `db/011-refunds.sql` for the Refund button. Set `KITCHEN_PHONE` in Vercel for the kitchen texts.

5. **Apple Pay** (one time, owner): Square Developer Dashboard → your application → **Apple Pay** (Production) → **Add domain** `sunvillebakerylv.com`. Square gives you a verification file; it must be served at `https://sunvillebakerylv.com/.well-known/apple-developer-merchantid-domain-association`, it is in `public/.well-known/` (no file extension; done Oct 31, 2026). If Square ever issues a new file, replace it there and deploy, then press **Verify** in Square. Until then the Apple Pay button simply doesn't show. Google Pay needs no setup.

Until the first four variables are set, `/order-cake` shows "coming soon" with the phone number.

Admin → Cake orders also has **Test order** buttons that run an order through the same steps without the public form (see `docs/ADMIN_GUIDE.md`).

Sandbox test card: 4111 1111 1111 1111, any future date, any CVV, ZIP 94103.
