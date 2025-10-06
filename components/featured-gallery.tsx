"use client"

import { useState, useEffect } from "react"
import { galleryImages } from "@/lib/gallery-images"

export function FeaturedGallery() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [featuredImages, setFeaturedImages] = useState<string[]>([])

  // Randomly select 9 images on component mount
  useEffect(() => {
    const shuffled = [...galleryImages].sort(() => Math.random() - 0.5)
    setFeaturedImages(shuffled.slice(0, 9))
  }, [])

  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="font-serif text-4xl md:text-5xl font-bold text-primary mb-6 text-balance">
            Featured Products
          </h2>
          <div className="w-24 h-1 bg-accent mx-auto mb-6" />
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            A glimpse of our handcrafted creations
          </p>
        </div>

        {/* Masonry Grid Layout */}
        <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
          {featuredImages.map((image, index) => (
            <div
              key={index}
              className="break-inside-avoid cursor-pointer group relative overflow-hidden rounded-lg shadow-md hover:shadow-xl transition-all duration-300"
              onClick={() => setSelectedImage(image)}
            >
              <img
                src={image}
                alt={`Featured product ${index + 1}`}
                className="w-full h-auto object-cover group-hover:scale-110 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
            </div>
          ))}
        </div>
      </div>

      {/* Lightbox Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <img
            src={selectedImage}
            alt="Featured product"
            className="max-w-full max-h-[90vh] object-contain"
          />
          <button
            className="absolute top-4 right-4 text-white text-4xl hover:text-accent transition-colors"
            onClick={() => setSelectedImage(null)}
          >
            ×
          </button>
        </div>
      )}
    </section>
  )
}
