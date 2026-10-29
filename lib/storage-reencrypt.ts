import 'server-only'
import { database } from './database'
import { decode, reencode } from './storage-crypto'
import { INQUIRY_PHOTO_NAME, reencryptInquiryPhoto } from './inquiry-photos'

type Sql = ReturnType<typeof database>
type Row = { id: string; value: string }

/** Encrypted text columns. Values are JSON from lib/storage-crypto.ts; an empty staff_notes means no notes. */
const COLUMNS: {
  name: string
  read: (sql: Sql) => PromiseLike<readonly Row[]>
  write: (sql: Sql, row: Row, next: string) => PromiseLike<readonly unknown[]>
}[] = [
  {
    name: 'pre-order',
    read: sql => sql<Row[]>`SELECT id::text AS id, payload AS value FROM bakery_orders`,
    write: (sql, row, next) =>
      sql`UPDATE bakery_orders SET payload=${next} WHERE id=${row.id} AND payload=${row.value} RETURNING id`,
  },
  {
    name: 'cake inquiry',
    read: sql => sql<Row[]>`SELECT id::text AS id, payload AS value FROM bakery_cake_inquiries`,
    write: (sql, row, next) =>
      sql`UPDATE bakery_cake_inquiries SET payload=${next} WHERE id=${row.id} AND payload=${row.value} RETURNING id`,
  },
  {
    name: 'cake inquiry notes',
    read: sql =>
      sql<Row[]>`SELECT id::text AS id, staff_notes AS value FROM bakery_cake_inquiries WHERE staff_notes <> ''`,
    write: (sql, row, next) =>
      sql`UPDATE bakery_cake_inquiries SET staff_notes=${next} WHERE id=${row.id} AND staff_notes=${row.value} RETURNING id`,
  },
  {
    name: 'cake order',
    read: sql => sql<Row[]>`SELECT id::text AS id, payload AS value FROM bakery_cake_orders`,
    write: (sql, row, next) =>
      sql`UPDATE bakery_cake_orders SET payload=${next} WHERE id=${row.id} AND payload=${row.value} RETURNING id`,
  },
]

export type ReencryptSummary = { checked: number; legacy: number; updated: number; failed: string[] }

/**
 * Re-encrypts everything still saved with the old ADMIN_PASSWORD-derived key (pre-orders, cake inquiries and their
 * notes and photos, cake orders) with CAMPAIGN_STORAGE_SECRET. Safe to run again: data already on the new key is
 * left alone. A row is only overwritten if it has not changed since it was read. With dryRun nothing is written.
 */
export async function reencryptLegacyData({ dryRun = false } = {}): Promise<ReencryptSummary> {
  const sql = database()
  const summary: ReencryptSummary = { checked: 0, legacy: 0, updated: 0, failed: [] }
  for (const { name, read, write } of COLUMNS) {
    for (const row of await read(sql)) {
      summary.checked++
      try {
        const next = reencode(row.value)
        if (!next) continue
        summary.legacy++
        if (dryRun) continue
        if ((await write(sql, row, next)).length) summary.updated++
        else summary.failed.push(`${name} ${row.id} (changed while re-encrypting; run again)`)
      } catch {
        summary.failed.push(`${name} ${row.id}`)
      }
    }
  }
  // Inquiry reference photos live encrypted in Storage; their names are listed in the inquiry payload.
  const inquiries = await sql`SELECT id::text AS id, payload FROM bakery_cake_inquiries`
  for (const inquiry of inquiries) {
    let photos: unknown = []
    try {
      photos = decode(inquiry.payload).photos ?? []
    } catch {
      continue // already reported above
    }
    for (const name of Array.isArray(photos) ? photos : []) {
      if (typeof name !== 'string' || !INQUIRY_PHOTO_NAME.test(name)) continue
      summary.checked++
      try {
        if (!(await reencryptInquiryPhoto(inquiry.id, name, dryRun))) continue
        summary.legacy++
        if (!dryRun) summary.updated++
      } catch {
        summary.failed.push(`cake inquiry photo ${inquiry.id}/${name}`)
      }
    }
  }
  return summary
}
