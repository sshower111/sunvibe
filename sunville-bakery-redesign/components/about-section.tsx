export function AboutSection() {
  return (
    <section id="about" className="py-24 bg-background">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-serif text-4xl md:text-5xl font-bold text-primary mb-6 text-balance">
            Crafted with Passion, Baked with Love
          </h2>
          <div className="w-24 h-1 bg-accent mx-auto mb-8" />
          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed mb-6">
            We offer French, Chinese, and Italian breads, mouth-watering pastries, chocolate and fruit creations, and
            seasonal creations such as puff cakes, moon cakes, and gingerbread treats.
          </p>
          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
            All items are available in single-item and party quantities. We use only the finest ingredients and the
            freshest fruits in our creations.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-16 max-w-5xl mx-auto">
          {[
            { number: "20+", label: "Years Experience" },
            { number: "100+", label: "Products" },
            { number: "10k+", label: "Happy Customers" },
            { number: "100%", label: "Fresh Daily" },
          ].map((stat, index) => (
            <div key={index} className="text-center">
              <div className="font-serif text-4xl md:text-5xl font-bold text-accent mb-2">{stat.number}</div>
              <div className="text-sm md:text-base text-muted-foreground font-medium">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
