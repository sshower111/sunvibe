import Image from 'next/image'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { StoreStatus } from '@/components/store-status'
import { SITE } from '@/lib/site-info'
import { cn } from '@/lib/utils'

// Red signboard beside the bakery photo. Phones: photo on top, sign below.
// The gold band along the bottom is the ribbon on a pastry box.
export function HeroSection() {
  return (
    <section
      aria-labelledby="home-heading"
      className="grid border-b-[6px] border-gold bg-brand pt-[var(--header-height)] md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]"
    >
      <div className="relative aspect-[4/3] md:order-last md:aspect-auto md:min-h-[clamp(32rem,78svh,44rem)]">
        <Image
          src="/hero-bakery.jpg"
          alt="Sponge cake and mooncakes on the bakery counter"
          fill
          priority
          sizes="(min-width: 768px) 48vw, 100vw"
          className="object-cover object-[65%_center]"
        />
      </div>
      <div className="signboard flex flex-col justify-center py-[clamp(2.5rem,6vw,5rem)] pl-[max(var(--gutter),calc((100vw-var(--content-width))/2+var(--gutter)))] pr-[var(--gutter)] md:pr-[clamp(2rem,4vw,4rem)]">
        <p className="text-base text-white/85">Family-owned on Spring Mountain Road since 2002</p>
        <h1 id="home-heading" className="text-display mt-4 max-w-[14ch]">
          Fresh buns & cakes in Las Vegas
        </h1>
        <p className="mt-5 max-w-[42ch] text-lg leading-relaxed text-white/90">
          Pineapple buns, BBQ pork buns, egg tarts and chiffon celebration cakes from Johnny and May’s kitchen.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Link
            href="/menu"
            className={cn(
              buttonVariants(),
              'w-full bg-white text-brand hover:bg-white/90 active:bg-white/80 sm:w-auto',
            )}
          >
            See the menu
          </Link>
          <Link
            href="/custom-cakes"
            className={cn(
              buttonVariants({ variant: 'outline' }),
              'w-full border-white/70 bg-transparent text-white hover:border-white hover:bg-white/10 active:bg-white/15 sm:w-auto',
            )}
          >
            Plan a custom cake
          </Link>
        </div>
        <div className="mt-8 border-t border-white/25 pt-5 text-white">
          <StoreStatus />
          <p className="mt-1 flex flex-wrap gap-x-5 text-sm text-white/85">
            <a
              href={SITE.directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-11 underline-offset-4 hover:underline"
            >
              {SITE.street}
              <span className="sr-only"> (opens a new tab)</span>
            </a>
            <a href={SITE.phoneHref} className="min-h-11 underline-offset-4 hover:underline">
              {SITE.phone}
            </a>
          </p>
        </div>
      </div>
    </section>
  )
}
