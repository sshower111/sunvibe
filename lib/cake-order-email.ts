import 'server-only'
import { mailer, EMAIL_FROM, bakeryInbox } from '@/lib/email'
import { SITE } from '@/lib/site-info'
import { SITE_URL } from '@/lib/seo'
import { escapeHtml } from '@/lib/security'
import {
  formatPickupDate,
  formatPickupTime,
  formatVegasTime,
  momText,
  orderRef,
  sizeLabel,
  type StoredCakeOrder,
} from '@/lib/cake-order'

// Emails for online cake orders. Every send uses an idempotency key, so a retry never sends twice.

const money = (n: number) => '$' + n.toFixed(2)
const pickup = (o: StoredCakeOrder) => `${formatPickupDate(o.pickupDate)}, ${formatPickupTime(o.pickupTime)}`
const cakeRows = (o: StoredCakeOrder): [string, string][] => [
  ['Cake', `${sizeLabel(o.size)} · ${o.flavor} cake · ${o.filling} filling`],
  ['Writing on cake', o.cakeMessage || 'None'],
  ['Pickup', `${pickup(o)} at ${SITE.address}`],
  ['Total', money(o.price)],
  ...(o.notes ? ([['Notes', o.notes]] as [string, string][]) : []),
]
const html = (paragraphs: string[], rows: [string, string][], after: string[] = []) =>
  paragraphs.map(p => `<p>${escapeHtml(p)}</p>`).join('') +
  rows.map(([label, value]) => `<p><strong>${label}:</strong> ${escapeHtml(value)}</p>`).join('') +
  after.map(p => `<p>${escapeHtml(p).replace(/\n/g, '<br>')}</p>`).join('')
const text = (paragraphs: string[], rows: [string, string][], after: string[] = []) =>
  [...paragraphs, '', ...rows.map(([l, v]) => `${l}: ${v}`), '', ...after].join('\n')

async function send(
  key: string,
  message: {
    to: string
    subject: string
    paragraphs: string[]
    rows: [string, string][]
    after?: string[]
    replyTo?: string
  },
) {
  try {
    const result = await mailer().emails.send(
      {
        from: EMAIL_FROM,
        to: message.to,
        ...(message.replyTo ? { replyTo: message.replyTo } : {}),
        subject: message.subject,
        html: html(message.paragraphs, message.rows, message.after),
        text: text(message.paragraphs, message.rows, message.after),
      },
      { idempotencyKey: key },
    )
    return !result.error
  } catch {
    return false
  }
}

/** New order: to the bakery (with the Chinese text for Mom) and to the customer. */
export async function sendNewOrderEmails(o: StoredCakeOrder) {
  const ref = orderRef(o.id)
  const held = o.status === 'awaiting_approval'
  const admin = `${SITE_URL}/admin?tab=cake-orders`
  const bakery = send(`cake-order-new-${o.id}`, {
    to: bakeryInbox(),
    replyTo: o.email,
    subject: `${held ? 'APPROVE BY ' + formatVegasTime(o.approveBy!) + ' — ' : ''}Cake order ${ref}: ${o.name} · ${sizeLabel(o.size)} · ${pickup(o)}`,
    paragraphs: held
      ? [
          `${o.approvalReason}. The card is held for ${money(o.price)}, not charged.`,
          `Approve or decline by ${formatVegasTime(o.approveBy!)} (Las Vegas) in admin → Cake orders: ${admin}`,
          'If nothing is done by then, the hold is released and the customer is told we could not take the order.',
        ]
      : [`Paid online: ${money(o.price)}. Admin → Cake orders: ${admin}`],
    rows: [['Name', o.name], ['Phone', o.phone], ['Email', o.email], ...cakeRows(o)],
    after: ['— For Mom —', momText(o)],
  })
  const customer = send(`cake-order-customer-${o.id}`, {
    to: o.email,
    replyTo: bakeryInbox(),
    subject: held
      ? `We received your cake order ${ref} — Sunville Bakery`
      : `Your cake order ${ref} is confirmed — Sunville Bakery`,
    paragraphs: held
      ? [
          `Hi ${o.name}, thanks for your order! Because of the timing, we need to check that we can make it.`,
          `We have placed a hold of ${money(o.price)} on your card but have not charged it. We will confirm by ${formatVegasTime(o.approveBy!)} (Las Vegas time). If we can't make it, the hold is released and you won't be charged.`,
        ]
      : [`Hi ${o.name}, thanks for your order! It is confirmed and paid.`],
    rows: cakeRows(o),
    after: [`Questions or changes? Reply to this email or call ${SITE.phone}.`],
  })
  return Promise.all([bakery, customer])
}

export const sendApprovedEmail = (o: StoredCakeOrder) =>
  send(`cake-order-approved-${o.id}`, {
    to: o.email,
    replyTo: bakeryInbox(),
    subject: `Your cake order ${orderRef(o.id)} is confirmed — Sunville Bakery`,
    paragraphs: [`Hi ${o.name}, good news: we can make your cake. Your card has now been charged ${money(o.price)}.`],
    rows: cakeRows(o),
    after: [`Questions or changes? Reply to this email or call ${SITE.phone}.`],
  })

/** Declined by the bakery, or not approved in time. The hold has been released either way. */
export const sendNotAcceptedEmail = (o: StoredCakeOrder) =>
  send(`cake-order-not-accepted-${o.id}`, {
    to: o.email,
    replyTo: bakeryInbox(),
    subject: `We can't make your cake order ${orderRef(o.id)} — Sunville Bakery`,
    paragraphs: [
      `Hi ${o.name}, we're sorry, but we can't make this cake for ${pickup(o)}.`,
      `The hold on your card has been released and you have not been charged. Your bank may take a few days to remove it from your statement.`,
      `Please choose a later pickup time on our website, or call ${SITE.phone} and we'll try to help.`,
    ],
    rows: cakeRows(o).filter(([label]) => label !== 'Total'),
  })
