import { Flame, Leaf, Wheat } from 'lucide-react'
import { BakeryMarquee } from '@/components/bakery-marquee'

// What makes Sunville's baking different, in the owners' words.
const craft = [
  {
    icon: Wheat,
    title: 'Made here, every day',
    text: 'Soft baked buns, steamed buns, egg tarts and cakes: everything on our shelves comes out of our own kitchen.',
  },
  {
    icon: Leaf,
    title: 'Less sugar',
    text: 'Our recipes go easy on the sugar, so you taste the bun and the filling, not just the sweetness.',
  },
  {
    icon: Flame,
    title: 'Our own char siu',
    text: 'The BBQ pork in our char siu buns is made in house.',
  },
]

// The moving strip of gallery photos (components/bakery-marquee.tsx), then the story and how we bake.
export function AboutSection({ images }: { images: string[] }) {
  return (
    <section
      aria-labelledby="about-heading"
      className="bg-base pt-[clamp(1.75rem,1rem+3vw,3.5rem)] pb-[var(--section-space)]"
    >
      <BakeryMarquee images={images} />
      <div
        id="about"
        className="site-container mt-[clamp(3rem,7vw,5.5rem)] scroll-mt-[calc(var(--header-height)+1rem)]"
      >
        <div className="grid gap-x-16 gap-y-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <h2 id="about-heading" className="heading-1">
            A family bakery since 2002
          </h2>
          <div className="max-w-[60ch] space-y-4 text-lg leading-relaxed text-ink">
            <p>
              Johnny and May come from Toishan. Johnny has been baking since he was 18, when he started out in San
              Francisco. In 2002 they brought that craft to Las Vegas and opened Sunville on Spring Mountain Road.
            </p>
            <p>Today Johnny leads the baking, while May welcomes customers and decorates the cakes.</p>
            <p className="text-ink-muted">Planning a celebration? Call us for quantities and pickup times.</p>
          </div>
        </div>

        <div className="mt-[clamp(3rem,7vw,5.5rem)]">
          <h3 className="heading-2">How we bake</h3>
          <ul className="mt-6 grid gap-4 md:grid-cols-3 md:gap-6">
            {craft.map(item => (
              <li key={item.title} className="card-surface card-pad">
                <span
                  aria-hidden="true"
                  className="flex size-11 items-center justify-center rounded-full bg-primary/[0.08] text-primary"
                >
                  <item.icon className="size-5" strokeWidth={1.75} />
                </span>
                <span className="heading-3 mt-4 block text-[1.375rem]">{item.title}</span>
                <p className="mt-2 leading-relaxed text-ink-muted">{item.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
