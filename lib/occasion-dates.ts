import { z } from 'zod'
export function storeDate(now = new Date()) { return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now) }
export function addDays(date: string, days: number) { const value = new Date(date + 'T12:00:00Z'); value.setUTCDate(value.getUTCDate() + days); return value.toISOString().slice(0, 10) }
export const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v => { const d = new Date(v + 'T12:00:00Z'); return Number.isFinite(d.getTime()) && d.toISOString().slice(0,10) === v }, 'Enter a valid date')
