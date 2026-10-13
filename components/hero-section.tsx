import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// Edge-to-edge photo hero. The shade sits behind the text only (bottom on phones, left on
// larger screens) so the baked goods stay bright and the words stay easy to read.
export function HeroSection() {
  return (
    <section
      aria-labelledby="home-heading"
      className="relative isolate flex [--ring:#fff] min-h-[clamp(32rem,85svh,46rem)] items-end overflow-hidden bg-primary md:items-center"
    >
      <Image
        src="/background2.jpg"
        alt=""
        fill
        priority
        sizes="100vw"
        className="-z-10 object-cover object-[65%_center]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-gradient-to-t from-black/85 via-black/45 to-black/10 md:bg-gradient-to-r md:from-black/80 md:via-black/45 md:to-transparent"
      />
      <div className="site-container pb-[clamp(2.5rem,8vw,4rem)] pt-[calc(var(--header-height)+3rem)] md:py-[calc(var(--header-height)+1rem)]">
        <div className="max-w-3xl">
          <p className="eyebrow text-white/85">Las Vegas · Family-owned since 2002</p>
          <h1 id="home-heading" className="text-display heading-on-dark mt-4">
            Fresh buns & cakes <span className="block text-accent">in Las Vegas</span>
          </h1>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link
              href="/custom-cakes"
              className={cn(
                buttonVariants(),
                'w-full bg-white text-primary hover:bg-white/90 active:bg-white/80 sm:w-auto',
              )}
            >
              Inquire for Custom Cakes <ArrowRight aria-hidden="true" />
            </Link>
            <Link
              href="/menu"
              className={cn(
                buttonVariants({ variant: 'outline' }),
                'w-full border-white/70 bg-white/10 text-white backdrop-blur-sm hover:border-white hover:bg-white/20 active:bg-white/25 sm:w-auto',
              )}
            >
              Explore Daily Menu
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
