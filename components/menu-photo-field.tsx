'use client'

import { useRef, useState } from 'react'
import { ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { prepareGalleryPhoto } from '@/lib/prepare-gallery-photo'

const PLACEHOLDER = '/placeholder.svg'
export const hasMenuPhoto = (url: string) => !!url && !url.includes('placeholder')
/**
 * Menu photos show up to about 400px wide (800 real pixels on phones and retina screens).
 * A photo with a shorter side under this looks blurry when stretched to fill the frame.
 */
const SHARP_MIN_PX = 600
export const isLowResPhoto = (img: HTMLImageElement) => Math.min(img.naturalWidth, img.naturalHeight) < SHARP_MIN_PX

/** Small square thumbnail for the admin menu list, flagging photos too small to look sharp. */
export function MenuPhotoThumb({ url }: { url?: string }) {
  const [lowRes, setLowRes] = useState(false)
  if (!url || !hasMenuPhoto(url))
    return (
      <span className="flex size-14 shrink-0 flex-col items-center justify-center rounded-lg border border-dashed text-[10px] leading-tight text-muted-foreground">
        <ImageIcon aria-hidden="true" className="size-4" />
        No photo
      </span>
    )
  return (
    <span className="relative size-14 shrink-0">
      <img
        src={url}
        alt=""
        loading="lazy"
        onLoad={event => setLowRes(isLowResPhoto(event.currentTarget))}
        className="size-14 rounded-lg object-cover"
      />
      {lowRes && (
        <span
          title="This photo is small and looks blurry on the menu. Replace it with a larger photo."
          className="absolute inset-x-0 bottom-0 rounded-b-lg bg-amber-100 text-center text-[10px] font-medium leading-4 text-amber-900"
        >
          Blurry
        </span>
      )}
    </span>
  )
}

/**
 * Photo for a menu item in the admin portal. The photo uploads as soon as it is chosen
 * (converted from HEIC and resized on the device) and `onChange` gets its public URL;
 * the item itself is only changed when the admin saves the form.
 */
export function MenuPhotoField({
  value,
  onChange,
  onBusyChange,
  disabled = false,
}: {
  value: string
  onChange: (url: string) => void
  onBusyChange?: (busy: boolean) => void
  disabled?: boolean
}) {
  const picker = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [lowRes, setLowRes] = useState(false)
  function setUploading(next: boolean) {
    setBusy(next)
    onBusyChange?.(next)
  }
  async function upload(file: File) {
    setUploading(true)
    setError('')
    try {
      const photo = await prepareGalleryPhoto(file)
      const form = new FormData()
      form.set('file', photo)
      form.set('folder', 'menu')
      const response = await fetch('/api/gallery/upload', { method: 'POST', body: form })
      const data = await response.json().catch(() => ({}))
      if (response.status === 401) throw new Error('Your session ended. Please sign in again.')
      if (!response.ok || !data.url) throw new Error(data.error || 'Upload failed. Please try again.')
      onChange(data.url)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed. Check your connection and try again.')
    } finally {
      setUploading(false)
      if (picker.current) picker.current.value = ''
    }
  }
  const shown = hasMenuPhoto(value)
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Photo</p>
      <div className="flex items-center gap-3">
        <div className="flex size-28 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted text-muted-foreground">
          {shown ? (
            <img
              src={value}
              alt="Menu item photo"
              onLoad={event => setLowRes(isLowResPhoto(event.currentTarget))}
              className="h-full w-full object-cover"
            />
          ) : (
            <ImageIcon aria-hidden="true" className="size-6" />
          )}
        </div>
        <div className="flex flex-col gap-2">
          <input
            ref={picker}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/avif,image/heic,image/heif,.heic,.heif"
            className="hidden"
            aria-label="Choose a photo for this item"
            onChange={event => {
              const file = event.target.files?.[0]
              if (file) void upload(file)
            }}
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={disabled || busy}
            onClick={() => picker.current?.click()}
          >
            {busy ? 'Uploading…' : shown ? 'Change photo' : 'Add photo'}
          </Button>
          {shown && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={disabled || busy}
              onClick={() => onChange(PLACEHOLDER)}
            >
              Remove photo
            </Button>
          )}
        </div>
      </div>
      {shown && lowRes && (
        <p className="rounded-md bg-amber-50 p-2 text-sm text-amber-900">
          This photo is small, so it will look blurry on the menu. Use a larger photo if you have one (a phone photo
          straight from the camera is best).
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        The menu shows photos as squares, so keep the whole item in the middle of the photo.{' '}
        {shown ? 'Save to show this photo on the menu.' : 'Without a photo the menu shows “Photo coming soon”.'}
      </p>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  )
}
