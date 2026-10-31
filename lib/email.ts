import 'server-only'
import { Resend } from 'resend'
import { SITE } from './site-info'

// All site emails go through Resend, sent from the bakery domain (sunvillebakerylv.com, verified in Resend).
// There is no orders@ mailbox: replies go to the customer through replyTo.
export const EMAIL_FROM = 'Sunville Bakery Website <orders@sunvillebakerylv.com>'
export const bakeryInbox = () => process.env.NOTIFICATION_EMAIL || SITE.email
let client: Resend | undefined
export const mailer = () => (client ??= new Resend(process.env.RESEND_API_KEY))
