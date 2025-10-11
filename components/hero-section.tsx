import { Button } from "@/components/ui/button"
import Link from "next/link"

export function HeroSection() {
  return (
    <section className="relative h-screen w-full overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <img src="/background2.jpg" alt="Artisan bakery products" className="w-full h-full object-cover object-center scale-105" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70" />
      </div>

      {/* Content */}
      <div className="relative h-full flex items-center justify-center">
        <div className="container mx-auto px-8 lg:px-16 max-w-[1100px] text-center">
          <h1 className="font-serif text-6xl sm:text-7xl md:text-8xl lg:text-[7rem] font-light text-white mb-10 text-balance animate-fade-in-up tracking-[-0.03em] leading-[1.1]">
            Authentic Chinese
            <br />
            <span className="font-normal">Baked Goods</span>
          </h1>
          <div className="w-20 h-[3px] bg-white/90 mx-auto mb-10 animate-fade-in-up animation-delay-100" />
          <p className="text-lg sm:text-xl md:text-2xl text-white/95 mb-16 max-w-2xl mx-auto leading-relaxed animate-fade-in-up animation-delay-200 font-light tracking-wide">
            Handcrafted fresh daily with traditional techniques and the finest ingredients
          </p>
          <div className="flex justify-center animate-fade-in-up animation-delay-300">
            <Link
              href="/menu"
              className="inline-block px-12 py-4 bg-white text-foreground font-medium text-sm tracking-[0.12em] uppercase transition-all duration-300 hover:bg-accent hover:text-white hover:scale-105 shadow-2xl hover:shadow-accent/50"
            >
              Explore Menu
            </Link>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-16 left-1/2 -translate-x-1/2 animate-bounce opacity-80">
        <div className="w-6 h-10 border-2 border-white/60 rounded-full flex items-start justify-center p-2">
          <div className="w-1.5 h-2.5 bg-white/60 rounded-full" />
        </div>
      </div>
    </section>
  )
}
