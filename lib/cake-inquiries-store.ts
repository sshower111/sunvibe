import 'server-only'
import { verifiedDatabase } from './database'
import { encode, decode } from './storage-crypto'
import type { InquiryStatus, StoredCakeInquiry } from './cake-inquiry'

const contentDatabase = () => verifiedDatabase('content')
type Details = Omit<StoredCakeInquiry, 'status' | 'staffNotes'>

export async function listCakeInquiries(): Promise<StoredCakeInquiry[]> {
  const sql = await contentDatabase()
  const rows =
    await sql`SELECT payload,status,staff_notes FROM bakery_cake_inquiries ORDER BY created_at DESC LIMIT 500`
  return rows.map(r => ({
    ...(decode(r.payload) as Details),
    status: r.status as InquiryStatus,
    staffNotes: r.staff_notes ? (decode(r.staff_notes) as string) : '',
  }))
}

/** Saves a new inquiry. A retried submission (same id) is ignored. */
export async function saveCakeInquiry(inquiry: Details) {
  const sql = await contentDatabase()
  await sql`INSERT INTO bakery_cake_inquiries(id,payload,created_at) VALUES(${inquiry.id},${encode(inquiry)},${inquiry.createdAt}) ON CONFLICT(id) DO NOTHING`
}

/** Deletes an inquiry for good (admin "Delete inquiry"). Returns the deleted inquiry, or null if it was not there. */
export async function deleteCakeInquiry(id: string) {
  const inquiry = await getCakeInquiry(id)
  if (!inquiry) return null
  const sql = await contentDatabase()
  await sql`DELETE FROM bakery_cake_inquiries WHERE id=${id}`
  return inquiry
}

export async function updateCakeInquiry(id: string, change: { status?: InquiryStatus; staffNotes?: string }) {
  const sql = await contentDatabase()
  const rows =
    change.status !== undefined
      ? await sql`UPDATE bakery_cake_inquiries SET status=${change.status},updated_at=now() WHERE id=${id} RETURNING id`
      : await sql`UPDATE bakery_cake_inquiries SET staff_notes=${change.staffNotes ? encode(change.staffNotes) : ''},updated_at=now() WHERE id=${id} RETURNING id`
  if (!rows.length) throw new Error('Inquiry not found')
}

export async function getCakeInquiry(id: string): Promise<StoredCakeInquiry | null> {
  const sql = await contentDatabase()
  const rows = await sql`SELECT payload,status,staff_notes FROM bakery_cake_inquiries WHERE id=${id}`
  if (!rows.length) return null
  return {
    ...(decode(rows[0].payload) as Details),
    status: rows[0].status as InquiryStatus,
    staffNotes: rows[0].staff_notes ? (decode(rows[0].staff_notes) as string) : '',
  }
}
