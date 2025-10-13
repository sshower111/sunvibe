export function AboutSection() {
  return (
    <section id="about" className="py-24 sm:py-32 bg-gradient-to-b from-white via-secondary/30 to-white relative">
      {/* Subtle Background Pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgb(0 0 0) 1px, transparent 0)',
          backgroundSize: '40px 40px'
        }}
      />

      <div className="container mx-auto px-6 md:px-12 lg:px-16 max-w-6xl relative">
        <div className="max-w-3xl mx-auto text-center mb-20">
          <p className="text-accent font-semibold text-sm tracking-[0.2em] uppercase mb-4">
            Our Story
          </p>
          <h2 className="font-serif text-4xl sm:text-5xl md:text-6xl font-bold text-primary mb-6 leading-tight">
            A Family Tradition Since 2002
          </h2>
          <div className="w-20 h-1 bg-accent/60 mx-auto mb-12" />

          <div className="space-y-6 text-base sm:text-lg text-foreground/80 leading-relaxed text-left">
            <p>
              Founded by Johnny, who honed his craft in San Francisco, Sunville Bakery was born from a simple dream:
              to bring authentic Chinese baked goods to Las Vegas with his own unique twist. What started as one baker's
              passion has grown into a beloved family tradition, with Johnny as head baker and May leading the front
              of house and cake decorating.
            </p>
            <p>
              We specialize in soft Asian chiffon cakes, mini mooncakes, and traditional buns including our popular
              BBQ pork buns, pineapple buns, milk cream buns, and pork floss buns. Every item is handmade fresh daily
              using traditional techniques and the finest ingredients.
            </p>
            <p className="font-semibold text-primary">
              Pre-orders welcome – we'll have your favorites ready the same day. Available in single servings or
              party quantities for any occasion.
            </p>
          </div>
        </div>

        {/* Founder Profile */}
        <div className="flex justify-center items-center">
          <div className="text-center">
            <div className="relative w-44 h-44 sm:w-52 sm:h-52 mx-auto mb-6 rounded-2xl overflow-hidden bg-white shadow-xl ring-1 ring-border/50 transition-all duration-500 hover:shadow-2xl hover:scale-105">
              <img
                src="https://s3-media0.fl.yelpcdn.com/bphoto/qGD2qXPzVo39_p2JpCohZQ/o.jpg"
                alt="Johnny - Head Baker"
                className="w-full h-full object-cover"
              />
            </div>
            <h3 className="font-serif text-2xl sm:text-3xl font-bold text-primary mb-2">Johnny</h3>
            <p className="text-sm sm:text-base text-muted-foreground tracking-[0.1em] uppercase font-medium">
              Head Baker & Founder
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
