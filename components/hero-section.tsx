import Image from 'next/image'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { StoreStatus } from '@/components/store-status'
import { SITE } from '@/lib/site-info'
import { cn } from '@/lib/utils'

// Red signboard beside the bakery photo. Phones and tablets: photo on top, sign below.
// The gold band along the bottom is the ribbon on a pastry box.
export function HeroSection() {
  return (
    <section
      aria-labelledby="home-heading"
      className="grid border-b-[6px] border-gold bg-brand pt-[var(--header-height)] lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]"
    >
      <div className="relative aspect-[16/10] lg:order-last lg:aspect-auto lg:min-h-[clamp(32rem,78svh,44rem)]">
        <Image
          src="/hero-bakery.jpg"
          alt="Sponge cake and mooncakes on the bakery counter"
          fill
          priority
          sizes="(min-width: 1024px) 48vw, 100vw"
          className="object-cover object-[65%_center]"
        />
      </div>
      <div className="signboard flex flex-col justify-center py-[clamp(1.75rem,6vw,5rem)] pl-[max(var(--gutter),calc((100vw-var(--content-width))/2+var(--gutter)))] pr-[var(--gutter)] lg:pr-[clamp(2rem,4vw,4rem)]">
        <p className="text-sm text-white/85 sm:text-base">Family-owned on Spring Mountain Road since 2002</p>
        <h1 id="home-heading" className="text-display mt-3 max-w-[14ch] sm:mt-4">
          Fresh buns & cakes in Las Vegas
        </h1>
        <p className="mt-4 max-w-[42ch] text-base leading-relaxed text-white/90 sm:mt-5 sm:text-lg">
          Pineapple buns, BBQ pork buns, egg tarts and chiffon celebration cakes from Johnny and May’s kitchen.
        </p>
        <div className="mt-6 grid gap-3 min-[360px]:grid-cols-2 sm:mt-8 sm:flex sm:flex-wrap">
          <Link
            href="/menu"
            className={cn(
              buttonVariants(),
              'w-full px-3 bg-white text-brand hover:bg-white/90 active:bg-white/80 sm:w-auto sm:px-5',
            )}
          >
            See the menu
          </Link>
          <Link
            href="/custom-cakes"
            className={cn(
              buttonVariants({ variant: 'outline' }),
              'w-full px-3 border-white/70 bg-transparent text-white hover:border-white hover:bg-white/10 active:bg-white/15 sm:w-auto sm:px-5',
            )}
          >
            Plan a custom cake
          </Link>
        </div>
        <div className="mt-6 border-t border-white/25 pt-4 text-white sm:mt-8 sm:pt-5">
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
