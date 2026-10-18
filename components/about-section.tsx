'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { canOptimizeGalleryImage } from '@/lib/gallery-images'

// Signature items shown under "Our story". Links jump to the item on the menu page (/menu#<product id>).
// If a menu photo changes in Admin, update the matching image URL here.
const favorites = [
  {
    name: 'BBQ Pork Bun',
    note: '叉燒包',
    href: '/menu#prod_TBefDXpMZYaNs2',
    image:
      'https://pbamlokgnomamommrofy.supabase.co/storage/v1/object/public/bakery-images/migrated/230c10af71eee8de-e67a0a8a6dd5cee1.jpg',
  },
  {
    name: 'Pineapple Bun',
    note: '菠蘿包',
    href: '/menu#prod_TBefJiLFwDD33u',
    image: 'https://i.ibb.co/dshSM9xk/pineBun.webp',
  },
  {
    name: 'Mooncakes',
    note: '月餅',
    href: '/menu#prod_TBefBiX4QUqIT5',
    image:
      'https://pbamlokgnomamommrofy.supabase.co/storage/v1/object/public/bakery-images/migrated/60a9fe48b611b3bd-7e78ea74575dff8c.jpg',
  },
  {
    name: 'Chiffon cakes',
    note: '戚風蛋糕',
    href: '/custom-cakes',
    image: 'https://s3-media0.fl.yelpcdn.com/bphoto/UaEwo9xWpemyC6zVVuhY0g/o.jpg',
  },
]

// Photo, then the Chinese name large in red (like the label on the shelf), then the English name.
function FavoriteCard({ item }: { item: (typeof favorites)[number] }) {
  const [failed, setFailed] = useState(false)
  return (
    <Link href={item.href} className="group block rounded-lg">
      <span className="relative block aspect-square overflow-hidden rounded-lg bg-surface">
        {!failed && (
          <Image
            src={item.image}
            alt=""
            fill
            sizes="(min-width: 1024px) 220px, (min-width: 768px) 22vw, 50vw"
            unoptimized={!canOptimizeGalleryImage(item.image)}
            onError={() => setFailed(true)}
            className="object-cover transition-transform duration-300 ease-[var(--ease-standard)] group-hover:scale-[1.04]"
          />
        )}
      </span>
      <span lang="zh-Hant" className="han-label mt-3 block text-[clamp(1.375rem,1.1rem+1vw,1.75rem)]">
        {item.note}
      </span>
      <span className="mt-0.5 block text-sm font-medium text-ink group-hover:underline group-hover:underline-offset-4">
        {item.name}
      </span>
    </Link>
  )
}

export function AboutSection() {
  const [photoFailed, setPhotoFailed] = useState(false)
  return (
    <section id="about" aria-labelledby="about-heading" className="-scroll-mt-4 bg-background section-space">
      {/* Phones and tablets: story, favorites, then Johnny's photo. Desktop: photo beside the story, favorites below. */}
      <div className="site-container grid items-start gap-x-16 gap-y-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <div className="order-1">
          <h2 id="about-heading" className="heading-1">
            A family bakery since 2002
          </h2>
          <div className="mt-6 max-w-[60ch] space-y-4 text-lg leading-relaxed text-ink">
            <p>
              After honing his craft in San Francisco, Johnny brought his passion for Chinese baked goods to Las Vegas.
              Today, he leads the baking at Sunville, while May welcomes customers and decorates cakes.
            </p>
            <p className="text-ink-muted">Planning a celebration? Call us for quantities and pickup times.</p>
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/menu" className={buttonVariants()}>
              See the full menu
            </Link>
            <Link href="/contact" className={buttonVariants({ variant: 'outline' })}>
              Plan your visit
            </Link>
          </div>
        </div>
        <figure className="order-3 md:max-w-md lg:order-2 lg:max-w-none">
          {!photoFailed ? (
            <span className="relative block aspect-[4/3] overflow-hidden rounded-lg bg-surface lg:aspect-[4/5]">
              <Image
                src="https://s3-media0.fl.yelpcdn.com/bphoto/qGD2qXPzVo39_p2JpCohZQ/o.jpg"
                alt="Johnny, Sunville Bakery’s founder, presenting a celebration cake"
                fill
                sizes="(min-width: 1024px) 22rem, (min-width: 768px) 28rem, 100vw"
                loading="lazy"
                onError={() => setPhotoFailed(true)}
                className="object-cover object-[50%_70%]"
              />
            </span>
          ) : (
            <div className="flex aspect-[4/3] items-center justify-center rounded-lg bg-surface p-6 font-serif text-2xl text-brand">
              Meet our founder
            </div>
          )}
          <figcaption className="mt-3 text-sm text-ink-muted">
            <span className="font-serif text-lg text-ink">Johnny</span>, founder and head baker
          </figcaption>
        </figure>
        <div className="order-2 lg:order-3 lg:col-span-2 lg:mt-[clamp(1rem,4vw,3rem)]">
          <h3 className="heading-2">Customer favorites</h3>
          <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4 md:gap-x-6">
            {favorites.map(item => (
              <FavoriteCard key={item.name} item={item} />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
