import { readSeasonalBanners } from '@/lib/seasonal-store'
import { SeasonalBanner } from '@/components/seasonal-banner'
import { getActiveBanner } from '@/lib/seasonal'
import { Navigation } from "@/components/navigation"
import { HeroSection } from "@/components/hero-section"
import { AboutSection } from "@/components/about-section"
import { FeaturedGallery } from "@/components/featured-gallery"
import { Footer } from "@/components/footer"

export default async function Home() {
  // Fail closed on storage outages so a switched-off campaign cannot reappear.
  const banners = await readSeasonalBanners().catch(() => [])
  return (
    <div className="min-h-screen">
      <SeasonalBanner banner={getActiveBanner(new Date(), banners)} />
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
