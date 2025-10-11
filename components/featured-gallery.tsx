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
    <section className="py-32 sm:py-40 bg-gradient-to-b from-white via-muted/10 to-white">
      <div className="container mx-auto px-8 lg:px-16 max-w-[1400px]">
        <div className="text-center mb-20">
          <h2 className="font-serif text-4xl sm:text-5xl md:text-6xl font-light text-primary mb-6 tracking-[-0.02em]">
            Featured Products
          </h2>
          <div className="w-20 h-[3px] bg-accent mx-auto mb-8" />
          <p className="text-lg sm:text-xl text-muted-foreground/70 max-w-2xl mx-auto leading-relaxed">
            A glimpse of our handcrafted creations
          </p>
        </div>

        {/* Masonry Grid Layout */}
        <div className="columns-1 md:columns-2 lg:columns-3 gap-8 space-y-8">
          {featuredImages.map((image, index) => (
            <div
              key={index}
              className="break-inside-avoid cursor-pointer group relative overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500"
              onClick={() => setSelectedImage(image)}
            >
              <img
                src={image}
                alt={`Featured product ${index + 1}`}
                className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </div>
          ))}
        </div>
      </div>

      {/* Lightbox Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-6 backdrop-blur-sm"
          onClick={() => setSelectedImage(null)}
        >
          <img
            src={selectedImage}
            alt="Featured product"
            className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl"
          />
          <button
            className="absolute top-8 right-8 text-white text-5xl hover:text-accent transition-all duration-300 hover:scale-110 w-14 h-14 flex items-center justify-center"
            onClick={() => setSelectedImage(null)}
          >
            ×
          </button>
        </div>
      )}
    </section>
  )
}
