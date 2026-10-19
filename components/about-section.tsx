import Link from 'next/link'
import { BakeryMarquee } from '@/components/bakery-marquee'

// What makes Sunville's baking different, in the owners' words. Chinese heading first, like a shelf label.
const craft = [
  {
    zh: '每日新鮮',
    title: 'Made here, every day',
    text: 'Soft baked buns, steamed buns, egg tarts and cakes: everything on our shelves comes out of our own kitchen.',
  },
  {
    zh: '少甜',
    title: 'Less sugar',
    text: 'Our recipes go easy on the sugar, so you taste the bun and the filling, not just the sweetness.',
  },
  {
    zh: '自家製叉燒',
    title: 'Our own char siu',
    text: 'The BBQ pork in our char siu buns is made in house.',
  },
]

// Johnny's two must-try items, linked to their place on the menu.
const picks = [
  { zh: '海綿蛋糕', en: 'Sponge cakes', href: '/menu#prod_TBefqYqYbk4GCM' },
  { zh: '叉燒包', en: 'BBQ pork bun', href: '/menu#prod_TBefDXpMZYaNs2' },
]

// Story, how we bake, Johnny's picks, then the moving strip of gallery photos (components/bakery-marquee.tsx).
export function AboutSection({ images }: { images: string[] }) {
  return (
    <section id="about" aria-labelledby="about-heading" className="-scroll-mt-4 bg-background section-space">
      <div className="site-container">
        <div className="grid gap-x-16 gap-y-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <h2 id="about-heading" className="heading-1">
            A family bakery since 2002
          </h2>
          <div className="max-w-[60ch] space-y-4 text-lg leading-relaxed text-ink">
            <p>
              Johnny and May come from{' '}
              <span className="whitespace-nowrap">
                Toishan (<span lang="zh-Hant">台山</span>).
              </span>{' '}
              Johnny has been baking since he was 18, when he started out in San Francisco. In 2002 they brought that
              craft to Las Vegas and opened Sunville on Spring Mountain Road.
            </p>
            <p>Today Johnny leads the baking, while May welcomes customers and decorates the cakes.</p>
            <p className="text-ink-muted">Planning a celebration? Call us for quantities and pickup times.</p>
          </div>
        </div>

        <div className="mt-[clamp(3rem,7vw,5.5rem)]">
          <h3 className="heading-2">How we bake</h3>
          <ul className="mt-6 grid gap-x-10 gap-y-8 md:grid-cols-3">
            {craft.map(item => (
              <li key={item.title} className="border-t-2 border-brand pt-5">
                <span lang="zh-Hant" className="han-label block text-[clamp(1.75rem,1.4rem+1.2vw,2.25rem)]">
                  {item.zh}
                </span>
                <span className="heading-3 mt-2 block [--heading-color:var(--ink)]">{item.title}</span>
                <p className="mt-2 leading-relaxed text-ink-muted">{item.text}</p>
              </li>
            ))}
          </ul>
          <div className="mt-10 flex flex-col gap-4 rounded-lg bg-surface card-pad sm:flex-row sm:items-center sm:gap-8">
            <p className="heading-3 shrink-0 [--heading-color:var(--ink)]">Johnny’s picks</p>
            <ul className="flex flex-wrap gap-x-8 gap-y-2">
              {picks.map(pick => (
                <li key={pick.href}>
                  <Link href={pick.href} className="group inline-flex min-h-12 items-baseline gap-3 rounded-sm">
                    <span lang="zh-Hant" className="han-label text-2xl">
                      {pick.zh}
                    </span>
                    <span className="font-medium text-ink underline-offset-4 group-hover:underline">{pick.en}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      <div className="mt-[clamp(3rem,7vw,5.5rem)]">
        <BakeryMarquee images={images} />
      </div>
    </section>
  )
}
