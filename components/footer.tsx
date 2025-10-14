import Link from "next/link"

export function Footer() {
  return (
    <footer className="bg-primary text-primary-foreground py-8 md:py-12">
      <div className="container mx-auto px-8 lg:px-16 max-w-[1400px]">
        <div className="grid md:grid-cols-3 gap-8 md:gap-10 mb-8 md:mb-10 md:items-start">
          <div className="flex flex-col md:-mt-1">
            <div className="mb-3 md:mb-4">
              <img
                src="/logoWhite.png"
                alt="Sunville Bakery"
                className="h-10 w-auto opacity-95"
              />
            </div>
            <div className="rounded-lg overflow-hidden shadow-xl ring-2 ring-white/10">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3220.8527743586677!2d-115.19991842394843!3d36.13007247247373!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x80c8c7fe24c0e7c1%3A0x7b3e84e5f1c5e8c0!2s4053%20Spring%20Mountain%20Rd%2C%20Las%20Vegas%2C%20NV%2089102!5e0!3m2!1sen!2sus!4v1234567890123"
                width="100%"
                height="180"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              ></iframe>
            </div>
          </div>

          <div>
            <h3 className="text-xs md:text-sm font-semibold tracking-[0.12em] uppercase mb-4 md:mb-5 text-primary-foreground/95">Contact</h3>
            <ul className="space-y-2 md:space-y-3 text-sm md:text-base text-primary-foreground/75 leading-relaxed">
              <li className="leading-relaxed">4053 Spring Mountain Rd<br />Las Vegas, NV 89102</li>
              <li className="pt-1 font-medium text-primary-foreground/85">702-889-8897</li>
              <li className="hover:text-accent transition-colors duration-300 cursor-pointer">sunvillebakery@gmail.com</li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs md:text-sm font-semibold tracking-[0.12em] uppercase mb-4 md:mb-5 text-primary-foreground/95">Hours</h3>
            <ul className="space-y-2 md:space-y-3 text-sm md:text-base text-primary-foreground/75 leading-relaxed">
              <li>
                <div className="font-medium text-primary-foreground/85">Monday - Tuesday, Thursday - Sunday</div>
                <div>8:00 AM - 8:00 PM</div>
              </li>
              <li className="pt-1 md:pt-2">
                <div className="font-medium text-primary-foreground/85">Wednesday</div>
                <div>8:00 AM - 3:00 PM</div>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-primary-foreground/15 pt-5 md:pt-6 text-center text-xs md:text-sm text-primary-foreground/60 tracking-wide">
          <p>&copy; {new Date().getFullYear()} Sunville Bakery. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
