import 'server-only'
import { mailer, EMAIL_FROM, bakeryInbox } from '@/lib/email'
import { SITE } from '@/lib/site-info'
import { type CakeInquiry, inquiryRef, formatEventTime, tierFlavorLines } from '@/lib/cake-inquiry'
import { cakeLabel } from '@/lib/cake-catalog'
import { ZH, zhHtml, zhOption, zhText } from '@/lib/email-zh'
import { escapeHtml } from '@/lib/security'
import { emailHeading, emailNote, emailPage, emailParagraph, emailRows, SUBJECT_TAG } from '@/lib/email-layout'

// The two custom cake inquiry emails: one to the bakery (English + Chinese), one copy to the customer.
// Used by the public form and by the admin "Send test inquiry" button, so a test looks exactly like the real thing.

const TIER_ZH: Record<string, string> = { 'Top tier': '頂層', 'Middle tier': '中層', 'Bottom tier': '底層' }

type Attachment = { filename: string; content: Buffer }
type Options = {
  requestId: string
  attachments?: Attachment[]
  /** Test mode: subjects start with [TEST] and both emails go to the bakery inbox. */
  test?: boolean
}

/** Sends the bakery email. Returns false if it could not be sent. */
export async function sendBakeryEmail(data: CakeInquiry, { requestId, attachments = [], test }: Options) {
  const { tierFlavors, ...rest } = data
  const values = {
    ...rest,
    size: cakeLabel(data.size),
    eventTime: formatEventTime(data.eventTime) || 'Not decided yet',
    deliveryAddress: data.fulfillment === 'Pickup' ? 'Bakery pickup' : data.deliveryAddress,
    // Different flavor per tier: one line per tier under Flavor.
    ...(tierFlavors && {
      flavor: tierFlavorLines(data.size, tierFlavors).join('\n'),
      filling: 'By tier, see flavor',
    }),
  }
  const labels: Record<string, string> = {
    name: 'Name',
    email: 'Email',
    phone: 'Phone',
    eventDate: 'Event date',
    eventTime: 'Event time',
    eventType: 'Event',
    servings: 'Servings requested',
    size: 'Cake size',
    flavor: 'Flavor preference',
    filling: 'Filling preference',
    cakeMessage: 'Writing on cake',
    budget: 'Budget',
    fulfillment: 'Pickup / delivery request',
    deliveryAddress: 'Delivery address / hotel',
    notes: 'Notes / dietary requests',
  }
  // Chinese copy: option values are translated, typed values (name, notes, address…) stay as written.
  const translated = new Set(['eventType', 'size', 'flavor', 'filling', 'budget', 'fulfillment'])
  const zhRows = Object.keys(labels).map(key => {
    const value = values[key as keyof typeof values]
    const zh =
      key === 'deliveryAddress' && data.fulfillment === 'Pickup'
        ? ZH.bakeryPickup
        : tierFlavors && key === 'flavor'
          ? tierFlavorLines(data.size, tierFlavors, zhOption)
              .map(line => line.replace(/^(Top|Middle|Bottom) tier/, name => TIER_ZH[name]))
              .join('\n')
          : tierFlavors && key === 'filling'
            ? '按層，見口味'
            : key === 'eventTime' && !data.eventTime
              ? ZH.notDecided
              : !value
                ? ZH.none
                : translated.has(key)
                  ? zhOption(value)
                  : value
    return [ZH[key as keyof typeof ZH], zh] as [string, string]
  })
  const text = Object.entries(labels)
    .map(([key, label]) => `${label}: ${values[key as keyof typeof values] || 'None'}`)
    .join('\n')
    .concat('\n', zhText(ZH.cakeHeading, zhRows, ZH.cakeNotConfirmed))
  const html = emailPage(
    (test ? emailNote('<strong>TEST INQUIRY sent from admin. Not a real customer.</strong>') : '') +
      emailHeading('Custom cake inquiry — quote requested') +
      emailNote('This is not a confirmed order.') +
      emailRows(
        Object.entries(labels).map(([key, label]) => [label, escapeHtml(values[key as keyof typeof values] || 'None')]),
      ) +
      zhHtml(
        ZH.cakeHeading,
        zhRows.map(([label, value]) => [label, escapeHtml(value)]),
        ZH.cakeNotConfirmed,
      ),
  )
  const result = await mailer().emails.send(
    {
      from: EMAIL_FROM,
      to: bakeryInbox(),
      replyTo: test ? bakeryInbox() : values.email,
      subject: `${test ? '[TEST] ' : ''}${SUBJECT_TAG.inquiry}Custom cake: ${[values.name, values.eventType, values.eventDate, formatEventTime(data.eventTime), inquiryRef(requestId)].filter(Boolean).join(' · ')}`,
      text: (test ? 'TEST INQUIRY sent from admin. Not a real customer.\n\n' : '') + text,
      html,
      attachments,
    },
    { idempotencyKey: `cake-${requestId}` },
  )
  return !result.error
}

/** Sends the customer's copy. Never throws: a missing copy must not fail a delivered inquiry. */
export async function sendCustomerCopy(data: CakeInquiry, { requestId, test }: Options) {
  const { tierFlavors, ...rest } = data
  const values = {
    ...rest,
    size: cakeLabel(data.size),
    eventTime: formatEventTime(data.eventTime) || 'Not decided yet',
    flavors: tierFlavors ? tierFlavorLines(data.size, tierFlavors).join('; ') : `${data.flavor} / ${data.filling}`,
  }
  try {
    const copy = await mailer().emails.send(
      {
        from: EMAIL_FROM,
        to: test ? bakeryInbox() : values.email,
        replyTo: bakeryInbox(),
        subject: `${test ? '[TEST] ' : ''}We received your cake inquiry ${inquiryRef(requestId)} — ${SITE.name}`,
        ...customerCopy(values),
      },
      { idempotencyKey: `cake-copy-${requestId}` },
    )
    if (copy.error) console.error('Cake inquiry copy not sent to customer', requestId, copy.error)
  } catch (error) {
    console.error('Cake inquiry copy not sent to customer', requestId, error)
  }
}

// Only the customer's own choices; free-text notes and addresses are left out of an email sent to a typed address.
function customerCopy(values: Record<string, string>) {
  const rows: [string, string][] = [
    ['Event', [values.eventType, values.eventDate, values.eventTime].filter(Boolean).join(' · ')],
    ['Cake', `${values.servings} servings · ${values.size}`],
    ['Flavor / filling', values.flavors],
    ['Writing on cake', values.cakeMessage || 'None'],
    ['Budget', values.budget],
    ['Pickup / delivery', values.fulfillment],
  ]
  const intro = `Hi ${values.name}, thanks for your custom cake inquiry. We'll get back to you with availability and a quote.`
  const change = 'Need to add or change something? Just reply to this email. There is no need to send another form.'
  const notConfirmed = 'Your order and date are not confirmed until we confirm the details and payment with you.'
  return {
    text: [
      intro,
      '',
      ...rows.map(([label, value]) => `${label}: ${value}`),
      '',
      change,
      notConfirmed,
      '',
      `${SITE.name} · ${SITE.phone}`,
    ].join('\n'),
    html: emailPage(
      emailParagraph(escapeHtml(intro)) +
        emailRows(rows.map(([label, value]) => [label, escapeHtml(value)])) +
        emailParagraph(`<strong>${change}</strong>`) +
        emailParagraph(notConfirmed) +
        emailParagraph(`${SITE.name} · ${SITE.phone}`),
    ),
  }
}
