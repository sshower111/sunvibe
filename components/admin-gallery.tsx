'use client'

import { useCallback, useEffect, useState } from 'react'
import { GalleryPhotoUpload } from '@/components/gallery-photo-upload'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NoticeBar, type Notice } from '@/components/admin-notice'
import { useAdmin } from '@/components/admin-shell'

export function AdminGallery() {
  const { signedOut } = useAdmin()
  const [images, setImages] = useState<string[]>([])
  const [galleryLoading, setGalleryLoading] = useState(false)
  const [newImageUrl, setNewImageUrl] = useState('')
  const [urlLoading, setUrlLoading] = useState(false)
  const [galleryNotice, setGalleryNotice] = useState<Notice>(null)
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null)
  const [removing, setRemoving] = useState<string | null>(null)

  const fetchGalleryImages = useCallback(async () => {
    setGalleryLoading(true)
    try {
      const response = await fetch('/api/gallery', { cache: 'no-store' })
      const data = await response.json()
      setImages(data.images || [])
      if (data.degraded)
        setGalleryNotice({
          type: 'error',
          text: 'Gallery storage is unavailable, so the built-in photos are shown. Changes may not save until it recovers.',
        })
    } catch {
      setGalleryNotice({ type: 'error', text: 'Could not load the gallery. Check your connection and try again.' })
    } finally {
      setGalleryLoading(false)
    }
  }, [])
  useEffect(() => {
    void fetchGalleryImages()
  }, [fetchGalleryImages])

  const addImageFromUrl = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!newImageUrl.trim()) return
    setUrlLoading(true)
    try {
      const res = await fetch('/api/gallery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add', url: newImageUrl.trim() }),
      })
      if (res.status === 401) return signedOut()
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed to add image')
      setNewImageUrl('')
      await fetchGalleryImages()
      setGalleryNotice({ type: 'success', text: 'Photo link added to the gallery.' })
    } catch (err) {
      setGalleryNotice({ type: 'error', text: err instanceof Error ? err.message : 'Failed to add the link.' })
    } finally {
      setUrlLoading(false)
    }
  }

  const removeImage = async (url: string) => {
    setRemoving(url)
    setConfirmRemove(null)
    try {
      const res = await fetch('/api/gallery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'remove', url }),
      })
      if (res.status === 401) return signedOut()
      if (!res.ok) throw new Error()
      setImages(current => current.filter(image => image !== url))
      setGalleryNotice({ type: 'success', text: 'Photo removed from the gallery.' })
    } catch {
      setGalleryNotice({ type: 'error', text: 'Could not remove the photo. Please try again.' })
    } finally {
      setRemoving(null)
    }
  }

  return (
    <section aria-labelledby="gallery-admin-heading" className="space-y-4">
      <h2 id="gallery-admin-heading" className="heading-2">
        Gallery <span className="text-base font-normal text-muted-foreground">({images.length} photos)</span>
      </h2>
      <div className="space-y-4 rounded-xl border bg-white p-4">
        <GalleryPhotoUpload
          onSaved={() => {
            void fetchGalleryImages()
          }}
        />
        <details>
          <summary className="min-h-12 cursor-pointer py-3 text-sm focus-visible:outline focus-visible:outline-2">
            Or add a photo link
          </summary>
          <form onSubmit={addImageFromUrl} className="flex flex-col gap-2 sm:flex-row">
            <Input
              type="url"
              inputMode="url"
              aria-label="Photo URL"
              placeholder="https://example.com/image.jpg"
              value={newImageUrl}
              onChange={e => setNewImageUrl(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" loading={urlLoading} disabled={!newImageUrl.trim()}>
              {urlLoading ? 'Adding…' : 'Add link'}
            </Button>
          </form>
        </details>
      </div>
      <NoticeBar notice={galleryNotice} />
      {galleryLoading && !images.length ? (
        <div role="status">
          <span className="sr-only">Loading photos…</span>
          <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {Array.from({ length: 8 }, (_, i) => (
              <li key={i}>
                <Skeleton className="aspect-square w-full rounded-xl" />
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {images.map(image => (
            <li key={image} className="overflow-hidden rounded-xl border bg-white">
              <img src={image} alt="" loading="lazy" decoding="async" className="aspect-square w-full object-cover" />
              <div className="p-2">
                {confirmRemove === image ? (
                  <div className="grid grid-cols-2 gap-2">
                    <Button size="sm" variant="destructive" onClick={() => removeImage(image)}>
                      Remove
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setConfirmRemove(null)}>
                      Keep
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    disabled={removing === image}
                    onClick={() => setConfirmRemove(image)}
                  >
                    {removing === image ? 'Removing…' : 'Remove photo'}
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
