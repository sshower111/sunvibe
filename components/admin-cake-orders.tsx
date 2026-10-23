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
import { NativeSelect } from './ui/select'

const filters = {
  approval: { label: 'Needs approval', statuses: ['awaiting_approval'] },
  upcoming: { label: 'To make', statuses: ['paid', 'processing'] },
  done: { label: 'Picked up', statuses: ['picked_up'] },
  closed: { label: 'Declined / expired', statuses: ['declined', 'expired', 'failed'] },
} satisfies Record<string, { label: string; statuses: readonly CakeOrderStatus[] }>
type Filter = keyof typeof filters
type SortKey = 'created' | 'pickup'

export function AdminCakeOrders() {
  const [orders, setOrders] = useState<StoredCakeOrder[]>([])
  const [filter, setFilter] = useState<Filter | 'all'>('all')
  const [sort, setSort] = useState<{ by: SortKey; asc: boolean }>({ by: 'pickup', asc: true })
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
      setFilter('all')
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
  const pickupKey = (o: StoredCakeOrder) => o.pickupDate + o.pickupTime
  const shown = orders
    .filter(o => filter === 'all' || (filters[filter].statuses as readonly string[]).includes(o.status))
    .sort((a, b) => {
      const diff =
        sort.by === 'pickup' ? pickupKey(a).localeCompare(pickupKey(b)) : a.createdAt.localeCompare(b.createdAt)
      return sort.asc ? diff : -diff
    })
  const sortBy = (by: SortKey) => setSort(s => (s.by === by ? { by, asc: !s.asc } : { by, asc: by === 'pickup' }))
  const sortHeader = (by: SortKey, label: string) => (
    <th scope="col" className="px-3 py-2" aria-sort={sort.by === by ? (sort.asc ? 'ascending' : 'descending') : 'none'}>
      <button type="button" className="font-semibold underline-offset-2 hover:underline" onClick={() => sortBy(by)}>
        {label} {sort.by === by ? (sort.asc ? '▲' : '▼') : ''}
      </button>
    </th>
  )

  return (
    <section className="space-y-4">
      <h2 className="heading-2">Cake orders</h2>
      <div className="flex flex-wrap items-end gap-2">
        <label className="grid gap-1 text-sm font-semibold">
          Status
          <NativeSelect value={filter} onChange={e => setFilter(e.target.value as Filter | 'all')} className="w-56">
            <option value="all">All ({orders.length})</option>
            {(Object.keys(filters) as Filter[]).map(key => (
              <option key={key} value={key}>
                {filters[key].label} ({counts[key]})
              </option>
            ))}
          </NativeSelect>
        </label>
        <Button variant="outline" onClick={load} disabled={busy}>
          Refresh
        </Button>
        <Button variant="outline" onClick={() => sendTest('paid')} disabled={busy} className="ml-auto">
          Test order (paid)
        </Button>
        <Button variant="outline" onClick={() => sendTest('approval')} disabled={busy}>
          Test order (needs approval)
        </Button>
      </div>
      <p role="status" className="text-sm text-success empty:hidden">
        {notice}
      </p>
      <p role="alert" className="text-sm text-danger empty:hidden">
        {error}
      </p>
      {loaded && !shown.length && !error && <p>No orders here.</p>}
      {shown.length > 0 && (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-secondary">
              <tr className="whitespace-nowrap">
                {sortHeader('created', 'Ordered')}
                {sortHeader('pickup', 'Pickup')}
                <th scope="col" className="px-3 py-2">
                  Cake
                </th>
                <th scope="col" className="px-3 py-2">
                  Customer
                </th>
                <th scope="col" className="px-3 py-2">
                  Status
                </th>
                <th scope="col" className="px-3 py-2">
                  Phone
                </th>
                <th scope="col" className="px-3 py-2">
                  Email
                </th>
                <th scope="col" className="px-3 py-2">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {shown.map(o => (
                <tr key={o.id} className="border-b align-top last:border-0">
                  <td className="whitespace-nowrap px-3 py-2">{formatVegasTime(o.createdAt)}</td>
                  <td className="whitespace-nowrap px-3 py-2">
                    {formatPickupDate(o.pickupDate)}, {formatPickupTime(o.pickupTime)}
                  </td>
                  <td className="min-w-48 px-3 py-2">
                    {sizeLabel(o.size)} · {o.flavor} · {o.filling}
                    {o.cakeMessage && <div className="text-muted-foreground">Writing: {o.cakeMessage}</div>}
                    {o.notes && <div className="whitespace-pre-wrap text-muted-foreground">Notes: {o.notes}</div>}
                  </td>
                  <td className="px-3 py-2">
                    {o.name} <span className="whitespace-nowrap text-muted-foreground">{orderRef(o)}</span>
                    {o.test && (
                      <span className="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-semibold text-amber-900">
                        TEST
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <span className="whitespace-nowrap">{cakeOrderStatusLabels[o.status]}</span>
                    {o.status === 'awaiting_approval' && o.approveBy && (
                      <div className="min-w-40 text-xs text-amber-900">
                        {o.approvalReason}. Approve by {formatVegasTime(o.approveBy)}
                      </div>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    <a className="underline" href={'tel:' + o.phone.replace(/[^+0-9]/g, '')}>
                      {o.phone}
                    </a>
                  </td>
                  <td className="px-3 py-2">
                    <a className="break-all underline" href={`mailto:${o.email}`}>
                      {o.email}
                    </a>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => copy(o)}>
                        {copied === o.id ? 'Copied!' : 'Copy for Mom'}
                      </Button>
                      <Button asChild size="sm" variant="outline" className="sm:hidden">
                        <a href={'sms:?&body=' + encodeURIComponent(momText(o))}>Text Mom</a>
                      </Button>
                      {o.status === 'awaiting_approval' && (
                        <>
                          <Button
                            size="sm"
                            disabled={busy}
                            onClick={() => act(o.id, 'approve', `Approve and charge $${o.price.toFixed(2)}?`)}
                          >
                            Approve &amp; charge
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busy}
                            onClick={() =>
                              act(
                                o.id,
                                'decline',
                                'Decline this order? The hold is released and the customer is emailed.',
                              )
                            }
                          >
                            Decline
                          </Button>
                        </>
                      )}
                      {o.status === 'paid' && (
                        <Button size="sm" variant="outline" disabled={busy} onClick={() => act(o.id, 'picked_up')}>
                          Mark picked up
                        </Button>
                      )}
                      {o.status === 'picked_up' && (
                        <Button size="sm" variant="outline" disabled={busy} onClick={() => act(o.id, 'not_picked_up')}>
                          Undo picked up
                        </Button>
                      )}
                      {o.test && (
                        <Button size="sm" variant="outline" disabled={busy} onClick={() => act(o.id, 'delete')}>
                          Delete test
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-sm text-muted-foreground">
        Refunds and changes to paid orders are done in the Square Dashboard (Transactions), using the order code next to
        the customer's name.
      </p>
    </section>
  )
}
