import Link from "next/link"

export function HeroSection() {
  return (
    <section aria-labelledby="home-heading" className="relative flex min-h-[500px] items-center overflow-hidden bg-primary pb-10 pt-24 md:min-h-[680px] md:pt-40">
      <div className="absolute inset-0" aria-hidden="true">
        <img src="/background2.jpg" alt="" fetchPriority="high" className="h-full w-full object-cover object-center" />
        <div className="absolute inset-0 bg-black/65" />
      </div>
      <div className="relative mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="mb-4 text-sm font-semibold tracking-wide text-white">Las Vegas · Family-owned since 2002</p>
          <h1 id="home-heading" className="font-serif text-4xl font-bold leading-tight text-white sm:text-5xl md:text-6xl">Fresh baked<br /><span className="text-accent">goodness daily</span></h1>
          <p className="mb-7 mt-5 max-w-xl text-base leading-relaxed text-white sm:text-lg">Asian pastries, soft cakes, and traditional buns. Discover your favorites from our family bakery in Las Vegas.</p>
          <div className="flex flex-wrap gap-3">
            <Link href="/menu" className="inline-flex min-h-12 items-center justify-center rounded-lg bg-accent px-6 font-semibold text-accent-foreground hover:bg-accent/90 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">Explore the menu</Link>
            <a href="tel:+17028899887" className="inline-flex min-h-12 items-center justify-center rounded-lg border border-white bg-black/20 px-6 font-semibold text-white hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">Call to order</a>
          </div>
          <Link href="#about" className="mt-5 inline-flex min-h-11 items-center text-sm text-white underline underline-offset-4">Meet the family behind the bakery</Link>
        </div>
      </div>
    </section>
  )
}
