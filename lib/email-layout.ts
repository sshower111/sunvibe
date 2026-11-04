// Shared look for every site email: larger text, a two-column table of details, and a gray label column,
// so a whole order can be read at a glance. All strings passed in must already be HTML-escaped.

const FONT = "-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"

/** Outer wrapper: readable font size and line height, narrow column. */
export const emailPage = (body: string) =>
  `<div style="font-family:${FONT};font-size:16px;line-height:1.55;color:#222;max-width:620px">${body}</div>`

export const emailHeading = (text: string) =>
  `<h2 style="font-size:20px;line-height:1.3;margin:0 0 12px;color:#222">${text}</h2>`

export const emailParagraph = (html: string) => `<p style="margin:0 0 12px">${html}</p>`

/** Highlighted line, e.g. "TEST" or "not a confirmed order". */
export const emailNote = (html: string) =>
  `<p style="margin:0 0 16px;padding:10px 14px;background:#fff6e5;border-left:4px solid #e8a33d;border-radius:4px">${html}</p>`

/** Label / value table. Values may contain line breaks. */
export const emailRows = (rows: [label: string, html: string][]) =>
  '<table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;margin:4px 0 16px">' +
  rows
    .map(
      ([label, html]) =>
        '<tr>' +
        `<td style="padding:9px 14px 9px 0;border-bottom:1px solid #eee;vertical-align:top;width:36%;color:#6b6b6b;font-size:14px">${label}</td>` +
        `<td style="padding:9px 0;border-bottom:1px solid #eee;vertical-align:top">${html.replace(/\n/g, '<br>')}</td>` +
        '</tr>',
    )
    .join('') +
  '</table>'

export const emailDivider = () => '<hr style="margin:28px 0 20px;border:0;border-top:2px solid #e5e5e5">'

/** Subject tags so the bakery inbox can sort mail with Gmail filters (e.g. subject:[Order]). */
export const SUBJECT_TAG = {
  order: '[Order] ',
  inquiry: '[Inquiry] ',
  contact: '[Contact] ',
  preorder: '[Pre-order] ',
} as const

// Customer emails with the bakery's look: the logo on top, an illustration (public/email/happy-customer.png, from
// undraw.co in the bakery's colors; the .svg next to it is the source) and a headline, centered on a white card, the
// details in a table, the button last (so the details are read first) and the bakery's address at the bottom.
// Images come from the live site (public/), as PNG: email can't show local files, and Gmail doesn't show SVG.

const BRAND = '#9e2a2b'
const MUTED = '#6b6b6b'

export type BrandedEmail = {
  /** Site address the images are loaded from, e.g. https://sunvillebakerylv.com */
  siteUrl: string
  headline: string
  /** Paragraphs under the headline. */
  intro: string[]
  /** Heading over the details table, e.g. "Order #1042". */
  detailsTitle: string
  rows: [label: string, html: string][]
  /** Paragraphs after the details, before the button (e.g. amount and deadline). */
  beforeButton?: string[]
  button?: { label: string; url: string }
  /** Extra HTML after the details (e.g. the pickup QR code). */
  extra?: string
  /** Small centered lines at the end (questions, contact). */
  closing?: string[]
  /** Address and phone in the footer. */
  footer: string
  /** Highlighted line at the very top, e.g. "TEST". */
  note?: string
}

const centered = (html: string, style = '') => `<p style="margin:0 0 12px;text-align:center;${style}">${html}</p>`

/** All strings must already be HTML-escaped. */
export function emailBranded(e: BrandedEmail) {
  const rows = e.rows
    .map(
      ([label, html]) =>
        '<tr>' +
        `<td style="padding:10px 12px 10px 0;border-bottom:1px solid #eee;vertical-align:top;width:38%;color:${MUTED};font-size:14px;text-align:left">${label}</td>` +
        `<td style="padding:10px 0;border-bottom:1px solid #eee;vertical-align:top;text-align:left">${html.replace(/\n/g, '<br>')}</td>` +
        '</tr>',
    )
    .join('')
  const button = e.button
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px auto 8px"><tr><td style="border-radius:8px;background:${BRAND}">` +
      `<a href="${e.button.url}" style="display:inline-block;padding:15px 36px;color:#ffffff;font-weight:600;font-size:17px;text-decoration:none;border-radius:8px">${e.button.label}</a>` +
      '</td></tr></table>' +
      centered(
        `Or open: <a href="${e.button.url}" style="color:${MUTED};word-break:break-all">${e.button.url}</a>`,
        `font-size:13px;color:${MUTED};margin-bottom:24px`,
      )
    : ''
  return (
    `<div style="background:#f6f1ea;padding:24px 12px;font-family:${FONT};font-size:16px;line-height:1.55;color:#222">` +
    '<table role="presentation" cellpadding="0" cellspacing="0" align="center" style="width:100%;max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;border-collapse:separate">' +
    // Logo row with a line under it, then the illustration row. Padding, not margins: Gmail drops negative margins.
    '<tr><td style="padding:28px 28px 20px;text-align:center;border-bottom:1px solid #eee">' +
    (e.note ? emailNote(e.note) : '') +
    `<img src="${e.siteUrl}/logo-dark.png" width="180" height="43" alt="Sunville Bakery" style="display:block;margin:0 auto;border:0;height:auto;max-width:180px">` +
    '</td></tr>' +
    '<tr><td style="padding:28px 28px 8px;text-align:center">' +
    `<img src="${e.siteUrl}/email/happy-customer.png" width="106" height="220" alt="" style="display:block;margin:0 auto 8px;border:0;width:106px;height:220px">` +
    `<h1 style="font-size:24px;line-height:1.3;margin:8px 0 12px;color:#222;text-align:center">${e.headline}</h1>` +
    e.intro.map(p => centered(p, `color:#444`)).join('') +
    '</td></tr>' +
    '<tr><td style="padding:8px 28px 0">' +
    `<h2 style="font-size:17px;margin:12px 0 4px;color:#222;text-align:left">${e.detailsTitle}</h2>` +
    `<table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;margin:0 0 20px">${rows}</table>` +
    '</td></tr>' +
    '<tr><td style="padding:0 28px 20px;text-align:center">' +
    (e.extra ?? '') +
    (e.beforeButton ?? []).map(p => centered(p)).join('') +
    button +
    (e.closing ?? []).map(p => centered(p, `font-size:14px;color:${MUTED}`)).join('') +
    '</td></tr></table>' +
    centered(e.footer, `font-size:12px;color:${MUTED};margin:16px 0 0`) +
    '</div>'
  )
}

/** The pickup QR code box (lib/pickup-qr.ts); the image is an inline attachment (cid). */
export const emailPickupCode = (cid: string, delivery: boolean) =>
  '<div style="text-align:center;margin:4px 0 20px;padding:16px;border:1px dashed #d8c7ad;border-radius:10px">' +
  '<p style="margin:0;font-weight:600;font-size:17px">Your pickup code</p>' +
  `<img src="cid:${cid}" width="160" height="160" alt="Pickup QR code" style="display:block;margin:10px auto;border:0;width:160px;height:160px">` +
  `<p style="margin:0;font-size:14px;color:${MUTED}">${
    delivery ? 'Have this ready when we deliver your cake.' : 'Show this at the counter when you pick up your cake.'
  } It's optional: you can also just tell us your name.</p>` +
  '</div>'
