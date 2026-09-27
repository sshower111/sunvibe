"use client"

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { prepareGalleryPhoto } from '@/lib/prepare-gallery-photo'

type Result = { name: string; error?: string }
export function GalleryPhotoUpload({ password, onSaved }: { password: string; onSaved: () => void }) {
  const picker = useRef<HTMLInputElement>(null)
  const busy = useRef(false)
  const [progress, setProgress] = useState('')
  const [results, setResults] = useState<Result[]>([])
  async function upload(files: File[]) {
    if (busy.current || !files.length) return
    busy.current = true
    setResults([])
    const completed: Result[] = []
    try {
      for (const [index, file] of files.entries()) {
        try {
          setProgress('Preparing photo ' + (index + 1) + ' of ' + files.length + '…')
          const photo = await prepareGalleryPhoto(file)
          const body = new FormData(); body.append('file', photo); body.append('password', password)
          setProgress('Uploading photo ' + (index + 1) + ' of ' + files.length + '…')
          const response = await fetch('/api/gallery/upload', { method: 'POST', body })
          const data = await response.json().catch(() => ({}))
          if (!response.ok || !data.url) throw new Error(data.error || 'Upload failed. Please try again.')
          const saved = await fetch('/api/gallery', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'add', url: data.url, password }) })
          if (!saved.ok) throw new Error('Photo uploaded but could not be added to the gallery. Please try again.')
          completed.push({ name: file.name })
        } catch (error) { completed.push({ name: file.name, error: error instanceof Error ? error.message : 'Upload failed. Check your connection and try again.' }) }
        setResults([...completed])
      }
      if (completed.some(result => !result.error)) onSaved()
    } finally { busy.current = false; setProgress(''); if (picker.current) picker.current.value = '' }
  }
  return <div className="space-y-3" aria-busy={!!progress}>
    <input ref={picker} type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif,image/avif,image/heic,image/heif,.heic,.heif" className="hidden" aria-label="Choose gallery photos" onChange={event => void upload(Array.from(event.target.files || []))} />
    <Button type="button" className="w-full min-h-12 sm:w-auto" disabled={!!progress} onClick={() => picker.current?.click()}>{progress ? 'Adding photos…' : 'Add photos'}</Button>
    <p className="text-sm text-muted-foreground">Choose photos from your phone. They upload automatically. iPhone HEIC photos are converted and large photos resized for you.</p>
    <p className="text-xs text-muted-foreground">Keep this page open until finished. Animated photos upload as a still image.</p>
    <div role="status" aria-live="polite">{progress || (results.length > 0 ? results.filter(result => !result.error).length + ' of ' + results.length + ' photos added to your gallery.' : '')}</div>
    {results.some(result => result.error) && <ul className="space-y-2 text-sm">{results.filter(result => result.error).map((result, index) => <li key={index} className="break-words"><strong>{result.name}:</strong> {result.error}</li>)}</ul>}
  </div>
}
