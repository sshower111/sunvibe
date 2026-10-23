import type { Metadata } from 'next'
import { SITE } from '@/lib/site-info'
import { squareClientConfig } from '@/lib/square'
import { getCakeOrder } from '@/lib/cake-orders-store'
import { canPay, payWithoutCard } from '@/lib/custom-cake-orders'
import {
  amountDueNow,
  formatPickupDate,
  formatPickupTime,
  formatVegasTime,
  isDelivery,
  orderRef,
  sizeLabel,
} from '@/lib/cake-order'
import { Navigation } from '@/components/navigation'
import { Footer } from '@/components/footer'
import { PageBand } from '@/components/page-band'
import { PayForm } from '@/components/pay-form'
// Strict nonce CSP (middleware.ts) requires rendering per request.
export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Pay for your cake', robots: { index: false, follow: false } }

const money = (n: number) => '$' + n.toFixed(2)

export default async function PayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const order = /^[0-9a-f-]{36}$/i.test(id) ? await getCakeOrder(id).catch(() => null) : null
  const square = squareClientConfig()
  const custom = order?.kind === 'custom' ? order : null
  const paid = custom && ['paid', 'deposit_paid', 'picked_up'].includes(custom.status)
  const open = canPay(custom)
  const due = custom ? amountDueNow(custom) : 0
  const call = (
    <a href={SITE.phoneHref} className="font-semibold text-primary underline">
      call {SITE.phone}
    </a>
  )
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main id="main-content" tabIndex={-1}>
        <PageBand id="pay-heading" title={custom ? `Your custom cake ${orderRef(custom)}` : 'Payment link'}>
          {custom && <p>Thank you, {custom.name}! Please check the details and pay below.</p>}
        </PageBand>
        <section className="site-container section-space">
          <div className="max-w-2xl space-y-6">
            {!custom ? (
              <p>This payment link isn't valid. Please check the link in your email, or {call}.</p>
            ) : (
              <>
                <dl className="divide-y rounded-xl border bg-card card-pad text-sm">
                  {(
                    [
                      ['Cake', `${sizeLabel(custom.size)} · ${custom.flavor} cake · ${custom.filling} filling`],
                      ['Writing on cake', custom.cakeMessage || 'None'],
                      isDelivery(custom)
                        ? [
                            'Delivery',
                            `${formatPickupDate(custom.pickupDate)}, ${formatPickupTime(custom.pickupTime)} to ${custom.deliveryAddress}`,
                          ]
                        : [
                            'Pickup',
                            `${formatPickupDate(custom.pickupDate)}, ${formatPickupTime(custom.pickupTime)} at ${SITE.address}`,
                          ],
                      ...(custom.notes ? [['Design notes', custom.notes]] : []),
                      ['Total', money(custom.price)],
                      ...(custom.deposit
                        ? [
                            ['Deposit due now', money(custom.deposit)],
                            [
                              `Balance due at ${isDelivery(custom) ? 'delivery' : 'pickup'}`,
                              money(custom.price - custom.deposit),
                            ],
                          ]
                        : []),
                    ] as [string, string][]
                  ).map(([label, value]) => (
                    <div key={label} className="grid gap-1 py-2 sm:grid-cols-[10rem_1fr]">
                      <dt className="font-semibold">{label}</dt>
                      <dd className="whitespace-pre-wrap">{value}</dd>
                    </div>
                  ))}
                </dl>
                {paid ? (
                  <p className="rounded-md border border-success/25 bg-success-tint p-4 font-medium text-success">
                    Paid — thank you! Your cake is booked.
                  </p>
                ) : !open ? (
                  <p>This payment link has expired. Reply to our email or {call} and we'll send you a new one.</p>
                ) : !square ? (
                  <p>Online payment is unavailable right now. Please {call}.</p>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Please pay by {formatVegasTime(custom.payBy!)} (Las Vegas time). Need a change first? Reply to our
                      email or {call}.
                    </p>
                    <PayForm
                      id={custom.id}
                      amount={due}
                      contact={{ name: custom.name, email: custom.email, phone: custom.phone }}
                      square={square}
                      noCard={payWithoutCard(custom)}
                    />
                  </>
                )}
              </>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
