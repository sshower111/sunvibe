import { NextResponse } from 'next/server'
import { getMenuProducts } from '@/lib/menu-products'
export async function GET() {
  try { return NextResponse.json(await getMenuProducts(), { headers: { 'Cache-Control': 'no-store' } }) }
  catch { return NextResponse.json({ error: 'Failed to fetch products' }, { status: 503 }) }
}
