'use strict'
// Admin "Send test inquiry": admin only, both emails go to the bakery inbox marked [TEST], saved as a test.
const assert = require('node:assert/strict')
const { test } = require('node:test')
const { createLoader } = require('../helpers/load-ts.cjs')

process.env.RESEND_API_KEY = 'mock'
process.env.NOTIFICATION_EMAIL = 'inbox@example.com'
let admin = true
const mail = []
const saved = []
const deleted = []
const { load } = createLoader({
  mocks: {
    '@/lib/admin-auth': { isAdminRequest: async () => admin },
    // The real module starts a cleanup timer that keeps the test process alive.
    '@/lib/security': {
      escapeHtml: value =>
        value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[c]),
    },
    '@/lib/cake-inquiries-store': {
      saveCakeInquiry: async i => saved.push(i),
      listCakeInquiries: async () => [],
      deleteTestInquiry: async id => deleted.push(id),
    },
    resend: {
      Resend: class {
        emails = {
          send: async (body, options) => (mail.push({ body, options }), { data: { id: 'mock' }, error: null }),
        }
      },
    },
  },
})
const route = load('app/api/admin/cake-inquiries/route.ts')
const post = body =>
  route.POST(
    new Request('http://example.test/api/admin/cake-inquiries', { method: 'POST', body: JSON.stringify(body) }),
  )

test('admin can send a test cake inquiry to the bakery inbox', async () => {
  admin = false
  assert.equal((await post({ action: 'test' })).status, 401)
  assert.equal(mail.length, 0)
  admin = true
  const response = await post({ action: 'test' })
  assert.equal(response.status, 200)
  assert.equal((await response.json()).sentTo, 'inbox@example.com')
  assert.equal(mail.length, 2)
  for (const { body } of mail) {
    assert.equal(body.to, 'inbox@example.com')
    assert.match(body.subject, /^\[TEST\] /)
  }
  assert.match(mail[0].body.subject, /^\[TEST\] Custom cake inquiry: Test Customer · Birthday · /)
  assert(mail[0].body.text.startsWith('TEST INQUIRY'))
  assert(mail[0].body.html.includes('<strong>Writing on cake:</strong> Happy Birthday, Test!'))
  assert.equal(saved.length, 1, 'added to the list, marked as a test')
  assert.equal(saved[0].test, true)
  assert(!('acknowledged' in saved[0]))
  const id = saved[0].id
  assert.equal((await post({ action: 'delete', id })).status, 200)
  assert.deepEqual(deleted, [id])
  assert.equal((await post({ action: 'delete', id: 'not-a-uuid' })).status, 400)
})
