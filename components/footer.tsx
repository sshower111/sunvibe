import Link from "next/link"

export function Footer() {
  return (
    <footer className="bg-primary text-primary-foreground py-10">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="grid md:grid-cols-3 gap-8 mb-6">
          <div className="flex flex-col -mt-6">
            <div className="mb-4">
              <img
                src="/logoWhite.png"
                alt="Sunville Bakery"
                className="h-16 w-auto"
              />
            </div>
            <div>
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3220.8527743586677!2d-115.19991842394843!3d36.13007247247373!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x80c8c7fe24c0e7c1%3A0x7b3e84e5f1c5e8c0!2s4053%20Spring%20Mountain%20Rd%2C%20Las%20Vegas%2C%20NV%2089102!5e0!3m2!1sen!2sus!4v1234567890123"
                width="100%"
                height="200"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="rounded-lg"
              ></iframe>
            </div>
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

        <div className="border-t border-primary-foreground/20 pt-6 text-center text-base text-primary-foreground/60">
          <p>&copy; {new Date().getFullYear()} Sunville Bakery. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
