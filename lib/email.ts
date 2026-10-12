import 'server-only'
import { Resend } from 'resend'
import { SITE } from './site-info'

// All site emails go through Resend. Switch EMAIL_FROM to a verified bakery domain to improve deliverability.
export const EMAIL_FROM = 'Sunville Bakery Website <onboarding@resend.dev>'
export const bakeryInbox = () => process.env.NOTIFICATION_EMAIL || SITE.email
let client: Resend | undefined
export const mailer = () => (client ??= new Resend(process.env.RESEND_API_KEY))
