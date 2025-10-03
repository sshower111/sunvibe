import Link from "next/link"

export function Footer() {
  return (
    <footer className="bg-primary text-primary-foreground py-12">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 bg-accent rounded-full flex items-center justify-center">
                <span className="text-primary font-serif text-xl font-bold">S</span>
              </div>
              <span className="font-serif text-xl font-bold">Sunville Bakery</span>
            </div>
            <p className="text-primary-foreground/80 text-sm leading-relaxed">
              Authentic Asian style breads, pastries, and more. Crafted with passion since 2004.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-4">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="#about" className="text-primary-foreground/80 hover:text-accent transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="#products" className="text-primary-foreground/80 hover:text-accent transition-colors">
                  Products
                </Link>
              </li>
              <li>
                <Link href="#gifting" className="text-primary-foreground/80 hover:text-accent transition-colors">
                  Corporate Gifting
                </Link>
              </li>
              <li>
                <Link href="#contact" className="text-primary-foreground/80 hover:text-accent transition-colors">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-4">Contact</h3>
            <ul className="space-y-2 text-sm text-primary-foreground/80">
              <li>4503 Spring Mountain Road</li>
              <li>Las Vegas, NV 89102</li>
              <li>702-889-8897</li>
              <li>sunvillebakery@gmail.com</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-4">Hours</h3>
            <ul className="space-y-2 text-sm text-primary-foreground/80">
              <li>Monday - Sunday</li>
              <li>8:00 AM - 8:00 PM</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-primary-foreground/20 pt-8 text-center text-sm text-primary-foreground/60">
          <p>&copy; {new Date().getFullYear()} Sunville Bakery. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
