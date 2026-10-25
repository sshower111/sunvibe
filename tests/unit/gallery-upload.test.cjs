'use strict'
// Admin photo upload: signed-in admins only, and the file type comes from the file's bytes.
const assert = require('node:assert/strict')
const { test } = require('node:test')
const { createLoader } = require('../helpers/load-ts.cjs')
const { adminCookie } = require('../helpers/admin-session.cjs')

process.env.ADMIN_PASSWORD = 'test-only'
const uploads = []
const { load } = createLoader({
  mocks: {
    'next/headers': { cookies: async () => ({ get: () => undefined }) },
    // The real module starts a cleanup timer that keeps the test process alive.
    '@/lib/security': {
      rateLimiter: { check: () => true },
      getClientIp: () => 'test',
      // Same rules as lib/security.ts sanitizeFilename.
      sanitizeFilename: name =>
        name
          .replace(/[^a-zA-Z0-9.-]/g, '_')
          .replace(/\.+/g, '.')
          .replace(/^\./, '')
          .substring(0, 255),
    },
    '@/lib/photo-storage': {
      uploadPhoto: async (pathname, data, contentType) => {
        uploads.push({ pathname, data, contentType })
        return 'https://photos.test/' + pathname
      },
    },
  },
})
const route = load('app/api/gallery/upload/route.ts')
const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=',
  'base64',
)

function upload(bytes, { name = 'photo.jpg', type = 'image/jpeg', cookie = adminCookie(load), extra = {} } = {}) {
  const form = new FormData()
  form.append('file', new File([bytes], name, { type }))
  for (const [k, v] of Object.entries(extra)) form.append(k, v)
  const request = new Request('http://test.invalid/api/gallery/upload', { method: 'POST', body: form })
  if (cookie) request.headers.set('Cookie', cookie)
  return route.POST(request)
}

test('gallery upload requires the admin session cookie', async () => {
  assert.equal((await upload(png, { cookie: '' })).status, 401)
  assert.equal((await upload(png, { cookie: '', extra: { password: 'test-only' } })).status, 401)
  assert.equal((await upload(png, { cookie: 'sunville_admin=9999999999.forged' })).status, 401)
  assert.equal(uploads.length, 0)
})

test('gallery upload checks the real file type, not the claimed one', async () => {
  // HTML pretending to be a JPEG is refused.
  const fake = Buffer.from('<html><script>alert(1)</script></html>'.padEnd(64, ' '))
  assert.equal((await upload(fake, { name: 'cake.jpg', type: 'image/jpeg' })).status, 400)
  assert.equal(uploads.length, 0)

  // A real PNG labelled as an SVG is stored as a PNG with a .png name.
  const r = await upload(png, { name: '../evil.svg', type: 'image/svg+xml', extra: { folder: 'menu' } })
  assert.equal(r.status, 200)
  const saved = uploads.at(-1)
  assert.equal(saved.contentType, 'image/png')
  assert.match(saved.pathname, /^menu\/[0-9a-f-]{36}-[^/]*\.png$/)
  assert(!saved.pathname.includes('..'))

  // Over 5 MB is refused: just over by the file check, far over before the body is even read in full.
  const over = Buffer.concat([png, Buffer.alloc(5 * 1024 * 1024)])
  assert.equal((await upload(over, { name: 'big.png', type: 'image/png' })).status, 400)
  const huge = Buffer.concat([png, Buffer.alloc(6 * 1024 * 1024)])
  assert.equal((await upload(huge, { name: 'huge.png', type: 'image/png' })).status, 413)
  assert.equal(uploads.length, 1)
})
