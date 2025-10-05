import Link from "next/link"

export function Footer() {
  return (
    <footer className="bg-primary text-primary-foreground py-12">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <img
                src="/logoWhite.png"
                alt="Sunville Bakery"
                className="h-16 w-auto"
              />
            </div>
            <p className="text-primary-foreground/80 text-base leading-relaxed">
              Authentic Asian style breads, pastries, and more. Crafted with passion since 2002.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-xl mb-4">Quick Links</h3>
            <ul className="space-y-2 text-base">
              <li>
                <Link href="/" className="text-primary-foreground/80 hover:text-accent transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/#about" className="text-primary-foreground/80 hover:text-accent transition-colors">
                  About
                </Link>
              </li>
              <li>
                <Link href="/menu" className="text-primary-foreground/80 hover:text-accent transition-colors">
                  Menu
                </Link>
              </li>
              <li>
                <Link href="/gallery" className="text-primary-foreground/80 hover:text-accent transition-colors">
                  Gallery
                </Link>
              </li>
              <li>
                <Link href="/#contact" className="text-primary-foreground/80 hover:text-accent transition-colors">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-xl mb-4">Contact</h3>
            <ul className="space-y-2 text-base text-primary-foreground/80">
              <li>4053 Spring Mountain Rd</li>
              <li>Las Vegas, NV 89102</li>
              <li>702-889-8897</li>
              <li>sunvillebakery@gmail.com</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-xl mb-4">Hours</h3>
            <ul className="space-y-2 text-base text-primary-foreground/80">
              <li>Monday - Tuesday, Thursday - Sunday</li>
              <li>8:00 AM - 8:00 PM</li>
              <li className="pt-2">Wednesday</li>
              <li>8:00 AM - 3:00 PM</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-primary-foreground/20 pt-8 text-center text-base text-primary-foreground/60">
          <p>&copy; {new Date().getFullYear()} Sunville Bakery. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
