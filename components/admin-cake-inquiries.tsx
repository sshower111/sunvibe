'use client'
import { useEffect, useMemo, useState } from 'react'
import {
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
import { NativeSelect } from './ui/select'
import { Textarea } from './ui/textarea'
import { AdminCustomOrderForm } from './admin-custom-order-form'
import { cakeOrderStatusLabels, formatPickupDate, type CakeOrderStatus } from '@/lib/cake-order'

const filters = {
  open: { label: 'Open', statuses: ['new', 'waiting_customer', 'checking_owner'] },
  confirmed: { label: 'Confirmed & paid', statuses: ['confirmed_paid'] },
  closed: { label: 'Completed / cancelled', statuses: ['completed', 'cancelled'] },
  all: { label: 'All', statuses: inquiryStatuses },
} satisfies Record<string, { label: string; statuses: readonly InquiryStatus[] }>
type Filter = keyof typeof filters

const customerKeys = (i: StoredCakeInquiry) => [i.email.toLowerCase(), i.phone.replace(/\D/g, '')]
const received = (iso: string) =>
  new Date(iso).toLocaleString('en-US', {
    timeZone: 'America/Los_Angeles',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })

export function AdminCakeInquiries({ focusId }: { focusId?: string } = {}) {
  const [inquiries, setInquiries] = useState<StoredCakeInquiry[]>([])
  const [filter, setFilter] = useState<Filter>('open')
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [notice, setNotice] = useState('')
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

  // Opened from a notification (/admin/inquirys/<id>): show it and scroll to it once the list has loaded.
  useEffect(() => {
    if (!loaded || !focusId) return
    setFilter('all')
    requestAnimationFrame(() =>
      [...document.querySelectorAll<HTMLElement>('[data-inquiry-id="' + CSS.escape(focusId) + '"]')]
        .find(el => el.offsetParent !== null)
        ?.scrollIntoView({ block: 'center' }),
    )
  }, [loaded, focusId]) // eslint-disable-line react-hooks/exhaustive-deps

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

  const removeTest = (id: string) =>
    run(async () => {
      await request({ action: 'delete', id })
      setInquiries(current => current.filter(i => i.id !== id))
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
      <p role="status" className="text-sm text-success empty:hidden">
        {notice}
      </p>
      <p role="alert" className="text-sm text-danger empty:hidden">
        {error}
      </p>
      {loaded && !shown.length && !error && <p>No inquiries here.</p>}
      <div className="grid gap-2 md:grid-cols-2">
        {shown.map(i => {
          const related = others(i)
          const editing = i.id in drafts
          const draft = drafts[i.id] ?? i.staffNotes
          const flavorText = i.tierFlavors
            ? tierFlavorLines(i.size, i.tierFlavors).join('\n')
            : `${i.flavor} / ${i.filling}`
          const menu: MenuItem[] = [
            { label: 'Call ' + i.phone, href: 'tel:' + i.phone.replace(/[^+0-9]/g, '') },
            { label: 'Email ' + i.email, href: 'mailto:' + i.email },
            {
              label: i.staffNotes ? 'Edit private notes' : 'Add private notes',
              onSelect: () => setDrafts(d => ({ ...d, [i.id]: i.staffNotes })),
            },
            ...(i.test
              ? [
                  {
                    label: 'Delete test inquiry',
                    danger: true,
                    onSelect: () => window.confirm('Delete this test inquiry?') && void removeTest(i.id),
                  },
                ]
              : []),
          ]
          return (
            <article
              key={i.id}
              data-inquiry-id={i.id}
              className={
                'min-w-0 space-y-2 rounded-xl border bg-card p-3 text-sm ' +
                (i.id === focusId ? 'ring-2 ring-primary' : '')
              }
            >
              <div className="flex items-center gap-2">
                <h3 className="heading-3 min-w-0 flex-1 break-words">
                  {i.name} <span className="text-sm font-normal text-muted-foreground">{inquiryRef(i.id)}</span>
                  {i.test && (
                    <span className="ml-1.5 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-semibold text-amber-900">
                      TEST
                    </span>
                  )}
                </h3>
                <AdminActionMenu label={`More actions for inquiry ${inquiryRef(i.id)}`} items={menu} />
              </div>
              <p className="text-xs text-muted-foreground">Received {received(i.createdAt)}</p>
              {related.length > 0 && (
                <p className="rounded-md border border-amber-300 bg-amber-50 p-2 text-amber-900">
                  Same customer also sent{' '}
                  {related.length === 1 ? 'another inquiry' : `${related.length} other inquiries`}:{' '}
                  {related.map(o => `${received(o.createdAt)} (${inquiryStatusLabels[o.status]})`).join('; ')}
                </p>
              )}
              <div className="space-y-0.5 break-words">
                <p className="font-semibold">
                  {[i.eventType, i.eventDate && formatPickupDate(i.eventDate), formatEventTime(i.eventTime)]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
                <p>
                  {i.servings} servings · {cakeLabel(i.size)}
                </p>
                <p className="whitespace-pre-wrap">{flavorText}</p>
                {i.cakeMessage && <p className="text-muted-foreground">Writing: {i.cakeMessage}</p>}
                <p className="text-muted-foreground">
                  {i.fulfillment === 'Pickup' ? 'Pickup' : `${i.fulfillment} · ${i.deliveryAddress || 'Address TBC'}`} ·
                  Budget {i.budget}
                </p>
                {i.notes && <p className="whitespace-pre-wrap text-muted-foreground">Notes: {i.notes}</p>}
              </div>
              {i.photoCount > 0 && <InquiryPhotos inquiry={i} />}
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
                  <p className="whitespace-pre-wrap rounded-md bg-secondary p-2">
                    <span className="font-semibold">Private notes:</span> {i.staffNotes}
                  </p>
                )
              )}
              {i.order && (
                <p className="rounded-md border bg-secondary p-2">
                  Order {i.order.ref}: {cakeOrderStatusLabels[i.order.status as CakeOrderStatus] ?? i.order.status}.
                  Manage it in Cake orders.
                </p>
              )}
              <div className="flex flex-wrap items-center gap-2 pt-1">
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
                {!i.order && !['completed', 'cancelled'].includes(i.status) && (
                  <AdminCustomOrderForm
                    inquiry={i}
                    onCreated={message => {
                      setNotice(message)
                      void load()
                    }}
                  />
                )}
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
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
