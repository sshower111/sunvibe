import { Navigation } from "@/components/navigation"
import { HeroSection } from "@/components/hero-section"
import { AboutSection } from "@/components/about-section"
import { FeaturedGallery } from "@/components/featured-gallery"
import { Footer } from "@/components/footer"

export default function Home() {
  return (
    <div className="min-h-screen">
      <Navigation sticky />
    <main id="main-content" tabIndex={-1}>
      <HeroSection />
      <AboutSection />
      <FeaturedGallery />
      </main>
    <Footer />
    </div>
  )
}
