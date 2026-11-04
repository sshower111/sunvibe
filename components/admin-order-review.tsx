'use client'

import { useCallback, useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import {
  amountDueNow,
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
import { isPrimaryAction, orderActionIds, type OrderActionId } from '@/lib/admin-order-actions'
import { useAdmin } from '@/components/admin-shell'
import { AdminActionMenu, type MenuItem } from './admin-action-menu'
import { AdminSidePanel, PanelDetails } from './admin-side-panel'
import { OrderTags, StatusBadge } from './admin-cake-orders'
import { Button } from './ui/button'

// One cake order in the side panel: its details, the answer deadline and the next step:
// Approve & charge / Ask kitchen / Decline while the card is held, then Send to kitchen once paid.
// Less-used actions (copy, call, email, paid in store, undo, delete) are in the "⋯" menu.

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
  delivered: 'Delivered',
  not_picked_up: 'Undo picked up',
  paid_offline: 'Paid in store / by phone',
  refunded: 'Refunded, customer emailed',
  refunded_no_email: 'Refunded, no email',
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

export function AdminOrderPanel({
  id,
  onClose,
  onChange,
  onDeleted,
}: {
  id: string
  onClose: () => void
  /** Something changed: the list reloads. */
  onChange: () => void
  onDeleted: () => void
}) {
  const { signedOut } = useAdmin()
  const [data, setData] = useState<Loaded | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [declining, setDeclining] = useState(false)
  const [refunding, setRefunding] = useState(false)
  const [notify, setNotify] = useState(true)
  const [copied, setCopied] = useState('')
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
        onChange()
      }
    })
  async function copy(key: string, text: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(key)
      setTimeout(() => setCopied(c => (c === key ? '' : c)), 2500)
    } catch {
      setError('Could not copy.')
    }
  }

  const order = data?.order
  const refresh = (
    <button
      type="button"
      aria-label="Refresh order"
      onClick={() => void load()}
      disabled={busy}
      className="inline-flex size-10 shrink-0 items-center justify-center rounded-full text-foreground hover:bg-secondary active:bg-muted disabled:opacity-60"
    >
      <RefreshCw aria-hidden="true" className={'size-4 ' + (busy ? 'animate-spin' : '')} />
    </button>
  )
  const messages = (
    <>
      <p role="status" className="text-success empty:hidden">
        {notice}
      </p>
      <p role="alert" className="text-danger empty:hidden">
        {error}
      </p>
    </>
  )
  if (!order)
    return (
      <AdminSidePanel title="Order" actions={refresh} onClose={onClose}>
        {messages}
        {!error && <p className="text-muted-foreground">Loading…</p>}
      </AdminSidePanel>
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
          : 'The pay link email could not be sent. Use Resend pay link.'
        : 'Approved and charged. The customer has been emailed.',
    )
  }
  const resendLink = () => {
    if (window.confirm(`Email ${order.email} a new pay link (valid 3 days)?`))
      void act('resend_link', {}, () => 'Pay link sent again.')
  }

  // The "⋯" menu: every action for this status that isn't already a button below.
  const menuItem = (actionId: OrderActionId): MenuItem | null => {
    switch (actionId) {
      case 'review':
      case 'picked_up':
        return null
      case 'resend_link':
        return isPrimaryAction(order, actionId) ? null : { label: 'Resend pay link', onSelect: resendLink }
      case 'copy_link':
        return {
          label: copied === 'link' ? 'Copied!' : 'Copy pay link',
          onSelect: () => void copy('link', `${window.location.origin}/pay/${order.id}`),
        }
      case 'paid_offline':
        return {
          label: 'Paid in store / by phone',
          onSelect: () => {
            if (
              window.confirm(
                `Did ${order.name} pay another way (phone or in store)? The order moves to To make. No email is sent.`,
              )
            )
              void act('paid_offline')
          },
        }
      case 'text_kitchen':
        return paid ? null : { label: 'Text kitchen', phoneOnly: true, href: kitchenSms(phone, kitchenText(order)) }
      case 'copy_kitchen':
        return {
          label: copied === 'kitchen' ? 'Copied!' : 'Copy for kitchen',
          onSelect: () => void copy('kitchen', kitchenText(order)),
        }
      case 'call':
        return { label: 'Call ' + order.phone, href: 'tel:' + order.phone.replace(/[^+0-9]/g, '') }
      case 'email':
        return { label: 'Email customer', href: 'mailto:' + order.email }
      case 'not_picked_up':
        return { label: 'Undo picked up', onSelect: () => void act('not_picked_up') }
      case 'refund':
        return {
          label: 'Refund',
          danger: true,
          onSelect: () => {
            setNotify(true)
            setRefunding(true)
          },
        }
      case 'delete':
        return {
          label: order.test ? 'Delete test order' : 'Delete order',
          danger: true,
          onSelect: () => {
            const paid = ['paid', 'deposit_paid', 'picked_up'].includes(order.status)
            const question = order.test
              ? 'Delete this test order and its Discord card?'
              : `Delete order ${orderRef(order)} for ${order.name}? It is removed from admin for good, with its history and its Discord card.` +
                (paid ? ' Nothing is refunded: refund it first if the customer should get their money back.' : '') +
                ' The customer is not emailed.'
            if (!window.confirm(question)) return
            void run(async () => {
              const r = await request({ action: 'delete' })
              if (!r.discordDeleted)
                window.alert('Order deleted, but its Discord card could not be removed. Delete it in Discord.')
              onDeleted()
            })
          },
        }
    }
  }
  const menu = orderActionIds(order)
    .map(menuItem)
    .filter((item): item is MenuItem => item !== null)

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
    <AdminSidePanel
      title={`Order ${orderRef(order)}`}
      onClose={onClose}
      actions={
        <>
          {refresh}
          {menu.length > 0 && <AdminActionMenu label={`More actions for order ${orderRef(order)}`} items={menu} />}
        </>
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        {urgent && <span className="rounded bg-red-600 px-1.5 py-0.5 text-xs font-bold text-white">URGENT</span>}
        <StatusBadge o={order} />
        <OrderTags o={order} />
      </div>

      {deadline !== null && (
        <div
          className={
            'rounded-lg border p-3 ' +
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
        <p className="rounded-lg border border-red-300 bg-red-50 p-3 text-red-900">
          The card hold ended before the order was approved. Approving emails {order.name} a pay link.
        </p>
      )}
      {order.status === 'awaiting_payment' && order.payBy && (
        <p className="text-muted-foreground">Pay link valid until {formatVegasTime(order.payBy)}.</p>
      )}
      {order.kitchenSentAt && paid && (
        <p className="text-muted-foreground">Sent to kitchen {formatVegasTime(order.kitchenSentAt)}.</p>
      )}

      {messages}

      {/* Next step */}
      {(waiting || order.status === 'hold_expired') && !declining && (
        <div className="grid gap-2 sm:flex sm:flex-wrap">
          <Button disabled={busy} onClick={approve}>
            {order.status === 'hold_expired' ? 'Approve & send pay link' : `Approve & charge ${money(order.price)}`}
          </Button>
          {order.status === 'awaiting_approval' && (
            <Button asChild variant="outline">
              <a
                href={kitchenSms(phone, askKitchenText(order))}
                aria-disabled={busy}
                onClick={() => void act('ask_kitchen')}
              >
                Ask kitchen
              </a>
            </Button>
          )}
          <Button variant="outline" disabled={busy} onClick={() => setDeclining(true)}>
            Decline
          </Button>
        </div>
      )}
      {declining && (
        <div className="space-y-3 rounded-lg border border-red-300 p-3">
          <p className="font-semibold">
            Decline order {orderRef(order)}?{order.status !== 'hold_expired' && ' The card hold is released.'}
          </p>
          <label className="flex items-center gap-2">
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
      {refunding && (
        <div className="space-y-3 rounded-lg border border-red-300 p-3">
          <p className="font-semibold">
            Refund {money(amountDueNow(order))} to {order.name}&apos;s card for order {orderRef(order)}?
          </p>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              className="size-5 accent-primary"
              checked={notify}
              onChange={e => setNotify(e.target.checked)}
            />
            Email {order.name} about the refund
          </label>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="destructive"
              disabled={busy}
              onClick={() =>
                void act('refund', { notify }, () =>
                  notify ? 'Refunded. The customer has been emailed.' : 'Refunded.',
                ).then(() => setRefunding(false))
              }
            >
              Refund {money(amountDueNow(order))}
            </Button>
            <Button variant="outline" disabled={busy} onClick={() => setRefunding(false)}>
              Keep it
            </Button>
          </div>
        </div>
      )}
      {paid && !refunding && (
        <div className="grid gap-2 sm:flex sm:flex-wrap">
          <Button asChild variant={order.kitchenSentAt ? 'outline' : 'default'}>
            <a href={kitchenSms(phone, kitchenText(order))} onClick={() => void act('kitchen_sent')}>
              {order.kitchenSentAt ? 'Send to kitchen again' : 'Send to kitchen'}
            </a>
          </Button>
          {!order.kitchenSentAt && (
            <Button
              variant="outline"
              className="hidden sm:inline-flex"
              disabled={busy}
              onClick={() => void act('kitchen_sent')}
            >
              Mark sent
            </Button>
          )}
          <Button variant="outline" disabled={busy} onClick={() => void act('picked_up')}>
            Mark picked up
          </Button>
        </div>
      )}
      {isPrimaryAction(order, 'resend_link') && (
        <div>
          <Button variant="outline" disabled={busy} onClick={resendLink}>
            Resend pay link
          </Button>
        </div>
      )}

      <PanelDetails rows={rows} />

      <details className="rounded-lg border p-3">
        <summary className="cursor-pointer font-semibold">Kitchen text (Chinese)</summary>
        <pre lang="zh-Hant" className="mt-2 whitespace-pre-wrap font-sans">
          {kitchenText(order)}
        </pre>
        <Button size="sm" variant="outline" className="mt-2" onClick={() => void copy('kitchen', kitchenText(order))}>
          {copied === 'kitchen' ? 'Copied!' : 'Copy'}
        </Button>
      </details>

      {data.events.length > 0 && (
        <section aria-labelledby="order-history" className="space-y-2">
          <h3 id="order-history" className="heading-3">
            History
          </h3>
          <ol className="space-y-1">
            {data.events.map((e, i) => (
              <li key={i} className="flex gap-3">
                <span className="w-32 shrink-0 text-muted-foreground">{formatVegasTime(e.at)}</span>
                <span>{eventLabels[e.action] ?? e.action}</span>
              </li>
            ))}
          </ol>
        </section>
      )}
      {paid && (
        <p className="text-muted-foreground">
          Refunds and changes: Square Dashboard → Transactions, order code {orderRef(order)}.
        </p>
      )}
    </AdminSidePanel>
  )
}
