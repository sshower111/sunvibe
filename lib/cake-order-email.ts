import 'server-only'
import { mailer, EMAIL_FROM, bakeryInbox } from '@/lib/email'
import { SITE } from '@/lib/site-info'
import { SITE_URL } from '@/lib/seo'
import { escapeHtml } from '@/lib/security'
import {
  emailBranded,
  emailPickupCode,
  emailDivider,
  emailHeading,
  emailPage,
  emailParagraph,
  emailRows,
  SUBJECT_TAG,
} from '@/lib/email-layout'
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
import { PICKUP_QR_CID, pickupQrPng } from '@/lib/pickup-qr'

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
const html = (paragraphs: string[], rows: [string, string][], after: string[] = [], kitchen?: string, extra = '') =>
  emailPage(
    paragraphs.map(p => emailParagraph(escapeHtml(p))).join('') +
      emailRows(rows.map(([label, value]) => [label, escapeHtml(value)])) +
      extra +
      after.map(p => emailParagraph(escapeHtml(p).replace(/\n/g, '<br>'))).join('') +
      // Kitchen copy lines are "label：value", shown as a second table.
      (kitchen
        ? emailDivider() +
          `<div lang="zh-Hant">${emailHeading('Chinese copy for the kitchen')}` +
          emailRows(
            kitchen.split('\n').map(line => {
              const [label, ...value] = line.split('：')
              return [escapeHtml(label), escapeHtml(value.join('：'))]
            }),
          ) +
          '</div>'
        : ''),
  )
const text = (
  paragraphs: string[],
  rows: [string, string][],
  after: string[] = [],
  kitchen?: string,
  branded?: Branded,
) =>
  [
    ...(branded ? [branded.headline, ''] : []),
    ...paragraphs,
    '',
    ...(branded ? [branded.detailsTitle] : []),
    ...rows.map(([l, v]) => `${l}: ${v}`),
    '',
    ...(branded?.beforeButton ?? []),
    ...(branded?.button ? [`${branded.button.label}: ${branded.button.url}`, ''] : []),
    ...after,
    ...(kitchen ? ['', '— Chinese copy for the kitchen —', kitchen] : []),
  ].join('\n')

/** The bakery's look for customer emails (lib/email-layout.ts): paragraphs become the intro, `after` the closing. */
type Branded = {
  headline: string
  detailsTitle: string
  beforeButton?: string[]
  button?: { label: string; url: string }
}
const brandedHtml = (
  b: Branded,
  paragraphs: string[],
  rows: [string, string][],
  after: string[] = [],
  test?: boolean,
  extra?: string,
) =>
  emailBranded({
    extra,
    siteUrl: SITE_URL,
    headline: escapeHtml(b.headline),
    intro: paragraphs.map(escapeHtml),
    detailsTitle: escapeHtml(b.detailsTitle),
    rows: rows.map(([label, value]) => [escapeHtml(label), escapeHtml(value)]),
    beforeButton: b.beforeButton?.map(p => `<strong>${escapeHtml(p)}</strong>`),
    button: b.button && { label: escapeHtml(b.button.label), url: escapeHtml(b.button.url) },
    closing: after.map(escapeHtml),
    footer: escapeHtml(`${SITE.name} · ${SITE.address} · ${SITE.phone}`),
    note: test ? 'TEST email: no real customer received this.' : undefined,
  })

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
    /** Chinese copy for the kitchen (bakery emails only). */
    kitchen?: string
    /** Customer emails with the bakery's logo, illustration and centered layout. */
    branded?: Branded
    test?: boolean
    /** Adds the pickup QR code (customer confirmation emails once the cake is paid). */
    pickupQr?: StoredCakeOrder
    replyTo?: string
  },
) {
  try {
    const qr = message.pickupQr
    const extra = qr ? emailPickupCode(PICKUP_QR_CID, isDelivery(qr)) : ''
    const result = await mailer().emails.send(
      {
        from: EMAIL_FROM,
        to: message.to,
        ...(message.replyTo ? { replyTo: message.replyTo } : {}),
        subject: message.subject,
        html: message.branded
          ? brandedHtml(message.branded, message.paragraphs, message.rows, message.after, message.test, extra)
          : html(message.paragraphs, message.rows, message.after, message.kitchen, extra),
        text: text(
          message.paragraphs,
          message.rows,
          qr
            ? [
                'Your pickup code is the QR code in this email. Showing it is optional: you can also just give your name.',
                ...(message.after ?? []),
              ]
            : message.after,
          message.kitchen,
          message.branded,
        ),
        ...(qr
          ? {
              attachments: [{ filename: 'pickup-code.png', content: await pickupQrPng(qr), contentId: PICKUP_QR_CID }],
            }
          : {}),
      },
      { idempotencyKey: key },
    )
    return !result.error
  } catch {
    return false
  }
}

/** New order: to the bakery (with the Chinese copy for the kitchen) and to the customer. Every online order is held. */
export async function sendNewOrderEmails(o: StoredCakeOrder) {
  const ref = orderRef(o)
  const held = o.status === 'awaiting_approval'
  const admin = `${SITE_URL}/admin/orders`
  const bakery = send(`cake-order-new-${o.id}`, {
    to: bakeryInbox(),
    replyTo: o.email,
    subject: tag(
      o,
      `${SUBJECT_TAG.order}${held ? 'APPROVE BY ' + formatVegasTime(o.approveBy!) + ' — ' : ''}Cake order ${ref}: ${o.name} · ${sizeLabel(o.size)} · ${pickup(o)}`,
    ),
    paragraphs: held
      ? [
          `${o.approvalReason}. The card is held for ${money(o.price)}, not charged.`,
          `Approve or decline by ${formatVegasTime(o.approveBy!)} (Las Vegas) in admin → Cake orders: ${admin}`,
          'If nothing is done by then, the hold is released and the customer is told we could not take the order.',
        ]
      : [`Paid online: ${money(o.price)}. Admin → Cake orders: ${admin}`],
    rows: [['Name', o.name], ['Phone', o.phone], ['Email', o.email], ...cakeRows(o)],
    kitchen: kitchenText(o),
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
          `Hi ${o.name}, thanks for your order! We'll check with our kitchen and confirm it.`,
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
    to: customerEmail(o),
    replyTo: bakeryInbox(),
    subject: tag(o, `Your cake order ${orderRef(o)} is confirmed — Sunville Bakery`),
    paragraphs: [`Hi ${o.name}, good news: we can make your cake. Your card has now been charged ${money(o.price)}.`],
    rows: cakeRows(o),
    test: o.test,
    pickupQr: o,
    branded: { headline: 'Your cake is confirmed!', detailsTitle: `Order ${orderRef(o)}` },
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

/** Refund from admin: the online payment (the deposit for deposit orders) goes back to the card. */
export const sendRefundedEmail = (o: StoredCakeOrder) =>
  send(`cake-order-refunded-${o.id}`, {
    to: customerEmail(o),
    replyTo: bakeryInbox(),
    subject: tag(o, `Your cake order ${orderRef(o)} has been refunded — Sunville Bakery`),
    paragraphs: [
      `Hi ${o.name}, we've refunded ${money(amountDueNow(o))} for your cake order ${orderRef(o)} to the card you paid with.`,
      `Your bank may take 5–10 business days to show it on your statement.`,
      `Questions? Reply to this email or call ${SITE.phone}.`,
    ],
    rows: cakeRows(o).filter(([label]) => label !== 'Total'),
  })

// Orders paid through a link: custom cakes (made in admin from an inquiry), and online orders approved after
// their card hold ended.

export const payLink = (o: Pick<StoredCakeOrder, 'id'>) => `${SITE_URL}/pay/${o.id}`

/** "Your cake is confirmed — pay here": sent when the order is created, and again when the link is resent. */
export const sendPaymentRequestEmail = (o: StoredCakeOrder) =>
  send(`cake-order-pay-request-${o.id}-${o.payBy}`, {
    to: customerEmail(o),
    replyTo: bakeryInbox(),
    test: o.test,
    subject: tag(
      o,
      `Your ${o.kind === 'custom' ? 'custom cake' : 'cake order'} ${orderRef(o)} is confirmed — payment link inside`,
    ),
    paragraphs: [
      o.kind === 'custom'
        ? `Hi ${o.name}, thank you for choosing Sunville Bakery! Here are the final details of your cake. Please check them before paying.`
        : `Hi ${o.name}, good news: we can make your cake! The hold on your card ended before we confirmed, so it was not charged.`,
    ],
    rows: cakeRows(o),
    after: [`If anything needs changing, just reply to this email or call ${SITE.phone} before paying.`],
    branded: {
      headline: o.kind === 'custom' ? 'Your cake is confirmed!' : 'We can make your cake!',
      detailsTitle: `Order ${orderRef(o)}`,
      beforeButton: [
        `To reserve your cake, please pay ${o.deposit ? 'the deposit of ' : ''}${money(amountDueNow(o))} by ${formatVegasTime(o.payBy!)} (Las Vegas time).`,
      ],
      button: { label: `Pay ${o.deposit ? 'deposit ' : ''}${money(amountDueNow(o))}`, url: payLink(o) },
    },
  })

/** Custom order paid: receipt to the customer, notice to the bakery. */
export async function sendCustomPaidEmails(o: StoredCakeOrder) {
  const paid = amountDueNow(o)
  const what = o.deposit ? `deposit of ${money(paid)}` : `payment of ${money(paid)}`
  return Promise.all([
    send(`cake-order-custom-paid-${o.id}`, {
      to: customerEmail(o),
      replyTo: bakeryInbox(),
      subject: tag(
        o,
        `Payment received for your ${o.kind === 'custom' ? 'custom cake' : 'cake order'} ${orderRef(o)} — Sunville Bakery`,
      ),
      paragraphs: [`Hi ${o.name}, we've received your ${what}. Your cake is booked, and we can't wait to make it!`],
      rows: cakeRows(o),
      after: [`Questions or changes? Reply to this email or call ${SITE.phone}.`],
      test: o.test,
      pickupQr: o,
      branded: { headline: 'Payment received', detailsTitle: `Order ${orderRef(o)}` },
    }),
    send(`cake-order-custom-paid-bakery-${o.id}`, {
      to: bakeryInbox(),
      replyTo: o.email,
      subject: tag(
        o,
        `${SUBJECT_TAG.order}Paid: ${o.kind === 'custom' ? 'custom cake' : 'cake order'} ${orderRef(o)} · ${o.name} · ${pickup(o)}`,
      ),
      paragraphs: [`${o.name} paid the ${what} online. Admin → Cake orders: ${SITE_URL}/admin/orders`],
      rows: [['Name', o.name], ['Phone', o.phone], ['Email', o.email], ...cakeRows(o)],
      kitchen: kitchenText(o),
    }),
  ])
}
