'use client'

import { useCallback, useEffect, useState } from 'react'
import { adminPost, SignedOutError } from '@/lib/admin-api'
import { useAdmin } from '@/components/admin-shell'
import type { CustomerPhotos } from '@/lib/customer-photos'
import { AdminPageHeader } from './admin-page-header'
import { Button } from './ui/button'

// Admin → Customer photos: what customers sent from the thank-you email (lib/thank-you.ts), newest first.
// "Add to gallery" puts a photo on the website's gallery, only for customers who said OK.

type Entry = CustomerPhotos & { order: { ref: string; name: string; test: boolean } | null }
const photoUrl = (id: string, file: string) =>
  `/api/admin/customer-photos/photo?id=${encodeURIComponent(id)}&file=${encodeURIComponent(file)}`
const when = (iso: string) =>
  new Date(iso).toLocaleString('en-US', {
    timeZone: 'America/Los_Angeles',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })

export function AdminCustomerPhotos() {
  const { signedOut } = useAdmin()
  const [entries, setEntries] = useState<Entry[] | null>(null)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const request = useCallback(
    async (body: Record<string, unknown>) => {
      try {
        return await adminPost('/api/admin/customer-photos', body)
      } catch (e) {
        if (e instanceof SignedOutError) signedOut()
        throw e
      }
    },
    [signedOut],
  )
  const load = useCallback(async () => {
    setBusy('load')
    try {
      setEntries((await request({ action: 'list' })).entries)
      setError('')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy('')
    }
  }, [request])
  useEffect(() => {
    void load()
  }, [load])

  const addToGallery = async (id: string, file: string) => {
    setBusy(id + file)
    try {
      const { url } = await request({ action: 'add_to_gallery', id, file })
      setEntries(list =>
        list!.map(e =>
          e.id === id ? { ...e, photos: e.photos.map(p => (p.file === file ? { ...p, gallery: url } : p)) } : e,
        ),
      )
      setError('')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy('')
    }
  }
  const remove = async (id: string) => {
    if (!window.confirm('Delete these photos? Photos already in the gallery stay there.')) return
    setBusy(id)
    try {
      await request({ action: 'delete', id })
      setEntries(list => list!.filter(e => e.id !== id))
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy('')
    }
  }

  return (
    <section className="space-y-4">
      <AdminPageHeader title="Customer photos" onRefresh={() => void load()} busy={busy === 'load'} />
      <p className="text-sm text-muted-foreground">
        Sent from the thank-you email customers get the day after pickup or delivery. Only photos the customer said OK
        to can go in the gallery.
      </p>
      <p role="alert" className="text-sm text-danger empty:hidden">
        {error}
      </p>
      {entries && !entries.length && <p className="text-sm text-muted-foreground">No photos yet.</p>}
      <ul className="space-y-3">
        {entries?.map(e => (
          <li key={e.id} className="space-y-3 rounded-xl border bg-white p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-semibold">
                {e.order?.test && (
                  <span className="mr-1.5 rounded bg-amber-100 px-1 py-px text-xs text-amber-900">TEST</span>
                )}
                {e.order ? `${e.order.name} · ${e.order.ref}` : 'Order deleted'}
              </p>
              <p className="text-sm text-muted-foreground">{when(e.createdAt)}</p>
            </div>
            <p className={'text-sm ' + (e.consent ? 'text-green-800' : 'text-muted-foreground')}>
              {e.consent ? '✓ OK to show on the website' : 'Not OK to show on the website (private)'}
            </p>
            {e.note && <p className="whitespace-pre-wrap rounded-lg bg-secondary p-3">{e.note}</p>}
            {e.photos.length > 0 && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {e.photos.map(p => (
                  <div key={p.file} className="space-y-2">
                    <a href={photoUrl(e.id, p.file)} target="_blank" rel="noopener">
                      <img
                        src={photoUrl(e.id, p.file)}
                        alt=""
                        loading="lazy"
                        className="aspect-square w-full rounded-lg border object-cover"
                      />
                    </a>
                    {p.gallery ? (
                      <p className="text-center text-sm text-green-800">✓ In the gallery</p>
                    ) : (
                      e.consent && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full"
                          disabled={!!busy}
                          onClick={() => void addToGallery(e.id, p.file)}
                        >
                          {busy === e.id + p.file ? 'Adding…' : 'Add to gallery'}
                        </Button>
                      )
                    )}
                  </div>
                ))}
              </div>
            )}
            <button
              type="button"
              className="text-sm text-danger underline"
              disabled={!!busy}
              onClick={() => void remove(e.id)}
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
