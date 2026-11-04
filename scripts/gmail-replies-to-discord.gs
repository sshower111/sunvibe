// Customer email replies → Discord. Runs in the bakery's Gmail account (Google Apps Script), not on the website,
// because customers reply straight to sunvillebakerylv@gmail.com. Setup: docs/ADMIN_GUIDE.md → Discord.
//
// Every 5 minutes it looks for new emails from customers in threads about inquiries and orders
// ([Inquiry] / [Order] subjects, "We received your cake inquiry", "Your cake order …") and sends each one to the
// website, which posts it in the thread under that inquiry's or order's Discord message and pings the bakery.
// Only subjects with the inquiry code (#1A2B) or order number (#1042) count, so other mail never reaches Discord.

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
      if (at > since && isCustomerReply(m, thread)) replies.push({ at, m, thread })
    }
  replies.sort((a, b) => a.at - b.at)
  console.log(`${replies.length} new customer email(s) since ${new Date(since)}`)
  for (const r of replies) {
    if (!send(r.m, r.thread)) break // the website is down: try again from here next time
    props.setProperty('since', String(r.at))
  }
}

/** Same rule as the website (lib/discord-messages.ts replyTarget). */
function isOurSubject(subject) {
  if (/inquiry/i.test(subject)) return /#[0-9a-f]{4}(?![0-9a-z])/i.test(subject)
  return /cake order|custom cake|\[order\]/i.test(subject) && /#\d{4,9}(?!\d)/.test(subject)
}
function isCustomerReply(m, thread) {
  return !/orders@sunvillebakerylv\.com/i.test(m.getFrom()) && isOurSubject(thread.getFirstMessageSubject())
}

/** Run by hand to see what the script finds (last 2 days), without sending anything. */
function showWhatItSees() {
  const since = Number(PropertiesService.getScriptProperties().getProperty('since') || 0)
  console.log('Already sent everything up to: ' + (since ? new Date(since) : 'nothing yet (run setUp)'))
  console.log('Timer set up: ' + (ScriptApp.getProjectTriggers().length ? 'yes' : 'NO, run setUp'))
  const threads = GmailApp.search(SEARCH, 0, 50)
  console.log(threads.length + ' matching email thread(s) in the last 2 days')
  for (const thread of threads)
    for (const m of thread.getMessages()) {
      const state = !isCustomerReply(m, thread)
        ? 'skipped (not a customer reply about an inquiry or order)'
        : m.getDate().getTime() > since
          ? 'NEW, sends next run'
          : 'already sent'
      console.log(`${m.getDate()} | ${m.getFrom()} | ${thread.getFirstMessageSubject()} | ${state}`)
    }
}

/** Run by hand to send again everything from the last hour (e.g. replies that were skipped). */
function resendLastHour() {
  PropertiesService.getScriptProperties().setProperty('since', String(Date.now() - 60 * 60 * 1000))
  checkReplies()
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
  console.log(`Sent "${thread.getFirstMessageSubject()}" from ${email}: ${code} ${response.getContentText().slice(0, 100)}`)
  if (code === 401) throw new Error('SECRET does not match EMAIL_REPLY_SECRET in Vercel')
  return code === 200 || code === 400 // 400: unreadable email, skip it
}

/** Only the new part of the reply, without the quoted earlier emails. */
function latestText(text) {
  const all = String(text).split(/\r?\n/)
  const lines = []
  for (let i = 0; i < all.length; i++) {
    const line = all[i].trim()
    const next = (all[i + 1] || '').trim()
    // "On Wed, Nov 4, 2026 at 2:03 AM Sunville Bakery <…> wrote:", sometimes split over two lines
    const quoteStart =
      (/^On .+/.test(line) && (/wrote:$/.test(line) || /wrote:$/.test(line + ' ' + next))) ||
      /^-{2,}\s*Original Message/i.test(line) ||
      (/^From: .+/.test(line) && /^(Sent|Date): /.test(next)) ||
      line.startsWith('>')
    if (quoteStart) break
    lines.push(all[i])
  }
  return lines.join('\n').trim()
}

/** Run once by hand: checks every 5 minutes from now on. Running it again keeps its place (nothing is skipped). */
function setUp() {
  for (const t of ScriptApp.getProjectTriggers()) ScriptApp.deleteTrigger(t)
  ScriptApp.newTrigger('checkReplies').timeBased().everyMinutes(5).create()
  const props = PropertiesService.getScriptProperties()
  if (!props.getProperty('since')) props.setProperty('since', String(Date.now()))
}
