'use client'
import { useEffect, useMemo, useState } from 'react'
import {
  formatEventTime,
  inquiryStatuses,
  inquiryStatusLabels,
  MAX_STAFF_NOTES,
  type InquiryStatus,
  type StoredCakeInquiry,
} from '@/lib/cake-inquiry'
import { cakeLabel } from '@/lib/cake-catalog'
import { adminPost } from '@/lib/admin-api'
import { Button } from './ui/button'
import { NativeSelect } from './ui/select'
import { Textarea } from './ui/textarea'

const filters = {
  open: { label: 'Open', statuses: ['new', 'waiting_customer', 'checking_owner'] },
  confirmed: { label: 'Confirmed & paid', statuses: ['confirmed_paid'] },
  closed: { label: 'Completed / cancelled', statuses: ['completed', 'cancelled'] },
  all: { label: 'All', statuses: inquiryStatuses },
} satisfies Record<string, { label: string; statuses: readonly InquiryStatus[] }>
type Filter = keyof typeof filters

const customerKeys = (i: StoredCakeInquiry) => [i.email.toLowerCase(), i.phone.replace(/\D/g, '')]
const received = (iso: string) =>
  new Date(iso).toLocaleString('en-US', { timeZone: 'America/Los_Angeles', dateStyle: 'medium', timeStyle: 'short' })

export function AdminCakeInquiries() {
  const [inquiries, setInquiries] = useState<StoredCakeInquiry[]>([])
  const [filter, setFilter] = useState<Filter>('open')
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [loaded, setLoaded] = useState(false)
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

  // Customers sometimes send a second form to add or correct details; link those together.
  const others = useMemo(() => {
    const byCustomer = new Map<string, StoredCakeInquiry[]>()
    for (const i of inquiries)
      for (const key of customerKeys(i)) if (key) byCustomer.set(key, [...(byCustomer.get(key) ?? []), i])
    return (i: StoredCakeInquiry) =>
      [...new Set(customerKeys(i).flatMap(key => byCustomer.get(key) ?? []))].filter(o => o.id !== i.id)
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
      <h2 className="heading-2">Cake inquiries</h2>
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
        <Button variant="outline" onClick={load} disabled={busy} className="ml-auto">
          Refresh
        </Button>
      </div>
      <p role="alert" className="text-sm text-danger empty:hidden">
        {error}
      </p>
      {loaded && !shown.length && !error && <p>No inquiries here.</p>}
      <div className="grid gap-4 lg:grid-cols-2">
        {shown.map(i => {
          const related = others(i)
          const draft = drafts[i.id] ?? i.staffNotes
          const rows: [string, string][] = [
            ['Event', [i.eventType, i.eventDate, formatEventTime(i.eventTime)].filter(Boolean).join(' · ')],
            ['Cake', `${i.servings} servings · ${cakeLabel(i.size)}`],
            ['Flavor / filling', `${i.flavor} / ${i.filling}`],
            ['Writing on cake', i.cakeMessage || 'None'],
            ['Budget', i.budget],
            [
              'Pickup / delivery',
              i.fulfillment === 'Pickup' ? 'Pickup' : `${i.fulfillment} · ${i.deliveryAddress || 'Address TBC'}`,
            ],
            ['Photos', i.photoCount ? `${i.photoCount} (in the inquiry email)` : 'None'],
            ['Customer notes', i.notes || 'None'],
          ]
          return (
            <article key={i.id} className="min-w-0 space-y-3 rounded-xl border bg-card p-4">
              <div>
                <h3 className="heading-3">{i.name}</h3>
                <p className="text-sm text-muted-foreground">Received {received(i.createdAt)} (Las Vegas)</p>
              </div>
              {related.length > 0 && (
                <p className="rounded-md border border-amber-300 bg-amber-50 p-2 text-sm text-amber-900">
                  Same customer also sent{' '}
                  {related.length === 1 ? 'another inquiry' : `${related.length} other inquiries`}:{' '}
                  {related.map(o => `${received(o.createdAt)} (${inquiryStatusLabels[o.status]})`).join('; ')}
                </p>
              )}
              <p className="flex flex-wrap gap-x-4 text-sm">
                <a className="inline-flex min-h-12 items-center underline" href={`mailto:${i.email}`}>
                  {i.email}
                </a>
                <a
                  className="inline-flex min-h-12 items-center underline"
                  href={'tel:' + i.phone.replace(/[^+0-9]/g, '')}
                >
                  {i.phone}
                </a>
              </p>
              <dl className="space-y-2 break-words text-sm">
                {rows.map(([label, value]) => (
                  <div key={label} className="grid gap-1 sm:grid-cols-[9rem_1fr]">
                    <dt className="font-semibold">{label}</dt>
                    <dd className="whitespace-pre-wrap">{value}</dd>
                  </div>
                ))}
              </dl>
              <div>
                <label htmlFor={'inquiry-status-' + i.id} className="mb-1 block text-sm font-semibold">
                  Status
                </label>
                <NativeSelect
                  id={'inquiry-status-' + i.id}
                  value={i.status}
                  disabled={busy}
                  onChange={e => setStatus(i.id, e.target.value as InquiryStatus)}
                >
                  {inquiryStatuses.map(s => (
                    <option key={s} value={s}>
                      {inquiryStatusLabels[s]}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <div>
                <label htmlFor={'inquiry-notes-' + i.id} className="mb-1 block text-sm font-semibold">
                  Private notes (agreed design, final price, payment)
                </label>
                <Textarea
                  id={'inquiry-notes-' + i.id}
                  rows={3}
                  maxLength={MAX_STAFF_NOTES}
                  value={draft}
                  onChange={e => setDrafts(d => ({ ...d, [i.id]: e.target.value }))}
                />
                {draft.trim() !== i.staffNotes && (
                  <Button className="mt-2" onClick={() => saveNotes(i.id)} disabled={busy}>
                    Save notes
                  </Button>
                )}
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
