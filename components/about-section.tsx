import { BakeryMarquee } from '@/components/bakery-marquee'

// What makes Sunville's baking different, in the owners' words.
const craft = [
  {
    title: 'Made here, every day',
    text: 'Soft baked buns, steamed buns, egg tarts and cakes: everything on our shelves comes out of our own kitchen.',
  },
  {
    title: 'Less sugar',
    text: 'Our recipes go easy on the sugar, so you taste the bun and the filling, not just the sweetness.',
  },
  {
    title: 'Our own char siu',
    text: 'The BBQ pork in our char siu buns is made in house.',
  },
]

// Story, how we bake, then the moving strip of gallery photos (components/bakery-marquee.tsx).
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
              Johnny and May come from Toishan. Johnny has been baking since he was 18, when he started out in San
              Francisco. In 2002 they brought that craft to Las Vegas and opened Sunville on Spring Mountain Road.
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
                <span className="heading-3 block text-[1.5rem]">{item.title}</span>
                <p className="mt-2 leading-relaxed text-ink-muted">{item.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="mt-[clamp(3rem,7vw,5.5rem)]">
        <BakeryMarquee images={images} />
      </div>
    </section>
  )
}
