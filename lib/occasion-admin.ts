import 'server-only'
import { createHash, timingSafeEqual } from 'node:crypto'
export function isOccasionAdmin(password:unknown) { const expected=process.env.ADMIN_PASSWORD;return !!expected&&typeof password==='string'&&timingSafeEqual(createHash('sha256').update(password).digest(),createHash('sha256').update(expected).digest()) }
