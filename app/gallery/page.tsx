import { GalleryView } from "@/components/gallery-view"
import { getPublicGallery } from "@/lib/public-gallery"

// Rendered on the server from cached gallery data (refreshed right after admin edits).
export default async function GalleryPage() {
  const { images } = await getPublicGallery()
  return <GalleryView galleryImages={images} />
}
