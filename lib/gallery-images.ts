// Fallback gallery (original Yelp photos, and former ImgBB photos now in Supabase storage). Admin uploads live in Supabase.

export const galleryImages = [
  // Yelp Images
  'https://s3-media0.fl.yelpcdn.com/bphoto/B090usCLomkBbDkleZmY0g/258s.jpg',
  'https://s3-media0.fl.yelpcdn.com/bphoto/hddQliQD_ec47ZsSojRKvQ/o.jpg',
  'https://s3-media0.fl.yelpcdn.com/bphoto/DVpCZ-UHArRy0WpZtXeZRA/258s.jpg',
  'https://s3-media0.fl.yelpcdn.com/bphoto/hO8WQYQdNbvOmS_aT04HPg/258s.jpg',
  'https://s3-media0.fl.yelpcdn.com/bphoto/UaEwo9xWpemyC6zVVuhY0g/o.jpg',
  'https://s3-media0.fl.yelpcdn.com/bphoto/tiREJVTDeZTafusCzxnzZg/o.jpg',
  'https://s3-media0.fl.yelpcdn.com/bphoto/UbR8m-sTTjzW59Suli3sng/o.jpg',
  'https://s3-media0.fl.yelpcdn.com/bphoto/pKrji2xXs18M03ZOGLjldw/o.jpg',
  'https://s3-media0.fl.yelpcdn.com/bphoto/wultZwh4B4ry9Cc5yDjJYQ/o.jpg',

  // Formerly on ImgBB; copied to Supabase storage (Oct 2026) with the same order, so captions still match.
  'https://pbamlokgnomamommrofy.supabase.co/storage/v1/object/public/bakery-images/gallery/ibb-nNxVCjWz.jpg',
  'https://pbamlokgnomamommrofy.supabase.co/storage/v1/object/public/bakery-images/gallery/ibb-gbL5r6yk.jpg',
  'https://pbamlokgnomamommrofy.supabase.co/storage/v1/object/public/bakery-images/gallery/ibb-7t8m8hj8.jpg',
  'https://pbamlokgnomamommrofy.supabase.co/storage/v1/object/public/bakery-images/gallery/ibb-jvXCPLYX.jpg',
  'https://pbamlokgnomamommrofy.supabase.co/storage/v1/object/public/bakery-images/gallery/ibb-TDwChqZN.jpg',
]

// New photos are added in Admin > Gallery (stored in Supabase). This list is only the
// built-in fallback used if gallery storage is unreachable.

// Descriptions verified visually; keep each caption paired with its image URL.
const galleryDescriptions = [
  'Tall pink tiered cake decorated with roses and gold accents',
  'White tiered cake decorated with white flowers and green leaves',
  'Golden round bun on a patterned plate',
  'Wrapped golden bun with a crackled topping',
  'Pink tiered celebration cake with roses and a topper',
  'Golden bun with a pale textured topping',
  'Round pastry with purple swirled layers',
  'Tray of yellow custard egg tarts',
  'Yellow glazed round cake topped with fruit',
  'Fresh egg tarts arranged on a baking tray',
  'Soft bun cut open to show its savory filling',
  'White tiered cake with pink flowers and delicate greenery',
  'Two-tier cake decorated with a train track and trees',
  'Blue birthday cake decorated with sea creatures and character toppers',
]
const galleryAltByUrl = new Map(galleryImages.map((url, index) => [url, galleryDescriptions[index]]))
export function galleryAlt(src: string) {
  return galleryAltByUrl.get(src) || 'A baked creation from Sunville Bakery in Las Vegas'
}

// Unrecognized admin-upload hosts retain normal image delivery, never a broad proxy allowlist.
// NEXT_PUBLIC_PHOTO_BASE is set in next.config.mjs from SUPABASE_URL + bucket, matching images.remotePatterns.
const photoBase = process.env.NEXT_PUBLIC_PHOTO_BASE || ''
export function canOptimizeGalleryImage(src: string) {
  if (photoBase && src.startsWith(photoBase)) return true
  try {
    const url = new URL(src)
    return (
      url.protocol === 'https:' && url.hostname === 's3-media0.fl.yelpcdn.com' && url.pathname.startsWith('/bphoto/')
    )
  } catch {
    return false
  }
}
