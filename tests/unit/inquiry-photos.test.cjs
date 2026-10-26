'use strict'
// Inquiry reference photos: stored encrypted, served only to admin, only names listed on the inquiry.
const assert = require('node:assert/strict')
const { test } = require('node:test')
const { createLoader } = require('../helpers/load-ts.cjs')

process.env.CAMPAIGN_STORAGE_SECRET = 'test-secret'
process.env.ADMIN_PASSWORD = 'test-password'
const files = new Map()
let failNext = false
const inquiryId = '22222222-2222-4222-8222-222222222222'
let inquiry = { id: inquiryId, photoCount: 2, photos: ['1.jpg'] }
const { load } = createLoader({
  mocks: {
    '@supabase/supabase-js': {
      createClient: () => ({
        storage: {
          from: () => ({
            upload: async (path, data) => {
              if (failNext) return ((failNext = false), { error: { message: 'down' } })
              files.set(path, Buffer.from(data))
              return { error: null }
            },
            download: async path =>
              files.has(path) ? { data: new Blob([files.get(path)]), error: null } : { data: null, error: {} },
          }),
        },
      }),
    },
    '@/lib/database': { database: () => {} },
    '@/lib/cake-inquiries-store': { getCakeInquiry: async id => (id === inquiryId ? inquiry : null) },
  },
})
process.env.SUPABASE_URL = 'https://example.supabase.co'
process.env.SUPABASE_SECRET_KEY = 'mock'
const photos = load('lib/inquiry-photos.ts')
const route = load('app/api/admin/cake-inquiries/photo/route.ts')
const { adminCookie } = require('../helpers/admin-session.cjs')
const { NextRequest } = require('next/server')
const get = (query, cookie) =>
  route.GET(
    new NextRequest('http://example.test/api/admin/cake-inquiries/photo?' + query, {
      headers: cookie ? { cookie } : {},
    }),
  )

test('photos are saved encrypted and failures are skipped', async () => {
  const jpg = Buffer.from([255, 216, 255, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])
  failNext = true
  const saved = await photos.saveInquiryPhotos(inquiryId, [
    { filename: 'cake-reference-1.jpg', content: jpg }, // upload fails
    { filename: 'cake-reference-2.png', content: Buffer.from('plain png bytes') },
  ])
  assert.deepEqual(saved, ['2.png'])
  const stored = files.get(`cake-inquiries/${inquiryId}/2.png`)
  assert(stored && !stored.includes(Buffer.from('plain png bytes')), 'stored bytes are encrypted')
  await photos.saveInquiryPhotos(inquiryId, [{ filename: 'cake-reference-1.jpg', content: jpg }])
  assert.deepEqual(await photos.readInquiryPhoto(inquiryId, '1.jpg'), jpg)
})

test('admin photo route: admin only, listed names only, correct type', async () => {
  const cookie = adminCookie(load)
  assert.equal((await get(`id=${inquiryId}&file=1.jpg`)).status, 401)
  assert.equal((await get(`id=${inquiryId}&file=2.png`, cookie)).status, 404) // stored but not listed
  assert.equal((await get(`id=${inquiryId}&file=../x.jpg`, cookie)).status, 404)
  assert.equal((await get(`id=33333333-3333-4333-8333-333333333333&file=1.jpg`, cookie)).status, 404)
  const ok = await get(`id=${inquiryId}&file=1.jpg`, cookie)
  assert.equal(ok.status, 200)
  assert.equal(ok.headers.get('content-type'), 'image/jpeg')
  assert.match(ok.headers.get('cache-control'), /^private/)
  assert.equal(Buffer.from(await ok.arrayBuffer())[0], 255)
})
