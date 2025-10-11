export function AboutSection() {
  return (
    <section id="about" className="py-32 sm:py-40 bg-gradient-to-b from-white via-background/30 to-white">
      <div className="container mx-auto px-8 lg:px-16 max-w-[1200px]">
        <div className="max-w-4xl mx-auto text-center mb-24">
          <h2 className="font-serif text-4xl sm:text-5xl md:text-6xl font-light text-primary mb-6 tracking-[-0.02em] leading-tight">
            A Family Tradition Since 2002
          </h2>
          <div className="w-20 h-[3px] bg-accent mx-auto mb-16" />
          <div className="space-y-8 text-lg sm:text-xl text-muted-foreground/80 leading-[1.8]">
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
            <p>
              Pre-orders welcome – we'll have your favorites ready the same day. Available in single servings or
              party quantities for any occasion.
            </p>
          </div>
        </div>

        {/* Team Photos */}
        <div className="flex justify-center items-center pt-8">
          <div className="text-center">
            <div className="relative w-48 h-48 sm:w-56 sm:h-56 mx-auto mb-8 rounded-full overflow-hidden bg-white shadow-2xl ring-4 ring-accent/20 transition-all duration-500 hover:ring-8 hover:ring-accent/30 hover:scale-105">
              <img
                src="https://s3-media0.fl.yelpcdn.com/bphoto/qGD2qXPzVo39_p2JpCohZQ/o.jpg"
                alt="Johnny - Head Baker"
                className="w-full h-full object-cover"
              />
            </div>
            <h3 className="font-serif text-2xl sm:text-3xl font-normal text-primary mb-3 tracking-[-0.01em]">Johnny</h3>
            <p className="text-sm sm:text-base text-muted-foreground/70 tracking-[0.1em] uppercase font-medium">Head Baker & Founder</p>
          </div>
        </div>
      </div>
    </section>
  )
}
