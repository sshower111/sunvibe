"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Dialog, DialogTrigger, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Search, X, ChevronDown, Phone, MapPin, ImageIcon } from "lucide-react"
import { getStoreStatus, rankMenuSearch, menuDescription, menuCategories, menuGroup, menuLeadTime, type MenuProduct } from "@/lib/menu"

const phone = "tel:+17028899887"
const directions = "https://www.google.com/maps/search/?api=1&query=4053+Spring+Mountain+Rd+Las+Vegas+NV+89102"

function LeadTimeBadge({ product }: { product: MenuProduct }) {
  const lead = menuLeadTime(product)
  return <span className={'mb-3 inline-flex w-fit items-center self-start rounded-md px-2.5 py-1.5 text-left text-xs font-medium sm:mb-0 ' + (lead.tone === 'notice' ? 'bg-amber-100 text-amber-950' : lead.tone === 'daily' ? 'bg-green-50 text-green-900' : 'bg-secondary text-foreground')}>{lead.text}</span>
}

function ProductImage({ product, detail = false }: { product: MenuProduct; detail?: boolean }) {
  const [failed, setFailed] = useState(false)
  const valid = product.image && !product.image.includes('/placeholder') && !['null', 'undefined'].includes(product.image)
  return (
    <span className={detail ? "block aspect-[4/3] overflow-hidden rounded-xl bg-secondary" : "block h-28 w-24 shrink-0 overflow-hidden rounded-lg bg-secondary sm:h-44 sm:w-full sm:rounded-none"}>
      {valid && !failed ? <img src={product.image} alt={detail ? product.name : ""} loading={detail ? "eager" : "lazy"} decoding="async" onError={() => setFailed(true)} className="h-full w-full object-cover" /> :
        <span className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground"><ImageIcon aria-hidden="true" className="h-7 w-7" /><span className="text-center text-xs">Photo coming soon</span></span>}
    </span>
  )
}

export default function MenuPage({ initialProducts, initialError = false }: { initialProducts: MenuProduct[]; initialError?: boolean }) {
  const [products, setProducts] = useState<MenuProduct[]>(initialProducts)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(initialError)
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState("All Items")
  const [suggesting, setSuggesting] = useState(false)
  const [activeSuggestion, setActiveSuggestion] = useState(-1)
  const [hoursOpen, setHoursOpen] = useState(false)
  const [status, setStatus] = useState<ReturnType<typeof getStoreStatus> | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const requestRef = useRef<AbortController | null>(null)

  const loadProducts = useCallback(async () => {
    requestRef.current?.abort()
    const controller = new AbortController()
    requestRef.current = controller
    setLoading(true)
    setError(false)
    try {
      const response = await fetch('/api/products', { signal: controller.signal, cache: 'no-store' })
      if (!response.ok) throw new Error('Unable to load menu')
      const data = await response.json()
      if (!Array.isArray(data)) throw new Error('Invalid menu')
      setProducts(data)
    } catch {
      if (!controller.signal.aborted) setError(true)
    } finally {
      if (!controller.signal.aborted) setLoading(false)
    }
  }, [])

  useEffect(() => {
    return () => requestRef.current?.abort()
  }, [loadProducts])
  useEffect(() => {
    const update = () => setStatus(getStoreStatus(new Date()))
    update()
    const timer = setInterval(update, 60000)
    return () => clearInterval(timer)
  }, [])
  useEffect(() => {
    if (activeSuggestion >= 0) document.getElementById('suggestion-' + activeSuggestion)?.scrollIntoView({ block: 'nearest' })
  }, [activeSuggestion])

  const categories = menuCategories
  const ranked = rankMenuSearch(products, query)
  const suggestions = query.trim() ? ranked : []
  const showSuggestions = suggesting && suggestions.length > 0
  const filtered = ranked.filter(product => category === 'All Items' || menuGroup(product) === category)
  const selectSuggestion = (product: MenuProduct) => {
    setQuery(product.name)
    setCategory('All Items')
    setSuggesting(false)
    setActiveSuggestion(-1)
    searchRef.current?.focus()
  }
  const clearFilters = () => {
    setQuery('')
    setCategory('All Items')
    setSuggesting(false)
    setActiveSuggestion(-1)
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
    <main id="main-content" tabIndex={-1}>
      <div className="site-container page-space">
        <header className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <p className="mb-1 text-sm font-medium text-primary">Sunville Bakery · Las Vegas</p>
            <h1 className="heading-1">Fresh buns & pastries in Las Vegas</h1>
            <p className="mt-2 text-sm text-muted-foreground">Fresh daily buns. Call to confirm availability and pickup.</p>
            <button type="button" aria-expanded={hoursOpen} aria-controls="menu-hours" onClick={() => setHoursOpen(!hoursOpen)} className="mt-2 flex min-h-12 items-center gap-2 rounded text-sm font-medium focus-visible:outline-2 focus-visible:outline-primary">
              <span aria-hidden="true" className={'h-2 w-2 shrink-0 rounded-full ' + (status?.open ? 'bg-green-700' : 'bg-gray-500')} />
              {status?.text || 'View store hours'} <span className="text-muted-foreground">(Las Vegas)</span>
              <ChevronDown aria-hidden="true" className={'h-4 w-4 shrink-0 transition-transform ' + (hoursOpen ? 'rotate-180' : '')} />
            </button>
            <div id="menu-hours" hidden={!hoursOpen} className="mt-1 rounded-lg border bg-white p-4 text-sm leading-7">
              <p>Mon–Tue, Thu–Sun: 8 AM–8 PM</p><p>Wednesday: 8 AM–3 PM</p><p className="text-muted-foreground">All hours are Pacific Time.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 sm:pt-2">
            <Button asChild className="min-h-12"><a href={phone}><Phone aria-hidden="true" />Call to order</a></Button>
            <Button asChild variant="outline" className="min-h-12"><a href={directions} target="_blank" rel="noopener noreferrer"><MapPin aria-hidden="true" />Directions<span className="sr-only"> (opens a new tab)</span></a></Button>
          </div>
        </header>
        <a href={directions} target="_blank" rel="noopener noreferrer" className="mb-5 inline-block text-sm text-muted-foreground underline underline-offset-4">4053 Spring Mountain Rd, Las Vegas, NV 89102<span className="sr-only"> (opens a new tab)</span></a>

        <section aria-label="Find menu items" className="sticky top-16 z-30 -mx-4 mb-6 border-b bg-background px-4 py-3 md:top-24 sm:mx-0 sm:px-0">
          <div className="relative mb-3" onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) { setSuggesting(false); setActiveSuggestion(-1) }
          }}>
            <label htmlFor="menu-search" className="sr-only">Search menu by name, description, or category</label>
            <Search aria-hidden="true" className="absolute left-4 top-3.5 h-5 w-5 text-muted-foreground" />
            <Input id="menu-search" ref={searchRef} role="combobox" aria-autocomplete="list" aria-expanded={showSuggestions} aria-controls="menu-suggestions" aria-activedescendant={showSuggestions && activeSuggestion >= 0 ? 'suggestion-' + activeSuggestion : undefined}
              value={query} placeholder="Search cakes, buns, flavors…" autoComplete="off"
              onChange={event => { setQuery(event.target.value); setSuggesting(true); setActiveSuggestion(-1) }}
              onFocus={() => setSuggesting(true)}
              onKeyDown={event => {
                if (event.key === 'Escape') { setSuggesting(false); setActiveSuggestion(-1) }
                if (event.key === 'ArrowDown' && suggestions.length) { event.preventDefault(); setSuggesting(true); setActiveSuggestion(index => Math.min(index + 1, suggestions.length - 1)) }
                if (event.key === 'ArrowUp' && showSuggestions) { event.preventDefault(); setActiveSuggestion(index => Math.max(index - 1, -1)) }
                if (event.key === 'Enter' && showSuggestions && activeSuggestion >= 0 && suggestions[activeSuggestion]) { event.preventDefault(); selectSuggestion(suggestions[activeSuggestion]) }
              }}
              className="pl-11 pr-12" />
            {query && <button type="button" aria-label="Clear search" className="absolute right-0 top-0 flex h-12 w-12 items-center justify-center rounded-xl focus-visible:outline-2 focus-visible:outline-primary" onClick={() => { setQuery(''); setSuggesting(false); setActiveSuggestion(-1); searchRef.current?.focus() }}><X aria-hidden="true" className="h-5 w-5" /></button>}
            <ul id="menu-suggestions" hidden={!showSuggestions} role="listbox" aria-label="Suggested menu items" className="absolute left-0 right-0 top-full z-40 mt-1 max-h-64 overflow-y-auto rounded-xl border bg-white p-1 shadow-lg">
              {suggestions.map((product, index) => <li key={product.id} id={'suggestion-' + index} role="option" aria-selected={index === activeSuggestion} onMouseDown={event => event.preventDefault()} onClick={() => selectSuggestion(product)} className={'min-h-12 cursor-pointer rounded-lg px-3 py-3 text-sm hover:bg-secondary ' + (index === activeSuggestion ? 'bg-secondary' : '')}>
                <span className="font-medium">{product.name}</span><span className="ml-2 text-muted-foreground">{product.category}</span>
              </li>)}
            </ul>
          </div>
          <div className="mb-3"><Button asChild className="w-full sm:w-auto"><a href={phone} aria-label="Call Sunville Bakery to order: 702-889-9887"><Phone aria-hidden="true" />Call to order</a></Button></div>
          <div role="group" aria-label="Filter by category" className="flex gap-2 overflow-x-auto pb-2 sm:flex-wrap">
            {categories.map(item => <button key={item} type="button" aria-pressed={category === item} onClick={() => { setCategory(item); if (item === 'Custom Cakes') setQuery(''); setSuggesting(false); setActiveSuggestion(-1) }} className={'action-button shrink-0 border focus-visible:outline-2 focus-visible:outline-primary ' + (category === item ? 'border-primary bg-primary text-white' : 'border-border bg-white text-foreground hover:bg-secondary')}>{item}</button>)}
          </div>
        </section>

        {category === 'Custom Cakes' ? <section aria-labelledby="custom-menu-title" className="rounded-xl border border-amber-300 bg-amber-50 p-6 sm:p-8">
          <span className="inline-flex rounded-md bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-950">Requires 3-5 Days Notice</span>
          <h2 id="custom-menu-title" className="heading-2 mt-4">A cake made for your celebration</h2>
          <p className="mt-3 max-w-2xl text-muted-foreground">Choose a size, explore flavors, and request a quote.</p>
          <Button asChild className="mt-5 w-full sm:w-auto"><a href="/custom-cakes">Explore Custom Cakes & Inquire</a></Button>
          <p className="mt-3 text-sm text-muted-foreground">Availability and your final design are confirmed by the bakery.</p>
        </section> : loading ? <div role="status" aria-label="Loading menu"><p className="mb-4 text-sm text-muted-foreground">Loading menu…</p><div aria-hidden="true" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 8 }, (_, index) => <div key={index} className="h-40 rounded-xl bg-secondary motion-safe:animate-pulse sm:h-72" />)}</div></div> : error ?
          <div role="alert" className="rounded-xl border bg-white p-8 text-center"><h2 className="heading-2">We couldn’t load the menu</h2><p className="my-3 text-muted-foreground">Please try again, or call 702-889-9887 for help.</p><Button onClick={loadProducts}>Retry</Button></div> : <>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><p role="status" className="text-sm text-muted-foreground">{filtered.length} {filtered.length === 1 ? 'item' : 'items'}{category !== 'All Items' ? ' in ' + category : ''}{query.trim() ? ' matching “' + query.trim() + '”' : ''}</p>{(query || category !== 'All Items') && <Button variant="ghost" onClick={clearFilters}>Clear filters</Button>}</div>
            {filtered.length === 0 ? <div className="rounded-xl border bg-white px-4 py-12 text-center"><h2 className="heading-2">No items found</h2><p className="my-3 text-muted-foreground">Try another flavor or category, or explore the full menu.</p><Button onClick={clearFilters}>Clear filters</Button></div> :
              <div className="menu-card-grid grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map(product => <Dialog key={product.id}>
                  <article id={product.id} className="menu-card scroll-mt-80 relative focus-within:outline-2 focus-within:outline-primary">
                    <DialogTrigger asChild><button type="button" aria-label={'View details for ' + product.name} className="absolute inset-0 z-10 rounded-xl focus-visible:outline-2 focus-visible:outline-primary"><span className="sr-only">View details for {product.name}</span></button></DialogTrigger>
                    <ProductImage product={product} />
                    <div className="menu-card-copy flex min-w-0 flex-1 flex-col sm:p-4"><span className="mb-1 text-xs text-muted-foreground">{menuGroup(product)}</span><h2 className="heading-3">{product.name}</h2><span className="mb-3 mt-2 break-words text-sm leading-relaxed text-muted-foreground sm:my-0">{menuDescription(product.description) || 'View details'}</span><span className="mt-auto flex items-center justify-between gap-2 sm:pt-2"><span className="text-lg font-semibold text-primary">${product.price}</span><span className="text-xs font-medium underline underline-offset-4">Details</span></span></div>
                  </article>
                  <DialogContent className="max-h-[85dvh] overflow-y-auto bg-white">
                    <DialogTitle className="heading-3 pr-12">{product.name}</DialogTitle>
                    <ProductImage product={product} detail />
                    <p className="text-sm text-muted-foreground">{menuGroup(product)}</p>
                    <LeadTimeBadge product={product} />
                    <DialogDescription className="whitespace-pre-wrap break-words text-base leading-relaxed">{product.description || 'Call us for more details about this item.'}</DialogDescription>
                    <p className="text-2xl font-semibold text-primary">${product.price}</p>
                    <Button asChild className="min-h-12"><a href={phone}><Phone aria-hidden="true" />Call to order</a></Button>
                    <p className="text-xs text-muted-foreground">Call to confirm availability and arrange pickup.</p>
                  </DialogContent>
                </Dialog>)}
              </div>}
          </>}
      </div>
      </main>
    <Footer />
    </div>
  )
}
