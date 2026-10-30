import 'server-only'
import { mailer, EMAIL_FROM, bakeryInbox } from '@/lib/email'
import { SITE } from '@/lib/site-info'
import { SITE_URL } from '@/lib/seo'
import { escapeHtml } from '@/lib/security'
import {
  amountDueNow,
  isDelivery,
  formatPickupDate,
  formatPickupTime,
  formatVegasTime,
  kitchenText,
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
  isDelivery(o)
    ? ['Delivery', `${pickup(o)} to ${o.deliveryAddress} (${o.fulfillment})`]
    : ['Pickup', `${pickup(o)} at ${SITE.address}`],
  ['Total', money(o.price)],
  ...(o.deposit
    ? ([
        ['Deposit', money(o.deposit)],
        ['Balance due at ' + (isDelivery(o) ? 'delivery' : 'pickup'), money(o.price - o.deposit)],
      ] as [string, string][])
    : []),
  ...(o.notes ? ([[o.kind === 'custom' ? 'Design notes' : 'Notes', o.notes]] as [string, string][]) : []),
]
const html = (paragraphs: string[], rows: [string, string][], after: string[] = []) =>
  paragraphs.map(p => `<p>${escapeHtml(p)}</p>`).join('') +
  rows.map(([label, value]) => `<p><strong>${label}:</strong> ${escapeHtml(value)}</p>`).join('') +
  after.map(p => `<p>${escapeHtml(p).replace(/\n/g, '<br>')}</p>`).join('')
const text = (paragraphs: string[], rows: [string, string][], after: string[] = []) =>
  [...paragraphs, '', ...rows.map(([l, v]) => `${l}: ${v}`), '', ...after].join('\n')

/** Customer emails for a test order go to the bakery inbox instead. */
const customerEmail = (o: StoredCakeOrder) => (o.test ? bakeryInbox() : o.email)
const tag = (o: StoredCakeOrder, subject: string) => (o.test ? '[TEST] ' + subject : subject)

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

/** New order: to the bakery (with the Chinese copy for the kitchen) and to the customer. */
export async function sendNewOrderEmails(o: StoredCakeOrder) {
  const ref = orderRef(o)
  const held = o.status === 'awaiting_approval'
  const admin = `${SITE_URL}/admin?tab=cake-orders`
  const bakery = send(`cake-order-new-${o.id}`, {
    to: bakeryInbox(),
    replyTo: o.email,
    subject: tag(
      o,
      `${held ? 'APPROVE BY ' + formatVegasTime(o.approveBy!) + ' — ' : ''}Cake order ${ref}: ${o.name} · ${sizeLabel(o.size)} · ${pickup(o)}`,
    ),
    paragraphs: held
      ? [
          `${o.approvalReason}. The card is held for ${money(o.price)}, not charged.`,
          `Approve or decline by ${formatVegasTime(o.approveBy!)} (Las Vegas) in admin → Cake orders: ${admin}`,
          'If nothing is done by then, the hold is released and the customer is told we could not take the order.',
        ]
      : [`Paid online: ${money(o.price)}. Admin → Cake orders: ${admin}`],
    rows: [['Name', o.name], ['Phone', o.phone], ['Email', o.email], ...cakeRows(o)],
    after: ['— Chinese copy for the kitchen —', kitchenText(o)],
  })
  const customer = send(`cake-order-customer-${o.id}`, {
    to: customerEmail(o),
    replyTo: bakeryInbox(),
    subject: tag(
      o,
      held
        ? `We received your cake order ${ref} — Sunville Bakery`
        : `Your cake order ${ref} is confirmed — Sunville Bakery`,
    ),
    paragraphs: held
      ? [
          `Hi ${o.name}, thanks for your order! Because of the timing, we need to check that we can make it.`,
          `We have placed a hold of ${money(o.price)} on your card but have not charged it. We will confirm by ${formatVegasTime(o.approveBy!)} (Las Vegas time). If we can't make it, the hold is released and you won't be charged.`,
        ]
      : [`Hi ${o.name}, thanks for your order! It is confirmed and paid.`],
    rows: cakeRows(o),
    after: [`Questions or changes? Reply to this email or call ${SITE.phone}.`],
  })
  return Promise.all([bakery, customer, held ? sendApprovalText(o) : Promise.resolve(true)])
}

/**
 * A text to the bakery phone for an order that needs approval, through the email-to-SMS gateway (SMS_GATEWAY_EMAIL).
 * Kept short and plain so carriers deliver it as one message.
 */
async function sendApprovalText(o: StoredCakeOrder) {
  const to = process.env.SMS_GATEWAY_EMAIL
  if (!to) return true
  try {
    const result = await mailer().emails.send(
      {
        from: EMAIL_FROM,
        to,
        subject: tag(o, 'Approve cake order'),
        text: `${o.test ? '[TEST] ' : ''}APPROVE by ${formatVegasTime(o.approveBy!)}: cake ${orderRef(o)}, ${sizeLabel(o.size)}, pickup ${pickup(o)}. ${SITE_URL}/admin`,
      },
      { idempotencyKey: `cake-order-sms-${o.id}` },
    )
    return !result.error
  } catch {
    return false
  }
}

export const sendApprovedEmail = (o: StoredCakeOrder) =>
  send(`cake-order-approved-${o.id}`, {
    to: customerEmail(o),
    replyTo: bakeryInbox(),
    subject: tag(o, `Your cake order ${orderRef(o)} is confirmed — Sunville Bakery`),
    paragraphs: [`Hi ${o.name}, good news: we can make your cake. Your card has now been charged ${money(o.price)}.`],
    rows: cakeRows(o),
    after: [`Questions or changes? Reply to this email or call ${SITE.phone}.`],
  })

/** Declined by the bakery, or not approved in time. The hold has been released either way. */
export const sendNotAcceptedEmail = (o: StoredCakeOrder) =>
  send(`cake-order-not-accepted-${o.id}`, {
    to: customerEmail(o),
    replyTo: bakeryInbox(),
    subject: tag(o, `We can't make your cake order ${orderRef(o)} — Sunville Bakery`),
    paragraphs: [
      `Hi ${o.name}, we're sorry, but we can't make this cake for ${pickup(o)}.`,
      `The hold on your card has been released and you have not been charged. Your bank may take a few days to remove it from your statement.`,
      `Please choose a later pickup time on our website, or call ${SITE.phone} and we'll try to help.`,
    ],
    rows: cakeRows(o).filter(([label]) => label !== 'Total'),
  })

// Custom cake orders (made in admin from an inquiry, paid through a link).

export const payLink = (o: Pick<StoredCakeOrder, 'id'>) => `${SITE_URL}/pay/${o.id}`

/** "Your cake is confirmed — pay here": sent when the order is created, and again when the link is resent. */
export const sendPaymentRequestEmail = (o: StoredCakeOrder) =>
  send(`cake-order-pay-request-${o.id}-${o.payBy}`, {
    to: customerEmail(o),
    replyTo: bakeryInbox(),
    subject: tag(o, `Your custom cake ${orderRef(o)} is confirmed — payment link inside`),
    paragraphs: [
      `Hi ${o.name}, thank you for choosing Sunville Bakery! Here are the final details of your cake.`,
      `To reserve it, please pay ${o.deposit ? 'the deposit of ' : ''}${money(amountDueNow(o))} by ${formatVegasTime(o.payBy!)} (Las Vegas time):`,
      payLink(o),
    ],
    rows: cakeRows(o),
    after: [`If anything above needs changing, just reply to this email or call ${SITE.phone} before paying.`],
  })

/** Custom order paid: receipt to the customer, notice to the bakery. */
export async function sendCustomPaidEmails(o: StoredCakeOrder) {
  const paid = amountDueNow(o)
  const what = o.deposit ? `deposit of ${money(paid)}` : `payment of ${money(paid)}`
  return Promise.all([
    send(`cake-order-custom-paid-${o.id}`, {
      to: customerEmail(o),
      replyTo: bakeryInbox(),
      subject: tag(o, `Payment received for your custom cake ${orderRef(o)} — Sunville Bakery`),
      paragraphs: [`Hi ${o.name}, we've received your ${what}. Your cake is booked!`],
      rows: cakeRows(o),
      after: [`Questions or changes? Reply to this email or call ${SITE.phone}.`],
    }),
    send(`cake-order-custom-paid-bakery-${o.id}`, {
      to: bakeryInbox(),
      replyTo: o.email,
      subject: tag(o, `Paid: custom cake ${orderRef(o)} · ${o.name} · ${pickup(o)}`),
      paragraphs: [`${o.name} paid the ${what} online. Admin → Cake orders: ${SITE_URL}/admin?tab=cake-orders`],
      rows: [['Name', o.name], ['Phone', o.phone], ['Email', o.email], ...cakeRows(o)],
      after: ['— Chinese copy for the kitchen —', kitchenText(o)],
    }),
  ])
}
