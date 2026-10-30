'use strict'
// Orders that need approval also text the bakery phone (SMS_GATEWAY_EMAIL); paid orders don't.
const assert = require('node:assert/strict')
const { test } = require('node:test')
const { createLoader } = require('../helpers/load-ts.cjs')

process.env.RESEND_API_KEY = 'mock'
process.env.NOTIFICATION_EMAIL = 'inbox@example.com'
const mail = []
const { load } = createLoader({
  mocks: {
    // The real module starts a cleanup timer that keeps the test process alive.
    '@/lib/security': { escapeHtml: value => value },
    resend: {
      Resend: class {
        emails = {
          send: async (body, options) => (mail.push({ body, options }), { data: { id: 'mock' }, error: null }),
        }
      },
    },
  },
})
const { sendNewOrderEmails } = load('lib/cake-order-email.ts')

const order = (extra = {}) => ({
  id: '00000000-0000-4000-8000-000000000001',
  orderNo: 1009,
  createdAt: '2026-10-30T18:41:47.000Z',
  name: 'Amy Chan',
  email: 'amy@example.com',
  phone: '(702) 555-0123',
  size: '10-inch',
  flavor: 'Vanilla',
  filling: 'Strawberry',
  cakeMessage: '',
  pickupDate: '2026-10-30',
  pickupTime: '19:30',
  notes: '',
  price: 72,
  status: 'paid',
  ...extra,
})
const held = () =>
  order({
    status: 'awaiting_approval',
    approveBy: '2026-10-30T19:41:47.000Z',
    approvalReason: 'Same-day pickup',
  })

test('an order waiting for approval texts the bakery phone', async () => {
  process.env.SMS_GATEWAY_EMAIL = '7025550123@sms.example.com'
  mail.length = 0
  await sendNewOrderEmails(held())
  const texts = mail.filter(m => m.body.to === '7025550123@sms.example.com')
  assert.equal(texts.length, 1)
  const { body, options } = texts[0]
  assert.match(body.text, /^APPROVE by .*12:41 PM: cake #1009, .*pickup .*7:30 PM\. https:\/\/.*\/admin$/)
  assert(body.text.length <= 160, `one SMS: ${body.text.length} characters`)
  assert.equal(body.html, undefined, 'plain text only')
  assert.equal(options.idempotencyKey, 'cake-order-sms-' + held().id + '-0')
})

test('paid orders and missing gateway send no text', async () => {
  process.env.SMS_GATEWAY_EMAIL = '7025550123@sms.example.com'
  mail.length = 0
  await sendNewOrderEmails(order())
  assert.equal(mail.filter(m => m.body.to === '7025550123@sms.example.com').length, 0)
  assert.equal(mail.length, 2, 'bakery and customer emails still go out')

  delete process.env.SMS_GATEWAY_EMAIL
  mail.length = 0
  await sendNewOrderEmails(held())
  assert.equal(mail.length, 2)
})

test('test orders are marked in the text', async () => {
  process.env.SMS_GATEWAY_EMAIL = '7025550123@sms.example.com'
  mail.length = 0
  await sendNewOrderEmails({ ...held(), test: true })
  const text = mail.find(m => m.body.to === '7025550123@sms.example.com')
  assert.match(text.body.text, /^\[TEST\] APPROVE by /)
})

test('several phones each get their own text', async () => {
  process.env.SMS_GATEWAY_EMAIL = ' 7025550123@tmomail.net , 7025550124@tmomail.net,'
  mail.length = 0
  await sendNewOrderEmails(held())
  const texts = mail.filter(m => m.body.to.endsWith('@tmomail.net'))
  assert.deepEqual(
    texts.map(m => m.body.to),
    ['7025550123@tmomail.net', '7025550124@tmomail.net'],
  )
  assert.equal(new Set(texts.map(m => m.options.idempotencyKey)).size, 2)
})
