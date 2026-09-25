import 'server-only'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { list, put } from '@vercel/blob'
import { SEASONAL_BANNERS } from './seasonal'
import { seasonalSchema } from './seasonal-schema'
const key = 'seasonal-banners.json'
const localDevelopment = process.env.NODE_ENV === 'development' && !process.env.VERCEL
const localPath = path.join(process.cwd(), '.local-data', key)
const defaults = () => SEASONAL_BANNERS.map(item => ({ ...item, enabled: item.enabled !== false }))
export async function readSeasonalBanners() {
  if (localDevelopment) {
    try { return seasonalSchema.parse(JSON.parse(await readFile(localPath, 'utf8'))) }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return defaults()
      throw error
    }
  }
  const { blobs } = await list({ prefix: key, limit: 100 })
  const blob = blobs.find(item => item.pathname === key)
  if (!blob) return defaults()
  const response = await fetch(blob.url + '?v=' + Date.now(), { cache: 'no-store' })
  if (!response.ok) throw new Error('Banner storage unavailable')
  return seasonalSchema.parse(await response.json())
}
export async function writeSeasonalBanners(banners: unknown) {
  const validated = seasonalSchema.parse(banners)
  if (localDevelopment) {
    await mkdir(path.dirname(localPath), { recursive: true })
    const temporaryPath = localPath + '.' + randomUUID() + '.tmp'
    await writeFile(temporaryPath, JSON.stringify(validated), 'utf8')
    await rename(temporaryPath, localPath)
    return
  }
  await put(key, JSON.stringify(validated), { access: 'public', addRandomSuffix: false, allowOverwrite: true, contentType: 'application/json', cacheControlMaxAge: 60 })
}
