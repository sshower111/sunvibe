/** @type {import('next').NextConfig} */
const photoBucket = process.env.SUPABASE_STORAGE_BUCKET || 'bakery-images'
const photoHost = process.env.SUPABASE_URL ? new URL(process.env.SUPABASE_URL).hostname : ''
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    // TODO: turn this off once the remaining type errors (admin gallery / Stripe legacy files) are fixed.
    ignoreBuildErrors: true,
  },
  // Lets client code recognise Supabase photo URLs that next/image may resize (see lib/gallery-images.ts).
  env: {
    NEXT_PUBLIC_PHOTO_BASE: photoHost ? `https://${photoHost}/storage/v1/object/public/${photoBucket}/` : '',
  },
  async headers() {
    return [{ source: '/:path*', headers: [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      ...(process.env.NODE_ENV === 'production' ? [{ key: 'Strict-Transport-Security', value: 'max-age=63072000' }] : []),
    ] }, { source: '/api/:path*', headers: [
      { key: 'Content-Security-Policy', value: "default-src 'none'; frame-ancestors 'none'; base-uri 'none'" },
      { key: 'Cache-Control', value: 'no-store' },
    ] }]
  },
  images: {
    formats: ['image/webp'],
    // Fewer size variants and a 31-day cache = far fewer image transformations.
    deviceSizes: [640, 828, 1200, 1920],
    imageSizes: [96, 256, 384],
    minimumCacheTTL: 2678400,
    remotePatterns: [
      ...(photoHost ? [{ protocol: 'https', hostname: photoHost, pathname: `/storage/v1/object/public/${photoBucket}/**` }] : []),
      { protocol: 'https', hostname: 's3-media0.fl.yelpcdn.com', pathname: '/bphoto/**' },
      { protocol: 'https', hostname: 'i.ibb.co', pathname: '/**' },
    ],
  },
}

export default nextConfig
