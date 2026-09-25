"use client"
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { SeasonalBannerConfig } from '@/lib/seasonal'
export function AdminBanners({ password }: { password: string }) {
  const [banners, setBanners] = useState<SeasonalBannerConfig[]>([])
  const [loaded, setLoaded] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  async function load() {
    setBusy(true)
    try {
      const response = await fetch('/api/admin/banners', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password, action: 'read' }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)
      setBanners(data.banners); setLoaded(true); setMessage('')
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not load banners') }
    finally { setBusy(false) }
  }
  useEffect(() => { void load() }, [password])
  function update(index: number, patch: Partial<SeasonalBannerConfig>) { setBanners(items => items.map((item, i) => i === index ? { ...item, ...patch } : item)) }
  async function save(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setMessage('')
    try {
      const response = await fetch('/api/admin/banners', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password, action: 'save', banners }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)
      setMessage('Banners saved. Changes appear on the next homepage visit or refresh.')
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not save banners') }
    finally { setBusy(false) }
  }
  return <section className="rounded-xl border bg-card p-5"><h2 className="heading-2">Homepage banners</h2><p className="my-3 text-sm">Enabled banners appear during their dates in Las Vegas time. The first matching banner wins. Save changes to apply your edits.</p><p className="text-sm">Closing a banner hides it for 24 hours. It can appear again on the next visit while its campaign is active.</p>
    <p role="status" className="my-3">{message}</p>
    {!loaded ? <Button onClick={load} disabled={busy}>{busy ? 'Loading…' : 'Retry loading'}</Button> : <form onSubmit={save}><fieldset disabled={busy} className="space-y-6">
      {banners.map((banner, index) => <fieldset key={banner.id} className="space-y-4 rounded-lg border p-4"><legend className="px-2 font-semibold">{banner.id}</legend>
        <label className="flex min-h-12 items-center gap-3"><input type="checkbox" checked={banner.enabled !== false} onChange={event => update(index, { enabled: event.target.checked })} />Enabled</label>
        {(['headline', 'message', 'ctaLabel', 'ctaHref', 'startsAt', 'endsAt', 'productId'] as const).map(field => <label key={field} className="block text-sm font-medium">{{ headline: 'Headline', message: 'Message', ctaLabel: 'Button text', ctaHref: 'Button link (/menu or tel:+17028899887)', startsAt: 'Start date', endsAt: 'End date', productId: 'Gift-box Stripe product ID (optional)' }[field]}
          {field === 'message' ? <Textarea required maxLength={350} value={banner.message} onChange={event => update(index, { message: event.target.value })} /> : <Input type={field.endsWith('At') ? 'date' : 'text'} required={field !== 'productId'} value={banner[field] ?? ''} onChange={event => update(index, { [field]: field === 'productId' ? event.target.value || undefined : event.target.value })} />}</label>)}
        <Button type="button" variant="outline" onClick={() => setBanners(items => items.filter((_, i) => i !== index))}>Remove banner</Button>
      </fieldset>)}
      <div className="flex flex-wrap gap-3"><Button type="button" variant="outline" onClick={() => setBanners(items => [...items, { id: 'festival-' + crypto.randomUUID(), enabled: false, headline: '', message: '', ctaLabel: 'Call (702) 889-9887', ctaHref: 'tel:+17028899887', startsAt: '', endsAt: '' }])}>Add banner</Button><Button type="submit">{busy ? 'Saving…' : 'Save banners'}</Button></div>
    </fieldset></form>}
  </section>
}
