'use strict'
// Rate limits are shared through bakery_rate_limits (db/006-rate-limits.sql), with a per-instance
// memory fallback while the database or table is unavailable.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { test, after } = require('node:test')
const { PGlite } = require('@electric-sql/pglite')
const { createLoader } = require('../helpers/load-ts.cjs')

const db = new PGlite()
after(() => db.close())
async function sql(strings, ...values) {
  const query = strings.reduce((text, part, i) => text + part + (i < values.length ? '$' + (i + 1) : ''), '')
  return (await db.query(query, values)).rows
}
process.env.DATABASE_URL = 'test-only'
// Two separate module loads stand in for two server instances.
const instance = () => createLoader({ mocks: { postgres: () => sql } }).load('lib/security.ts').rateLimiter
const first = instance()
const second = instance()

test('falls back to a per-instance limit while the table is missing', async t => {
  t.mock.method(console, 'error', () => {})
  assert.equal(await first.check('contact:1.2.3.4', 1, 60_000), true)
  assert.equal(await first.check('contact:1.2.3.4', 1, 60_000), false)
  assert.equal(await second.check('contact:1.2.3.4', 1, 60_000), true, 'not shared without the table')
})

test('limits are shared across instances and stored without the IP', async () => {
  const { root } = createLoader()
  await db.exec(fs.readFileSync(path.join(root, 'db/006-rate-limits.sql'), 'utf8'))
  assert.equal(await first.check('preorder:5.6.7.8', 2, 60_000), true)
  assert.equal(await second.check('preorder:5.6.7.8', 2, 60_000), true)
  assert.equal(await first.check('preorder:5.6.7.8', 2, 60_000), false)
  assert.equal(await second.check('preorder:5.6.7.8', 2, 60_000), false)
  assert.equal(await first.check('preorder:9.9.9.9', 2, 60_000), true, 'other clients are not affected')
  const keys = (await sql`SELECT key FROM bakery_rate_limits`).map(r => r.key).join(' ')
  assert.doesNotMatch(keys, /5\.6\.7\.8|preorder/)
})

test('a new window starts after the old one ends', async () => {
  assert.equal(await first.check('contact:4.4.4.4', 1, 60_000), true)
  assert.equal(await first.check('contact:4.4.4.4', 1, 60_000), false)
  await sql`UPDATE bakery_rate_limits SET reset_at = now() - interval '1 second'`
  assert.equal(await second.check('contact:4.4.4.4', 1, 60_000), true)
  assert.equal(await first.check('contact:4.4.4.4', 1, 60_000), false)
})
