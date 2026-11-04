// Customer email replies → Discord. Runs in the bakery's Gmail account (Google Apps Script), not on the website,
// because customers reply straight to sunvillebakerylv@gmail.com. Setup: docs/ADMIN_GUIDE.md → Discord.
//
// Every 5 minutes it looks for new emails from customers in threads about inquiries and orders
// ([Inquiry] / [Order] subjects, "We received your cake inquiry", "Your cake order …") and posts each one once.

const WEBHOOK_URL = 'PASTE_THE_DISCORD_WEBHOOK_URL_HERE'
const MENTION = '' // e.g. '@everyone' to make phones ping even when the channel is muted
const SEARCH =
  'in:inbox newer_than:2d -from:me -from:orders@sunvillebakerylv.com ' +
  '(subject:"[Inquiry]" OR subject:"[Order]" OR subject:"cake inquiry" OR subject:"cake order" OR subject:"custom cake")'

function checkReplies() {
  const props = PropertiesService.getScriptProperties()
  const since = Number(props.getProperty('since') || Date.now() - 10 * 60 * 1000)
  let newest = since
  for (const thread of GmailApp.search(SEARCH, 0, 50)) {
    for (const m of thread.getMessages()) {
      const at = m.getDate().getTime()
      if (at <= since || /orders@sunvillebakerylv\.com/i.test(m.getFrom())) continue
      newest = Math.max(newest, at)
      post(m, thread)
    }
  }
  props.setProperty('since', String(newest))
}

function post(m, thread) {
  const from = m.getFrom().replace(/<.*>/, '').replace(/"/g, '').trim() || m.getFrom()
  const body = latestText(m.getPlainBody())
  const title = '📩 Customer replied: ' + thread.getFirstMessageSubject().replace(/^(re|fwd?):\s*/i, '')
  UrlFetchApp.fetch(WEBHOOK_URL, {
    method: 'post',
    contentType: 'application/json',
    muteHttpExceptions: true,
    payload: JSON.stringify({
      username: 'Sunville Bakery',
      content: ((MENTION ? MENTION + ' ' : '') + '**📩 Email reply** — ' + from).slice(0, 1900),
      allowed_mentions: { parse: ['everyone', 'roles', 'users'] },
      embeds: [
        {
          title: title.slice(0, 256),
          url: 'https://mail.google.com/mail/u/0/#inbox/' + thread.getId(),
          description: body.slice(0, 1500) || '(no text)',
          color: 0x5865f2,
          fields: [{ name: '👤 From', value: m.getFrom().slice(0, 1024) }],
        },
      ],
    }),
  })
}

/** Only the new part of the reply, without the quoted earlier emails. */
function latestText(text) {
  const lines = []
  for (const line of String(text).split(/\r?\n/)) {
    if (/^On .+wrote:$/.test(line.trim()) || /^-{2,}\s*Original Message/i.test(line) || line.startsWith('>')) break
    lines.push(line)
  }
  return lines.join('\n').trim()
}

/** Run once by hand: checks every 5 minutes from now on. */
function setUp() {
  for (const t of ScriptApp.getProjectTriggers()) ScriptApp.deleteTrigger(t)
  ScriptApp.newTrigger('checkReplies').timeBased().everyMinutes(5).create()
  PropertiesService.getScriptProperties().setProperty('since', String(Date.now()))
}
