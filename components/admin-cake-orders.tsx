'use client'
import { useEffect, useState } from 'react'
import {
  cakeOrderStatusLabels,
  formatPickupDate,
  formatPickupTime,
  formatVegasTime,
  orderRef,
  sizeLabel,
  type CakeOrderStatus,
  type StoredCakeOrder,
} from '@/lib/cake-order'
import { adminPost } from '@/lib/admin-api'
import { isUrgent } from '@/lib/admin-order-board'
import { needsAnswer } from '@/lib/admin-order-actions'
import { AdminPageHeader } from './admin-page-header'
import { AdminSegmented } from './admin-segmented'
import { AdminStatusBadge, type BadgeTone } from './admin-status-badge'
import { AdminOrderPanel } from './admin-order-review'
import { headCell, listBox, rowClass, useOpenParam } from './admin-side-panel'

// Cake orders: a compact list (table on wide screens, one line pair per order on phones). Clicking an order opens
// it in the side panel, where everything is done.

const filters = {
  approval: { label: 'Needs approval', statuses: ['awaiting_approval', 'checking_kitchen', 'hold_expired'] },
  upcoming: { label: 'To make', statuses: ['paid', 'deposit_paid', 'processing'] },
  payment: { label: 'Awaiting payment', statuses: ['awaiting_payment'] },
  done: { label: 'Picked up', statuses: ['picked_up'] },
  closed: { label: 'Declined / refunded', statuses: ['declined', 'expired', 'failed', 'refunded'] },
} satisfies Record<string, { label: string; statuses: readonly CakeOrderStatus[] }>
type Filter = keyof typeof filters
const statusTone: Record<CakeOrderStatus, BadgeTone> = {
  awaiting_approval: 'amber',
  checking_kitchen: 'amber',
  hold_expired: 'red',
  processing: 'blue',
  awaiting_payment: 'blue',
  paid: 'green',
  deposit_paid: 'green',
  picked_up: 'gray',
  declined: 'red',
  expired: 'red',
  failed: 'red',
  refunded: 'gray',
}
type SortKey = 'created' | 'pickup'
const money = (n: number) => '$' + n.toFixed(2)
/** Paid but the kitchen hasn't had the order text yet. */
const notSentToKitchen = (o: StoredCakeOrder) =>
  (o.status === 'paid' || o.status === 'deposit_paid') && !o.kitchenSentAt

export function AdminCakeOrders() {
  const [orders, setOrders] = useState<StoredCakeOrder[]>([])
  const [filter, setFilter] = useState<Filter | 'all'>('all')
  const [sort, setSort] = useState<{ by: SortKey; asc: boolean }>({ by: 'pickup', asc: true })
  const [busy, setBusy] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const { openId, open, close } = useOpenParam()
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
  const reload = async () => setOrders((await request({ action: 'list' })).orders)
  const load = () =>
    run(async () => {
      await reload()
      setLoaded(true)
    })
  useEffect(() => {
    void load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const sendTest = (scenario: 'urgent' | 'later') =>
    run(async () => {
      setNotice('')
      const r = await request({ action: 'test', scenario })
      await reload()
      setFilter('all')
      setNotice(
        `Test order ${r.ref} added. Emails went to ${r.sentTo} with [TEST] subjects. ` +
          (r.viaSquare ? 'The payment is in the Square sandbox dashboard.' : 'No card was charged.'),
      )
    })

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
  const sortHeader = (by: SortKey, label: string, className = '') => (
    <th
      scope="col"
      className={headCell + ' ' + className}
      aria-sort={sort.by === by ? (sort.asc ? 'ascending' : 'descending') : 'none'}
    >
      <button type="button" className="inline-flex items-center gap-1 hover:text-foreground" onClick={() => sortBy(by)}>
        {label}
        <span aria-hidden="true" className={sort.by === by ? 'text-foreground' : 'opacity-40'}>
          {sort.by === by && !sort.asc ? '↓' : '↑'}
        </span>
      </button>
    </th>
  )
  const pickup = (o: StoredCakeOrder) => `${formatPickupDate(o.pickupDate)}, ${formatPickupTime(o.pickupTime)}`

  return (
    <section className="space-y-4">
      <AdminPageHeader
        title="Cake orders"
        onRefresh={load}
        busy={busy}
        menu={[
          { label: 'Test order (urgent, tomorrow)', onSelect: () => void sendTest('urgent') },
          { label: 'Test order (in 3 days)', onSelect: () => void sendTest('later') },
        ]}
      />
      <AdminSegmented
        label="Show orders"
        value={filter}
        onChange={setFilter}
        options={[
          { id: 'all' as const, label: 'All', count: orders.length },
          ...(Object.keys(filters) as Filter[]).map(key => ({
            id: key,
            label: filters[key].label,
            count: counts[key],
          })),
        ]}
      />
      <p role="status" className="text-sm text-success empty:hidden">
        {notice}
      </p>
      <p role="alert" className="text-sm text-danger empty:hidden">
        {error}
      </p>
      {loaded && !shown.length && !error && <p className="text-sm text-muted-foreground">No orders here.</p>}
      {shown.length > 0 && (
        <>
          {/* Phones and tablets: two lines per order. */}
          <ul className={listBox + ' lg:hidden'}>
            {shown.map(o => (
              <li key={o.id} className={rowClass(o.id === openId)}>
                <button type="button" onClick={() => open(o.id)} className="block w-full px-3 py-2.5 text-left">
                  <span className="flex items-center gap-2">
                    <span className="min-w-0 flex-1 truncate font-semibold">{o.name}</span>
                    <span className="text-sm tabular-nums">{money(o.price)}</span>
                  </span>
                  <span className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="min-w-0 flex-1 truncate">
                      <Flags o={o} />
                      {pickup(o)}
                    </span>
                    <StatusBadge o={o} list />
                  </span>
                </button>
              </li>
            ))}
          </ul>

          {/* Wide screens: table. */}
          <div className={listBox + ' hidden lg:block'}>
            <table className="w-full table-fixed text-left text-sm">
              <thead className="border-b bg-secondary">
                <tr>
                  {sortHeader('pickup', 'Pickup', 'w-[11rem]')}
                  <th scope="col" className={headCell}>
                    Customer
                  </th>
                  <th scope="col" className={headCell + ' hidden xl:table-cell'}>
                    Cake
                  </th>
                  <th scope="col" className={headCell + ' w-[6rem] text-right'}>
                    Amount
                  </th>
                  <th scope="col" className={headCell + ' w-[11rem]'}>
                    Status
                  </th>
                  {sortHeader('created', 'Ordered', 'w-[10rem] hidden xl:table-cell')}
                </tr>
              </thead>
              <tbody>
                {shown.map(o => (
                  <tr key={o.id} className={rowClass(o.id === openId)} onClick={() => open(o.id)}>
                    <td className="px-3 py-2.5 whitespace-nowrap">{pickup(o)}</td>
                    <td className="truncate px-3 py-2.5">
                      <button
                        type="button"
                        className="font-medium hover:underline"
                        onClick={e => {
                          e.stopPropagation()
                          open(o.id)
                        }}
                      >
                        {o.name}
                      </button>{' '}
                      <span className="text-muted-foreground">{orderRef(o)}</span> <Flags o={o} />
                    </td>
                    <td className="hidden truncate px-3 py-2.5 text-muted-foreground xl:table-cell">
                      {sizeLabel(o.size)} · {o.flavor}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{money(o.price)}</td>
                    <td className="px-3 py-2.5">
                      <StatusBadge o={o} list />
                    </td>
                    <td className="hidden px-3 py-2.5 whitespace-nowrap text-muted-foreground xl:table-cell">
                      {formatVegasTime(o.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      {openId && (
        <AdminOrderPanel
          key={openId}
          id={openId}
          onClose={close}
          onChange={() => void reload().catch(() => {})}
          onDeleted={() => {
            close()
            void reload().catch(() => {})
          }}
        />
      )}
    </section>
  )
}

/** URGENT (answer today or tomorrow), TEST and CUSTOM markers. */
function Flags({ o }: { o: StoredCakeOrder }) {
  const urgent = needsAnswer(o) && isUrgent(o)
  if (!urgent && !o.test && o.kind !== 'custom') return null
  return (
    <>
      {urgent && (
        <span className="mr-1.5 rounded bg-red-600 px-1 py-px text-[0.65rem] font-bold text-white">URGENT</span>
      )}
      {o.test && (
        <span className="mr-1.5 rounded bg-amber-100 px-1 py-px text-[0.65rem] font-semibold text-amber-900">TEST</span>
      )}
      {o.kind === 'custom' && (
        <span className="mr-1.5 rounded bg-secondary px-1 py-px text-[0.65rem] font-semibold text-foreground ring-1 ring-border">
          CUSTOM
        </span>
      )}
    </>
  )
}

// Small display pieces shared by the list and the order panel.
/** In the list (`list`), a paid order the kitchen hasn't had yet shows "Send to kitchen" instead of "Paid". */
export function StatusBadge({ o, list }: { o: StoredCakeOrder; list?: boolean }) {
  if (list && notSentToKitchen(o)) return <AdminStatusBadge tone="amber">Send to kitchen</AdminStatusBadge>
  return (
    <AdminStatusBadge tone={statusTone[o.status]}>
      {o.kind === 'custom' && o.status === 'expired' ? 'Pay link expired' : cakeOrderStatusLabels[o.status]}
    </AdminStatusBadge>
  )
}
export function OrderTags({ o }: { o: StoredCakeOrder }) {
  return (
    <>
      {o.test && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-semibold text-amber-900">TEST</span>}
      {o.kind === 'custom' && (
        <span className="rounded bg-secondary px-1.5 py-0.5 text-xs font-semibold text-foreground">CUSTOM</span>
      )}
    </>
  )
}
