# Online cake orders (/order-cake)

Customers order one of the everyday chiffon cakes, pay by card through Square, and pick it up at the bakery. Custom designs, tiers and delivery go through the same order but end as a quote request (no payment).

## What customers can order

- Sizes: 6", 8", 10", 12" round, 1/4 sheet, 1/2 sheet, full sheet. Orders go through the shared order (`components/cake-order-flow.tsx`), which suggests a size from the guest count and only takes payment when the order qualifies; otherwise it sends a custom cake inquiry.
- Any listed flavor and filling. The price comes from the pricing sheet column for the filling (`lib/cake-catalog.ts`): Custard; Mixed Fruit / Strawberry / Banana; Mango / Taro; Coconut / Durian.
- The design must be the "Classic look" (cream finish, piped border, writing). Only this kind of order can be picked up the same day; the design step tells the customer when their cake qualifies.
- Optional writing on the cake (60 characters) and notes.
- Pickup only. No tax is added.

## Apple Pay and Google Pay

The payment step (and the custom cake pay link, `/pay/<id>`) shows **Apple Pay** (Safari on iPhone, iPad and Mac) and **Google Pay** (Chrome, Android) buttons above the card form, only on devices that support them (`components/square-card.tsx`). They charge or hold the card exactly like a typed card, including approval holds. Samsung Pay isn't offered: Square doesn't support it online. Apple Pay needs the domain set up once (Setup step 5). The site's security policy allows `pay.google.com` and `google.com` for Google Pay (`middleware.ts`).

## Pickup times and approval (`lib/cake-order.ts`)

Pickup slots are every 30 minutes until 30 minutes before closing (7:30 PM; Wednesday 2:30 PM), up to 60 days ahead, Las Vegas time.

| Pickup | 8" round, 1/4 sheet | 6", 10", 12" round, 1/2 sheet, full sheet |
|---|---|---|
| 2+ days ahead | Charged now | Charged now |
| Next day (from 9:30 AM) | Charged now | Card held, needs approval |
| Same day (from 10 AM, 3+ hours' notice) | Card held, needs approval | Card held, needs approval |

"Card held" means Square authorizes the amount but doesn't charge it. Approve by:

- Same-day: 1 hour after the order.
- Next-day: 12 hours after the order or 3 hours before pickup, whichever is earlier (at least 1 hour).

If nobody approves in time, Square releases the hold, the order shows as "Not approved in time", and the customer is emailed. If the customer then pays another way (Square terminal, cash, by phone), **Paid in store / by phone** on the order moves it to To make; no email is sent. The same button works on declined orders and expired pay links. This happens through the Square webhook, and also whenever admin → Cake orders is opened.

## Where customers find it

- Top menu and footer: **Order a Cake** (next to **Custom Cake Inquiry**).
- Home page hero: **Order a cake** is the main button.
- Custom cakes page: a "Need a cake sooner?" box under the red band.
- Menu page, Custom Cakes category: **Order an everyday cake** button.

## Failed payments

The order is saved just before the card is charged, so a charge always has an order. If the payment fails, the order is marked "Payment failed" (Declined / expired list in admin) and deleted after 2 days.

## Custom cake orders (pay links)

Made in admin → Cake inquiries → **Create order & send pay link** (`lib/custom-cake-orders.ts`, `components/admin-custom-order-form.tsx`).

- The order stores the agreed cake, pickup or delivery (with address), design notes, total price and an optional deposit.
- The customer is emailed a link to `/pay/<order id>` (the random ID is the link's secret; the page isn't indexed). It works for 3 days; after that the order shows "Pay link expired" until **Resend link** gives it 3 more days.
- Paying charges the full price or the deposit straight away (Square Online API rate). Status: `awaiting_payment` → `paid` or `deposit_paid`; the inquiry becomes Confirmed & paid. Receipt to the customer, notice (with the Chinese copy for the kitchen) to the bakery.
- Test inquiries make test orders: emails go to the bakery inbox, and on the live site the pay page has a no-card test button.
- Needs `db/005-custom-cake-orders.sql` (adds the two statuses).

## Emails

- New order: to the bakery inbox (subject starts with `APPROVE BY …` when it needs approval, with the Chinese copy for the kitchen) and to the customer.
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
4. Run `db/003-cake-orders.sql`, then `db/004-cake-order-numbers.sql`, once in Supabase (SQL editor). 004 gives orders sequential numbers (#1001, #1002, ...); run it before deploying code that uses them.

5. **Apple Pay** (one time, owner): Square Developer Dashboard → your application → **Apple Pay** (Production) → **Add domain** `sunvillebakerylv.com`. Square gives you a verification file; it must be served at `https://sunvillebakerylv.com/.well-known/apple-developer-merchantid-domain-association`, so put it in `public/.well-known/` (no file extension) and deploy, then press **Verify** in Square. Until then the Apple Pay button simply doesn't show. Google Pay needs no setup.

Until the first four variables are set, `/order-cake` shows "coming soon" with the phone number.

Admin → Cake orders also has **Test order** buttons that run an order through the same steps without the public form (see `docs/ADMIN_GUIDE.md`).

Sandbox test card: 4111 1111 1111 1111, any future date, any CVV, ZIP 94103.
