import { ImageResponse } from 'next/og'
export const runtime = 'edge'
export function GET() {
  return new ImageResponse(<div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '80px', background: '#302018', color: '#fff5e5' }}><div style={{ fontSize: 30, color: '#ecc591', marginBottom: 32 }}>SUNVILLE BAKERY · LAS VEGAS</div><div style={{ fontSize: 76, fontWeight: 700, lineHeight: 1.12 }}>Fresh buns.</div><div style={{ fontSize: 76, fontWeight: 700, lineHeight: 1.12 }}>Celebration cakes.</div><div style={{ fontSize: 28, marginTop: 40 }}>Family-owned · Baked fresh daily</div></div>, { width: 1200, height: 630 })
}
