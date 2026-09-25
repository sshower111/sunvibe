import { z } from 'zod'
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => { const parsed = new Date(value + 'T00:00:00Z'); return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value }, 'Enter a valid date')
export const seasonalSchema = z.array(z.object({
  id: z.string().regex(/^[a-z0-9-]{1,80}$/),
  enabled: z.boolean(),
  headline: z.string().trim().min(1).max(160),
  message: z.string().trim().min(1).max(350),
  ctaLabel: z.string().trim().min(1).max(80),
  ctaHref: z.string().max(500).refine(value => /^\/(?![\/\\])[^\s\\]*$/.test(value) || /^tel:\+?[0-9()-]+$/.test(value) || value === '#', 'Use a site path such as /menu or a tel: phone link'),
  startsAt: date, endsAt: date,
  productId: z.string().regex(/^prod_[a-zA-Z0-9]+$/).optional(),
}).refine(value => value.startsAt <= value.endsAt, 'End date must be on or after start date')
.refine(value => !value.enabled || ![value.headline, value.message, value.ctaLabel].some(text => /TODO/i.test(text)), 'Replace TODO text before enabling this banner'))
.max(30).refine(items => new Set(items.map(item => item.id)).size === items.length, 'Banner IDs must be unique')
