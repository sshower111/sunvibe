import Link from "next/link"

export function HeroSection() {
  return (
    <section className="relative min-h-[90vh] w-full overflow-hidden flex items-center">
      {/* Background Image */}
      <div className="absolute inset-0">
        <img
          src="/background2.jpg"
          alt="Artisan bakery products"
          className="w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/60" />
      </div>

      {/* Content */}
      <div className="relative w-full">
        <div className="container mx-auto px-6 md:px-12 lg:px-16 max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-accent font-semibold text-sm md:text-base tracking-[0.2em] uppercase mb-4 animate-fade-in-up">
              Las Vegas • Family-Owned Since 2002
            </p>
            <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-white mb-6 animate-fade-in-up animation-delay-100 leading-[1.1]">
              Fresh Baked
              <br />
              <span className="text-accent">Goodness Daily</span>
            </h1>
            <p className="text-lg md:text-xl text-white/90 mb-10 max-w-xl leading-relaxed animate-fade-in-up animation-delay-200">
              Handcrafted Asian pastries, cakes, and buns made fresh every day with authentic recipes and premium ingredients.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 animate-fade-in-up animation-delay-300">
              <Link
                href="/menu"
                className="inline-flex items-center justify-center px-8 py-4 bg-accent text-accent-foreground font-semibold text-base rounded-lg transition-all duration-300 hover:bg-accent/90 hover:scale-105 hover:shadow-xl hover:shadow-accent/30"
              >
                Order Now
              </Link>
              <Link
                href="/#about"
                className="inline-flex items-center justify-center px-8 py-4 bg-white/10 backdrop-blur-sm text-white font-semibold text-base rounded-lg border-2 border-white/30 transition-all duration-300 hover:bg-white/20 hover:border-white/50"
              >
                Our Story
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Decorative Bottom Fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </section>
  )
}
