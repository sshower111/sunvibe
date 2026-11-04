'use strict'
// End to end, inside this process: a customer sends the /custom-cakes form → the bakery's Discord gets the inquiry
// card in the inquiries channel → the customer replies by email → the reply lands in the thread under that card.
// The real form handler, notification and Discord code run; only Discord's servers, the database, email and the
// CAPTCHA are fakes, so nothing leaves this computer. Run: pnpm test
const assert = require('node:assert/strict')
const { test } = require('node:test')
const { createLoader } = require('../helpers/load-ts.cjs')

const INQUIRY_ID = '2a2b0000-1111-4111-8111-111111111111'
const ORDERS = '900000000000000001'
const INQUIRIES = '900000000000000002'

// Fake database: only what the Discord code uses (remember a message, find it again).
const remembered = []
const sql = (strings, ...values) => {
  const text = strings.join('?')
  if (text.includes('INSERT INTO bakery_discord_messages')) {
    const [kind, refId, channelId, messageId] = values
    if (!remembered.some(r => r.kind === kind && r.ref_id === refId))
      remembered.push({ kind, ref_id: refId, channel_id: channelId, message_id: messageId })
    return Promise.resolve([])
  }
  if (text.includes('FROM bakery_discord_messages') && text.includes("kind='inquiry'")) {
    const prefix = values[0].replace('%', '')
    return Promise.resolve(remembered.filter(r => r.kind === 'inquiry' && r.ref_id.startsWith(prefix)))
  }
  return Promise.resolve([])
}

// Fake Discord: records every call and gives each new message an ID.
const discord = []
let nextId = 5001
const realFetch = global.fetch
function fakeDiscord() {
  global.fetch = async (url, init = {}) => {
    const call = { url: String(url), method: init.method, body: init.body ? JSON.parse(init.body) : undefined }
    discord.push(call)
    const reply = call.method === 'POST' && /\/messages$/.test(call.url) ? { id: String(nextId++) } : {}
    return { ok: true, status: 200, text: async () => JSON.stringify(reply) }
  }
}

const { load } = createLoader({
  mocks: {
    '@/lib/turnstile': { verifyTurnstile: async () => true },
    '@/lib/security': {
      rateLimiter: { check: () => true },
      getClientIp: () => 'test',
      escapeHtml: value => value.replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`),
    },
    '@/lib/cake-inquiries-store': { saveCakeInquiry: async () => {} },
    '@/lib/inquiry-photos': { saveInquiryPhotos: async () => [] },
    resend: {
      Resend: class {
        emails = { send: async () => ({ data: { id: 'mock' }, error: null }) }
      },
    },
    './database': { verifiedDatabase: async () => sql },
  },
})
const form = load('app/api/custom-cakes/route.ts')
const emailReply = load('app/api/discord/email-reply/route.ts')

function sendInquiry(fields) {
  const body = new FormData()
  for (const [key, value] of Object.entries(fields)) body.set(key, value)
  return form.POST(new Request('http://example.test/api/custom-cakes', { method: 'POST', body }))
}

test('inquiry form → Discord card in the inquiries channel → email reply in its thread', async t => {
  Object.assign(process.env, {
    TURNSTILE_SECRET_KEY: 'mock',
    TURNSTILE_ALLOWED_HOSTNAMES: 'example.test',
    RESEND_API_KEY: 'mock',
    DISCORD_BOT_TOKEN: 'bot-token',
    DISCORD_CHANNEL_ID: ORDERS,
    DISCORD_INQUIRY_CHANNEL_ID: INQUIRIES,
    DISCORD_ADMIN_IDS: '111111111111111111',
    EMAIL_REPLY_SECRET: 'reply-secret',
  })
  delete process.env.DISCORD_MENTION
  fakeDiscord()
  t.after(() => {
    global.fetch = realFetch
    for (const key of [
      'DISCORD_BOT_TOKEN',
      'DISCORD_CHANNEL_ID',
      'DISCORD_INQUIRY_CHANNEL_ID',
      'DISCORD_ADMIN_IDS',
      'EMAIL_REPLY_SECRET',
    ])
      delete process.env[key]
  })

  // 1. A customer sends the form: hotel delivery, notes, budget, style and a reference link.
  const sent = await sendInquiry({
    name: 'Linda Park',
    email: 'linda@example.com',
    phone: '7025550199',
    eventDate: '2099-01-20',
    eventTime: '14:00',
    eventType: 'Birthday',
    servings: '20',
    size: '8-inch',
    flavor: 'Vanilla',
    filling: 'Custard',
    cakeMessage: 'Happy 30th Amy',
    budget: '$100–$200',
    designStyle: 'Drip Cake',
    referenceLink: 'https://www.pinterest.com/pin/123/',
    textOk: 'yes',
    fulfillment: 'Casino / Hotel delivery — $50',
    deliveryAddress: 'Aria, room 1204',
    notes: 'Pink flowers, gold drip. Nut allergy.',
    requestId: INQUIRY_ID,
    captchaToken: 'mock',
  })
  assert.equal(sent.status, 200)

  // 2. Discord got one message, in the inquiries channel (not orders), posted as the bot.
  const posts = discord.filter(c => c.method === 'POST')
  assert.equal(posts.length, 1)
  assert.equal(posts[0].url, `https://discord.com/api/v10/channels/${INQUIRIES}/messages`)
  const card = posts[0].body.embeds[0]
  const show = name => card.fields.find(f => f.name === name)?.value
  assert.equal(card.title, '💬 Custom cake inquiry · #2A2B')
  assert.equal(card.url, `https://sunvillebakerylv.com/admin/inquiries/${INQUIRY_ID}`)
  assert.equal(show('👤 Customer'), 'Linda Park')
  assert.equal(show('📞 Phone'), '7025550199')
  assert.equal(show('📅 Date'), 'Tue, Jan 20 · 2:00 PM')
  assert.equal(show('🚚 Delivery'), 'Casino / Hotel delivery — $50\n📍 Aria, room 1204')
  assert.equal(show('📝 Notes'), 'Pink flowers, gold drip. Nut allergy.')
  assert.equal(show('💰 Budget'), '$100–$200')
  assert.equal(show('🎂 Cake'), '8-inch round · Vanilla / Custard')
  assert.equal(show('✍️ Writing on cake'), 'Happy 30th Amy')
  assert.equal(show('🎨 Style'), 'Drip Cake')
  assert.equal(show('🔗 Links'), 'https://www.pinterest.com/pin/123/')
  assert.equal(show('💬 OK to text'), 'Yes')
  assert.deepEqual(posts[0].body.components, []) // inquiries have no buttons
  // ...and the site remembered which message it is.
  assert.deepEqual(remembered, [{ kind: 'inquiry', ref_id: INQUIRY_ID, channel_id: INQUIRIES, message_id: '5001' }])

  // 3. Linda replies to the inquiry email; the Gmail script forwards it to the site.
  discord.length = 0
  const replied = await emailReply.POST(
    new Request('http://example.test/api/discord/email-reply', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer reply-secret' },
      body: JSON.stringify({
        fromName: 'Linda Park',
        fromEmail: 'linda@example.com',
        subject: 'Re: [Inquiry] Custom cake: Linda Park · Birthday · 2099-01-20 · 2:00 PM · #2A2B',
        text: 'Can we make it 25 servings?',
        gmailUrl: 'https://mail.google.com/mail/u/0/#inbox/abc123',
      }),
    }),
  )
  assert.deepEqual(await replied.json(), { ok: true, postedIn: 'thread' })

  // 4. A thread was started under the inquiry card, and the reply was posted in it, pinging the bakery.
  const [thread, message] = discord
  assert.equal(thread.url, `https://discord.com/api/v10/channels/${INQUIRIES}/messages/5001/threads`)
  assert.equal(thread.body.name, '#2A2B Linda Park')
  assert.equal(message.url, 'https://discord.com/api/v10/channels/5001/messages')
  assert.equal(message.body.content, '<@111111111111111111> 📩 **Linda Park** replied by email')
  assert.equal(message.body.embeds[0].description, 'Can we make it 25 servings?')
  assert.equal(message.body.embeds[0].url, 'https://mail.google.com/mail/u/0/#inbox/abc123')
  assert.equal(discord.length, 2)
})
