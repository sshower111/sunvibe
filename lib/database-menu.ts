import 'server-only'
import { verifiedDatabase } from './database'
import type { MenuProduct } from './menu'
export type StoredMenuProduct = MenuProduct & { active: boolean }
export function menuRow(row: Record<string, any>): StoredMenuProduct {
 return { id: row.id, name: row.name, description: row.description, price: (row.price_cents / 100).toFixed(2), priceId: '', image: row.image, category: row.category, active: row.active }
}
export async function databaseMenu(all = false) {
 const sql = await verifiedDatabase('menu')
 const rows = await sql`SELECT * FROM bakery_menu WHERE active OR ${all} ORDER BY position, id`
 return rows.map(menuRow)
}
