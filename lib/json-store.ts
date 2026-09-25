import 'server-only'
import { readFile, writeFile, mkdir, rename } from 'node:fs/promises'
import path from 'node:path'
import { createHash, randomBytes, createCipheriv, createDecipheriv, randomUUID } from 'node:crypto'
import { list, put } from '@vercel/blob'
const local = !process.env.VERCEL && (process.env.NODE_ENV === 'development' || !process.env.BLOB_READ_WRITE_TOKEN)
const queues = new Map<string, Promise<unknown>>()
function secret() { const value = process.env.CAMPAIGN_STORAGE_SECRET || process.env.ADMIN_PASSWORD; if (!value) throw new Error('Storage encryption not configured'); return createHash('sha256').update(value).digest() }
function encode(value: unknown) { const iv = randomBytes(12); const cipher = createCipheriv('aes-256-gcm', secret(), iv); const data = Buffer.concat([cipher.update(JSON.stringify(value)), cipher.final()]); return JSON.stringify({ v: 1, iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), data: data.toString('base64') }) }
function decode(text: string) { const value = JSON.parse(text); const cipher = createDecipheriv('aes-256-gcm', secret(), Buffer.from(value.iv,'base64')); cipher.setAuthTag(Buffer.from(value.tag,'base64')); return JSON.parse(Buffer.concat([cipher.update(Buffer.from(value.data,'base64')), cipher.final()]).toString()) }
async function read<T>(key: string, fallback: T): Promise<{ value: T; etag?: string }> {
  if (local) { try { return { value: JSON.parse(await readFile(path.join(process.cwd(), '.local-data', key), 'utf8')) } } catch (e) { if ((e as NodeJS.ErrnoException).code === 'ENOENT') return { value: fallback }; throw e } }
  const { blobs } = await list({ prefix: 'occasions/' + key, limit: 100 })
  const blob = blobs.find(b => b.pathname === 'occasions/' + key)
  if (!blob) return { value: fallback }
  const response = await fetch(blob.url + '?v=' + randomUUID(), { cache: 'no-store' })
  if (!response.ok) throw new Error('Storage unavailable')
  const etag = response.headers.get('etag')
  if (!etag) throw new Error('Storage version missing')
  return { value: decode(await response.text()), etag }
}
export async function readJson<T>(key: string, fallback: T): Promise<T> { return (await read(key, fallback)).value }
export async function updateJson<T>(key: string, fallback: T, change: (value: T) => T): Promise<T> {
  const previous = queues.get(key) || Promise.resolve()
  const task = previous.catch(() => {}).then(async () => {
    for (let attempt = 0; attempt < 5; attempt++) {
      const current = await read(key, fallback); const value = change(current.value)
      if (local) { const file = path.join(process.cwd(), '.local-data', key); await mkdir(path.dirname(file), { recursive: true }); const temp = file + '.' + randomUUID(); await writeFile(temp, JSON.stringify(value)); await rename(temp, file); return value }
      try { await put('occasions/' + key, encode(value), { access: 'public', addRandomSuffix: false, allowOverwrite: !!current.etag, ...(current.etag ? { ifMatch: current.etag } : {}), contentType: 'application/json', cacheControlMaxAge: 60 }); return value }
      catch (error) { if (!/precondition|already exists|condition|412|409/i.test(String(error))) throw error }
    }
    throw new Error('Another update is in progress. Please retry.')
  })
  queues.set(key, task); try { return await task } finally { if (queues.get(key) === task) queues.delete(key) }
}
