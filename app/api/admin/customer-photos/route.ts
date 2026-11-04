import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { isAdminRequest } from '@/lib/admin-auth'
import {
  deleteCustomerPhotos,
  getCustomerPhotos,
  listCustomerPhotos,
  markInGallery,
  readCustomerPhoto,
} from '@/lib/customer-photos'
import { listCakeOrders } from '@/lib/cake-orders-store'
import { orderRef } from '@/lib/cake-order'
import { uploadPhoto } from '@/lib/photo-storage'
import { editGallery } from '@/lib/database-content'

// Admin → Customer photos: what customers sent from the thank-you email, and "Add to gallery" for photos they
// said OK to.
const schema = z.union([
  z.object({ action: z.literal('list') }),
  z.object({ action: z.literal('add_to_gallery'), id: z.string().uuid(), file: z.string().max(80) }),
  z.object({ action: z.literal('delete'), id: z.string().uuid() }),
])

export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const parsed = schema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  const body = parsed.data
  try {
    if (body.action === 'list') {
      const [entries, orders] = await Promise.all([listCustomerPhotos(), listCakeOrders().catch(() => [])])
      const byId = new Map(orders.map(o => [o.id, o]))
      return NextResponse.json(
        {
          entries: entries.map(e => {
            const o = byId.get(e.orderId)
            return { ...e, order: o ? { ref: orderRef(o), name: o.name, test: !!o.test } : null }
          }),
        },
        { headers: { 'Cache-Control': 'no-store' } },
      )
    }
    if (body.action === 'delete') {
      await deleteCustomerPhotos(body.id)
      return NextResponse.json({ success: true })
    }
    const entry = await getCustomerPhotos(body.id)
    const photo = entry?.photos.find(p => p.file === body.file)
    if (!entry || !photo) return NextResponse.json({ error: 'Photo not found. Refresh.' }, { status: 404 })
    if (!entry.consent)
      return NextResponse.json({ error: "The customer didn't say OK to showing this photo." }, { status: 409 })
    if (photo.gallery) return NextResponse.json({ success: true, url: photo.gallery })
    const url = await uploadPhoto(
      `gallery/${randomUUID()}-customer.jpg`,
      await readCustomerPhoto(entry.orderId, photo.file),
      'image/jpeg',
    )
    await editGallery('add', url)
    await markInGallery(entry.id, photo.file, url)
    revalidateTag('gallery-images')
    return NextResponse.json({ success: true, url })
  } catch (error) {
    console.error('Customer photos', (error as Error).message)
    return NextResponse.json({ error: 'Customer photos unavailable. Please retry.' }, { status: 503 })
  }
}
