import { z } from 'zod'
import { dateSchema, storeDate } from './occasion-dates'
export const imageSchema = z.string().max(1000).refine(v => !v || /^\/(?![\/\\])[^\s\\]*$/.test(v) || /^https:\/\/[^\s]+$/.test(v), 'Use an HTTPS image or local image path')
export const campaignSchema = z.object({
  id: z.string().regex(/^[a-zA-Z0-9-]{1,100}$/), occasion: z.string().trim().min(1).max(100), name: z.string().trim().min(1).max(150),
  banner: z.object({ headline: z.string().trim().min(1).max(160), message: z.string().trim().min(1).max(350), subline: z.string().max(350).optional(), ctaLabel: z.string().trim().min(1).max(80).default('Pre-order now') }),
  page: z.object({ title: z.string().trim().min(1).max(180), intro: z.string().trim().min(1).max(1500), heroImage: imageSchema.optional() }),
  items: z.array(z.object({ id: z.string().regex(/^[a-zA-Z0-9-]{1,100}$/), name: z.string().trim().min(1).max(150), nameAlt: z.string().max(150).optional(), price: z.number().finite().min(0.01).max(10000).refine(v => Math.abs(v * 100 - Math.round(v * 100)) < 0.000001, 'Use at most two decimal places'), photo: imageSchema.optional(), maxPerOrder: z.number().int().min(1).max(999).optional() })).max(40),
  startsAt: dateSchema, endsAt: dateSchema, orderCutoff: dateSchema, published: z.boolean(),
}).refine(c => c.startsAt <= c.endsAt && c.orderCutoff <= c.endsAt && c.orderCutoff >= c.startsAt, 'Dates must be ordered: start, cutoff, end')
.refine(c => new Set(c.items.map(i => i.id)).size === c.items.length, 'Item IDs must be unique')
export type Campaign = z.infer<typeof campaignSchema>
export function campaignStatus(c: Campaign, now = new Date()) { const today = storeDate(now); return !c.published ? 'draft' : today > c.endsAt ? 'ended' : today < c.startsAt ? 'scheduled' : 'active' }
export const seedCampaign: Campaign = { id: 'mid-autumn-2026', occasion: 'Mid-Autumn Festival', name: 'Mid-Autumn 2026', banner: { headline: 'Fresh mooncakes for Mid-Autumn Festival — this Friday.', message: 'Pineapple, red bean & lotus — baked fresh. Call to reserve yours.', ctaLabel: 'Reserve mooncakes' }, page: { title: 'Mid-Autumn mooncakes in Las Vegas', intro: 'Pineapple, red bean & lotus — baked fresh. Reserve your festival favorites.' }, items: [], startsAt: '2026-09-24', endsAt: '2026-09-25', orderCutoff: '2026-09-24', published: true }
