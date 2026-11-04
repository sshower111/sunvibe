'use client'

import { useEffect, useRef, useState } from 'react'
import { ImagePlus, X } from 'lucide-react'
import { prepareGalleryPhoto } from '@/lib/prepare-gallery-photo'
import { Button } from './ui/button'
import { Textarea } from './ui/textarea'

// The "Share a photo" page: pick photos, an optional note, "OK to show on your website", Send. Nothing is required
// but one photo or a note. Each photo is resized on the phone and sent on its own (app/api/photos/route.ts).

const MAX = 5
type Picked = { file: File; url: string }

export function CustomerPhotosForm({ orderId, firstName }: { orderId: string; firstName: string }) {
  const input = useRef<HTMLInputElement>(null)
  const [picked, setPicked] = useState<Picked[]>([])
  const [note, setNote] = useState('')
  const [consent, setConsent] = useState(false)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  useEffect(() => () => picked.forEach(p => URL.revokeObjectURL(p.url)), [picked])

  const add = (files: FileList | null) => {
    setError('')
    const room = MAX - picked.length
    const chosen = [...(files ?? [])].slice(0, room)
    if ((files?.length ?? 0) > room) setError(`Up to ${MAX} photos, please.`)
    setPicked(current => [...current, ...chosen.map(file => ({ file, url: URL.createObjectURL(file) }))])
  }
  const remove = (n: number) => setPicked(current => current.filter((_, i) => i !== n))

  async function send() {
    if (!picked.length && !note.trim()) return setError('Add a photo or a few words.')
    setError('')
    const submission = crypto.randomUUID()
    const post = async (file?: File) => {
      const form = new FormData()
      form.set('order', orderId)
      form.set('submission', submission)
      form.set('note', note.trim())
      form.set('consent', consent ? 'yes' : 'no')
      if (file) form.set('file', file)
      const r = await fetch('/api/photos', { method: 'POST', body: form })
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'Something went wrong. Please try again.')
    }
    try {
      if (!picked.length) {
        setBusy('Sending…')
        await post()
      }
      for (const [n, p] of picked.entries()) {
        setBusy(picked.length > 1 ? `Sending photo ${n + 1} of ${picked.length}…` : 'Sending…')
        await post(await prepareGalleryPhoto(p.file))
      }
      setDone(true)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy('')
    }
  }

  if (done)
    return (
      <div className="space-y-3 pt-6 text-center">
        <h1 className="font-sans text-2xl font-semibold text-foreground">Thank you, {firstName}! 🎂</h1>
        <p className="text-lg text-muted-foreground">We love seeing our cakes at your celebrations.</p>
      </div>
    )

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="font-sans text-2xl font-semibold text-foreground">Share a photo</h1>
        <p className="text-muted-foreground">We&apos;d love to see your cake at the party.</p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {picked.map((p, n) => (
          <div key={p.url} className="relative aspect-square overflow-hidden rounded-xl bg-secondary">
            <img src={p.url} alt={`Photo ${n + 1}`} className="size-full object-cover" />
            <button
              type="button"
              onClick={() => remove(n)}
              aria-label={`Remove photo ${n + 1}`}
              className="absolute right-1.5 top-1.5 flex !size-7 !min-h-0 !min-w-0 items-center justify-center rounded-full bg-black/60 !p-0 text-white"
              disabled={!!busy}
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
        ))}
        {picked.length < MAX && (
          <button
            type="button"
            onClick={() => input.current?.click()}
            disabled={!!busy}
            className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed text-muted-foreground"
          >
            <ImagePlus className="size-7" aria-hidden="true" />
            <span className="text-sm">{picked.length ? 'Add more' : 'Add photos'}</span>
          </button>
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={e => {
          add(e.target.files)
          e.target.value = ''
        }}
      />

      <div className="space-y-2">
        <label htmlFor="photo-note" className="block text-muted-foreground">
          Anything you&apos;d like to tell us? (optional)
        </label>
        <Textarea id="photo-note" rows={3} maxLength={1000} value={note} onChange={e => setNote(e.target.value)} />
      </div>

      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={consent}
          onChange={e => setConsent(e.target.checked)}
          className="mt-1 size-5 shrink-0"
        />
        <span>It&apos;s OK to show my photos on the Sunville Bakery website.</span>
      </label>

      <p role="alert" className="text-danger empty:hidden">
        {error}
      </p>
      <Button size="lg" className="h-14 w-full text-lg" onClick={() => void send()} disabled={!!busy}>
        {busy || 'Send'}
      </Button>
    </div>
  )
}
