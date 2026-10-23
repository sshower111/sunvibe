import 'server-only'
import postgres from 'postgres'
type Sql = ReturnType<typeof postgres>
let connection: Sql | undefined
let guarded: Sql | undefined
/** A query that hasn't answered in this time is treated as a dead connection. */
const QUERY_TIMEOUT_MS = Number(process.env.DB_QUERY_TIMEOUT_MS) || 10_000

export function database(): Sql {
  if (!process.env.DATABASE_URL) throw new Error('Database is not configured')
  if (!connection || !guarded) {
    const sql = (connection = open(process.env.DATABASE_URL))
    // Serverless instances are frozen between requests, and the pooler can drop their idle sockets. postgres.js
    // then waits forever for an answer on a dead socket, which left admin pages loading with greyed-out buttons.
    // Every query now gets a time limit; on a timeout the pool is thrown away so the next request reconnects.
    guarded = new Proxy(sql, {
      apply(target, thisArg, args) {
        const query = Reflect.apply(target, thisArg, args) as Promise<unknown>
        let timer: ReturnType<typeof setTimeout> | undefined
        const timeout = new Promise<never>((_, reject) => {
          timer = setTimeout(() => {
            if (connection === sql) {
              connection = guarded = undefined
              verifiedScopes.clear()
              void sql.end({ timeout: 0 }).catch(() => {})
            }
            reject(new Error('Database did not answer in time'))
          }, QUERY_TIMEOUT_MS)
        })
        return Promise.race([query, timeout]).finally(() => clearTimeout(timer))
      },
    })
  }
  return guarded
}

function open(url: string) {
  // Supabase transaction pooler: no prepared statements, bounded per-instance pool.
  // TLS certificates must be verified; never use rejectUnauthorized:false.
  return postgres(url, {
    prepare: false,
    max: 2,
    // Short idle and lifetime limits so connections aren't kept across long freezes.
    idle_timeout: 5,
    max_lifetime: 60 * 5,
    connect_timeout: 10,
    ssl: process.env.SUPABASE_DB_CA
      ? { ca: process.env.SUPABASE_DB_CA.replace(/\\n/g, '\n'), rejectUnauthorized: true }
      : 'verify-full',
  })
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
