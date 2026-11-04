'use strict'
// Customer email replies → the Discord thread under their inquiry or order.
const assert = require('node:assert/strict')
const { test } = require('node:test')
const { createLoader } = require('../helpers/load-ts.cjs')

const msg = createLoader().load('lib/discord-messages.ts')
const ORDER_ID = '00000000-0000-4000-8000-000000000001'

test('which inquiry or order a reply is about, from its subject', () => {
  assert.deepEqual(msg.replyTarget('Re: [Inquiry] Custom cake: Linda Park · Birthday · 2026-11-08 · #1A2B'), {
    kind: 'inquiry',
    ref: '1a2b',
  })
  assert.deepEqual(msg.replyTarget('Re: We received your cake inquiry #0F9C — Sunville Bakery'), {
    kind: 'inquiry',
    ref: '0f9c',
  })
  assert.deepEqual(msg.replyTarget('Re: Your cake order #1042 is confirmed — Sunville Bakery'), {
    kind: 'order',
    orderNo: 1042,
  })
  assert.deepEqual(msg.replyTarget('Re: Your custom cake #1050 is confirmed — payment link inside'), {
    kind: 'order',
    orderNo: 1050,
  })
  assert.equal(msg.replyTarget('Re: question about cakes'), null)
})

test('reply message: pings, subject without Re:, only the new text, Gmail link only to Gmail', () => {
  const reply = msg.emailReplyDiscord(
    {
      fromName: 'Linda Park',
      fromEmail: 'linda@example.com',
      subject: 'Re: Re: [Inquiry] Custom cake #1A2B',
      text: 'Pink please!',
      gmailUrl: 'https://mail.google.com/mail/u/0/#inbox/abc',
    },
    '<@111>',
  )
  assert.equal(reply.content, '<@111> 📩 **Linda Park** replied by email')
  assert.equal(reply.embed.title, '[Inquiry] Custom cake #1A2B')
  assert.equal(reply.embed.description, 'Pink please!')
  assert.equal(reply.embed.url, 'https://mail.google.com/mail/u/0/#inbox/abc')
  const other = msg.emailReplyDiscord(
    { fromName: '', fromEmail: 'a@b.c', subject: 's', text: '', gmailUrl: 'https://evil.example' },
    '',
  )
  assert.equal(other.embed.url, undefined)
  assert.equal(other.content, '📩 **a@b.c** replied by email')
})

test('posted in the inquiry thread, or on its own when the message is unknown', async () => {
  const loader = createLoader()
  const calls = []
  const queries = []
  let rows = [{ channel_id: '888888', message_id: '4444' }]
  loader.mocks['./database'] = {
    verifiedDatabase:
      async () =>
      (strings, ...values) => {
        queries.push(values)
        return Promise.resolve(rows)
      },
  }
  loader.mocks['./discord'] = {
    botReady: () => true,
    channelFor: c => (c === 'inquiries' ? '888888' : '999999'),
    discordMention: () => '<@111>',
    ensureThread: async (channelId, messageId, name) => {
      calls.push({ thread: name, channelId, messageId })
      return messageId
    },
    discordApi: async (path, method, body) => {
      calls.push({ path, body })
      return {}
    },
  }
  const replies = loader.load('lib/discord-replies.ts')
  const reply = {
    fromName: 'Linda Park',
    fromEmail: 'linda@example.com',
    subject: 'Re: [Inquiry] Custom cake #1A2B',
    text: 'Pink please!',
  }
  assert.equal(await replies.postEmailReply(reply), 'thread')
  assert.deepEqual(queries[0], ['1a2b%'])
  assert.deepEqual(calls[0], { thread: '#1A2B Linda Park', channelId: '888888', messageId: '4444' })
  assert.equal(calls[1].path, '/channels/4444/messages')
  assert.equal(calls[1].body.content, '<@111> 📩 **Linda Park** replied by email')

  // An order sent before the bot was set up: posted in the orders channel.
  rows = []
  calls.length = 0
  assert.equal(await replies.postEmailReply({ ...reply, subject: 'Re: Your cake order #1042 is confirmed' }), 'channel')
  assert.deepEqual(queries.at(-1), [1042])
  assert.equal(calls[0].path, '/channels/999999/messages')

  // Other mail the Gmail search let through (no inquiry code or order number): nothing is posted.
  calls.length = 0
  for (const subject of [
    'Did your recent Amazon order meet your expectations? Review it on Amazon',
    "Get Sunville Bakery's first order on Uber Eats",
  ])
    assert.equal(await replies.postEmailReply({ ...reply, subject }), 'ignored')
  assert.deepEqual(calls, [])
})

test('the endpoint needs the EMAIL_REPLY_SECRET', async () => {
  const loader = createLoader()
  const posted = []
  loader.mocks['@/lib/discord-replies'] = {
    postEmailReply: async r => {
      posted.push(r)
      return 'thread'
    },
  }
  const route = loader.load('app/api/discord/email-reply/route.ts')
  const call = auth =>
    route.POST(
      new Request('http://example.test/api/discord/email-reply', {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...(auth ? { authorization: auth } : {}) },
        body: JSON.stringify({ subject: 'Re: [Inquiry] #1A2B', text: 'hi' }),
      }),
    )
  delete process.env.EMAIL_REPLY_SECRET
  assert.equal((await call('Bearer anything')).status, 401)
  process.env.EMAIL_REPLY_SECRET = 'reply-secret'
  assert.equal((await call()).status, 401)
  assert.equal((await call('Bearer wrong')).status, 401)
  const ok = await call('Bearer reply-secret')
  assert.equal(ok.status, 200)
  assert.deepEqual(await ok.json(), { ok: true, postedIn: 'thread' })
  assert.equal(posted[0].subject, 'Re: [Inquiry] #1A2B')
  delete process.env.EMAIL_REPLY_SECRET
})

test('db/012: re-runnable; the first message per order is kept', async () => {
  const fs = require('node:fs')
  const path = require('node:path')
  const { PGlite } = require('@electric-sql/pglite')
  const sql = fs.readFileSync(path.resolve(__dirname, '..', '..', 'db', '012-discord-messages.sql'), 'utf8')
  const db = new PGlite()
  await db.exec(sql)
  await db.exec(sql)
  const add = m =>
    db.query(
      `INSERT INTO bakery_discord_messages(kind,ref_id,channel_id,message_id) VALUES('order',$1,'9',$2) ON CONFLICT DO NOTHING`,
      [ORDER_ID, m],
    )
  await add('1')
  await add('2')
  assert.deepEqual((await db.query('SELECT message_id FROM bakery_discord_messages')).rows, [{ message_id: '1' }])
  await assert.rejects(
    db.query(`INSERT INTO bakery_discord_messages(kind,ref_id,channel_id,message_id) VALUES('menu',$1,'9','3')`, [
      ORDER_ID,
    ]),
  )
  await db.close()
})
