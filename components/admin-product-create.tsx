'use client'
import { useState, useRef, useId } from 'react'
import { Button } from './ui/button'
import { adminPost } from '@/lib/admin-api'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'
import { MenuPhotoField } from './menu-photo-field'
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogTrigger } from './ui/dialog'
export function AdminProductCreate({ onSaved }: { onSaved: () => void }) {
  const [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [image, setImage] = useState('/placeholder.svg'),
    [uploading, setUploading] = useState(false)
  const requestId = useRef(''),
    id = useId()
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (busy || uploading) return
    setBusy(true)
    setError('')
    const form = new FormData(e.currentTarget)
    if (!requestId.current) requestId.current = crypto.randomUUID()
    try {
      await adminPost('/api/admin/menu', {
        ...Object.fromEntries(form),
        image,
        action: 'create',
        requestId: requestId.current,
      })
      onSaved()
      setOpen(false)
      requestId.current = ''
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to add item')
    } finally {
      setBusy(false)
    }
  }
  return (
    <Dialog
      open={open}
      onOpenChange={v => {
        if (!busy) {
          setOpen(v)
          if (v) {
            requestId.current = ''
            setError('')
            setImage('/placeholder.svg')
          }
        }
      }}
    >
      <DialogTrigger asChild>
        <Button>Add menu item</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogTitle>Add menu item</DialogTitle>
        <DialogDescription>Add a photo, name, price and description to your menu.</DialogDescription>
        <form onSubmit={submit} className="space-y-4" aria-busy={busy}>
          <MenuPhotoField value={image} onChange={setImage} onBusyChange={setUploading} disabled={busy} />
          {(['name', 'price', 'category'] as const).map(field => (
            <div key={field}>
              <label className="block mb-2" htmlFor={id + field}>
                {{ name: 'Item name', price: 'Price (USD)', category: 'Category' }[field]}
              </label>
              <Input
                id={id + field}
                name={field}
                required
                defaultValue={field === 'category' ? 'Buns' : ''}
                maxLength={field === 'name' ? 250 : field === 'category' ? 150 : 9}
                inputMode={field === 'price' ? 'decimal' : undefined}
                disabled={busy}
              />
            </div>
          ))}
          <div>
            <label htmlFor={id + 'description'} className="block mb-2">
              Description
            </label>
            <Textarea id={id + 'description'} name="description" maxLength={2000} disabled={busy} />
          </div>
          {error && <p role="alert">{error}</p>}
          <Button type="submit" disabled={busy || uploading}>
            {busy ? 'Saving…' : 'Add item'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
