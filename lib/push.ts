import 'server-only'
import { randomUUID } from 'node:crypto'
import webpush from 'web-push'
import { verifiedDatabase } from './database'
import { postToDiscord } from './discord'
import { plainDiscord, type DiscordMessage } from './discord-messages'

// Web Push to the admin app (iPhone Home Screen app or a desktop browser). Keys come from Vercel environment
// variables, never the repo: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY and VAPID_SUBJECT (mailto: address).
// Generate them once with `npx web-push generate-vapid-keys` (docs/ADMIN_GUIDE.md).
// Every notification also goes to the bakery's Discord channel when DISCORD_WEBHOOK_URL is set (lib/discord.ts).

export type PushMessage = {
  title: string
  body: string
  /** Admin page opened when the notification is tapped, e.g. /admin/orders/<id>. */
  url: string
  /** Notifications with the same tag replace each other instead of piling up. */
  tag?: string
  /** Fuller Discord version; without one, Discord gets the title and body. */
  discord?: DiscordMessage
}
export type PushDevice = { id: string; label: string; endpoint: string; createdAt: string; lastOkAt?: string }

export const pushPublicKey = () => process.env.VAPID_PUBLIC_KEY || null

function configured() {
  const publicKey = process.env.VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT
  if (!publicKey || !privateKey || !subject) return false
  webpush.setVapidDetails(subject, publicKey, privateKey)
  return true
}
const contentDatabase = () => verifiedDatabase('content')

/** Saves this device's subscription (turning notifications on again on the same device just updates it). */
export async function saveSubscription(input: { endpoint: string; p256dh: string; auth: string; label: string }) {
  const sql = await contentDatabase()
  await sql`INSERT INTO bakery_push_subscriptions(id,endpoint,p256dh,auth,device_label)
    VALUES(${randomUUID()},${input.endpoint},${input.p256dh},${input.auth},${input.label})
    ON CONFLICT(endpoint) DO UPDATE SET p256dh=EXCLUDED.p256dh,auth=EXCLUDED.auth,device_label=EXCLUDED.device_label`
}

export async function listDevices(): Promise<PushDevice[]> {
  const sql = await contentDatabase()
  const rows =
    await sql`SELECT id,device_label,endpoint,created_at,last_ok_at FROM bakery_push_subscriptions ORDER BY created_at`
  return rows.map(r => ({
    id: r.id,
    label: r.device_label,
    endpoint: r.endpoint,
    createdAt: new Date(r.created_at).toISOString(),
    lastOkAt: r.last_ok_at ? new Date(r.last_ok_at).toISOString() : undefined,
  }))
}

export async function removeDevice(id: string) {
  const sql = await contentDatabase()
  await sql`DELETE FROM bakery_push_subscriptions WHERE id=${id}`
}

/**
 * Sends a notification to every admin device. Never throws (a push problem must never fail an order or inquiry);
 * errors are logged. Devices the push service says are gone (404/410) are removed.
 */
export async function pushToAdmins(message: PushMessage) {
  const result = { sent: 0, failed: 0, discord: false }
  const { discord, ...push } = message
  const toDiscord = postToDiscord(discord ?? plainDiscord(message.title, message.body, message.url))
  try {
    if (!configured()) return result
    const sql = await contentDatabase()
    const rows = await sql`SELECT id,endpoint,p256dh,auth FROM bakery_push_subscriptions`
    await Promise.all(
      rows.map(async r => {
        try {
          await webpush.sendNotification(
            { endpoint: r.endpoint, keys: { p256dh: r.p256dh, auth: r.auth } },
            JSON.stringify(push),
            { TTL: 24 * 60 * 60, urgency: 'high', timeout: 10_000 },
          )
          result.sent++
          await sql`UPDATE bakery_push_subscriptions SET last_ok_at=now() WHERE id=${r.id}`
        } catch (error) {
          result.failed++
          const status = (error as { statusCode?: number }).statusCode
          if (status === 404 || status === 410) await sql`DELETE FROM bakery_push_subscriptions WHERE id=${r.id}`
          else console.error('Push notification failed', { status, detail: (error as Error).message })
        }
      }),
    )
  } catch (error) {
    console.error('Push notifications unavailable', (error as Error).message)
  }
  result.discord = await toDiscord
  return result
}

/** Builds and sends a notification; never throws, so it can sit right after a customer's order or inquiry. */
export async function notifyAdmins(build: () => PushMessage) {
  try {
    return await pushToAdmins(build())
  } catch (error) {
    console.error('Push notification not sent', (error as Error).message)
    return { sent: 0, failed: 0, discord: false }
  }
}

/** Records a reminder as sent; false when it was already sent (so each reminder goes out once). */
export async function claimReminder(orderId: string, kind: string) {
  const sql = await contentDatabase()
  const rows =
    await sql`INSERT INTO bakery_push_reminders(order_id,kind) VALUES(${orderId},${kind}) ON CONFLICT DO NOTHING RETURNING kind`
  return rows.length > 0
}
