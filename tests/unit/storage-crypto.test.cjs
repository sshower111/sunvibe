'use strict'
// Storage encryption keys: new data uses CAMPAIGN_STORAGE_SECRET only; data saved with the old
// ADMIN_PASSWORD-derived key still reads and can be re-encrypted (lib/storage-reencrypt.ts).
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { createHash, createCipheriv, randomBytes } = require('node:crypto')
const { test, after, beforeEach } = require('node:test')
const { PGlite } = require('@electric-sql/pglite')
const { createLoader } = require('../helpers/load-ts.cjs')
const { adminCookie } = require('../helpers/admin-session.cjs')

const db = new PGlite()
after(() => db.close())
async function sql(strings, ...values) {
  const query = strings.reduce((text, part, i) => text + part + (i < values.length ? '$' + (i + 1) : ''), '')
  return (await db.query(query, values)).rows
}
const files = new Map()
const { load, root } = createLoader({
  mocks: {
    postgres: () => sql,
    '@supabase/supabase-js': {
      createClient: () => ({
        storage: {
          from: () => ({
            upload: async (name, data) => (files.set(name, Buffer.from(data)), { error: null }),
            download: async name =>
              files.has(name) ? { data: new Blob([files.get(name)]), error: null } : { data: null, error: {} },
          }),
        },
      }),
    },
  },
})
const env = { ADMIN_PASSWORD: 'old-admin-password', CAMPAIGN_STORAGE_SECRET: 'storage-secret' }
beforeEach(() => {
  Object.assign(process.env, env, {
    DATABASE_URL: 'test-only',
    SUPABASE_URL: 'https://example.supabase.co',
    SUPABASE_SECRET_KEY: 'mock',
  })
})
const crypto = load('lib/storage-crypto.ts')

/** What lib/storage-crypto.ts wrote before CAMPAIGN_STORAGE_SECRET was required. */
const legacyKey = () => createHash('sha256').update(env.ADMIN_PASSWORD).digest()
function legacyEncode(value) {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', legacyKey(), iv)
  const data = Buffer.concat([cipher.update(JSON.stringify(value)), cipher.final()])
  const tag = cipher.getAuthTag().toString('base64')
  return JSON.stringify({ v: 1, iv: iv.toString('base64'), tag, data: data.toString('base64') })
}
function legacyEncryptBytes(data) {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', legacyKey(), iv)
  const body = Buffer.concat([cipher.update(data), cipher.final()])
  return Buffer.concat([iv, cipher.getAuthTag(), body])
}

test('new data is encrypted with CAMPAIGN_STORAGE_SECRET and survives a password change', () => {
  const text = crypto.encode({ name: 'Ana' })
  const bytes = crypto.encryptBytes(Buffer.from('photo'))
  process.env.ADMIN_PASSWORD = 'new-admin-password'
  assert.deepEqual(crypto.decode(text), { name: 'Ana' })
  assert.equal(crypto.decryptBytes(bytes).toString(), 'photo')
  delete process.env.ADMIN_PASSWORD
  assert.deepEqual(crypto.decode(text), { name: 'Ana' })
  assert.equal(crypto.reencode(text), null, 'already on the current key')
  assert.equal(crypto.reencryptBytes(bytes), null)
})

test('encryption never falls back to ADMIN_PASSWORD', () => {
  delete process.env.CAMPAIGN_STORAGE_SECRET
  assert.throws(() => crypto.encode({ a: 1 }), /CAMPAIGN_STORAGE_SECRET/)
  assert.throws(() => crypto.encryptBytes(Buffer.from('x')), /CAMPAIGN_STORAGE_SECRET/)
  delete process.env.ADMIN_PASSWORD
  assert.throws(() => crypto.decode(legacyEncode({ a: 1 })), /CAMPAIGN_STORAGE_SECRET/)
})

test('legacy ADMIN_PASSWORD data still decrypts, also before the secret is set', () => {
  const text = legacyEncode({ phone: '7025550123' })
  const bytes = legacyEncryptBytes(Buffer.from('legacy photo'))
  assert.deepEqual(crypto.decode(text), { phone: '7025550123' })
  assert.equal(crypto.decryptBytes(bytes).toString(), 'legacy photo')
  delete process.env.CAMPAIGN_STORAGE_SECRET
  assert.deepEqual(crypto.decode(text), { phone: '7025550123' })
})

test('re-encrypting legacy data moves it to the new key', () => {
  const text = crypto.reencode(legacyEncode({ phone: '7025550123' }))
  const bytes = crypto.reencryptBytes(legacyEncryptBytes(Buffer.from('legacy photo')))
  assert.ok(text && bytes)
  process.env.ADMIN_PASSWORD = 'new-admin-password'
  assert.deepEqual(crypto.decode(text), { phone: '7025550123' })
  assert.equal(crypto.decryptBytes(bytes).toString(), 'legacy photo')
})

test('data from an unknown key is rejected', () => {
  process.env.CAMPAIGN_STORAGE_SECRET = 'other-secret'
  const foreign = crypto.encode({ a: 1 })
  process.env.CAMPAIGN_STORAGE_SECRET = env.CAMPAIGN_STORAGE_SECRET
  assert.throws(() => crypto.decode(foreign))
  assert.throws(() => crypto.reencode(foreign))
})

test('admin re-encryption moves every legacy record and photo, and is safe to repeat', async () => {
  for (const file of ['001-bakery.sql', '002-cake-inquiries.sql', '003-cake-orders.sql', '004-cake-order-numbers.sql'])
    await db.exec(fs.readFileSync(path.join(root, 'db', file), 'utf8'))
  const ids = {
    order: '11111111-1111-4111-8111-111111111111',
    inquiry: '22222222-2222-4222-8222-222222222222',
    fresh: '33333333-3333-4333-8333-333333333333',
    cake: '44444444-4444-4444-8444-444444444444',
  }
  const now = new Date().toISOString()
  await sql`INSERT INTO bakery_orders(id,payload,status,created_at) VALUES(${ids.order},${legacyEncode({ name: 'Pre' })},'new',${now})`
  await sql`INSERT INTO bakery_cake_inquiries(id,payload,staff_notes,created_at) VALUES(${ids.inquiry},${legacyEncode({ name: 'Inq', photos: ['1.jpg'] })},${legacyEncode('paid cash')},${now})`
  await sql`INSERT INTO bakery_cake_inquiries(id,payload,created_at) VALUES(${ids.fresh},${crypto.encode({ name: 'New' })},${now})`
  await sql`INSERT INTO bakery_cake_orders(id,payload,status,pickup_at,created_at) VALUES(${ids.cake},${legacyEncode({ name: 'Cake' })},'paid',${now},${now})`
  files.set(`cake-inquiries/${ids.inquiry}/1.jpg`, legacyEncryptBytes(Buffer.from('jpeg bytes')))

  const route = load('app/api/admin/storage-key/route.ts')
  const { NextRequest } = require('next/server')
  const post = (body, cookie) =>
    route.POST(
      new NextRequest('https://sunvillebakerylv.com/api/admin/storage-key', {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
        body: JSON.stringify(body),
      }),
    )
  assert.equal((await post({ action: 'reencrypt' })).status, 401)
  const cookie = adminCookie(load)

  const check = await (await post({ action: 'check' }, cookie)).json()
  assert.deepEqual(check, { checked: 6, legacy: 5, updated: 0, failed: [] })
  assert.notEqual(
    crypto.reencode((await sql`SELECT payload FROM bakery_orders`)[0].payload),
    null,
    'dry run writes nothing',
  )

  const run = await (await post({ action: 'reencrypt' }, cookie)).json()
  assert.deepEqual(run, { checked: 6, legacy: 5, updated: 5, failed: [] })
  assert.deepEqual(await (await post({ action: 'reencrypt' }, cookie)).json(), {
    checked: 6,
    legacy: 0,
    updated: 0,
    failed: [],
  })

  // Everything reads with only the new key once the admin password is gone.
  delete process.env.ADMIN_PASSWORD
  assert.deepEqual(crypto.decode((await sql`SELECT payload FROM bakery_orders`)[0].payload), { name: 'Pre' })
  const [inquiry] = await sql`SELECT payload, staff_notes FROM bakery_cake_inquiries WHERE id=${ids.inquiry}`
  assert.equal(crypto.decode(inquiry.payload).name, 'Inq')
  assert.equal(crypto.decode(inquiry.staff_notes), 'paid cash')
  assert.deepEqual(crypto.decode((await sql`SELECT payload FROM bakery_cake_orders`)[0].payload), { name: 'Cake' })
  assert.equal(crypto.decryptBytes(files.get(`cake-inquiries/${ids.inquiry}/1.jpg`)).toString(), 'jpeg bytes')
})
