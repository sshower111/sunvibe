"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { NativeSelect } from '@/components/ui/select'
import { cakeCatalog, priceGroups, type CakeSpec } from '@/lib/cake-catalog'

export function CakeServingGuide() {
  const [category, setCategory] = useState<CakeSpec['category']>('Round')
  const [selected, setSelected] = useState('8-inch')
  const cake = cakeCatalog.find(item => item.value === selected)!
  const money = (value: number) => `$${value.toFixed(2)}`
  return <section id="serving-guide" className="border-y bg-card" aria-labelledby="size-heading"><div className="site-container section-space">
    <div className="max-w-2xl"><h2 id="size-heading" className="heading-2">Sizes & prices</h2><p className="mt-3 text-muted-foreground">Choose a style and size. Servings are approximate.</p></div>
    <div role="group" aria-label="Cake style" className="mt-6 flex flex-wrap gap-2">{(['Round', 'Sheet', 'Multi-tier'] as const).map(value => <Button key={value} type="button" aria-pressed={category === value} variant={category === value ? 'default' : 'outline'} onClick={() => { setCategory(value); setSelected(value === 'Round' ? '8-inch' : cakeCatalog.find(cake => cake.category === value)!.value) }}>{value === 'Multi-tier' ? 'Tiered cakes' : value + ' cakes'}</Button>)}</div>
    <div className="mt-6 grid items-start gap-6 lg:grid-cols-[0.8fr_1.2fr]">
      <div className="rounded-xl border bg-background p-5 sm:p-6"><label htmlFor="guide-cake-size" className="mb-2 block text-sm font-semibold">Select a {category.toLowerCase()} cake size</label><NativeSelect id="guide-cake-size" value={selected} onChange={event => setSelected(event.target.value)}>{cakeCatalog.filter(item => item.category === category).map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</NativeSelect>
        <div aria-live="polite" className="mt-5"><h3 className="heading-3">{cake.label}</h3><div className="mt-4 grid grid-cols-2 gap-3"><div className="rounded-lg border bg-card p-4"><p className="text-3xl font-semibold text-primary">{cake.servings}</p><p className="mt-1 text-sm">Servings</p></div></div></div>
        <p className="mt-4 text-sm text-muted-foreground">{'Servings are approximate, based on 1.5" × 2" slices.'}</p>
      </div>
      <div aria-live="polite" className="rounded-xl border p-5 sm:p-6"><h3 className="heading-3">{cake.label} pricing</h3>{category === 'Multi-tier' ? <><p className="mt-4 text-3xl font-semibold text-primary">{money(cake.prices[0])}</p><p className="mt-3 text-sm text-muted-foreground">Listed price for this tier combination.</p></> : <dl className="mt-4 divide-y">{priceGroups.map((group, index) => <div key={group} className="flex items-start justify-between gap-4 py-3 text-sm"><dt className="max-w-xs">{group}</dt><dd className="shrink-0 font-semibold tabular-nums text-primary">{money(cake.prices[index])}</dd></div>)}</dl>}<p className="mt-4 text-sm text-muted-foreground">Final pricing depends on your design, filling, and delivery.</p></div>
    </div>
    {category === 'Multi-tier' && <p className="mt-5 text-sm text-muted-foreground"><a href="tel:+17028899887" className="inline-flex min-h-12 items-center font-semibold text-primary underline underline-offset-4">Need 4+ tiers or a different combination? Call 702-889-9887</a></p>}
    {/* Only the selected style is compared, so phones show 3–8 rows instead of all 16 cakes. */}
    <details className="mt-6 rounded-xl border bg-background"><summary className="min-h-12 cursor-pointer px-5 py-4 font-semibold text-primary">Compare {category === 'Multi-tier' ? 'tiered cake' : category.toLowerCase() + ' cake'} sizes</summary>
      <ul className="divide-y border-t px-2 sm:px-3">{cakeCatalog.filter(item => item.category === category).map(item => <li key={item.value}><button type="button" aria-pressed={item.value === selected} aria-label={`View ${item.label} pricing`} onClick={() => { setSelected(item.value); document.getElementById('guide-cake-size')?.focus() }} className={'flex min-h-12 w-full items-center justify-between gap-3 rounded-lg px-3 py-3 text-left text-sm transition-colors hover:bg-secondary ' + (item.value === selected ? 'bg-secondary' : '')}><span><span className="block font-semibold text-primary">{item.label}</span><span className="block text-muted-foreground">{item.servings} servings</span></span><span className="shrink-0 font-medium tabular-nums">{item.prices.length > 1 ? `${money(Math.min(...item.prices))}–${money(Math.max(...item.prices))}` : money(item.prices[0])}</span></button></li>)}</ul>
    </details>
    <details className="mt-4 rounded-xl border bg-background"><summary className="min-h-12 cursor-pointer px-5 py-4 font-semibold text-primary">Delivery fees</summary>
      <div className="border-t px-5 pb-5"><dl className="divide-y text-sm"><div className="flex items-center justify-between gap-4 py-3"><dt>Local delivery (within 10 miles)</dt><dd className="shrink-0 font-semibold tabular-nums text-primary">$30</dd></div><div className="flex items-center justify-between gap-4 py-3"><dt>Casino / hotel delivery</dt><dd className="shrink-0 font-semibold tabular-nums text-primary">$50</dd></div></dl><p className="border-t pt-3 text-sm text-muted-foreground">Delivery availability is confirmed with your quote.</p></div>
    </details>
  </div></section>
}
