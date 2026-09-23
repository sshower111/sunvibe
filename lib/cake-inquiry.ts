import { z } from 'zod'

import { cakeCatalog, deliveryOptions } from './cake-catalog'

export const eventTypes = ['Birthday', 'Wedding', 'Anniversary', 'Character / Theme', 'Other'] as const
export const budgets = ['Not sure — please advise', 'Under $100', '$100–$200', '$200–$350', '$350–$500', '$500–$800', '$800+'] as const
export const flavors = ['Please recommend', 'Vanilla', 'Chocolate', 'Coffee', 'Green Tea', 'Orange', 'Pandan'] as const
export const fillings = ['Please recommend', 'Mixed Fresh Fruit', 'Strawberry', 'Mango', 'Taro', 'Custard', 'Coconut', 'Durian', 'Banana', 'Custom filling / describe in notes'] as const
export const MAX_PHOTO_BYTES = 1024 * 1024
export const MAX_PHOTOS = 3
export function earliestCakeDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now)
  const part = (key: string) => parts.find(p => p.type === key)!.value
  const date = new Date(`${part('year')}-${part('month')}-${part('day')}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() + 3)
  return date.toISOString().slice(0, 10)
}
export const cakeInquirySchema = z.object({
  name: z.string().trim().min(1, 'Enter your name.').max(100),
  email: z.string().trim().email('Enter a valid email address.').max(100),
  phone: z.string().trim().min(7, 'Enter a phone number.').max(30).regex(/^[+\d\s().-]+$/, 'Enter a valid phone number.').refine(v => v.replace(/\D/g, '').length >= 7, 'Enter a valid phone number.'),
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose an event date.').refine(v => { const d = new Date(v + 'T12:00:00Z'); return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v && v >= earliestCakeDate() }, 'Please allow at least 3 days (Las Vegas time).'),
  eventType: z.enum(eventTypes),
  servings: z.string().regex(/^\d{1,3}$/, 'Enter a guest count from 1 to 999.').refine(v => Number(v) >= 1, 'Enter at least 1 serving.'),
  size: z.string().refine(value => value === 'Not sure' || cakeCatalog.some(cake => cake.value === value), 'Choose a listed cake size.'),
  flavor: z.enum(flavors), filling: z.enum(fillings), budget: z.enum(budgets),
  fulfillment: z.enum(deliveryOptions),
  deliveryAddress: z.string().trim().max(500, 'Please keep the delivery address under 500 characters.'),
  notes: z.string().trim().max(3000, 'Please keep notes under 3,000 characters.'),
  acknowledged: z.literal('yes', { errorMap: () => ({ message: 'Please acknowledge this is an inquiry, not a confirmed order.' }) }),
})
export type CakeInquiry = z.infer<typeof cakeInquirySchema>
