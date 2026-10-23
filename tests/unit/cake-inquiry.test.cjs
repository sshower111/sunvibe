'use strict'
// Custom cake inquiry API: validation, photo limits, CAPTCHA, escaping, email payload, rate limits.
// Email and CAPTCHA providers are mocked; nothing leaves this process. Run: pnpm test
const assert = require('node:assert/strict')
const { test } = require('node:test')
const { createLoader } = require('../helpers/load-ts.cjs')

Object.assign(process.env, {
  TURNSTILE_SECRET_KEY: 'mock',
  TURNSTILE_ALLOWED_HOSTNAMES: 'example.test',
  RESEND_API_KEY: 'mock',
})

let verified = true
let emailError = false
let limited = false
const mail = []
const saved = []
let storeDown = false

const { load } = createLoader({
  mocks: {
    '@/lib/turnstile': {
      verifyTurnstile: async (_token, action) => {
        assert.equal(action, 'custom_cake')
        return verified
      },
    },
    '@/lib/security': {
      rateLimiter: { check: () => !limited },
      getClientIp: () => 'test',
      escapeHtml: value =>
        value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[c]),
    },
    '@/lib/cake-inquiries-store': {
      saveCakeInquiry: async inquiry => {
        if (storeDown) throw new Error('mock database outage')
        saved.push(inquiry)
      },
    },
    resend: {
      Resend: class {
        emails = {
          send: async (body, options) => {
            mail.push({ body, options })
            return emailError ? { error: { message: 'mock failure' } } : { data: { id: 'mock' }, error: null }
          },
        }
      },
    },
  },
})
const schema = load('lib/cake-inquiry.ts')
const route = load('app/api/custom-cakes/route.ts')

const valid = {
  name: '<script>test</script>',
  email: 'cake@example.com',
  phone: '7025550100',
  eventDate: '2099-01-20',
  eventType: 'Birthday',
  servings: '12',
  size: '8-inch',
  flavor: 'Please recommend',
  filling: 'Please recommend',
  cakeMessage: 'Happy 30th, <b>Amy</b>!',
  budget: 'Not sure — please advise',
  fulfillment: 'Pickup',
  deliveryAddress: '',
  notes: '<img src=x> allergy request',
  acknowledged: 'yes',
  requestId: '11111111-1111-4111-8111-111111111111',
  captchaToken: 'mock',
}
async function post(overrides = {}, photos = []) {
  const form = new FormData()
  for (const [key, value] of Object.entries({ ...valid, ...overrides })) form.set(key, value)
  for (const file of photos) form.append('photos', file)
  return route.POST(new Request('http://example.test/api/custom-cakes', { method: 'POST', body: form }))
}
test('custom cake inquiries are validated, escaped and emailed once', async () => {
  assert.equal(schema.earliestCakeDate(new Date('2026-09-24T01:00:00Z')), '2026-09-26')
  assert.equal((await post({ eventDate: '2026-02-30' })).status, 400)
  assert.equal((await post({ eventDate: '2000-01-01' })).status, 400)
  assert.equal((await post({ eventTime: '25:00' })).status, 400)
  assert.equal(schema.formatEventTime('14:30'), '2:30 PM')
  assert.equal(schema.formatEventTime('00:15'), '12:15 AM')
  assert.equal((await post({ email: 'invalid' })).status, 400)
  assert.equal((await post({ size: 'tier-8-10-12-14' })).status, 400)
  assert.equal((await post({ size: 'tier-6-10-12-16-18' })).status, 400)
  assert.equal((await post({ acknowledged: '' })).status, 400)
  assert.equal((await post({ filling: 'Strawberry Banana' })).status, 200)
  mail.length = 0
  saved.length = 0
  assert.equal((await post({ cakeMessage: 'x'.repeat(schema.MAX_CAKE_MESSAGE + 1) })).status, 400)
  assert.equal((await post({}, [new File(['fake'], 'fake.jpg', { type: 'image/jpeg' })])).status, 400)
  assert.equal(
    (await post({}, [new File([new Uint8Array(schema.MAX_PHOTO_BYTES + 1)], 'big.png', { type: 'image/png' })])).status,
    400,
  )
  const png = new File(
    [
      Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=',
        'base64',
      ),
    ],
    '../unsafe.png',
    { type: 'image/png' },
  )
  assert.equal((await post({}, Array(schema.MAX_PHOTOS + 1).fill(png))).status, 400)
  verified = false
  assert.equal((await post()).status, 403)
  assert.equal(mail.length, 0)
  verified = true
  assert.equal((await post({}, [png])).status, 200)
  // The bakery email first, then a copy to the customer whose replies go back to the bakery.
  assert.equal(mail.length, 2)
  const copy = mail[1]
  assert.equal(copy.body.to, valid.email)
  assert.equal(copy.body.replyTo, process.env.NOTIFICATION_EMAIL || 'sunvillebakerylv@gmail.com')
  assert.equal(copy.options.idempotencyKey, 'cake-copy-' + valid.requestId)
  assert(copy.body.html.includes('Hi &lt;script&gt;test&lt;/script&gt;') && !copy.body.html.includes('<script>'))
  assert(copy.body.html.includes('<strong>Writing on cake:</strong> Happy 30th, &lt;b&gt;Amy&lt;/b&gt;!'))
  assert(copy.body.text.includes('Just reply to this email'))
  assert(!copy.body.html.includes('allergy request'), 'customer notes are not echoed')
  assert.equal(copy.body.attachments, undefined)
  assert(!mail[0].body.html.includes('<script>'))
  assert(mail[0].body.html.includes('&lt;script&gt;'))
  assert.equal(mail[0].body.attachments[0].filename, 'cake-reference-1.png')
  assert.equal(mail[0].body.replyTo, valid.email)
  // Traditional Chinese copy under the English: labels and options translated, typed text as written and escaped.
  const zh = mail[0].body.html.slice(mail[0].body.html.indexOf('lang="zh-Hant"'))
  assert(zh.includes('<strong>活動類型：</strong>生日'))
  assert(zh.includes('<strong>蛋糕尺寸：</strong>8 吋圓形'))
  assert(zh.includes('<strong>送貨地址／酒店：</strong>店內自取'))
  assert(zh.includes('<strong>活動時間：</strong>未定'))
  assert(mail[0].body.html.includes('<strong>Event time:</strong> Not decided yet'))
  assert(zh.includes('&lt;img src=x&gt; allergy request') && !zh.includes('<img'))
  assert(mail[0].body.text.includes('\n— 中文 —\n訂製蛋糕查詢（需報價）'))
  assert.equal(mail[0].options.idempotencyKey, 'cake-' + valid.requestId)
  // Writing on the cake: escaped in both languages, never translated.
  assert(mail[0].body.html.includes('<strong>Writing on cake:</strong> Happy 30th, &lt;b&gt;Amy&lt;/b&gt;!'))
  assert(zh.includes('<strong>蛋糕上的字：</strong>Happy 30th, &lt;b&gt;Amy&lt;/b&gt;!'))
  // Delivered inquiries are saved to the tracker, without the acknowledgement checkbox.
  assert.equal(saved.length, 1)
  assert.equal(saved[0].id, valid.requestId)
  assert.equal(saved[0].photoCount, 1)
  assert.equal(saved[0].cakeMessage, 'Happy 30th, <b>Amy</b>!')
  assert(!('acknowledged' in saved[0]))
  // A tracker outage does not fail an inquiry that was emailed.
  storeDown = true
  assert.equal((await post({ cakeMessage: '' })).status, 200)
  assert(mail.at(-1).body.html.includes('<strong>Writing on cake:</strong> None'))
  storeDown = false
  emailError = true
  const savedBefore = saved.length
  assert.equal((await post()).status, 502)
  assert.equal(saved.length, savedBefore, 'failed emails are not saved')
  limited = true
  assert.equal((await post()).status, 429)
  limited = false
  const large = new Request('http://example.test/api/custom-cakes', {
    method: 'POST',
    headers: { 'Content-Type': 'multipart/form-data; boundary=test' },
    body: new Uint8Array(schema.MAX_PHOTOS * schema.MAX_PHOTO_BYTES + 65537),
  })
  assert.equal((await route.POST(large)).status, 413)
})
