# Online cake orders (/order-cake)

Customers order one of the everyday chiffon cakes, pay by card through Square, and pick it up at the bakery. Custom designs, tiers and delivery stay on `/custom-cakes` (inquiry, no payment).

## What customers can order

- Sizes: 6", 8", 10", 12" round, 1/4 sheet, 1/2 sheet.
- Any listed flavor and filling. The price comes from the pricing sheet column for the filling (`lib/cake-catalog.ts`): Custard; Mixed Fruit / Strawberry / Banana / Strawberry Banana; Mango / Taro; Coconut / Durian.
- Optional writing on the cake (60 characters) and notes.
- Pickup only. No tax is added.

## Pickup times and approval (`lib/cake-order.ts`)

Pickup slots are every 30 minutes until 30 minutes before closing (7:30 PM; Wednesday 2:30 PM), up to 60 days ahead, Las Vegas time.

| Pickup | 8" round, 1/4 sheet | 6", 10", 12" round, 1/2 sheet |
|---|---|---|
| 2+ days ahead | Charged now | Charged now |
| Next day (from 9:30 AM) | Charged now | Card held, needs approval |
| Same day (from 10 AM, 3+ hours' notice) | Card held, needs approval | Card held, needs approval |

"Card held" means Square authorizes the amount but doesn't charge it. Approve by:

- Same-day: 1 hour after the order.
- Next-day: 12 hours after the order or 3 hours before pickup, whichever is earlier (at least 1 hour).

If nobody approves in time, Square releases the hold, the order shows as "Not approved in time", and the customer is emailed. This happens through the Square webhook, and also whenever admin → Cake orders is opened.

## Emails

- New order: to the bakery inbox (subject starts with `APPROVE BY …` when it needs approval, with the Chinese text for Mom) and to the customer.
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
4. Run `db/003-cake-orders.sql` once in Supabase (SQL editor).

Until the first four variables are set, `/order-cake` shows "coming soon" with the phone number.

Admin → Cake orders also has **Test order** buttons that run an order through the same steps without the public form (see `docs/ADMIN_GUIDE.md`).

Sandbox test card: 4111 1111 1111 1111, any future date, any CVV, ZIP 94103.
