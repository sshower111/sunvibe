'use strict'
// A query on a dead connection must not hang forever: it fails after the time limit and the next query reconnects.
const assert = require('node:assert/strict')
const { test } = require('node:test')
const { createLoader } = require('../helpers/load-ts.cjs')

test('hung database query times out and the pool is replaced', async () => {
  process.env.DATABASE_URL = 'test-only'
  process.env.DB_QUERY_TIMEOUT_MS = '50'
  const pools = []
  const fakePostgres = () => {
    const pool = { ended: false, hang: pools.length === 0 }
    const sql = (strings, ...values) =>
      pool.hang ? new Promise(() => {}) : Promise.resolve([{ scope: 'content', strings, values }])
    sql.json = v => v
    sql.end = async () => {
      pool.ended = true
    }
    pools.push(pool)
    return sql
  }
  const { load } = createLoader({ mocks: { postgres: fakePostgres } })
  const db = load('lib/database.ts')
  const first = db.database()
  assert.equal(typeof first.json, 'function') // helpers still reachable
  await assert.rejects(first`SELECT 1`, /did not answer in time/)
  assert.equal(pools[0].ended, true)
  const second = db.database()
  assert.notEqual(second, first)
  assert.equal((await second`SELECT 1`).length, 1)
  assert.equal(pools.length, 2)
  await db.verifiedDatabase('content')
})

test('no more queries run at once than the pool has connections', async () => {
  // With more, postgres.js sends the extra ones on a busy connection and the Supabase pooler never answers.
  process.env.DATABASE_URL = 'test-only'
  process.env.DB_QUERY_TIMEOUT_MS = '1000'
  let running = 0
  let most = 0
  const fakePostgres = (_url, options) => {
    const sql = () => ({
      then(resolve, reject) {
        running++
        most = Math.max(most, running)
        return new Promise(done => setTimeout(done, 10))
          .then(() => {
            running--
            return [{ max: options.max }]
          })
          .then(resolve, reject)
      },
    })
    sql.end = async () => {}
    return sql
  }
  const { load } = createLoader({ mocks: { postgres: fakePostgres } })
  const sql = load('lib/database.ts').database()
  const results = await Promise.all(Array.from({ length: 7 }, () => sql`SELECT 1`))
  assert.equal(results.length, 7)
  assert.equal(most, results[0][0].max)
})
