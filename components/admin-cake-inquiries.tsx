'use client'
import { useEffect, useMemo, useState } from 'react'
import {
  fillingText,
  flavorText as typedFlavor,
  referenceLinks,
  formatEventTime,
  inquiryRef,
  inquiryStatuses,
  inquiryStatusLabels,
  MAX_STAFF_NOTES,
  tierFlavorLines,
  type InquiryStatus,
  type StoredCakeInquiry,
} from '@/lib/cake-inquiry'
import { cakeLabel } from '@/lib/cake-catalog'
import { adminPost } from '@/lib/admin-api'
import { Button } from './ui/button'
import { AdminPageHeader } from './admin-page-header'
import { AdminActionMenu, type MenuItem } from './admin-action-menu'
import { AdminSegmented } from './admin-segmented'
import { AdminStatusBadge, type BadgeTone } from './admin-status-badge'
import { AdminSidePanel, PanelDetails, headCell, listBox, rowClass, useOpenParam } from './admin-side-panel'
import { NativeSelect } from './ui/select'
import { Textarea } from './ui/textarea'
import { AdminCustomOrderForm } from './admin-custom-order-form'
import { cakeOrderStatusLabels, formatPickupDate, type CakeOrderStatus } from '@/lib/cake-order'

// Cake inquiries: a compact list; clicking one opens it in the side panel (details, photos, private notes,
// status and the custom order form).

const filters = {
  open: { label: 'Open', statuses: ['new', 'waiting_customer', 'checking_owner'] },
  confirmed: { label: 'Confirmed & paid', statuses: ['confirmed_paid'] },
  closed: { label: 'Completed / cancelled', statuses: ['completed', 'cancelled'] },
  all: { label: 'All', statuses: inquiryStatuses },
} satisfies Record<string, { label: string; statuses: readonly InquiryStatus[] }>
type Filter = keyof typeof filters
const statusTone: Record<InquiryStatus, BadgeTone> = {
  new: 'blue',
  waiting_customer: 'amber',
  checking_owner: 'amber',
  confirmed_paid: 'green',
  completed: 'gray',
  cancelled: 'red',
}

const customerKeys = (i: StoredCakeInquiry) => [i.email.toLowerCase(), i.phone.replace(/\D/g, '')]
const received = (iso: string) =>
  new Date(iso).toLocaleString('en-US', {
    timeZone: 'America/Los_Angeles',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
/** "Birthday · Sat, Nov 8 · 2:00 PM" */
const eventText = (i: StoredCakeInquiry) =>
  [i.eventType, i.eventDate && formatPickupDate(i.eventDate), formatEventTime(i.eventTime)].filter(Boolean).join(' · ')

export function AdminCakeInquiries() {
  const [inquiries, setInquiries] = useState<StoredCakeInquiry[]>([])
  const [filter, setFilter] = useState<Filter>('open')
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [notice, setNotice] = useState('')
  const { openId, open, close } = useOpenParam()
  const request = (body: Record<string, unknown>) => adminPost('/api/admin/cake-inquiries', body)

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
      setInquiries((await request({ action: 'list' })).inquiries)
      setLoaded(true)
    })
  useEffect(() => {
    void load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const patch = (id: string, change: Partial<StoredCakeInquiry>) =>
    setInquiries(current => current.map(i => (i.id === id ? { ...i, ...change } : i)))
  const setStatus = (id: string, status: InquiryStatus) =>
    run(async () => {
      await request({ action: 'status', id, status })
      patch(id, { status })
    })
  const saveNotes = (id: string) =>
    run(async () => {
      const staffNotes = (drafts[id] ?? '').trim()
      await request({ action: 'notes', id, staffNotes })
      patch(id, { staffNotes })
      setDrafts(({ [id]: _, ...rest }) => rest)
    })

  const remove = (id: string) =>
    run(async () => {
      setNotice('')
      const r = await request({ action: 'delete', id })
      close()
      setInquiries(current => current.filter(i => i.id !== id))
      setNotice(
        r.discordDeleted
          ? 'Inquiry deleted, with its Discord card.'
          : 'Inquiry deleted, but its Discord card could not be removed. Delete it in Discord.',
      )
    })
  const sendTest = () =>
    run(async () => {
      setNotice('')
      const { sentTo } = await request({ action: 'test' })
      setInquiries((await request({ action: 'list' })).inquiries)
      setFilter('open')
      setNotice(`Test inquiry sent to ${sentTo} (two emails starting with [TEST]) and added below.`)
    })

  // Customers sometimes send a second form to add or correct details; link those together.
  const others = useMemo(() => {
    const byCustomer = new Map<string, StoredCakeInquiry[]>()
    for (const i of inquiries.filter(i => !i.test))
      for (const key of customerKeys(i)) if (key) byCustomer.set(key, [...(byCustomer.get(key) ?? []), i])
    return (i: StoredCakeInquiry) =>
      i.test ? [] : [...new Set(customerKeys(i).flatMap(key => byCustomer.get(key) ?? []))].filter(o => o.id !== i.id)
  }, [inquiries])

  const counts = Object.fromEntries(
    Object.entries(filters).map(([key, f]) => [
      key,
      inquiries.filter(i => (f.statuses as readonly string[]).includes(i.status)).length,
    ]),
  )
  const shown = inquiries.filter(i => (filters[filter].statuses as readonly string[]).includes(i.status))
  const selected = openId ? inquiries.find(i => i.id === openId) : undefined
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

  const panel = () => {
    if (!openId) return null
    if (!selected)
      return (
        <AdminSidePanel title="Inquiry" onClose={close}>
          {messages}
          <p className="text-muted-foreground">{loaded ? 'This inquiry was not found.' : 'Loading…'}</p>
        </AdminSidePanel>
      )
    const i = selected
    const related = others(i)
    const editing = i.id in drafts
    const draft = drafts[i.id] ?? i.staffNotes
    const flavorText = i.tierFlavors
      ? tierFlavorLines(i.size, i.tierFlavors, v => fillingText(v, i.customFilling)).join('\n')
      : `${typedFlavor(i.flavor, i.customFlavor)} / ${fillingText(i.filling, i.customFilling)}`
    const menu: MenuItem[] = [
      { label: 'Call ' + i.phone, href: 'tel:' + i.phone.replace(/[^+0-9]/g, '') },
      { label: 'Email ' + i.email, href: 'mailto:' + i.email },
      {
        label: i.staffNotes ? 'Edit private notes' : 'Add private notes',
        onSelect: () => setDrafts(d => ({ ...d, [i.id]: i.staffNotes })),
      },
      {
        label: i.test ? 'Delete test inquiry' : 'Delete inquiry',
        danger: true,
        onSelect: () =>
          window.confirm(
            i.test
              ? 'Delete this test inquiry and its Discord card?'
              : `Delete the inquiry from ${i.name}? It is removed from admin for good, with its photos and its Discord card.` +
                  (i.order ? ` Order ${i.order.ref} made from it stays in Cake orders.` : ''),
          ) && void remove(i.id),
      },
    ]
    const rows: [string, React.ReactNode][] = [
      ['Event', eventText(i)],
      ['Cake', `${i.servings} servings · ${cakeLabel(i.size)}`],
      ['Flavor', flavorText],
      ['Writing', i.cakeMessage || 'None'],
      ...(i.designStyle ? ([['Styles', i.designStyle]] as [string, string][]) : []),
      ...(i.referenceLink
        ? ([
            [
              'Links',
              <span key="links" className="flex flex-col">
                {referenceLinks(i.referenceLink).map(link => (
                  <a
                    key={link}
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="break-all text-primary underline"
                  >
                    {link}
                  </a>
                ))}
              </span>,
            ],
          ] as [string, React.ReactNode][])
        : []),
      i.fulfillment === 'Pickup'
        ? ['Pickup', 'At the bakery']
        : ['Delivery', `${i.fulfillment} · ${i.deliveryAddress || 'Address TBC'}`],
      ['Budget', i.budget],
      ...(i.notes ? ([['Notes', i.notes]] as [string, string][]) : []),
      ...(i.photoCount > 0
        ? ([['Photos', <InquiryPhotos key="photos" inquiry={i} />]] as [string, React.ReactNode][])
        : []),
      ['Customer', i.name],
      [
        'Phone',
        <span key="tel">
          <a href={'tel:' + i.phone.replace(/[^+0-9]/g, '')} className="text-primary underline">
            {i.phone}
          </a>
          {i.textOk === 'yes' && ' · OK to text'}
        </span>,
      ],
      [
        'Email',
        <a key="mail" href={'mailto:' + i.email} className="break-all text-primary underline">
          {i.email}
        </a>,
      ],
      ['Received', received(i.createdAt)],
    ]
    return (
      <AdminSidePanel
        key={i.id}
        title={
          <>
            {i.name} <span className="font-normal text-muted-foreground">{inquiryRef(i.id)}</span>
          </>
        }
        onClose={close}
        actions={<AdminActionMenu label={`More actions for inquiry ${inquiryRef(i.id)}`} items={menu} />}
      >
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor={'inquiry-status-' + i.id} className="sr-only">
            Status
          </label>
          <NativeSelect
            id={'inquiry-status-' + i.id}
            value={i.status}
            disabled={busy}
            className="!min-h-9 w-auto !py-1 text-sm"
            onChange={e => setStatus(i.id, e.target.value as InquiryStatus)}
          >
            {inquiryStatuses.map(st => (
              <option key={st} value={st}>
                {inquiryStatusLabels[st]}
              </option>
            ))}
          </NativeSelect>
          {i.test && (
            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-semibold text-amber-900">TEST</span>
          )}
        </div>
        {messages}
        {related.length > 0 && (
          <p className="rounded-lg border border-amber-300 bg-amber-50 p-2.5 text-amber-900">
            Same customer also sent {related.length === 1 ? 'another inquiry' : `${related.length} other inquiries`}:{' '}
            {related.map((o, n) => (
              <span key={o.id}>
                {n > 0 && '; '}
                <button type="button" className="underline" onClick={() => open(o.id)}>
                  {received(o.createdAt)}
                </button>{' '}
                ({inquiryStatusLabels[o.status]})
              </span>
            ))}
          </p>
        )}
        {i.order && (
          <p className="rounded-lg border bg-secondary p-2.5">
            Order {i.order.ref}: {cakeOrderStatusLabels[i.order.status as CakeOrderStatus] ?? i.order.status}. Manage it
            in Cake orders.
          </p>
        )}
        {!i.order && !['completed', 'cancelled'].includes(i.status) && (
          <AdminCustomOrderForm
            inquiry={i}
            onCreated={message => {
              setNotice(message)
              void load()
            }}
          />
        )}

        {editing ? (
          <div>
            <label htmlFor={'inquiry-notes-' + i.id} className="mb-1 block font-semibold">
              Private notes
            </label>
            <Textarea
              id={'inquiry-notes-' + i.id}
              rows={3}
              maxLength={MAX_STAFF_NOTES}
              value={draft}
              autoFocus
              onChange={e => setDrafts(d => ({ ...d, [i.id]: e.target.value }))}
            />
            <div className="mt-2 flex gap-2">
              <Button size="sm" onClick={() => saveNotes(i.id)} disabled={busy}>
                Save notes
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setDrafts(({ [i.id]: _, ...rest }) => rest)}
                disabled={busy}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          i.staffNotes && (
            <p className="whitespace-pre-wrap rounded-lg bg-secondary p-2.5">
              <span className="font-semibold">Private notes:</span> {i.staffNotes}
            </p>
          )
        )}

        <PanelDetails rows={rows} />
      </AdminSidePanel>
    )
  }

  return (
    <section className="space-y-4">
      <AdminPageHeader
        title="Cake inquiries"
        onRefresh={load}
        busy={busy}
        menu={[{ label: 'Send test inquiry', onSelect: () => void sendTest() }]}
      />
      <AdminSegmented
        label="Show inquiries"
        value={filter}
        onChange={setFilter}
        options={(Object.keys(filters) as Filter[]).map(key => ({
          id: key,
          label: filters[key].label,
          count: counts[key],
        }))}
      />
      {/* While a panel is open its own copy of these messages is shown instead. */}
      {!openId && <div className="text-sm empty:hidden">{messages}</div>}
      {loaded && !shown.length && !error && <p className="text-sm text-muted-foreground">No inquiries here.</p>}
      {shown.length > 0 && (
        <>
          {/* Phones and tablets: two lines per inquiry. */}
          <ul className={listBox + ' lg:hidden'}>
            {shown.map(i => (
              <li key={i.id} className={rowClass(i.id === openId)}>
                <button type="button" onClick={() => open(i.id)} className="block w-full px-3 py-2.5 text-left">
                  <span className="flex items-center gap-2">
                    <span className="min-w-0 flex-1 truncate font-semibold">
                      <TestTag i={i} />
                      {i.name}
                    </span>
                    <span className="text-xs text-muted-foreground">{received(i.createdAt)}</span>
                  </span>
                  <span className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="min-w-0 flex-1 truncate">{eventText(i)}</span>
                    <InquiryBadge i={i} />
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
                  <th scope="col" className={headCell + ' w-[9rem]'}>
                    Received
                  </th>
                  <th scope="col" className={headCell}>
                    Customer
                  </th>
                  <th scope="col" className={headCell}>
                    Event
                  </th>
                  <th scope="col" className={headCell + ' hidden xl:table-cell'}>
                    Cake
                  </th>
                  <th scope="col" className={headCell + ' hidden w-[8rem] xl:table-cell'}>
                    Budget
                  </th>
                  <th scope="col" className={headCell + ' w-[11rem]'}>
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {shown.map(i => (
                  <tr key={i.id} className={rowClass(i.id === openId)} onClick={() => open(i.id)}>
                    <td className="whitespace-nowrap px-3 py-2.5 text-muted-foreground">{received(i.createdAt)}</td>
                    <td className="truncate px-3 py-2.5">
                      <TestTag i={i} />
                      <button
                        type="button"
                        className="font-medium hover:underline"
                        onClick={e => {
                          e.stopPropagation()
                          open(i.id)
                        }}
                      >
                        {i.name}
                      </button>{' '}
                      <span className="text-muted-foreground">{inquiryRef(i.id)}</span>
                    </td>
                    <td className="truncate px-3 py-2.5">{eventText(i)}</td>
                    <td className="hidden truncate px-3 py-2.5 text-muted-foreground xl:table-cell">
                      {i.servings} servings · {cakeLabel(i.size)}
                    </td>
                    <td className="hidden truncate px-3 py-2.5 text-muted-foreground xl:table-cell">{i.budget}</td>
                    <td className="px-3 py-2.5">
                      <InquiryBadge i={i} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      {panel()}
    </section>
  )
}

function InquiryBadge({ i }: { i: StoredCakeInquiry }) {
  return <AdminStatusBadge tone={statusTone[i.status]}>{inquiryStatusLabels[i.status]}</AdminStatusBadge>
}
function TestTag({ i }: { i: StoredCakeInquiry }) {
  return i.test ? (
    <span className="mr-1.5 rounded bg-amber-100 px-1 py-px text-[0.65rem] font-semibold text-amber-900">TEST</span>
  ) : null
}

const photoUrl = (id: string, file: string) =>
  `/api/admin/cake-inquiries/photo?id=${encodeURIComponent(id)}&file=${encodeURIComponent(file)}`

/** Small thumbnails; hovering (or focusing) one shows the whole photo in the middle of the screen; tapping opens it in a new tab. */
function InquiryPhotos({ inquiry: i }: { inquiry: StoredCakeInquiry }) {
  const photos = i.photos ?? []
  if (!i.photoCount) return 'None'
  if (!photos.length) return `${i.photoCount} photo${i.photoCount === 1 ? '' : 's'} in the inquiry email`
  return (
    <span className="flex flex-wrap items-center gap-2 whitespace-normal">
      {photos.map((file, n) => (
        <a
          key={file}
          href={photoUrl(i.id, file)}
          target="_blank"
          rel="noopener"
          aria-label={`Reference photo ${n + 1} (opens full size)`}
          className="group relative block focus-visible:outline-2"
        >
          <img src={photoUrl(i.id, file)} alt="" loading="lazy" className="size-12 rounded-md border object-cover" />
          <span className="pointer-events-none fixed left-1/2 top-1/2 z-50 hidden w-[min(90vw,32rem)] -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-card p-1 shadow-2xl group-hover:block group-focus-visible:block">
            <img
              src={photoUrl(i.id, file)}
              alt={`Reference photo ${n + 1}`}
              className="max-h-[80vh] w-full rounded object-contain"
            />
          </span>
        </a>
      ))}
      {photos.length < i.photoCount && (
        <span className="text-muted-foreground">+{i.photoCount - photos.length} in the inquiry email</span>
      )}
    </span>
  )
}
