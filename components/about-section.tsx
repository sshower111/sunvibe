import { BakeryMarquee } from '@/components/bakery-marquee'

// "Our story" text, then the moving strip of gallery photos (components/bakery-marquee.tsx).
export function AboutSection({ images }: { images: string[] }) {
  return (
    <section id="about" aria-labelledby="about-heading" className="-scroll-mt-4 bg-background section-space">
      <div className="site-container grid gap-x-16 gap-y-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-end">
        <h2 id="about-heading" className="heading-1">
          A family bakery since 2002
        </h2>
        <div className="max-w-[60ch] space-y-4 text-lg leading-relaxed text-ink">
          <p>
            After honing his craft in San Francisco, Johnny brought his passion for Chinese baked goods to Las Vegas.
            Today, he leads the baking at Sunville, while May welcomes customers and decorates cakes.
          </p>
          <p className="text-ink-muted">Planning a celebration? Call us for quantities and pickup times.</p>
        </div>
      </div>
      <div className="mt-[clamp(2.5rem,6vw,4.5rem)]">
        <BakeryMarquee images={images} />
      </div>
    </section>
  )
}
