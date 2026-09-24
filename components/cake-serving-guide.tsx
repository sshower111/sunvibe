"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { NativeSelect } from '@/components/ui/select'
import { cakeCatalog, priceGroups, type CakeSpec } from '@/lib/cake-catalog'

export function CakeServingGuide() {
  const [category, setCategory] = useState<CakeSpec['category']>('Round')
  const [selected, setSelected] = useState('6-inch')
  const cake = cakeCatalog.find(item => item.value === selected)!
  const money = (value: number) => `$${value.toFixed(2)}`
  return <section id="serving-guide" className="border-y bg-card" aria-labelledby="size-heading"><div className="site-container section-space">
    <div className="max-w-2xl"><h2 id="size-heading" className="heading-2">Sizes & prices</h2><p className="mt-3 text-muted-foreground">Choose a style and size. Servings are approximate.</p></div>
    <div role="group" aria-label="Cake style" className="mt-6 flex flex-wrap gap-2">{(['Round', 'Sheet', 'Multi-tier'] as const).map(value => <Button key={value} type="button" aria-pressed={category === value} variant={category === value ? 'default' : 'outline'} onClick={() => { setCategory(value); setSelected(cakeCatalog.find(cake => cake.category === value)!.value) }}>{value === 'Multi-tier' ? 'Tiered cakes' : value + ' cakes'}</Button>)}</div>
    <div className="mt-6 grid items-start gap-6 lg:grid-cols-[0.8fr_1.2fr]">
      <div className="rounded-xl border bg-background p-5 sm:p-6"><label htmlFor="guide-cake-size" className="mb-2 block text-sm font-semibold">Select a {category.toLowerCase()} cake size</label><NativeSelect id="guide-cake-size" value={selected} onChange={event => setSelected(event.target.value)}>{cakeCatalog.filter(item => item.category === category).map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</NativeSelect>
        <div aria-live="polite" className="mt-5"><h3 className="heading-3">{cake.label}</h3><div className="mt-4 grid grid-cols-2 gap-3">{cake.party != null && <div className="rounded-lg border bg-card p-4"><p className="text-3xl font-semibold text-primary">{cake.party}</p><p className="mt-1 text-sm">Party servings</p></div>}{cake.wedding != null && <div className="rounded-lg border bg-card p-4"><p className="text-3xl font-semibold text-primary">{cake.wedding}</p><p className="mt-1 text-sm">Wedding servings</p></div>}</div></div>
        <p className="mt-4 text-sm text-muted-foreground">{category === 'Round' ? 'Party slices: approximately 1.5" × 2". Wedding slices: approximately 1" × 2".' : category === 'Sheet' ? 'Sheet cake servings use standard 2" × 2" party slices.' : 'All tiered cake serving counts use standard wedding-size slices.'}</p>
      </div>
      <div aria-live="polite" className="rounded-xl border p-5 sm:p-6"><h3 className="heading-3">{cake.label} pricing</h3>{category === 'Multi-tier' ? <><p className="mt-4 text-3xl font-semibold text-primary">{money(cake.prices[0])}</p><p className="mt-3 text-sm text-muted-foreground">Listed price for this tier combination.</p></> : <dl className="mt-4 divide-y">{priceGroups.map((group, index) => <div key={group} className="flex items-start justify-between gap-4 py-3 text-sm"><dt className="max-w-xs">{group}</dt><dd className="shrink-0 font-semibold tabular-nums text-primary">{money(cake.prices[index])}</dd></div>)}</dl>}<p className="mt-4 text-sm text-muted-foreground">Final pricing depends on your design, filling, and delivery.</p></div>
    </div>
    {category === 'Multi-tier' && <p className="mt-5 text-sm text-muted-foreground"><a href="tel:+17028899887" className="inline-flex min-h-12 items-center font-semibold text-primary underline underline-offset-4">Call for 4+ tier cakes: 702-889-9887</a></p>}
    <details className="mt-6 rounded-xl border"><summary className="min-h-12 cursor-pointer px-5 py-4 font-semibold text-primary">Compare all cake sizes</summary><div className="grid gap-3 p-4 pt-0 sm:grid-cols-2 lg:grid-cols-3">{cakeCatalog.map(item => <button key={item.value} type="button" aria-label={`View ${item.label} pricing`} onClick={() => { setCategory(item.category); setSelected(item.value); document.getElementById('guide-cake-size')?.focus() }} className="min-h-12 rounded-lg border bg-background p-4 text-left transition-colors hover:bg-secondary"><span className="block font-semibold text-primary">{item.label}</span><span className="mt-1 block text-sm">{item.party != null ? `${item.party} party servings` : ''}{item.party != null && item.wedding != null ? ' / ' : ''}{item.wedding != null ? `${item.wedding} wedding servings` : ''}</span><span className="mt-2 block text-sm font-medium">{item.prices.length > 1 ? `${money(item.prices[0])}–${money(item.prices[3])}` : money(item.prices[0])}</span></button>)}</div></details>
    <details className="mt-6 rounded-xl border border-primary/15 bg-secondary p-5"><summary className="min-h-12 cursor-pointer font-semibold text-primary">Delivery fees</summary><div className="mt-3 grid gap-3 text-sm sm:grid-cols-2"><p><strong>Local delivery (within 10 miles): $30</strong></p><p><strong>Casino / hotel delivery: $50</strong></p></div><p className="mt-3 text-sm text-muted-foreground">Delivery availability is confirmed with your quote.</p></details>
  </div></section>
}
