"use client"

import { Card, CardContent } from "@/components/ui/card"
import { useState } from "react"

const products = [
  {
    name: "French Baguette",
    category: "Breads",
    price: "$4.50",
    image: "/french-baguette-artisan-bread-golden-crust.jpg",
  },
  {
    name: "Pineapple Bun",
    category: "Asian Pastries",
    price: "$3.25",
    image: "https://media.discordapp.net/attachments/795164252045443075/1423911612758098020/pineBun.jpg?ex=68e20887&is=68e0b707&hm=b8b536715b1f96ca21b9312d3da166951d010faac925b27e0924062b9ba0414a&=&format=webp&width=800&height=1067",
  },
  {
    name: "Chocolate Croissant",
    category: "Pastries",
    price: "$4.75",
    image: "/chocolate-croissant-flaky-pastry.jpg",
  },
  {
    name: "Red Bean Bun",
    category: "Asian Pastries",
    price: "$3.00",
    image: "/red-bean-bun-soft-asian-bread.jpg",
  },
  {
    name: "Fruit Tart",
    category: "Desserts",
    price: "$5.50",
    image: "/fruit-tart-fresh-berries-pastry-cream.jpg",
  },
  {
    name: "Egg Custard Tart",
    category: "Asian Pastries",
    price: "$3.50",
    image: "/egg-custard-tart-portuguese-asian-dessert.jpg",
  },
]

export function ProductsSection() {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  return (
    <section id="products" className="py-32 bg-gray-50">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="font-serif text-4xl md:text-5xl font-bold text-primary mb-6 text-balance">
            Our Signature Products
          </h2>
          <div className="w-24 h-1 bg-accent mx-auto mb-6" />
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Discover our carefully crafted selection of breads, pastries, and desserts
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {products.map((product, index) => (
            <Card
              key={index}
              className="group overflow-hidden border-border hover:shadow-xl transition-all duration-300 cursor-pointer"
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <div className="relative overflow-hidden aspect-square">
                <img
                  src={product.image || "/placeholder.svg"}
                  alt={product.name}
                  className={`w-full h-full object-cover transition-transform duration-500 ${
                    hoveredIndex === index ? "scale-110" : "scale-100"
                  }`}
                />
                <div
                  className={`absolute inset-0 bg-gradient-to-t from-black/60 to-transparent transition-opacity duration-300 ${
                    hoveredIndex === index ? "opacity-100" : "opacity-0"
                  }`}
                />
                <div
                  className={`absolute bottom-4 left-4 right-4 text-white transition-all duration-300 ${
                    hoveredIndex === index ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
                  }`}
                >
                  <span className="text-sm font-medium bg-accent/90 text-accent-foreground px-3 py-1 rounded-full">
                    {product.category}
                  </span>
                </div>
              </div>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-serif text-xl font-bold text-primary">{product.name}</h3>
                  <span className="text-lg font-bold text-accent">{product.price}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
