import Link from "next/link"
import { ArrowUpRight, MapPin, Phone } from "lucide-react"

const directions = "https://www.google.com/maps/search/?api=1&query=4053+Spring+Mountain+Rd+Las+Vegas+NV+89102"
const linkStyle = "inline-flex min-h-12 items-center rounded-sm text-sm text-white/90 underline-offset-4 hover:text-white hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"

export function Footer() {
  return (
    <footer aria-label="Sunville Bakery information" className="bg-primary text-white">
      <div className="site-container section-space">
        <div className="sm:hidden">
          <p className="font-serif text-xl font-semibold">Sunville Bakery</p>
          <div className="mt-2 flex flex-wrap gap-x-6">
            <a href="tel:+17028899887" className={linkStyle}>Call the bakery</a>
            <a href={directions} target="_blank" rel="noopener noreferrer" className={linkStyle}>Directions<span className="sr-only"> (opens a new tab)</span></a>
          </div>
          <details className="mt-3 border-t border-white/20">
            <summary className="min-h-12 cursor-pointer py-3 text-sm font-medium focus-visible:outline-2 focus-visible:outline-white">Location, hours & email</summary>
            <div className="space-y-3 pb-4 text-sm leading-relaxed text-white/90">
              <address className="not-italic">4053 Spring Mountain Rd<br />Las Vegas, NV 89102</address>
              <p>Mon–Tue, Thu–Sun: 8 AM–8 PM<br />Wednesday: 8 AM–3 PM<br /><span className="text-xs">Las Vegas local time (Pacific)</span></p>
              <a href="mailto:sunvillebakerylv@gmail.com" className={linkStyle + " max-w-full break-all"}>sunvillebakerylv@gmail.com</a>
            </div>
          </details>
          <nav aria-label="Mobile footer navigation" className="flex flex-wrap gap-x-5 border-t border-white/20">
            <Link href="/menu" className={linkStyle}>Menu</Link><Link href="/#about" className={linkStyle}>About</Link><Link href="/gallery" className={linkStyle}>Gallery</Link><Link href="/contact" className={linkStyle}>Contact</Link>
          </nav>
        </div>
        <div className="hidden sm:grid gap-8 border-b border-white/20 pb-8 sm:grid-cols-2 lg:grid-cols-[1.2fr_1.2fr_1fr_0.7fr] lg:gap-10">
          <div className="min-w-0">
            <Link href="/" aria-label="Sunville Bakery home" className="inline-block rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">
              <img src="/logoWhite.png" alt="Sunville Bakery" loading="lazy" className="h-12 w-auto max-w-full object-contain" />
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/85">Your neighborhood Asian bakery in Las Vegas. Family-owned since 2002.</p>
            <a href="tel:+17028899887" className="mt-5 inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-white px-4 text-sm font-semibold text-primary hover:bg-white/90 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"><Phone aria-hidden="true" className="h-4 w-4" />Call to order</a>
          </div>

          <section aria-labelledby="footer-visit" className="min-w-0">
            <h2 id="footer-visit" className="heading-label mb-3">Visit & contact</h2>
            <address className="text-sm not-italic leading-relaxed text-white/90">4053 Spring Mountain Rd<br />Las Vegas, NV 89102</address>
            <a href={directions} target="_blank" rel="noopener noreferrer" className={linkStyle + " gap-2"}><MapPin aria-hidden="true" className="h-4 w-4" />Get directions<ArrowUpRight aria-hidden="true" className="h-4 w-4" /><span className="sr-only"> (opens a new tab)</span></a>
            <div><a href="tel:+17028899887" className={linkStyle}>702-889-9887</a></div>
            <a href="mailto:sunvillebakerylv@gmail.com" className={linkStyle + " max-w-full break-all"}>sunvillebakerylv@gmail.com</a>
          </section>

          <section aria-labelledby="footer-hours">
            <h2 id="footer-hours" className="heading-label mb-3">Bakery hours</h2>
            <dl className="space-y-3 text-sm leading-relaxed">
              <div><dt className="text-white/90">Mon–Tue, Thu–Sun</dt><dd className="font-medium">8 AM–8 PM</dd></div>
              <div><dt className="text-white/90">Wednesday</dt><dd className="font-medium">8 AM–3 PM</dd></div>
            </dl>
            <p className="mt-3 text-xs leading-relaxed text-white/80">All hours are Las Vegas local time (Pacific).</p>
          </section>

          <nav aria-label="Footer navigation">
            <h2 className="heading-label mb-1">Explore</h2>
            <ul>
              <li><Link href="/menu" className={linkStyle}>Menu</Link></li>
              <li><Link href="/#about" className={linkStyle}>Our story</Link></li>
              <li><Link href="/gallery" className={linkStyle}>Gallery</Link></li>
              <li><Link href="/contact" className={linkStyle}>Contact</Link></li>
            </ul>
          </nav>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 pt-5 text-xs leading-relaxed text-white/80">
          <p>&copy; {new Date().getFullYear()} Sunville Bakery. All rights reserved.</p>
          <p className="hidden sm:block">Call to confirm availability and arrange pickup.</p>
        </div>
      </div>
    </footer>
  )
}
