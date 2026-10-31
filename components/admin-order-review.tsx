'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { ChevronLeft } from 'lucide-react'
import {
  askKitchenText,
  formatPickupDate,
  formatPickupTime,
  formatVegasTime,
  isDelivery,
  kitchenSms,
  kitchenText,
  orderRef,
  sizeLabel,
  type StoredCakeOrder,
} from '@/lib/cake-order'
import { adminPost, SignedOutError } from '@/lib/admin-api'
import { isUrgent } from '@/lib/admin-order-board'
import { useAdmin } from '@/components/admin-shell'
import { AdminPageHeader } from './admin-page-header'
import { OrderTags, StatusBadge } from './admin-cake-orders'
import { Button } from './ui/button'

// One cake order (opened from a notification or the list): its details, the answer deadline and the next step:
// Approve & charge / Ask kitchen / Decline while the card is held, then Send to kitchen once paid.

type OrderEvent = { at: string; action: string; from?: string; to?: string; detail: string }
type Loaded = { order: StoredCakeOrder; events: OrderEvent[]; kitchenPhone: string }

const eventLabels: Record<string, string> = {
  placed: 'Order placed, card held',
  payment_failed: 'Card declined',
  ask_kitchen: 'Asked kitchen',
  approved: 'Approved, card charged',
  declined: 'Declined, customer emailed',
  declined_no_email: 'Declined, no email',
  expired: 'Not answered in time, cancelled',
  hold_expired: 'Card hold ended',
  pay_link_sent: 'Pay link emailed',
  kitchen_sent: 'Sent to kitchen',
  paid: 'Paid',
  picked_up: 'Picked up',
  not_picked_up: 'Undo picked up',
  paid_offline: 'Paid in store / by phone',
  awaiting_payment: 'Pay link reopened',
  processing: 'Paying',
}
const money = (n: number) => '$' + n.toFixed(2)
/** "42 min", "3 h 5 min", "2 days" */
function timeLeft(ms: number) {
  const min = Math.max(0, Math.round(ms / 60_000))
  if (min < 1) return 'less than a minute'
  if (min < 60) return `${min} min`
  if (min < 48 * 60) return `${Math.floor(min / 60)} h${min % 60 ? ` ${min % 60} min` : ''}`
  return `${Math.round(min / 1440)} days`
}

export function AdminOrderReview({ id }: { id: string }) {
  const { signedOut } = useAdmin()
  const [data, setData] = useState<Loaded | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [declining, setDeclining] = useState(false)
  const [notify, setNotify] = useState(true)
  const [copied, setCopied] = useState(false)
  const [now, setNow] = useState(() => Date.now())

  const request = useCallback(
    async (body: Record<string, unknown>) => {
      try {
        return await adminPost('/api/admin/cake-orders', { id, ...body })
      } catch (e) {
        if (e instanceof SignedOutError) signedOut()
        throw e
      }
    },
    [id, signedOut],
  )
  const run = useCallback(async (task: () => Promise<void>) => {
    setBusy(true)
    setError('')
    try {
      await task()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }, [])
  const load = useCallback(
    () =>
      run(async () => {
        setNotice('')
        setData(await request({ action: 'get' }))
      }),
    [run, request],
  )
  useEffect(() => {
    void load()
  }, [load])
  // Keeps "time left" current.
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(timer)
  }, [])

  const act = (action: string, extra: Record<string, unknown> = {}, done?: (r: Record<string, unknown>) => string) =>
    run(async () => {
      setNotice('')
      try {
        const r = await request({ action, ...extra })
        if (done) setNotice(done(r))
      } finally {
        setData(await request({ action: 'get' }).catch(() => data))
      }
    })

  const order = data?.order
  const header = (
    <>
      <Link
        href="/admin/orders"
        className="-ml-1 inline-flex items-center gap-0.5 text-sm font-medium text-primary hover:underline"
      >
        <ChevronLeft aria-hidden="true" className="size-4" />
        Orders
      </Link>
      <AdminPageHeader title={order ? `Order ${orderRef(order)}` : 'Order'} onRefresh={load} busy={busy} />
    </>
  )
  const messages = (
    <>
      <p role="status" className="text-sm text-success empty:hidden">
        {notice}
      </p>
      <p role="alert" className="text-sm text-danger empty:hidden">
        {error}
      </p>
    </>
  )
  if (!order)
    return (
      <section className="space-y-4">
        {header}
        {messages}
      </section>
    )

  const phone = data.kitchenPhone
  const waiting = order.status === 'awaiting_approval' || order.status === 'checking_kitchen'
  const paid = order.status === 'paid' || order.status === 'deposit_paid'
  const urgent = (waiting || order.status === 'hold_expired') && isUrgent(order, new Date(now))
  const deadline = waiting && order.approveBy ? Date.parse(order.approveBy) : null
  const approve = () => {
    const text =
      order.status === 'hold_expired'
        ? `Email ${order.name} a link to pay ${money(order.price)}?`
        : `Charge ${money(order.price)} to ${order.name}'s card?`
    if (!window.confirm(text)) return
    void act('approve', {}, r =>
      r.status === 'awaiting_payment'
        ? r.emailed
          ? `Pay link emailed to ${order.test ? 'the bakery inbox (test)' : order.email}.`
          : 'The pay link email could not be sent. Use Resend pay link in the list.'
        : 'Approved and charged. The customer has been emailed.',
    )
  }
  async function copyKitchen() {
    try {
      await navigator.clipboard.writeText(kitchenText(order!))
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      setError('Could not copy. Select the text and copy it instead.')
    }
  }

  const rows: [string, React.ReactNode][] = [
    [
      isDelivery(order) ? 'Delivery' : 'Pickup',
      `${formatPickupDate(order.pickupDate)}, ${formatPickupTime(order.pickupTime)}${isDelivery(order) ? ` to ${order.deliveryAddress} (${order.fulfillment})` : ''}`,
    ],
    ['Cake', `${sizeLabel(order.size)} · ${order.flavor} · ${order.filling}`],
    ['Writing', order.cakeMessage || 'None'],
    ...(order.notes ? ([['Notes', order.notes]] as [string, string][]) : []),
    [
      'Price',
      order.deposit
        ? `${money(order.price)} (deposit ${money(order.deposit)}, ${money(order.price - order.deposit)} due at ${isDelivery(order) ? 'delivery' : 'pickup'})`
        : money(order.price),
    ],
    ['Customer', order.name],
    [
      'Phone',
      <a key="tel" href={'tel:' + order.phone.replace(/[^+0-9]/g, '')} className="text-primary underline">
        {order.phone}
      </a>,
    ],
    [
      'Email',
      <a key="mail" href={'mailto:' + order.email} className="break-all text-primary underline">
        {order.email}
      </a>,
    ],
    ['Ordered', formatVegasTime(order.createdAt)],
  ]

  return (
    <section className="space-y-4">
      {header}
      <div className="flex flex-wrap items-center gap-2">
        {urgent && <span className="rounded bg-red-600 px-1.5 py-0.5 text-xs font-bold text-white">URGENT</span>}
        <StatusBadge o={order} />
        <OrderTags o={order} />
      </div>

      {deadline !== null && (
        <div
          className={
            'rounded-xl border p-3 text-sm ' +
            (deadline - now < 30 * 60_000
              ? 'border-red-300 bg-red-50 text-red-900'
              : 'border-amber-300 bg-amber-50 text-amber-900')
          }
        >
          <p className="font-semibold">
            Answer by {formatVegasTime(order.approveBy!)}
            {deadline > now ? ` · ${timeLeft(deadline - now)} left` : ' · time is up'}
          </p>
          <p>
            {order.shortHold === false
              ? 'Card held until then, not charged.'
              : 'Card held, not charged. Cancelled automatically after this time.'}
          </p>
          {order.status === 'checking_kitchen' && order.kitchenAskedAt && (
            <p>Kitchen asked {formatVegasTime(order.kitchenAskedAt)}.</p>
          )}
        </div>
      )}
      {order.status === 'hold_expired' && (
        <p className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-900">
          The card hold ended before the order was approved. Approving emails {order.name} a pay link.
        </p>
      )}
      {order.status === 'awaiting_payment' && order.payBy && (
        <p className="rounded-xl border bg-card p-3 text-sm">Pay link valid until {formatVegasTime(order.payBy)}.</p>
      )}

      {messages}

      {/* Next step */}
      {(waiting || order.status === 'hold_expired') && !declining && (
        <div className="grid gap-2 sm:flex sm:flex-wrap">
          <Button size="lg" disabled={busy} onClick={approve}>
            {order.status === 'hold_expired' ? 'Approve & send pay link' : `Approve & charge ${money(order.price)}`}
          </Button>
          {order.status === 'awaiting_approval' && (
            <Button asChild size="lg" variant="outline">
              <a
                href={kitchenSms(phone, askKitchenText(order))}
                aria-disabled={busy}
                onClick={() => void act('ask_kitchen')}
              >
                Ask kitchen
              </a>
            </Button>
          )}
          <Button size="lg" variant="outline" disabled={busy} onClick={() => setDeclining(true)}>
            Decline
          </Button>
        </div>
      )}
      {declining && (
        <div className="space-y-3 rounded-xl border border-red-300 bg-card p-3">
          <p className="font-semibold">
            Decline order {orderRef(order)}?{order.status !== 'hold_expired' && ' The card hold is released.'}
          </p>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="size-5 accent-primary"
              checked={notify}
              onChange={e => setNotify(e.target.checked)}
            />
            Email {order.name} that we can&apos;t make it
          </label>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="destructive"
              disabled={busy}
              onClick={() =>
                void act('decline', { notify }, () =>
                  notify ? 'Declined. The customer has been emailed.' : 'Declined.',
                ).then(() => setDeclining(false))
              }
            >
              Decline order
            </Button>
            <Button variant="outline" disabled={busy} onClick={() => setDeclining(false)}>
              Keep it
            </Button>
          </div>
        </div>
      )}
      {paid && (
        <div className="space-y-2">
          {order.kitchenSentAt && (
            <p className="text-sm text-muted-foreground">Sent to kitchen {formatVegasTime(order.kitchenSentAt)}.</p>
          )}
          <div className="grid gap-2 sm:flex sm:flex-wrap">
            <Button asChild size="lg" variant={order.kitchenSentAt ? 'outline' : 'default'}>
              <a href={kitchenSms(phone, kitchenText(order))} onClick={() => void act('kitchen_sent')}>
                {order.kitchenSentAt ? 'Send to kitchen again' : 'Send to kitchen'}
              </a>
            </Button>
            {!order.kitchenSentAt && (
              <Button size="lg" variant="outline" disabled={busy} onClick={() => void act('kitchen_sent')}>
                Mark sent
              </Button>
            )}
            <Button size="lg" variant="outline" disabled={busy} onClick={() => void act('picked_up')}>
              Mark picked up
            </Button>
          </div>
        </div>
      )}
      {order.status === 'awaiting_payment' && (
        <Button
          variant="outline"
          disabled={busy}
          onClick={() => {
            if (window.confirm(`Email ${order.email} a new pay link (valid 3 days)?`))
              void act('resend_link', {}, () => 'Pay link sent again.')
          }}
        >
          Resend pay link
        </Button>
      )}

      <dl className="divide-y rounded-xl border bg-card px-3 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="grid grid-cols-[6rem_1fr] items-baseline gap-2 py-2">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="whitespace-pre-wrap">{value}</dd>
          </div>
        ))}
      </dl>

      <details className="rounded-xl border bg-card p-3 text-sm">
        <summary className="cursor-pointer font-semibold">Kitchen text (Chinese)</summary>
        <pre lang="zh-Hant" className="mt-2 whitespace-pre-wrap font-sans">
          {kitchenText(order)}
        </pre>
        <Button size="sm" variant="outline" className="mt-2" onClick={() => void copyKitchen()}>
          {copied ? 'Copied!' : 'Copy'}
        </Button>
      </details>

      {data.events.length > 0 && (
        <section aria-labelledby="order-history" className="space-y-2">
          <h3 id="order-history" className="heading-3">
            History
          </h3>
          <ol className="space-y-1 text-sm">
            {data.events.map((e, i) => (
              <li key={i} className="flex gap-3">
                <span className="w-32 shrink-0 text-muted-foreground">{formatVegasTime(e.at)}</span>
                <span>{eventLabels[e.action] ?? e.action}</span>
              </li>
            ))}
          </ol>
        </section>
      )}
    </section>
  )
}
