// Customer email replies → Discord. Runs in the bakery's Gmail account (Google Apps Script), not on the website,
// because customers reply straight to sunvillebakerylv@gmail.com. Setup: docs/ADMIN_GUIDE.md → Discord.
//
// Every 5 minutes it looks for new emails from customers in threads about inquiries and orders
// ([Inquiry] / [Order] subjects, "We received your cake inquiry", "Your cake order …") and sends each one to the
// website, which posts it in the thread under that inquiry's or order's Discord message and pings the bakery.

const SITE = 'https://sunvillebakerylv.com/api/discord/email-reply'
const SECRET = 'PASTE_EMAIL_REPLY_SECRET_HERE' // same value as EMAIL_REPLY_SECRET in Vercel
const SEARCH =
  'in:inbox newer_than:2d -from:me -from:orders@sunvillebakerylv.com ' +
  '(subject:"[Inquiry]" OR subject:"[Order]" OR subject:"cake inquiry" OR subject:"cake order" OR subject:"custom cake")'

function checkReplies() {
  const props = PropertiesService.getScriptProperties()
  const since = Number(props.getProperty('since') || Date.now() - 10 * 60 * 1000)
  const replies = []
  for (const thread of GmailApp.search(SEARCH, 0, 50))
    for (const m of thread.getMessages()) {
      const at = m.getDate().getTime()
      if (at > since && !/orders@sunvillebakerylv\.com/i.test(m.getFrom())) replies.push({ at, m, thread })
    }
  replies.sort((a, b) => a.at - b.at)
  for (const r of replies) {
    if (!send(r.m, r.thread)) break // the website is down: try again from here next time
    props.setProperty('since', String(r.at))
  }
}

function send(m, thread) {
  const from = m.getFrom()
  const email = (from.match(/<([^>]+)>/) || [, from])[1].trim()
  const name = from.replace(/<.*>/, '').replace(/"/g, '').trim()
  const response = UrlFetchApp.fetch(SITE, {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + SECRET },
    muteHttpExceptions: true,
    payload: JSON.stringify({
      fromName: name === email ? '' : name,
      fromEmail: email,
      subject: thread.getFirstMessageSubject(),
      text: latestText(m.getPlainBody()),
      gmailUrl: 'https://mail.google.com/mail/u/0/#inbox/' + thread.getId(),
    }),
  })
  const code = response.getResponseCode()
  if (code === 401) throw new Error('SECRET does not match EMAIL_REPLY_SECRET in Vercel')
  return code === 200 || code === 400 // 400: unreadable email, skip it
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
