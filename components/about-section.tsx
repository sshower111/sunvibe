"use client"

import { useState } from "react"
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"

export function AboutSection() {
  const [photoFailed, setPhotoFailed] = useState(false)
  return (
    <section id="about" aria-labelledby="about-heading" className="scroll-mt-20 bg-background section-space md:scroll-mt-28">
      <div className="site-container grid items-start gap-8 md:grid-cols-[1.5fr_1fr] md:gap-12">
        <div>
          <p className="mb-2 text-sm font-semibold text-primary">Our story</p>
          <h2 id="about-heading" className="heading-2 mb-5">A family tradition since 2002</h2>
          <div className="max-w-2xl space-y-4 text-base leading-relaxed text-foreground">
            <p>After honing his craft in San Francisco, Johnny brought his passion for Chinese baked goods to Las Vegas. Today, he leads the baking at Sunville, while May welcomes customers and decorates cakes.</p>
            <p>Our specialties include soft Asian chiffon cakes, mini mooncakes, and traditional favorites such as BBQ pork buns, pineapple buns, milk cream buns, and pork floss buns.</p>
            <p>Picking up a treat or planning for a celebration? Call us to discuss quantities, availability, and pickup timing.</p>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/menu" className={buttonVariants()}>Find your favorites</Link>
            <Link href="/contact" className={buttonVariants({ variant: "outline" })}>Plan your visit</Link>
          </div>
        </div>
        <figure className="overflow-hidden rounded-xl border bg-white">
          {!photoFailed ? <img src="https://s3-media0.fl.yelpcdn.com/bphoto/qGD2qXPzVo39_p2JpCohZQ/o.jpg" width={486} height={1000} alt="Johnny, Sunville Bakery’s founder, presenting a celebration cake" loading="lazy" decoding="async" onError={() => setPhotoFailed(true)} className="block h-auto w-full" /> : <div className="flex aspect-[4/3] items-center justify-center bg-secondary p-6 font-serif text-2xl text-primary">Meet our founder</div>}
          <figcaption className="p-5"><p className="font-serif text-xl font-semibold text-primary">Johnny</p><p className="mt-1 text-sm text-muted-foreground">Founder & head baker</p></figcaption>
        </figure>
      </div>
    </section>
  )
}
