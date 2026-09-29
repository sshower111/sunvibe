"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { canOptimizeGalleryImage } from "@/lib/gallery-images"

// Signature items shown under "Our story". Links jump to the item on the menu page (/menu#<product id>).
// If a menu photo changes in Admin, update the matching image URL here.
const favorites = [
  { name: 'BBQ Pork Bun', note: '叉燒包 · Savory classic', href: '/menu#prod_TBefDXpMZYaNs2', image: 'https://pbamlokgnomamommrofy.supabase.co/storage/v1/object/public/bakery-images/migrated/230c10af71eee8de-e67a0a8a6dd5cee1.jpg' },
  { name: 'Pineapple Bun', note: '菠蘿包 · Crackly sweet top', href: '/menu#prod_TBefJiLFwDD33u', image: 'https://i.ibb.co/dshSM9xk/pineBun.webp' },
  { name: 'Mooncakes', note: '月餅 · Red bean, lotus & more', href: '/menu#prod_TBefBiX4QUqIT5', image: 'https://pbamlokgnomamommrofy.supabase.co/storage/v1/object/public/bakery-images/migrated/60a9fe48b611b3bd-7e78ea74575dff8c.jpg' },
  { name: 'Chiffon cakes', note: 'Custom celebration cakes', href: '/custom-cakes', image: 'https://s3-media0.fl.yelpcdn.com/bphoto/UaEwo9xWpemyC6zVVuhY0g/o.jpg' },
]

function FavoriteCard({ item }: { item: typeof favorites[number] }) {
  const [failed, setFailed] = useState(false)
  return <Link href={item.href} className="group block overflow-hidden rounded-xl border bg-white transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
    <span className="relative block aspect-[4/3] bg-secondary">
      {!failed && <Image src={item.image} alt="" fill sizes="(min-width: 1024px) 280px, (min-width: 768px) 25vw, 50vw" unoptimized={!canOptimizeGalleryImage(item.image)} onError={() => setFailed(true)} className="object-cover transition-transform duration-300 group-hover:scale-105" />}
    </span>
    <span className="block p-3">
      <span className="block font-semibold text-primary">{item.name}</span>
      <span className="mt-0.5 block text-xs text-muted-foreground">{item.note}</span>
    </span>
  </Link>
}

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
          <h3 className="heading-label mt-8 mb-3">Customer favorites</h3>
          <div className="grid max-w-2xl grid-cols-2 gap-3">
            {favorites.map(item => <FavoriteCard key={item.name} item={item} />)}
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/menu" className={buttonVariants()}>See the full menu</Link>
            <Link href="/contact" className={buttonVariants({ variant: "outline" })}>Plan your visit</Link>
          </div>
        </div>
        <figure className="overflow-hidden rounded-xl border bg-white">
          {/* Cropped to 2:3 (was the full, very tall photo), framed to keep his face and the cake. */}
          {!photoFailed ? <span className="relative block aspect-[2/3]"><Image src="https://s3-media0.fl.yelpcdn.com/bphoto/qGD2qXPzVo39_p2JpCohZQ/o.jpg" alt="Johnny, Sunville Bakery’s founder, presenting a celebration cake" fill sizes="(min-width: 768px) 40vw, 100vw" loading="lazy" onError={() => setPhotoFailed(true)} className="object-cover object-[50%_70%]" /></span> : <div className="flex aspect-[4/3] items-center justify-center bg-secondary p-6 font-serif text-2xl text-primary">Meet our founder</div>}
          <figcaption className="p-5"><p className="font-serif text-xl font-semibold text-primary">Johnny</p><p className="mt-1 text-sm text-muted-foreground">Founder & head baker</p></figcaption>
        </figure>
      </div>
    </section>
  )
}
