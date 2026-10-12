import { readCampaigns, writeCampaign, removeCampaign } from './database-content'
import 'server-only'
import { z } from 'zod'
import { unstable_cache, revalidateTag } from 'next/cache'
import { cache } from 'react'
import { campaignSchema, campaignStatus, type Campaign } from './campaign-model'
export * from './campaign-model'
// Public/editor validation lives in campaign-model; persistence stays server-only.
export async function listCampaigns(): Promise<Campaign[]> { return z.array(campaignSchema).parse(await readCampaigns()) }
export async function getCampaign(id: string) { return (await listCampaigns()).find(c => c.id === id) ?? null }
const cachedPublicCampaigns = unstable_cache(async () => {
 try { return { campaigns: await listCampaigns(), unavailable: false } }
 catch { return { campaigns: [] as Campaign[], unavailable: true } }
}, ['public-campaigns-v4'], { revalidate: 900, tags: ['campaigns'] })
const publicCampaigns = cache(async () => process.env.NODE_ENV === 'development' ? { campaigns: await listCampaigns(), unavailable: false } : cachedPublicCampaigns())
export async function getActiveCampaign(now = new Date()) {
 const result = await publicCampaigns()
 if (result.unavailable) throw new Error('Campaign storage temporarily unavailable')
 return result.campaigns.find(c => campaignStatus(c, now) === 'active') ?? null
}
export async function saveCampaign(campaign: Campaign) { const c = campaignSchema.parse(campaign); await writeCampaign(c); revalidateTag('campaigns'); return c }
export async function deleteCampaign(id: string) { await removeCampaign(id); revalidateTag('campaigns') }
