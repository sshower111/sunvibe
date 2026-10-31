import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { isAdminRequest } from '@/lib/admin-auth'
import { listDevices, pushPublicKey, pushToAdmins, removeDevice, saveSubscription } from '@/lib/push'

// Admin → Settings → Notifications: turn notifications on for this device, list and remove devices, send a test.
const bodySchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('status') }),
  z.object({
    action: z.literal('subscribe'),
    label: z.string().trim().max(60).default(''),
    subscription: z.object({
      endpoint: z.string().url().startsWith('https://').max(2048),
      keys: z.object({ p256dh: z.string().min(1).max(256), auth: z.string().min(1).max(256) }),
    }),
  }),
  z.object({ action: z.literal('remove'), id: z.string().uuid() }),
  z.object({ action: z.literal('test') }),
])

export async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  const body = parsed.data
  try {
    if (body.action === 'subscribe') {
      const { endpoint, keys } = body.subscription
      await saveSubscription({ endpoint, p256dh: keys.p256dh, auth: keys.auth, label: body.label })
    } else if (body.action === 'remove') await removeDevice(body.id)
    else if (body.action === 'test') {
      const result = await pushToAdmins({
        title: 'TEST · Sunville Admin',
        body: 'Notifications are working.',
        url: '/admin/settings',
        tag: 'test',
      })
      return NextResponse.json(result)
    }
    return NextResponse.json(
      { publicKey: pushPublicKey(), devices: await listDevices() },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (error) {
    console.error('Admin push request failed', (error as Error).message)
    return NextResponse.json({ error: 'Notifications are unavailable right now. Please retry.' }, { status: 503 })
  }
}
