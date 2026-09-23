"use client"

import { useState } from "react"
import Link from "next/link"

export function AboutSection() {
  const [photoFailed, setPhotoFailed] = useState(false)
  return (
    <section id="about" aria-labelledby="about-heading" className="scroll-mt-20 bg-background py-12 md:scroll-mt-28 md:py-16">
      <div className="mx-auto grid max-w-[1280px] items-start gap-8 px-4 sm:px-6 md:grid-cols-[1.5fr_1fr] md:gap-12 lg:px-8">
        <div>
          <p className="mb-2 text-sm font-semibold text-primary">Our story</p>
          <h2 id="about-heading" className="mb-5 font-serif text-3xl leading-tight text-primary md:text-4xl">A family tradition since 2002</h2>
          <div className="max-w-2xl space-y-4 text-base leading-relaxed text-foreground">
            <p>After honing his craft in San Francisco, Johnny brought his passion for Chinese baked goods to Las Vegas. Today, he leads the baking at Sunville, while May welcomes customers and decorates cakes.</p>
            <p>Our specialties include soft Asian chiffon cakes, mini mooncakes, and traditional favorites such as BBQ pork buns, pineapple buns, milk cream buns, and pork floss buns.</p>
            <p>Picking up a treat or planning for a celebration? Call us to discuss quantities, availability, and pickup timing.</p>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/menu" className="inline-flex min-h-11 items-center rounded-lg bg-primary px-5 font-medium text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">Find your favorites</Link>
            <Link href="/contact" className="inline-flex min-h-11 items-center px-3 font-medium text-primary underline underline-offset-4">Plan your visit</Link>
          </div>
        </div>
        <figure className="overflow-hidden rounded-xl border bg-white">
          {!photoFailed ? <img src="https://s3-media0.fl.yelpcdn.com/bphoto/qGD2qXPzVo39_p2JpCohZQ/o.jpg" alt="Johnny, Sunville Bakery’s founder and head baker" loading="lazy" decoding="async" onError={() => setPhotoFailed(true)} className="block h-auto w-full" /> : <div className="flex aspect-[4/3] items-center justify-center bg-secondary p-6 font-serif text-2xl text-primary">Meet our founder</div>}
          <figcaption className="p-5"><p className="font-serif text-xl font-semibold text-primary">Johnny</p><p className="mt-1 text-sm text-muted-foreground">Founder & head baker</p></figcaption>
        </figure>
      </div>
    </section>
  )
}
