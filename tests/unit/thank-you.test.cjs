'use strict'
// Thank-you email a day after pickup, the "Share a photo" page's upload, and admin "Add to gallery" (consent only).
const assert = require('node:assert/strict')
const { test } = require('node:test')
const sharp = require('sharp')
const { createLoader } = require('../helpers/load-ts.cjs')

process.env.NOTIFICATION_EMAIL = 'inbox@example.com'
const ORDER = '00000000-0000-4000-8000-0000000000bb'
const SUB = '00000000-0000-4000-8000-0000000000cc'
const mail = []
let order
const saved = { subs: {}, photos: [] }
const gallery = []
const escapeHtml = v =>
  String(v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[c])
const { load } = createLoader({
  mocks: {
    '@/lib/security': { escapeHtml, getClientIp: () => '1.2.3.4', rateLimiter: { check: async () => true } },
    '@/lib/email': {
      EMAIL_FROM: 'x',
      bakeryInbox: () => 'inbox@example.com',
      mailer: () => ({ emails: { send: async m => (mail.push(m), {}) } }),
    },
    '@/lib/cake-orders-store': {
      getCakeOrder: async id => (id === ORDER ? { ...order } : null),
      listCakeOrders: async () => [order],
    },
    '@/lib/admin-auth': { isAdminRequest: () => true },
    '@/lib/customer-photos': {
      MAX_NOTE: 1000,
      MAX_PHOTOS_PER_ORDER: 10,
      PHOTO_FILE: /.*/,
      saveSubmission: async s => (saved.subs[s.id] = s),
      photoCountForOrder: async () => saved.photos.length,
      addSubmissionPhoto: async (id, orderId, jpeg) => (saved.photos.push({ id, orderId, jpeg }), 'f.jpg'),
      getCustomerPhotos: async id =>
        saved.subs[id] && { ...saved.subs[id], createdAt: '', photos: [{ file: 'f.jpg' }] },
      readCustomerPhoto: async () => Buffer.from('jpeg'),
      markInGallery: async () => {},
      listCustomerPhotos: async () => [],
      deleteCustomerPhotos: async () => {},
    },
    '@/lib/photo-storage': { uploadPhoto: async path => 'https://cdn.example/' + path },
    '@/lib/database-content': { editGallery: async (action, url) => gallery.push(url) },
    'next/cache': { revalidateTag: () => {} },
  },
})
const email = load('lib/cake-order-email.ts')
const thanks = load('lib/thank-you.ts')
const photosRoute = load('app/api/photos/route.ts')
const adminRoute = load('app/api/admin/customer-photos/route.ts')

const base = {
  id: ORDER,
  orderNo: 1042,
  name: 'Jane Doe',
  email: 'jane@example.com',
  phone: '7025550100',
  size: '8-inch',
  flavor: 'Vanilla',
  filling: 'Mango',
  cakeMessage: '',
  notes: '',
  fulfillment: 'Pickup',
  pickupTime: '14:00',
  price: 45,
  createdAt: '2026-11-01T00:00:00Z',
}

test('thank-you email: short, first name, one "Share a photo" button, no order table', async () => {
  await email.sendThankYouEmail({ ...base, pickupDate: '2026-11-03', status: 'picked_up' })
  const m = mail.at(-1)
  assert.equal(m.to, 'jane@example.com')
  assert.equal(m.subject, 'Thanks for celebrating with us, Jane 🎂')
  assert(m.html.includes(`href="https://sunvillebakerylv.com/photos/${ORDER}"`))
  assert(m.html.includes('Share a photo'))
  assert(m.html.includes('No need to reply.'))
  assert(!m.html.includes('<h2'), 'no details table')
  assert(m.text.includes('/photos/' + ORDER))
})

test('sent only in the daytime in Las Vegas', () => {
  assert.equal(thanks.sendingHours(new Date('2026-11-05T17:00:00Z')), true) // 9 AM
  assert.equal(thanks.sendingHours(new Date('2026-11-05T16:59:00Z')), false) // 8:59 AM
  assert.equal(thanks.sendingHours(new Date('2026-11-06T04:00:00Z')), false) // 8 PM
})

const upload = async fields => {
  const form = new FormData()
  for (const [k, v] of Object.entries(fields)) form.set(k, v)
  return photosRoute.POST(new Request('http://example.test/api/photos', { method: 'POST', body: form }))
}

test('photo page: picked-up orders accept photos (cleaned to JPEG) and the OK answer; others do not', async () => {
  const today = new Date().toISOString().slice(0, 10)
  order = { ...base, pickupDate: today, status: 'awaiting_payment' }
  const png = await sharp({ create: { width: 40, height: 30, channels: 3, background: '#f00' } })
    .png()
    .toBuffer()
  const file = new File([png], 'cake.png', { type: 'image/png' })
  assert.equal((await upload({ order: ORDER, submission: SUB, consent: 'yes', file })).status, 404)
  order.status = 'picked_up'
  assert.equal((await upload({ order: ORDER, submission: 'nope', file })).status, 400)
  const r = await upload({ order: ORDER, submission: SUB, consent: 'yes', note: ' Loved it! ', file })
  assert.equal(r.status, 200)
  assert.deepEqual(saved.subs[SUB], { id: SUB, orderId: ORDER, note: 'Loved it!', consent: true })
  assert.equal((await sharp(saved.photos[0].jpeg).metadata()).format, 'jpeg')
  // Not an image: refused.
  const text = new File([Buffer.from('hello')], 'a.jpg', { type: 'image/jpeg' })
  assert.equal((await upload({ order: ORDER, submission: SUB, file: text })).status, 400)
})

test('admin: Add to gallery only when the customer said OK', async () => {
  const post = body =>
    adminRoute.POST(new Request('http://example.test', { method: 'POST', body: JSON.stringify(body) }))
  saved.subs[SUB].consent = false
  assert.equal((await post({ action: 'add_to_gallery', id: SUB, file: 'f.jpg' })).status, 409)
  assert.equal(gallery.length, 0)
  saved.subs[SUB].consent = true
  const r = await post({ action: 'add_to_gallery', id: SUB, file: 'f.jpg' })
  assert.equal(r.status, 200)
  assert.match(gallery[0], /^https:\/\/cdn\.example\/gallery\/.+-customer\.jpg$/)
})
