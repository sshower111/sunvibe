'use strict'
// Discord buttons on order messages: signature check, who may press, Acknowledge (kitchen thread), Approve/Decline
// with a confirm step, and posting as the bot.
const assert = require('node:assert/strict')
const crypto = require('node:crypto')
const { test } = require('node:test')
const { createLoader } = require('../helpers/load-ts.cjs')

const { load, mocks } = createLoader()
const msg = load('lib/discord-messages.ts')

const ID = '00000000-0000-4000-8000-000000000001'
const order = (extra = {}) => ({
  id: ID,
  orderNo: 1042,
  name: 'Jane Doe',
  email: 'jane@example.com',
  phone: '7025550123',
  size: '8-inch',
  flavor: 'Vanilla',
  filling: 'Strawberry',
  cakeMessage: '',
  notes: '',
  pickupDate: '2026-11-04',
  pickupTime: '14:00',
  price: 45,
  createdAt: '2026-10-31T17:00:00Z',
  status: 'awaiting_approval',
  paymentId: 'pay-1',
  ...extra,
})
const ids = rows => rows.flatMap(r => r.components.map(b => b.custom_id.split(':')[0]))

test('buttons follow the order status', () => {
  assert.deepEqual(ids(msg.orderButtons(order())), ['ack', 'approve', 'decline'])
  assert.deepEqual(ids(msg.orderButtons(order(), true)), ['approve', 'decline'])
  assert.deepEqual(ids(msg.orderButtons(order({ status: 'checking_kitchen' }), true)), ['approve', 'decline'])
  assert.deepEqual(ids(msg.orderButtons(order({ status: 'paid' }))), ['ack'])
  assert.deepEqual(ids(msg.orderButtons(order({ status: 'paid' }), true)), [])
  assert.deepEqual(msg.orderButtons(order({ status: 'declined' })), [])
  assert.equal(msg.orderButtons(order({ status: 'hold_expired' }))[0].components[0].label, 'Approve (send pay link)')
  // New order messages carry them.
  assert.deepEqual(ids(msg.orderDiscord(order(), 'Needs approval', '⏳', 1).components), ['ack', 'approve', 'decline'])
})

test('button IDs are parsed strictly', () => {
  assert.deepEqual(msg.parseButton('approve-yes:' + ID + ':123456789012345678'), {
    action: 'approve-yes',
    orderId: ID,
    messageId: '123456789012345678',
  })
  assert.equal(msg.parseButton('refund:' + ID), null)
  assert.equal(msg.parseButton('approve:not-an-id'), null)
})

test('confirm prompt names the customer and amount', () => {
  const charge = msg.confirmPrompt(order(), 'approve', '123456789012345678')
  assert.equal(charge.content, 'Charge Jane Doe $45 for #1042? They get the confirmation email.')
  assert.deepEqual(ids(charge.components), ['approve-yes', 'cancel'])
  assert.match(charge.components[0].components[0].custom_id, /:123456789012345678$/)
  assert.match(msg.confirmPrompt(order({ test: true }), 'approve', '123456').content, /^\[TEST — no card is charged\]/)
  assert.match(msg.confirmPrompt(order(), 'decline', '123456').content, /^Decline #1042 for Jane Doe\?/)
  assert.match(msg.confirmPrompt(order({ status: 'hold_expired' }), 'approve', '123456').content, /pay link for \$45/)
})

test('updated message: new status in the title, history under it', () => {
  const m = msg.updatedOrderMessage(
    order({ status: 'paid' }),
    ['👍 Acknowledged by Keith', '✅ Approved by Keith'],
    true,
  )
  assert.equal(m.embeds[0].title, '✅ Paid · #1042')
  assert.equal(m.embeds[0].description, '👍 Acknowledged by Keith\n✅ Approved by Keith')
  assert.deepEqual(m.components, [])
})

// --- interactions ---

const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519')
const publicHex = publicKey.export({ format: 'der', type: 'spki' }).subarray(-32).toString('hex')
const sign = (timestamp, body) => crypto.sign(null, Buffer.from(timestamp + body), privateKey).toString('hex')

// Modules are loaded once, so the doubles read the current test's state.
let state
mocks['./cake-order-actions'] = {
  getCakeOrderSettled: async () => ({ ...state.order }),
  askKitchen: async () => {
    state.order.status = 'checking_kitchen'
    return { ...state.order }
  },
  approveOrder: async () => {
    state.approved++
    state.order.status = 'paid'
    return { status: 'paid' }
  },
  declineOrder: async () => {
    state.declined++
    state.order.status = 'declined'
  },
}
mocks['./cake-orders-store'] = { getCakeOrder: async () => ({ ...state.order }) }
mocks['./discord'] = {
  discordApi: async (path, method, body) => {
    state.calls.push({ path, method, body })
    if (method === 'GET') return { embeds: [{ description: '👍 Acknowledged by Keith' }], thread: { id: '555555' } }
    return {}
  },
}
const lib = load('lib/discord-interactions.ts')
function setUp(start = order()) {
  state = { order: { ...start }, calls: [], approved: 0, declined: 0 }
  const work = []
  return { lib, state, later: fn => work.push(fn), run: () => Promise.all(work.splice(0).map(fn => fn())) }
}
const press = (customId, userId = '111') => ({
  type: 3,
  application_id: 'app1',
  token: 'tok',
  channel_id: '999999',
  member: { nick: 'Keith', user: { id: userId, username: 'keith' } },
  data: { custom_id: customId },
  message: { id: '777777', embeds: [{}] },
})

test('signature: valid, tampered, wrong key and stale requests', () => {
  const { lib } = setUp()
  const now = Date.now()
  const ts = String(Math.floor(now / 1000))
  const body = '{"type":1}'
  assert.equal(lib.verifyDiscordRequest(publicHex, sign(ts, body), ts, body, now), true)
  assert.equal(lib.verifyDiscordRequest(publicHex, sign(ts, body), ts, '{"type":3}', now), false)
  assert.equal(lib.verifyDiscordRequest('00'.repeat(32), sign(ts, body), ts, body, now), false)
  assert.equal(lib.verifyDiscordRequest(publicHex, sign(ts, body), ts, body, now + 10 * 60_000), false)
  assert.equal(lib.verifyDiscordRequest(publicHex, null, ts, body, now), false)
})

test('ping, and only listed Discord users may press', async () => {
  process.env.DISCORD_ADMIN_IDS = '111, 222'
  const { lib, later } = setUp()
  assert.deepEqual(await lib.handleInteraction({ type: 1 }, later), { type: 1 })
  const denied = await lib.handleInteraction(press('approve:' + ID, '333'), later)
  assert.equal(denied.type, 4)
  assert.equal(denied.data.flags, 64)
  assert.match(denied.data.content, /^Not allowed/)
  assert.equal((await lib.handleInteraction(press('approve:' + ID, '222'), later)).type, 5)
  delete process.env.DISCORD_ADMIN_IDS
})

test('Acknowledge: checking with kitchen, kitchen thread with the Chinese text, message updated', async () => {
  process.env.DISCORD_ADMIN_IDS = '111'
  const { lib, state, later, run } = setUp()
  assert.deepEqual(await lib.handleInteraction(press('ack:' + ID), later), { type: 6 })
  await run()
  assert.equal(state.order.status, 'checking_kitchen')
  const [thread, text, edit] = state.calls
  assert.equal(thread.path, '/channels/999999/messages/777777/threads')
  assert.equal(thread.body.name, '#1042 Jane Doe · kitchen')
  assert.equal(text.path, '/channels/777777/messages')
  assert.match(text.body.content, /^電話：7025550123/)
  assert.equal(edit.path, '/webhooks/app1/tok/messages/@original')
  assert.equal(edit.body.embeds[0].description, '👍 Acknowledged by Keith · checking with kitchen')
  assert.deepEqual(ids(edit.body.components), ['approve', 'decline'])
  delete process.env.DISCORD_ADMIN_IDS
})

test('Approve: asks first, Yes charges and redraws the order message; Cancel changes nothing', async () => {
  process.env.DISCORD_ADMIN_IDS = '111'
  const { lib, state, later, run } = setUp()
  await lib.handleInteraction(press('approve:' + ID), later)
  await run()
  assert.equal(state.approved, 0)
  assert.match(state.calls[0].body.content, /^Charge Jane Doe \$45/)

  const cancel = await lib.handleInteraction(press('cancel:' + ID), later)
  assert.deepEqual(cancel, { type: 7, data: { content: 'Cancelled. Nothing changed.', components: [] } })

  state.calls.length = 0
  const yes = await lib.handleInteraction(press(`approve-yes:${ID}:777777`), later)
  assert.equal(yes.type, 7)
  await run()
  assert.equal(state.approved, 1)
  assert.equal(state.calls[0].body.content, '✅ Approved by Keith · charged $45')
  const redraw = state.calls.find(c => c.method === 'PATCH' && c.path === '/channels/999999/messages/777777')
  assert.equal(redraw.body.embeds[0].title, '✅ Paid · #1042')
  assert.equal(redraw.body.embeds[0].description, '👍 Acknowledged by Keith\n✅ Approved by Keith · charged $45')
  assert.deepEqual(redraw.body.components, []) // paid and already has its kitchen thread
  delete process.env.DISCORD_ADMIN_IDS
})

test('Approve on an order that was already answered in admin: says so, nothing charged', async () => {
  process.env.DISCORD_ADMIN_IDS = '111'
  const { lib, state, later, run } = setUp(order({ status: 'paid' }))
  await lib.handleInteraction(press('approve:' + ID), later)
  await run()
  assert.equal(state.approved, 0)
  assert.equal(state.calls[0].body.content, '#1042 is already **Paid**. Nothing changed.')
  delete process.env.DISCORD_ADMIN_IDS
})

test('Decline: Yes releases the hold and emails', async () => {
  process.env.DISCORD_ADMIN_IDS = '111'
  const { lib, state, later, run } = setUp()
  await lib.handleInteraction(press(`decline-yes:${ID}:777777`), later)
  await run()
  assert.equal(state.declined, 1)
  assert.equal(state.calls[0].body.content, '❌ Declined by Keith · card hold released, customer emailed')
  delete process.env.DISCORD_ADMIN_IDS
})

test('postToDiscord: posts as the bot with buttons when the bot is set up', async () => {
  const discord = createLoader().load('lib/discord.ts')
  const realFetch = global.fetch
  const calls = []
  Object.assign(process.env, { DISCORD_BOT_TOKEN: 'bot-token', DISCORD_CHANNEL_ID: '999999' })
  global.fetch = async (url, init) => {
    calls.push({ url, init })
    return { ok: true, text: async () => '{"id":"1"}' }
  }
  try {
    const sent = await discord.postToDiscord(msg.orderDiscord(order(), 'Needs approval', '⏳', 1))
    assert.equal(sent, true)
    assert.equal(calls[0].url, 'https://discord.com/api/v10/channels/999999/messages')
    assert.equal(calls[0].init.headers.Authorization, 'Bot bot-token')
    assert.deepEqual(ids(JSON.parse(calls[0].init.body).components), ['ack', 'approve', 'decline'])
  } finally {
    global.fetch = realFetch
    delete process.env.DISCORD_BOT_TOKEN
    delete process.env.DISCORD_CHANNEL_ID
  }
})
