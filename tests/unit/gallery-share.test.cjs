'use strict'
// iPhone Shortcut gallery sharing: needs GALLERY_SHARE_KEY, adds one cleaned JPEG to the gallery.
const assert = require('node:assert/strict')
const { test } = require('node:test')
const sharp = require('sharp')
const { createLoader } = require('../helpers/load-ts.cjs')

const KEY = 'k'.repeat(40)
const uploads = []
const added = []
let limited = false
const { load } = createLoader({
  mocks: {
    'next/cache': { revalidateTag: () => {} },
    '@/lib/security': { rateLimiter: { check: () => !limited }, getClientIp: () => 'test' },
    '@/lib/photo-storage': {
      uploadPhoto: async (pathname, data, contentType) => {
        uploads.push({ pathname, data, contentType })
        return 'https://photos.test/' + pathname
      },
    },
    '@/lib/database-content': { editGallery: async (action, url) => added.push({ action, url }) },
  },
})
const route = load('app/api/gallery/share/route.ts')
const { NextRequest } = require('next/server')
const send = (body, { key = KEY, type = 'image/jpeg' } = {}) => {
  const headers = key ? { authorization: 'Bearer ' + key } : {}
  if (!(body instanceof FormData)) headers['content-type'] = type
  return route.POST(new NextRequest('http://example.test/api/gallery/share', { method: 'POST', body, headers }))
}

test('shared photos need the share key', async () => {
  delete process.env.GALLERY_SHARE_KEY
  const photo = await sharp({ create: { width: 8, height: 8, channels: 3, background: '#f00' } })
    .jpeg()
    .toBuffer()
  assert.equal((await send(photo)).status, 401) // not set up: refused even with a key
  process.env.GALLERY_SHARE_KEY = 'short'
  assert.equal((await send(photo, { key: 'short' })).status, 401) // too short to be safe
  process.env.GALLERY_SHARE_KEY = KEY
  assert.equal((await send(photo, { key: '' })).status, 401)
  assert.equal((await send(photo, { key: 'x'.repeat(40) })).status, 401)
  assert.equal(uploads.length + added.length, 0)
  limited = true
  assert.equal((await send(photo)).status, 429)
  limited = false
})

test('shared photos are resized, upright JPEGs without location data, added to the gallery', async () => {
  process.env.GALLERY_SHARE_KEY = KEY
  const withGps = await sharp({ create: { width: 3000, height: 1500, channels: 3, background: '#fc0' } })
    .jpeg()
    .withExif({ IFD0: { Make: 'Apple' }, IFD3: { GPSLatitudeRef: 'N', GPSLatitude: '36/1 10/1 0/1' } })
    .toBuffer()
  assert((await sharp(withGps).metadata()).exif, 'test photo has EXIF')
  const r = await send(withGps)
  assert.equal(r.status, 200)
  assert.equal((await r.json()).message, 'Added to the gallery')
  const out = uploads.at(-1)
  assert.equal(out.contentType, 'image/jpeg')
  assert.match(out.pathname, /^gallery\/[0-9a-f-]{36}-shared\.jpg$/)
  const meta = await sharp(out.data).metadata()
  assert.equal(meta.format, 'jpeg')
  assert.equal(meta.width, 2000)
  assert.equal(meta.exif, undefined)
  assert.deepEqual(added.at(-1), { action: 'add', url: 'https://photos.test/' + out.pathname })

  // Form upload with the photo in "file" also works (PNG becomes JPEG).
  const png = await sharp({ create: { width: 10, height: 10, channels: 4, background: '#0000' } })
    .png()
    .toBuffer()
  const form = new FormData()
  form.append('file', new File([png], 'IMG_1.png', { type: 'image/png' }))
  assert.equal((await send(form)).status, 200)
  assert.equal(uploads.at(-1).contentType, 'image/jpeg')

  // Not a photo, empty, or too big for Vercel: refused, nothing added.
  const before = added.length
  assert.equal((await send(Buffer.from('<svg onload=alert(1)>'.padEnd(64)), { type: 'image/svg+xml' })).status, 400)
  assert.equal((await send(Buffer.alloc(0))).status, 400)
  assert.equal((await send(Buffer.concat([withGps, Buffer.alloc(4 * 1024 * 1024)]))).status, 413)
  assert.equal(added.length, before)
})
