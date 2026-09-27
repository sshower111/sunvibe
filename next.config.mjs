/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
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
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      ...(process.env.SUPABASE_URL ? [{ protocol: 'https', hostname: new URL(process.env.SUPABASE_URL).hostname, pathname: '/storage/v1/object/public/' + (process.env.SUPABASE_STORAGE_BUCKET || 'bakery-images') + '/**' }] : []),
      { protocol: 'https', hostname: 's3-media0.fl.yelpcdn.com', pathname: '/bphoto/**' },
      { protocol: 'https', hostname: 'i.ibb.co', pathname: '/**' },
    ],
  },
}

export default nextConfig
