import { Button } from "@/components/ui/button"
import { MapPin, Phone, Clock } from "lucide-react"

export function ContactSection() {
  return (
    <section id="contact" className="py-16 sm:py-24 md:py-32 bg-green-50/30">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="font-serif text-4xl sm:text-5xl md:text-6xl font-bold text-primary mb-6 text-balance">Visit Us Today</h2>
            <div className="w-24 h-1 bg-accent mx-auto mb-6" />
            <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
              Stop by our bakery or place an order for pickup
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-8 mb-8 sm:mb-12">
            <div className="text-center">
              <div className="w-20 h-20 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-10 h-10 text-accent" />
              </div>
              <h3 className="font-semibold text-xl mb-3 text-primary">Location</h3>
              <p className="text-muted-foreground text-base">
                4053 Spring Mountain Rd
                <br />
                Las Vegas, NV 89102
                <br />
                United States
              </p>
            </div>

            <div className="text-center">
              <div className="w-20 h-20 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Phone className="w-10 h-10 text-accent" />
              </div>
              <h3 className="font-semibold text-xl mb-3 text-primary">Phone</h3>
              <p className="text-muted-foreground text-base">
                702-889-8897
                <br />
                <a href="mailto:sunvillebakery@gmail.com" className="text-accent hover:underline">
                  sunvillebakery@gmail.com
                </a>
              </p>
            </div>

            <div className="text-center">
              <div className="w-20 h-20 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-10 h-10 text-accent" />
              </div>
              <h3 className="font-semibold text-xl mb-3 text-primary">Hours</h3>
              <p className="text-muted-foreground text-base">
                Mon-Tue, Thu-Sun: 8:00 AM - 8:00 PM
                <br />
                Wednesday: 8:00 AM - 3:00 PM
              </p>
            </div>
          </div>

          {/* Map */}
          <div className="rounded-lg overflow-hidden shadow-lg mb-8 h-64 sm:h-80 md:h-96 bg-muted">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3220.8!2d-115.2!3d36.13!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMzbCsDA3JzQ4LjAiTiAxMTXCsDEyJzAwLjAiVw!5e0!3m2!1sen!2sus!4v1234567890"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Sunville Bakery Location"
            />
          </div>

        </div>
      </div>
    </section>
  )
}
