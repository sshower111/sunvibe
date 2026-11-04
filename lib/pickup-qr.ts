import 'server-only'
import QRCode from 'qrcode'
import { SITE_URL } from './seo'
import type { StoredCakeOrder } from './cake-order'

// Pickup QR code in the customer's confirmation email. It opens the order's pickup page in admin
// (/admin/pickup/<id>): bakery staff signed in on their phone see the order in Chinese and confirm the pickup or
// delivery with one tap. Anyone else who scans it only gets the admin sign-in, so it shows no customer details.
// Optional: the customer can still just give their name at the counter.

export const pickupUrl = (o: Pick<StoredCakeOrder, 'id'>) => `${SITE_URL}/admin/pickup/${o.id}`

/** The QR code as a PNG, for an inline email image (cid:pickup-qr). */
export const pickupQrPng = (o: Pick<StoredCakeOrder, 'id'>) =>
  QRCode.toBuffer(pickupUrl(o), { type: 'png', width: 360, margin: 2, errorCorrectionLevel: 'M' })

export const PICKUP_QR_CID = 'pickup-qr'
