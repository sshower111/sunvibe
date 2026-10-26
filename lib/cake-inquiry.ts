import { z } from 'zod'

import { cakeCatalog, deliveryOptions } from './cake-catalog'

export const eventTypes = ['Birthday', 'Wedding', 'Anniversary', 'Character / Theme', 'Other'] as const
export const budgets = [
  'Not sure — please advise',
  'Under $100',
  '$100–$200',
  '$200–$350',
  '$350–$500',
  '$500–$800',
  '$800+',
] as const
export const flavors = ['Please recommend', 'Vanilla', 'Chocolate', 'Coffee', 'Green Tea', 'Orange', 'Pandan'] as const
export const fillings = [
  'Please recommend',
  'Mixed Fresh Fruit',
  'Strawberry',
  'Banana',
  'Strawberry Banana',
  'Mango',
  'Taro',
  'Custard',
  'Coconut',
  'Durian',
  'Something else (e.g., passion fruit)',
] as const
// The bakery accommodates fillings it doesn't list; the customer describes them in the notes.
export const CUSTOM_FILLING = fillings[fillings.length - 1]
export const MAX_CAKE_MESSAGE = 60
// 5 × 800 KB keeps the whole upload under Vercel's 4.5 MB request limit.
export const MAX_PHOTO_BYTES = 800 * 1024
export const MAX_PHOTOS = 5
export function earliestCakeDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  const part = (key: string) => parts.find(p => p.type === key)!.value
  const date = new Date(`${part('year')}-${part('month')}-${part('day')}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() + 3)
  return date.toISOString().slice(0, 10)
}
// Event time is optional ('' = not decided yet). Stored as 24-hour HH:MM from <input type="time">.
export function formatEventTime(value: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(value)
  if (!match) return ''
  const hour = Number(match[1])
  return `${hour % 12 || 12}:${match[2]} ${hour < 12 ? 'AM' : 'PM'}`
}
export const cakeInquirySchema = z.object({
  name: z.string().trim().min(1, 'Enter your name.').max(100),
  email: z.string().trim().email('Enter a valid email address.').max(100),
  phone: z
    .string()
    .trim()
    .min(7, 'Enter a phone number.')
    .max(30)
    .regex(/^[+\d\s().-]+$/, 'Enter a valid phone number.')
    .refine(v => {
      const n = v.replace(/\D/g, '').length
      return n >= 7 && n <= 10
    }, 'Enter a phone number with up to 10 digits.'),
  eventDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose an event date.')
    .refine(v => {
      const d = new Date(v + 'T12:00:00Z')
      return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v && v >= earliestCakeDate()
    }, 'Please allow at least 3 days (Las Vegas time).'),
  eventTime: z
    .string()
    .trim()
    .regex(/^(?:(?:[01]\d|2[0-3]):[0-5]\d)?$/, 'Choose a time, or leave it blank if not decided.')
    .default(''),
  eventType: z.enum(eventTypes),
  servings: z
    .string()
    .regex(/^\d{1,3}$/, 'Enter a guest count from 1 to 999.')
    .refine(v => Number(v) >= 1, 'Enter at least 1 serving.'),
  size: z
    .string()
    .refine(
      value => value === 'Not sure' || cakeCatalog.some(cake => cake.value === value),
      'Choose a listed cake size.',
    ),
  flavor: z.enum(flavors),
  filling: z.enum(fillings),
  cakeMessage: z
    .string()
    .trim()
    .max(MAX_CAKE_MESSAGE, `Please keep the cake message under ${MAX_CAKE_MESSAGE} characters.`)
    .default(''),
  budget: z.enum(budgets),
  fulfillment: z.enum(deliveryOptions),
  deliveryAddress: z.string().trim().max(500, 'Please keep the delivery address under 500 characters.'),
  notes: z.string().trim().max(3000, 'Please keep notes under 3,000 characters.'),
  acknowledged: z.literal('yes', {
    errorMap: () => ({ message: 'Please acknowledge this is an inquiry, not a confirmed order.' }),
  }),
})
export type CakeInquiry = z.infer<typeof cakeInquirySchema>

// Tracking in admin. Each open status says whose turn it is.
export const inquiryStatuses = [
  'new',
  'waiting_customer',
  'checking_owner',
  'confirmed_paid',
  'completed',
  'cancelled',
] as const
export type InquiryStatus = (typeof inquiryStatuses)[number]
export const inquiryStatusLabels: Record<InquiryStatus, string> = {
  new: 'New',
  waiting_customer: 'Awaiting customer',
  checking_owner: 'Under bakery review',
  confirmed_paid: 'Confirmed & paid',
  completed: 'Completed',
  cancelled: 'Cancelled',
}
export const MAX_STAFF_NOTES = 3000
/** Short code shown in email subjects and admin so each inquiry gets its own email thread. */
export const inquiryRef = (id: string) => '#' + id.slice(0, 4).toUpperCase()
export type StoredCakeInquiry = Omit<CakeInquiry, 'acknowledged'> & {
  id: string
  createdAt: string
  photoCount: number
  /** Reference photos kept for admin preview, e.g. ["1.jpg", "2.png"]. Missing on inquiries from before photos were kept. */
  photos?: string[]
  status: InquiryStatus
  staffNotes: string
  /** Sample from admin "Send test inquiry"; can be deleted from admin. */
  test?: boolean
  /** Admin list only: the custom cake order made from this inquiry, if any. */
  order?: { ref: string; status: string }
}
