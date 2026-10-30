import { ImageResponse } from 'next/og'
// Generated once at build time instead of on every social-media crawl.
// Pastry-box red with the gold ribbon edge, like the page bands on the site.
export const dynamic = 'force-static'
export function GET() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '80px',
        background: '#a3201c',
        borderBottom: '24px solid #e9a93b',
        color: '#ffffff',
      }}
    >
      <div style={{ fontSize: 30, color: '#fce7b8', marginBottom: 32 }}>Sunville Bakery · Las Vegas</div>
      <div style={{ fontSize: 76, lineHeight: 1.12 }}>Fresh buns & celebration cakes</div>
      <div style={{ fontSize: 30, marginTop: 40, color: 'rgba(255,255,255,0.85)' }}>
        Family-owned on Spring Mountain Road since 2002
      </div>
    </div>,
    { width: 1200, height: 630 },
  )
}
