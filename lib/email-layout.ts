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
