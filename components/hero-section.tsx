import Image from 'next/image'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// Edge-to-edge bakery photo. The shade sits behind the words only (bottom on phones, left on wider
// screens) so the baked goods stay bright. The gold band along the bottom is the ribbon on a pastry box.
export function HeroSection() {
  return (
    <section
      aria-labelledby="home-heading"
      className="relative isolate flex min-h-[clamp(34rem,88svh,48rem)] items-end overflow-hidden border-b-[6px] border-gold bg-ink [--heading-color:#fff] [--ring:#fff] md:items-center"
    >
      <Image
        src="/hero-bakery.jpg"
        alt=""
        fill
        priority
        sizes="100vw"
        className="-z-10 object-cover object-[65%_center]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-gradient-to-t from-ink/90 via-ink/55 to-ink/5 md:bg-gradient-to-r md:from-ink/85 md:via-ink/50 md:to-transparent"
      />
      <div className="site-container pb-[clamp(2rem,7vw,4rem)] pt-[calc(var(--header-height)+3rem)] text-white md:py-[calc(var(--header-height)+1rem)]">
        <div className="max-w-2xl">
          <p className="text-sm text-white/85 sm:text-base">Family-owned on Spring Mountain Road since 2002</p>
          <h1 id="home-heading" className="text-display mt-3 max-w-[14ch] sm:mt-4">
            Fresh buns & cakes in Las Vegas
          </h1>
          <p className="mt-4 max-w-[42ch] text-base leading-relaxed text-white/90 sm:mt-5 sm:text-lg">
            Pineapple buns, BBQ pork buns, egg tarts and chiffon celebration cakes from Johnny and May’s kitchen.
          </p>
          <div className="mt-6 grid gap-3 min-[360px]:grid-cols-2 sm:mt-8 sm:flex sm:flex-wrap">
            <Link
              href="/order-cake"
              className={cn(buttonVariants(), 'w-full px-3 min-[360px]:col-span-2 sm:w-auto sm:px-5')}
            >
              Order a cake
            </Link>
            <Link
              href="/menu"
              className={cn(
                buttonVariants({ variant: 'outline' }),
                'w-full border-white/70 bg-white/10 px-3 text-white backdrop-blur-sm hover:border-white hover:bg-white/20 active:bg-white/25 sm:w-auto sm:px-5',
              )}
            >
              See the menu
            </Link>
            <Link
              href="/custom-cakes"
              className={cn(
                buttonVariants({ variant: 'outline' }),
                'w-full border-white/70 bg-white/10 px-3 text-white backdrop-blur-sm hover:border-white hover:bg-white/20 active:bg-white/25 sm:w-auto sm:px-5',
              )}
            >
              Custom cake inquiry
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
