'use client'
import { useEffect, useState } from 'react'
import {
  cakeOrderStatusLabels,
  formatPickupDate,
  formatPickupTime,
  formatVegasTime,
  isDelivery,
  kitchenText,
  orderRef,
  sizeLabel,
  type CakeOrderStatus,
  type StoredCakeOrder,
} from '@/lib/cake-order'
import { adminPost } from '@/lib/admin-api'
import { isUrgent, orderBoard } from '@/lib/admin-order-board'
import { isPrimaryAction, orderActionIds, type OrderActionId } from '@/lib/admin-order-actions'
import { AdminActionMenu, type MenuItem } from './admin-action-menu'
import { AdminPageHeader } from './admin-page-header'
import { Button } from './ui/button'
import { AdminSegmented } from './admin-segmented'
import { AdminStatusBadge, type BadgeTone } from './admin-status-badge'

const filters = {
  approval: { label: 'Needs approval', statuses: ['awaiting_approval', 'checking_kitchen', 'hold_expired'] },
  payment: { label: 'Awaiting payment (custom)', statuses: ['awaiting_payment'] },
  upcoming: { label: 'To make', statuses: ['paid', 'deposit_paid', 'processing'] },
  done: { label: 'Picked up', statuses: ['picked_up'] },
  closed: { label: 'Declined / expired', statuses: ['declined', 'expired', 'failed'] },
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
}
type SortKey = 'created' | 'pickup'

export function AdminCakeOrders({ focusId }: { focusId?: string } = {}) {
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

  // Opened from a notification (/admin/orders/<id>): show it and scroll to it once the list has loaded.
  useEffect(() => {
    if (!loaded || !focusId) return
    setFilter('all')
    requestAnimationFrame(() =>
      [...document.querySelectorAll<HTMLElement>('[data-order-id="' + CSS.escape(focusId) + '"]')]
        .find(el => el.offsetParent !== null)
        ?.scrollIntoView({ block: 'center' }),
    )
  }, [loaded, focusId]) // eslint-disable-line react-hooks/exhaustive-deps

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
    action:
      | 'approve'
      | 'decline'
      | 'paid_offline'
      | 'picked_up'
      | 'not_picked_up'
      | 'delete'
      | 'resend_link'
      | 'kitchen_sent',
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
  async function copyLink(order: StoredCakeOrder) {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/pay/${order.id}`)
      setCopied('link-' + order.id)
      setTimeout(() => setCopied(c => (c === 'link-' + order.id ? '' : c)), 2500)
    } catch {
      setError('Could not copy the link.')
    }
  }
  async function copy(order: StoredCakeOrder) {
    try {
      await navigator.clipboard.writeText(kitchenText(order))
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
  const actionLabels: Record<OrderActionId, (o: StoredCakeOrder) => string> = {
    approve: () => 'Approve & charge',
    decline: () => 'Decline',
    picked_up: () => 'Mark picked up',
    resend_link: () => 'Resend pay link',
    copy_link: o => (copied === 'link-' + o.id ? 'Copied!' : 'Copy pay link'),
    paid_offline: () => 'Paid in store / by phone',
    text_kitchen: () => 'Text kitchen',
    copy_kitchen: o => (copied === o.id ? 'Copied!' : 'Copy for kitchen'),
    call: o => 'Call ' + o.phone,
    email: () => 'Email customer',
    not_picked_up: () => 'Undo picked up',
    delete: () => 'Delete test order',
  }
  const menuItem = (o: StoredCakeOrder, id: OrderActionId): MenuItem => {
    const label = actionLabels[id](o)
    switch (id) {
      case 'approve':
        return { label, onSelect: () => act(o.id, 'approve', `Approve and charge ${o.price.toFixed(2)}?`) }
      case 'decline':
        return {
          label,
          danger: true,
          onSelect: () => act(o.id, 'decline', 'Decline this order? The hold is released and the customer is emailed.'),
        }
      case 'picked_up':
      case 'not_picked_up':
      case 'delete':
        return { label, danger: id === 'delete', onSelect: () => act(o.id, id) }
      case 'resend_link':
        return { label, onSelect: () => act(o.id, 'resend_link', `Email ${o.email} a new pay link (valid 3 days)?`) }
      case 'copy_link':
        return { label, onSelect: () => void copyLink(o) }
      case 'paid_offline':
        return {
          label,
          onSelect: () =>
            act(
              o.id,
              'paid_offline',
              `Did ${o.name} pay another way (phone or in store)? The order moves to To make. No email is sent.`,
            ),
        }
      case 'text_kitchen':
        return { label, phoneOnly: true, href: 'sms:?&body=' + encodeURIComponent(kitchenText(o)) }
      case 'copy_kitchen':
        return { label, onSelect: () => void copy(o) }
      case 'call':
        return { label, href: 'tel:' + o.phone.replace(/[^+0-9]/g, '') }
      case 'email':
        return { label, href: 'mailto:' + o.email }
    }
  }
  // Main actions as buttons; everything else in the order's "⋯" menu.
  const orderButtons = (o: StoredCakeOrder) => {
    const ids = orderActionIds(o).filter(id => isPrimaryAction(o, id))
    if (!ids.length) return null
    return (
      <div className="flex flex-wrap items-center gap-2 pt-1 xl:flex-nowrap xl:pt-0">
        {ids.map(id => {
          const item = menuItem(o, id)
          return item.href ? (
            <Button key={id} asChild size="sm" variant="outline" className={item.phoneOnly ? 'sm:hidden' : ''}>
              <a href={item.href}>{item.label}</a>
            </Button>
          ) : (
            <Button
              key={id}
              size="sm"
              variant={id === 'approve' ? 'default' : 'outline'}
              disabled={busy}
              onClick={item.onSelect}
            >
              {item.label}
            </Button>
          )
        })}
      </div>
    )
  }
  const orderMenu = (o: StoredCakeOrder) => {
    const rest = orderActionIds(o).filter(id => !isPrimaryAction(o, id))
    return rest.length ? (
      <AdminActionMenu label={`More actions for order ${orderRef(o)}`} items={rest.map(id => menuItem(o, id))} />
    ) : null
  }
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
      <AdminPageHeader
        title="Cake orders"
        onRefresh={load}
        busy={busy}
        menu={[
          { label: 'Test order (paid)', onSelect: () => void sendTest('paid') },
          { label: 'Test order (needs approval)', onSelect: () => void sendTest('approval') },
        ]}
      />
      <PinnedOrders orders={orders} busy={busy} act={act} />
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
      {loaded && !shown.length && !error && <p>No orders here.</p>}
      {shown.length > 0 && (
        <>
          {/* Phones and tablets: one compact card per order. */}
          <ul className="grid gap-2 md:grid-cols-2 xl:hidden">
            {shown.map(o => (
              <li
                key={o.id}
                data-order-id={o.id}
                className={
                  'space-y-1.5 rounded-xl border bg-card p-3 text-sm ' + (o.id === focusId ? 'ring-2 ring-primary' : '')
                }
              >
                <div className="flex items-center gap-2">
                  <p className="flex-1 font-semibold">
                    {formatPickupDate(o.pickupDate)}, {formatPickupTime(o.pickupTime)}
                  </p>
                  <StatusBadge o={o} />
                  {orderMenu(o)}
                </div>
                <CakeDetails o={o} />
                <p className="text-muted-foreground">
                  {o.name} · {orderRef(o)} · ${o.price.toFixed(2)}
                  <OrderTags o={o} />
                </p>
                <StatusNote o={o} />
                {orderButtons(o)}
              </li>
            ))}
          </ul>

          {/* Wide screens: table. */}
          <div className="hidden overflow-x-auto rounded-xl border bg-card xl:block">
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
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {shown.map(o => (
                  <tr
                    key={o.id}
                    data-order-id={o.id}
                    className={'border-b align-top last:border-0 ' + (o.id === focusId ? 'bg-amber-50' : '')}
                  >
                    <td className="px-3 py-2">{formatVegasTime(o.createdAt)}</td>
                    <td className="px-3 py-2">
                      {formatPickupDate(o.pickupDate)}, {formatPickupTime(o.pickupTime)}
                    </td>
                    <td className="min-w-40 px-3 py-2">
                      <CakeDetails o={o} />
                      <div className="text-muted-foreground">${o.price.toFixed(2)}</div>
                    </td>
                    <td className="min-w-40 px-3 py-2">
                      {o.name} <span className="whitespace-nowrap text-muted-foreground">{orderRef(o)}</span>
                      <OrderTags o={o} />
                      <div className="text-xs text-muted-foreground">{o.phone}</div>
                    </td>
                    <td className="px-3 py-2">
                      <StatusBadge o={o} />
                      <StatusNote o={o} />
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex w-max items-center gap-2">
                        {orderButtons(o)}
                        {orderMenu(o)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      <p className="text-sm text-muted-foreground">
        Refunds and changes to paid orders are done in the Square Dashboard (Transactions), using the order code next to
        the customer's name.
      </p>
    </section>
  )
}

type Act = (id: string, action: 'approve' | 'decline' | 'kitchen_sent', confirmText?: string) => void
const smsToKitchen = (o: StoredCakeOrder) => 'sms:?&body=' + encodeURIComponent(kitchenText(o))

// Pinned at the top: orders waiting on the bakery. Empty lists are not shown.
function PinnedOrders({ orders, busy, act }: { orders: StoredCakeOrder[]; busy: boolean; act: Act }) {
  const board = orderBoard(orders)
  const groups = [
    { id: 'approve', title: 'Needs approval', list: board.needsApproval },
    { id: 'kitchen', title: 'Checking with kitchen', list: board.checkingKitchen },
    { id: 'send', title: 'Approved — not sent to kitchen', list: board.notSentToKitchen },
  ].filter(g => g.list.length)
  if (!groups.length) return null
  return (
    <div className="space-y-4">
      {groups.map(group => (
        <section key={group.id} aria-labelledby={'pinned-' + group.id} className="space-y-2">
          <h3 id={'pinned-' + group.id} className="heading-3">
            {group.title} <span className="font-normal text-muted-foreground">({group.list.length})</span>
          </h3>
          <ul className="grid gap-2 md:grid-cols-2">
            {group.list.map(o => (
              <li key={o.id} className="space-y-2 rounded-xl border bg-card p-3">
                <div className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                  {group.id !== 'send' && isUrgent(o) && (
                    <span className="rounded bg-red-600 px-1.5 py-0.5 text-xs font-bold text-white">URGENT</span>
                  )}
                  {o.test && (
                    <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-semibold text-amber-900">
                      TEST
                    </span>
                  )}
                  <span>
                    {formatPickupDate(o.pickupDate)}, {formatPickupTime(o.pickupTime)}
                  </span>
                </div>
                <p className="text-sm">
                  {sizeLabel(o.size)} · {o.flavor} · {o.filling}
                </p>
                <p className="text-sm text-muted-foreground">
                  {o.name} · {orderRef(o)} · ${o.price.toFixed(2)}
                  {o.status === 'awaiting_approval' && o.approveBy && <> · approve by {formatVegasTime(o.approveBy)}</>}
                </p>
                <div className="flex flex-wrap gap-2">
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
                          act(o.id, 'decline', 'Decline this order? The hold is released and the customer is emailed.')
                        }
                      >
                        Decline
                      </Button>
                    </>
                  )}
                  {group.id === 'send' && (
                    <>
                      <Button asChild size="sm" className="sm:hidden">
                        <a href={smsToKitchen(o)} onClick={() => act(o.id, 'kitchen_sent')}>
                          Send to kitchen
                        </a>
                      </Button>
                      <Button size="sm" variant="outline" disabled={busy} onClick={() => act(o.id, 'kitchen_sent')}>
                        Mark sent
                      </Button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

// Small display pieces shared by the order cards and the table.
function StatusBadge({ o }: { o: StoredCakeOrder }) {
  return (
    <AdminStatusBadge tone={statusTone[o.status]}>
      {o.kind === 'custom' && o.status === 'expired' ? 'Pay link expired' : cakeOrderStatusLabels[o.status]}
    </AdminStatusBadge>
  )
}
function CakeDetails({ o }: { o: StoredCakeOrder }) {
  return (
    <>
      <p>
        {sizeLabel(o.size)} · {o.flavor} · {o.filling}
      </p>
      {o.cakeMessage && <p className="text-muted-foreground">Writing: {o.cakeMessage}</p>}
      {isDelivery(o) && (
        <p className="text-muted-foreground">
          Delivery: {o.deliveryAddress} ({o.fulfillment})
        </p>
      )}
      {o.notes && <p className="whitespace-pre-wrap text-muted-foreground">Notes: {o.notes}</p>}
    </>
  )
}
function OrderTags({ o }: { o: StoredCakeOrder }) {
  return (
    <>
      {o.test && (
        <span className="ml-1.5 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-semibold text-amber-900">TEST</span>
      )}
      {o.kind === 'custom' && (
        <span className="ml-1.5 rounded bg-secondary px-1.5 py-0.5 text-xs font-semibold text-foreground">CUSTOM</span>
      )}
    </>
  )
}
function StatusNote({ o }: { o: StoredCakeOrder }) {
  const note =
    o.status === 'awaiting_approval' && o.approveBy
      ? `${o.approvalReason}. Approve by ${formatVegasTime(o.approveBy)}`
      : o.status === 'awaiting_payment' && o.payBy
        ? `Link valid until ${formatVegasTime(o.payBy)}`
        : o.status === 'deposit_paid' && o.deposit
          ? `Collect $${(o.price - o.deposit).toFixed(2)} at ${isDelivery(o) ? 'delivery' : 'pickup'}`
          : ''
  return note ? (
    <p className={'text-xs ' + (o.status === 'awaiting_approval' ? 'text-amber-900' : 'text-muted-foreground')}>
      {note}
    </p>
  ) : null
}
