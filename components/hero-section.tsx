import { Button } from "@/components/ui/button"
import Link from "next/link"

export function HeroSection() {
  return (
    <section className="relative h-[70vh] w-full overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <img src="/background2.jpg" alt="Artisan bakery products" className="w-full h-full object-cover object-top" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/60" />
      </div>

      {/* Content */}
      <div className="relative h-full flex items-center justify-center">
        <div className="container mx-auto px-4 lg:px-8 text-center">
          <h1 className="font-serif text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-bold text-white mb-4 sm:mb-6 text-balance animate-fade-in-up px-4">
            Authentic Chinese
            <br />
            <span className="text-accent">Baked Goods</span>
          </h1>
          <p className="text-lg sm:text-xl md:text-2xl text-white/90 mb-10 sm:mb-12 max-w-2xl mx-auto text-pretty animate-fade-in-up animation-delay-200 px-4">
            Handcrafted fresh daily with traditional techniques and the finest ingredients
          </p>
          <div className="flex justify-center animate-fade-in-up animation-delay-400">
            <Link
              href="/menu"
              className="text-white text-xl font-semibold underline underline-offset-8 transition-all duration-200 hover:scale-110 hover:text-accent"
            >
              View Menu
            </Link>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 border-2 border-white/50 rounded-full flex items-start justify-center p-2">
          <div className="w-1.5 h-3 bg-white/50 rounded-full" />
        </div>
      </div>
    </section>
  )
}
