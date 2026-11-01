import Link from 'next/link'
import { cakeCatalog } from '@/lib/cake-catalog'
import { CONFIRM_BADGE, INSTANT_NOTICE_HOURS, isInstantCake, ORDER_SIZES } from '@/lib/cake-order'
import { buttonVariants } from '@/components/ui/button'
import { CakePreview } from '@/components/cake-preview'
import { cn } from '@/lib/utils'

// Cakes on /menu: the sizes customers order and pay for online (/order-cake?size=…), then a separate way into
// custom cake quotes (/custom-cakes), so buying now and asking for a quote never look alike.
const cakes = cakeCatalog.filter(cake => (ORDER_SIZES as readonly string[]).includes(cake.value))

export function CakeLeadBadge({ size }: { size: string }) {
  const instant = isInstantCake(size)
  return (
    <span
      className={cn(
        'inline-flex w-fit items-center rounded-md px-2.5 py-1.5 text-left text-xs font-medium',
        instant ? 'bg-success-tint text-success' : 'bg-warning-tint text-warning',
      )}
    >
      {instant ? `Ready in ${INSTANT_NOTICE_HOURS} hours` : CONFIRM_BADGE}
    </span>
  )
}

export function MenuCakes() {
  return (
    <section aria-labelledby="menu-cakes-title" className="mb-10 space-y-6">
      <h2 id="menu-cakes-title" className="heading-2">
        Cakes
      </h2>
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cakes.map(cake => (
          <li key={cake.value} className="relative flex gap-4 rounded-lg border bg-card p-4 sm:flex-col">
            <div className="flex w-28 shrink-0 items-center justify-center rounded-md bg-surface p-2 sm:w-full sm:p-6">
              <CakePreview
                size={cake.value}
                flavor="Vanilla"
                fillingName="Mixed Fresh Fruit"
                design="simple"
                message=""
                className="h-auto w-full sm:max-w-56"
              />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <h3 className="font-serif text-xl text-primary">{cake.label}</h3>
              <p className="text-sm text-muted-foreground">
                Serves {cake.servings} · chiffon cake, your flavor and filling
              </p>
              <CakeLeadBadge size={cake.value} />
              <div className="mt-auto flex items-center justify-between gap-3 pt-2">
                <span className="price text-lg">from ${Math.min(...cake.prices)}</span>
                <Link
                  href={`/order-cake?size=${cake.value}`}
                  className={cn(buttonVariants(), 'after:absolute after:inset-0 after:rounded-lg')}
                  aria-label={`Order a ${cake.label}`}
                >
                  Order
                </Link>
              </div>
            </div>
          </li>
        ))}
      </ul>
      <div className="flex flex-col gap-4 rounded-lg bg-ink p-5 text-white sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <p className="font-serif text-2xl">Custom, decorated & tiered cakes</p>
          <p className="mt-1 text-white/80">Designed for your event and quoted by our decorators.</p>
        </div>
        <Link href="/custom-cakes" className={cn(buttonVariants({ variant: 'outline' }), 'shrink-0 bg-white text-ink')}>
          Request a quote
        </Link>
      </div>
    </section>
  )
}
