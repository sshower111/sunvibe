"use client"

import { useId, useRef, useState } from 'react'
import { Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

type EditableProduct = { id: string; name: string; description: string; price: string; priceId: string }
export function AdminProductEditor({ product, password, onSaved, disabled = false }: {
  product: EditableProduct; password: string; onSaved: (product: EditableProduct) => void; disabled?: boolean
}) {
  const id = useId()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(product.name)
  const [description, setDescription] = useState(product.description || '')
  const [price, setPrice] = useState(product.price)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const attempt = useRef<{ draft: string; id: string } | null>(null)
  const inFlight = useRef(false)
  const changed = name.trim() !== product.name || description.trim() !== (product.description || '') || Number(price) !== Number(product.price)
  function changeOpen(next: boolean) {
    if (inFlight.current) return
    if (next) { setName(product.name); setDescription(product.description || ''); setPrice(product.price); setError(''); setSaved(false); attempt.current = null }
    setOpen(next)
  }
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (inFlight.current) return
    if (!name.trim()) { setError('Enter an item name.'); return }
    if (!/^\d{1,6}(?:\.\d{1,2})?$/.test(price)) { setError('Enter a valid price with at most two decimal places.'); return }
    inFlight.current = true
    setSaving(true); setError('')
    const draft = JSON.stringify({ name: name.trim(), description: description.trim(), price })
    if (attempt.current?.draft !== draft) attempt.current = { draft, id: crypto.randomUUID() }
    try {
      const response = await fetch('/api/admin/products/update', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: product.id, ...JSON.parse(draft), password, requestId: attempt.current.id }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to save this item.')
      onSaved(data.product); setOpen(false); setSaved(true)
    } catch (error) { setError(error instanceof Error ? error.message : 'Unable to save this item. Please try again.') }
    finally { inFlight.current = false; setSaving(false) }
  }
  return <div>
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogTrigger asChild><Button size="sm" variant="outline" disabled={disabled} aria-label={'Edit item: ' + product.name}><Pencil aria-hidden="true" />Edit item</Button></DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto bg-white" showCloseButton={!saving} onEscapeKeyDown={event => { if (saving) event.preventDefault() }} onInteractOutside={event => { if (saving) event.preventDefault() }}>
        <DialogTitle className="heading-2 pr-10">Edit menu item</DialogTitle>
        <DialogDescription>Update the name, description, and price together.</DialogDescription>
        <form onSubmit={save} className="space-y-4" aria-busy={saving}>
          <div><label htmlFor={id + '-name'} className="mb-2 block text-sm font-medium">Item name</label><Input id={id + '-name'} value={name} onChange={event => setName(event.target.value)} maxLength={250} required disabled={saving} autoFocus /></div>
          <div><label htmlFor={id + '-description'} className="mb-2 block text-sm font-medium">Description</label><Textarea id={id + '-description'} value={description} onChange={event => setDescription(event.target.value)} maxLength={2000} rows={4} disabled={saving} aria-describedby={id + '-help'} /><p id={id + '-help'} className="mt-1 text-xs text-muted-foreground">Leave blank to remove the description.</p></div>
          <div><label htmlFor={id + '-price'} className="mb-2 block text-sm font-medium">Price (USD)</label><Input id={id + '-price'} type="text" inputMode="decimal" value={price} onChange={event => setPrice(event.target.value)} required disabled={saving} maxLength={9} placeholder="0.00" /></div>
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          <div className="flex flex-col gap-3 sm:flex-row"><Button type="submit" disabled={saving || !changed} className="sm:flex-1">{saving ? 'Saving…' : 'Save changes'}</Button><Button type="button" variant="outline" disabled={saving} onClick={() => changeOpen(false)}>Cancel</Button></div>
        </form>
      </DialogContent>
    </Dialog>
    {saved && <p role="status" className="mt-2 text-sm text-green-800">Item saved.</p>}
  </div>
}
