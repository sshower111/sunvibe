import 'server-only'
import { z } from 'zod'
import { unstable_cache, revalidateTag } from 'next/cache'
import { cache } from 'react'
import { campaignSchema, campaignStatus, seedCampaign, type Campaign } from './campaign-model'
export * from './campaign-model'
// Public/editor validation lives in campaign-model; persistence stays server-only.
export async function listCampaigns(): Promise<Campaign[]> { const { readJson } = await import('./json-store'); return z.array(campaignSchema).parse(await readJson('campaigns.json', [seedCampaign])) }
export async function getCampaign(id: string) { return (await listCampaigns()).find(c => c.id === id) ?? null }
const cachedPublicCampaigns = unstable_cache(async () => {
 try { return { campaigns: await listCampaigns(), unavailable: false } }
 catch { return { campaigns: [] as Campaign[], unavailable: true } }
}, ['public-campaigns-v2'], { revalidate: 900, tags: ['campaigns'] })
const publicCampaigns = cache(async () => process.env.NODE_ENV === 'development' ? { campaigns: await listCampaigns(), unavailable: false } : cachedPublicCampaigns())
export async function getActiveCampaign(now = new Date()) {
 const result = await publicCampaigns()
 if (result.unavailable) throw new Error('Campaign storage temporarily unavailable')
 return result.campaigns.find(c => campaignStatus(c, now) === 'active') ?? null
}
export async function saveCampaign(campaign: Campaign) { const c = campaignSchema.parse(campaign); const { updateJson } = await import('./json-store'); await updateJson<Campaign[]>('campaigns.json', [seedCampaign], rows => { const valid = z.array(campaignSchema).parse(rows); return valid.some(row => row.id === c.id) ? valid.map(row => row.id === c.id ? c : row) : [...valid, c] }); revalidateTag('campaigns'); return c }
export async function deleteCampaign(id: string) { const { updateJson } = await import('./json-store'); await updateJson<Campaign[]>('campaigns.json', [seedCampaign], rows => rows.filter(row => row.id !== id)); revalidateTag('campaigns') }
