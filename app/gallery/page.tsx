"use client"

import { useState } from "react"
import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { galleryImages } from "@/lib/gallery-images"

export default function GalleryPage() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null)

  return (
    <main className="min-h-screen">
      <Navigation />

      <div className="pt-36 pb-20 sm:pb-24 bg-gradient-to-b from-white via-background/20 to-white">
        <div className="container mx-auto px-6 sm:px-8 lg:px-16 max-w-[1400px]">
          <div className="text-center mb-16 sm:mb-20">
            <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl font-light text-primary mb-6 tracking-[-0.02em] leading-tight">
              Our Gallery
            </h1>
            <div className="w-20 h-[3px] bg-accent mx-auto mb-8" />
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Explore our handcrafted breads, pastries, and baked goods
            </p>
          </div>

          {/* Masonry Grid Layout */}
          <div className="columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-8 space-y-8">
            {galleryImages.map((image, index) => (
              <div
                key={index}
                className="break-inside-avoid cursor-pointer group relative overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-700 ease-out hover:-translate-y-1"
                onClick={() => setSelectedImage(image)}
              >
                <img
                  src={image}
                  alt={`Gallery image ${index + 1}`}
                  className="w-full h-auto object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-500" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Lightbox Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6 animate-fade-in"
          onClick={() => setSelectedImage(null)}
        >
          <img
            src={selectedImage}
            alt="Gallery image"
            className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
          />
          <button
            className="absolute top-6 right-6 text-white text-5xl hover:text-accent transition-all duration-300 hover:scale-110"
            onClick={() => setSelectedImage(null)}
          >
            ×
          </button>
        </div>
      )}

      <Footer />
    </main>
  )
}
