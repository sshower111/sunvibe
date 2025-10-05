export function AboutSection() {
  return (
    <section id="about" className="py-16 sm:py-24 md:py-32 bg-green-50/30">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-serif text-4xl sm:text-5xl md:text-6xl font-bold text-primary mb-6 text-balance">
            A Family Tradition Since 2002
          </h2>
          <div className="w-24 h-1 bg-accent mx-auto mb-8" />
          <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground leading-relaxed mb-6">
            Founded by Johnny, who honed his craft in San Francisco, Sunville Bakery was born from a simple dream:
            to bring authentic Chinese baked goods to Las Vegas with his own unique twist. What started as one baker's
            passion has grown into a beloved family tradition, with Johnny as head baker and May leading the front
            of house and cake decorating.
          </p>
          <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground leading-relaxed mb-6">
            We specialize in soft Asian chiffon cakes, mini mooncakes, and traditional buns including our popular
            BBQ pork buns, pineapple buns, milk cream buns, and pork floss buns. Every item is handmade fresh daily
            using traditional techniques and the finest ingredients.
          </p>
          <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground leading-relaxed mb-8 sm:mb-12">
            Pre-orders welcome – we'll have your favorites ready the same day. Available in single servings or
            party quantities for any occasion.
          </p>
        </div>

        {/* Team Photos */}
        <div className="flex justify-center items-center max-w-4xl mx-auto mb-12 sm:mb-16">
          <div className="text-center">
            <div className="relative w-36 h-36 sm:w-48 sm:h-48 mx-auto mb-4 rounded-full overflow-hidden bg-white shadow-lg">
              <img
                src="https://s3-media0.fl.yelpcdn.com/bphoto/qGD2qXPzVo39_p2JpCohZQ/o.jpg"
                alt="Johnny - Head Baker"
                className="w-full h-full object-cover mix-blend-multiply"
              />
            </div>
            <h3 className="font-serif text-2xl sm:text-3xl font-bold text-primary mb-2">Johnny</h3>
            <p className="text-base sm:text-lg text-muted-foreground">Head Baker & Founder</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 max-w-5xl mx-auto px-4">
          {[
            { number: "20+", label: "Years Experience" },
            { number: "100+", label: "Products" },
            { number: "10k+", label: "Happy Customers" },
            { number: "100%", label: "Fresh Daily" },
          ].map((stat, index) => (
            <div key={index} className="text-center">
              <div className="font-serif text-4xl sm:text-5xl md:text-6xl font-bold text-accent mb-2">{stat.number}</div>
              <div className="text-sm sm:text-base md:text-lg text-muted-foreground font-medium">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
