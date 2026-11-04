import 'server-only'
import { verifiedDatabase } from './database'
import { decode, encode } from './storage-crypto'
import { downloadPrivateFile, removePrivateFiles, uploadPrivateFile } from './photo-storage'

// Photos customers send after their cake (the thank-you email links to /photos/<order id>; db/013). Kept private
// and encrypted; admin → Customer photos can add the ones the customer said OK to to the public gallery.

export const MAX_PHOTOS_PER_ORDER = 10
export const MAX_NOTE = 1000
export const PHOTO_FILE = /^[0-9a-f-]{36}-[1-9][0-9]?\.jpg$/

export type CustomerPhoto = { file: string; gallery?: string }
export type CustomerPhotos = {
  id: string
  orderId: string
  createdAt: string
  note: string
  consent: boolean
  photos: CustomerPhoto[]
}

const db = () => verifiedDatabase('content')
const path = (orderId: string, file: string) => `customer-photos/${orderId}/${file}`
type Row = Record<string, unknown>
const toEntry = (r: Row): CustomerPhotos => ({
  id: r.id as string,
  orderId: r.order_id as string,
  createdAt: new Date(r.created_at as string).toISOString(),
  note: r.note ? (decode(r.note as string) as string) : '',
  consent: r.consent as boolean,
  photos: (r.photos as CustomerPhoto[]) ?? [],
})

export async function listCustomerPhotos() {
  const sql = await db()
  return (await sql`SELECT * FROM bakery_customer_photos ORDER BY created_at DESC LIMIT 300`).map(toEntry)
}
export async function getCustomerPhotos(id: string) {
  const sql = await db()
  const [row] = await sql`SELECT * FROM bakery_customer_photos WHERE id=${id}`
  return row ? toEntry(row) : null
}
export async function photoCountForOrder(orderId: string) {
  const sql = await db()
  const [row] =
    await sql`SELECT COALESCE(SUM(jsonb_array_length(photos)),0)::int AS n FROM bakery_customer_photos WHERE order_id=${orderId}`
  return Number(row?.n ?? 0)
}

/** Saves the note and consent of a submission (created on its first request; later requests update them). */
export async function saveSubmission(s: { id: string; orderId: string; note: string; consent: boolean }) {
  const sql = await db()
  const note = s.note ? encode(s.note) : ''
  const rows = await sql`INSERT INTO bakery_customer_photos(id,order_id,note,consent)
    VALUES(${s.id},${s.orderId},${note},${s.consent})
    ON CONFLICT(id) DO UPDATE SET note=EXCLUDED.note, consent=EXCLUDED.consent
    WHERE bakery_customer_photos.order_id=EXCLUDED.order_id RETURNING id`
  if (!rows.length) throw new Error('Submission belongs to another order')
}

/** Stores one photo (already a clean JPEG) under a submission. */
export async function addSubmissionPhoto(submissionId: string, orderId: string, jpeg: Buffer) {
  const sql = await db()
  const [row] = await sql`SELECT jsonb_array_length(photos) AS n FROM bakery_customer_photos WHERE id=${submissionId}`
  const file = `${submissionId}-${Number(row?.n ?? 0) + 1}.jpg`
  await uploadPrivateFile(path(orderId, file), jpeg)
  await sql`UPDATE bakery_customer_photos SET photos = photos || ${sql.json([{ file }])}::jsonb WHERE id=${submissionId}`
  return file
}

export const readCustomerPhoto = (orderId: string, file: string) => downloadPrivateFile(path(orderId, file))

export async function markInGallery(id: string, file: string, url: string) {
  const sql = await db()
  const entry = await getCustomerPhotos(id)
  if (!entry) return
  const photos = entry.photos.map(p => (p.file === file ? { ...p, gallery: url } : p))
  await sql`UPDATE bakery_customer_photos SET photos=${sql.json(photos)}::jsonb WHERE id=${id}`
}

/** Deletes a submission and its private photos (gallery copies stay; remove those in Gallery). */
export async function deleteCustomerPhotos(id: string) {
  const entry = await getCustomerPhotos(id)
  if (!entry) return
  await removePrivateFiles(entry.photos.map(p => path(entry.orderId, p.file)))
  const sql = await db()
  await sql`DELETE FROM bakery_customer_photos WHERE id=${id}`
}
