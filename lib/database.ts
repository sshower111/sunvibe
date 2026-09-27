import 'server-only'
import postgres from 'postgres'
export function usesDatabase(scope: 'menu' | 'content') {
 return process.env[scope === 'menu' ? 'MENU_DATA_SOURCE' : 'CONTENT_DATA_SOURCE'] === 'supabase'
}
let connection: ReturnType<typeof postgres> | undefined
export function database() {
 if (!process.env.DATABASE_URL) throw new Error('Database is not configured')
 // Supabase transaction pooler: no prepared statements, bounded per-instance pool.
 // TLS certificates must be verified; never use rejectUnauthorized:false.
 return connection ??= postgres(process.env.DATABASE_URL, { prepare: false, max: 2, idle_timeout: 20, connect_timeout: 10, ssl: process.env.SUPABASE_DB_CA ? { ca: process.env.SUPABASE_DB_CA.replace(/\\n/g, '\n'), rejectUnauthorized: true } : 'verify-full' })
}

// The migration marker only needs checking once per server instance, not before every query.
const verifiedScopes = new Map<'menu' | 'content', Promise<void>>()
export async function verifiedDatabase(scope: 'menu' | 'content') {
 const sql = database()
 let check = verifiedScopes.get(scope)
 if (!check) {
  check = sql`SELECT scope FROM bakery_migrations WHERE scope = ${scope}`.then(rows => {
   if (!rows.length) throw new Error((scope === 'menu' ? 'Menu' : 'Content') + ' migration has not been verified')
  })
  verifiedScopes.set(scope, check)
  check.catch(() => verifiedScopes.delete(scope)) // retry next time after a failure
 }
 await check
 return sql
}
