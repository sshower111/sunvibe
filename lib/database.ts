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
