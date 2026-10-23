'use client'
import { useEffect, useState } from 'react'
import {
  cakeOrderStatusLabels,
  formatPickupDate,
  formatPickupTime,
  formatVegasTime,
  momText,
  orderRef,
  sizeLabel,
  type CakeOrderStatus,
  type StoredCakeOrder,
} from '@/lib/cake-order'
import { adminPost } from '@/lib/admin-api'
import { Button } from './ui/button'

const filters = {
  approval: { label: 'Needs approval', statuses: ['awaiting_approval'] },
  upcoming: { label: 'To make', statuses: ['paid', 'processing'] },
  done: { label: 'Picked up', statuses: ['picked_up'] },
  closed: { label: 'Declined / expired', statuses: ['declined', 'expired', 'failed'] },
} satisfies Record<string, { label: string; statuses: readonly CakeOrderStatus[] }>
type Filter = keyof typeof filters

export function AdminCakeOrders() {
  const [orders, setOrders] = useState<StoredCakeOrder[]>([])
  const [filter, setFilter] = useState<Filter>('approval')
  const [busy, setBusy] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState('')
  const [notice, setNotice] = useState('')
  const request = (body: Record<string, unknown>) => adminPost('/api/admin/cake-orders', body)

  async function run(task: () => Promise<void>) {
    setBusy(true)
    try {
      await task()
      setError('')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  const load = () =>
    run(async () => {
      const list: StoredCakeOrder[] = (await request({ action: 'list' })).orders
      setOrders(list)
      if (!loaded && !list.some(o => o.status === 'awaiting_approval')) setFilter('upcoming')
      setLoaded(true)
    })
  useEffect(() => {
    void load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const sendTest = (scenario: 'paid' | 'approval') =>
    run(async () => {
      setNotice('')
      const r = await request({ action: 'test', scenario })
      setOrders((await request({ action: 'list' })).orders)
      setFilter(r.held ? 'approval' : 'upcoming')
      setNotice(
        `Test order ${r.ref} added below. Emails went to ${r.sentTo} with [TEST] subjects. ` +
          (r.viaSquare ? 'The payment is in the Square sandbox dashboard.' : 'No card was charged.'),
      )
    })
  const act = (
    id: string,
    action: 'approve' | 'decline' | 'picked_up' | 'not_picked_up' | 'delete',
    confirmText?: string,
  ) => {
    if (confirmText && !window.confirm(confirmText)) return
    void run(async () => {
      try {
        await request({ action, id })
      } finally {
        setOrders((await request({ action: 'list' })).orders)
      }
    })
  }
  async function copy(order: StoredCakeOrder) {
    try {
      await navigator.clipboard.writeText(momText(order))
      setCopied(order.id)
      setTimeout(() => setCopied(c => (c === order.id ? '' : c)), 2500)
    } catch {
      setError('Could not copy. Select the text and copy it instead.')
    }
  }

  const counts = Object.fromEntries(
    Object.entries(filters).map(([key, f]) => [
      key,
      orders.filter(o => (f.statuses as readonly string[]).includes(o.status)).length,
    ]),
  )
  // Upcoming pickups first; other lists newest first.
  const shown = orders
    .filter(o => (filters[filter].statuses as readonly string[]).includes(o.status))
    .sort((a, b) =>
      filter === 'upcoming' || filter === 'approval'
        ? (a.pickupDate + a.pickupTime).localeCompare(b.pickupDate + b.pickupTime)
        : b.createdAt.localeCompare(a.createdAt),
    )

  return (
    <section className="space-y-4">
      <h2 className="heading-2">Cake orders</h2>
      <div className="flex flex-wrap gap-2">
        {(Object.keys(filters) as Filter[]).map(key => (
          <Button
            key={key}
            variant={filter === key ? 'default' : 'outline'}
            aria-pressed={filter === key}
            onClick={() => setFilter(key)}
          >
            {filters[key].label} ({counts[key]})
          </Button>
        ))}
        <Button variant="outline" onClick={() => sendTest('paid')} disabled={busy} className="ml-auto">
          Test order (paid)
        </Button>
        <Button variant="outline" onClick={() => sendTest('approval')} disabled={busy}>
          Test order (needs approval)
        </Button>
        <Button variant="outline" onClick={load} disabled={busy}>
          Refresh
        </Button>
      </div>
      <p role="status" className="text-sm text-success empty:hidden">
        {notice}
      </p>
      <p role="alert" className="text-sm text-danger empty:hidden">
        {error}
      </p>
      {loaded && !shown.length && !error && <p>No orders here.</p>}
      <div className="grid gap-4 lg:grid-cols-2">
        {shown.map(o => (
          <article key={o.id} className="min-w-0 space-y-3 rounded-xl border bg-card p-4">
            <div>
              <h3 className="heading-3">
                {o.name} <span className="text-sm font-normal text-muted-foreground">{orderRef(o.id)}</span>
                {o.test && (
                  <span className="ml-2 rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">
                    TEST
                  </span>
                )}
              </h3>
              <p className="text-sm text-muted-foreground">
                {cakeOrderStatusLabels[o.status]} · ${o.price.toFixed(2)} · ordered {formatVegasTime(o.createdAt)}
              </p>
            </div>
            {o.status === 'awaiting_approval' && o.approveBy && (
              <p className="rounded-md border border-amber-300 bg-amber-50 p-2 text-sm text-amber-900">
                {o.approvalReason}. Card held, not charged. Approve by <strong>{formatVegasTime(o.approveBy)}</strong>{' '}
                (Las Vegas) or the hold is released automatically.
              </p>
            )}
            <dl className="space-y-1 break-words text-sm">
              {(
                [
                  ['Pickup', `${formatPickupDate(o.pickupDate)}, ${formatPickupTime(o.pickupTime)}`],
                  ['Cake', `${sizeLabel(o.size)} · ${o.flavor} · ${o.filling}`],
                  ['Writing', o.cakeMessage || 'None'],
                  ['Notes', o.notes || 'None'],
                ] as const
              ).map(([label, value]) => (
                <div key={label} className="grid gap-1 sm:grid-cols-[6rem_1fr]">
                  <dt className="font-semibold">{label}</dt>
                  <dd className="whitespace-pre-wrap">{value}</dd>
                </div>
              ))}
            </dl>
            <p className="flex flex-wrap gap-x-4 text-sm">
              <a
                className="inline-flex min-h-12 items-center underline"
                href={'tel:' + o.phone.replace(/[^+0-9]/g, '')}
              >
                {o.phone}
              </a>
              <a className="inline-flex min-h-12 items-center underline" href={`mailto:${o.email}`}>
                {o.email}
              </a>
            </p>
            <pre lang="zh-Hant" className="whitespace-pre-wrap rounded-md bg-secondary p-3 font-sans text-sm">
              {momText(o)}
            </pre>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => copy(o)}>
                {copied === o.id ? 'Copied!' : 'Copy for Mom'}
              </Button>
              <Button asChild variant="outline" className="sm:hidden">
                <a href={'sms:?&body=' + encodeURIComponent(momText(o))}>Text Mom</a>
              </Button>
              {o.status === 'awaiting_approval' && (
                <>
                  <Button
                    disabled={busy}
                    onClick={() => act(o.id, 'approve', `Approve and charge $${o.price.toFixed(2)}?`)}
                  >
                    Approve &amp; charge
                  </Button>
                  <Button
                    variant="outline"
                    disabled={busy}
                    onClick={() =>
                      act(o.id, 'decline', 'Decline this order? The hold is released and the customer is emailed.')
                    }
                  >
                    Decline
                  </Button>
                </>
              )}
              {o.status === 'paid' && (
                <Button variant="outline" disabled={busy} onClick={() => act(o.id, 'picked_up')}>
                  Mark picked up
                </Button>
              )}
              {o.status === 'picked_up' && (
                <Button variant="outline" disabled={busy} onClick={() => act(o.id, 'not_picked_up')}>
                  Undo picked up
                </Button>
              )}
              {o.test && (
                <Button variant="outline" disabled={busy} onClick={() => act(o.id, 'delete')}>
                  Delete test order
                </Button>
              )}
            </div>
          </article>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">
        Refunds and changes to paid orders are done in the Square Dashboard (Transactions), using the order code above.
      </p>
    </section>
  )
}
