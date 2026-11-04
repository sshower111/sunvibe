'use strict'
// One Discord card per order: later notifications go in its thread and redraw the card; admin actions redraw it;
// an inquiry that became an order gets a quiet card plus a linked line on the inquiry's card.
const assert = require('node:assert/strict')
const { test } = require('node:test')
const { createLoader } = require('../helpers/load-ts.cjs')

const ORDER_ID = '00000000-0000-4000-8000-000000000001'
const INQUIRY_ID = '3f420000-1111-4111-8111-111111111111'
const order = (extra = {}) => ({
  id: ORDER_ID,
  orderNo: 1050,
  name: 'Jil Lee',
  email: 'jil@example.com',
  phone: '7025550123',
  size: '12-inch',
  flavor: 'Vanilla',
  filling: 'Strawberry',
  cakeMessage: '',
  notes: '',
  pickupDate: '2026-11-14',
  pickupTime: '14:00',
  price: 120,
  createdAt: '2026-11-04T17:00:00Z',
  status: 'paid',
  kind: 'custom',
  inquiryId: INQUIRY_ID,
  ...extra,
})

let state
const loader = createLoader()
loader.mocks['./database'] = {
  verifiedDatabase:
    async () =>
    (strings, ...values) => {
      const text = strings.join('?')
      if (text.startsWith('SELECT channel_id,message_id FROM bakery_discord_messages')) {
        const [kind, id] = values
        return Promise.resolve(state.cards[`${kind}:${id}`] ? [state.cards[`${kind}:${id}`]] : [])
      }
      if (text.startsWith('DELETE')) state.forgot.push(values[0])
      return Promise.resolve([])
    },
}
loader.mocks['./cake-orders-store'] = { getCakeOrder: async () => ({ ...state.order }) }
loader.mocks['./discord'] = {
  botReady: () => true,
  ensureThread: async (channelId, messageId, name) => {
    state.calls.push({ thread: name, channelId, messageId })
    return messageId
  },
  postToDiscord: async message => {
    state.posted.push(message)
    if (message.link) state.cards[`${message.link.kind}:${message.link.id}`] = { channel_id: '999', message_id: '7001' }
    return true
  },
  discordApi: async (path, method, body) => {
    state.calls.push({ path, method, body })
    if (method === 'GET' && path === '/channels/999') return { guild_id: '123' }
    if (method === 'GET') return state.messages[path] ?? { embeds: [{}] }
    return {}
  },
}
const cards = loader.load('lib/discord-orders.ts')
const msg = loader.load('lib/discord-messages.ts')
function reset(extra = {}) {
  state = { order: order(), cards: {}, calls: [], posted: [], forgot: [], messages: {}, ...extra }
}

test('first notification about an order becomes its card; later ones go in its thread and redraw the card', async () => {
  reset()
  process.env.DISCORD_MENTION = '@everyone'
  const paid = { ...msg.orderDiscord(order(), 'Custom cake paid', '💰', 1), link: { kind: 'order', id: ORDER_ID } }
  // No card yet: posted as usual (and remembered).
  assert.equal(await cards.postNotification(paid), true)
  assert.equal(state.posted.length, 1)

  // Card known: a line in its thread with a ping, and the card redrawn with its history.
  reset({
    cards: { [`order:${ORDER_ID}`]: { channel_id: '999', message_id: '7001' } },
    messages: { '/channels/999/messages/7001': { embeds: [{ description: '👍 Acknowledged by Keith' }] } },
  })
  const reminder = { ...msg.orderDiscord(order(), 'Pickup today at 2:00 PM', '⏰', 1), components: [] }
  assert.equal(await cards.postNotification(reminder), true)
  assert.equal(state.posted.length, 0)
  assert.deepEqual(state.calls[0], { thread: '#1050 Jil Lee', channelId: '999', messageId: '7001' })
  assert.equal(state.calls[1].path, '/channels/7001/messages')
  assert.equal(state.calls[1].body.content, '@everyone **⏰ Pickup today at 2:00 PM · #1050** — Jil Lee')
  assert.equal(state.calls[1].body.embeds, undefined) // the details are on the card at the top of the thread
  const redraw = state.calls.find(c => c.method === 'PATCH')
  assert.equal(redraw.path, '/channels/999/messages/7001')
  assert.equal(redraw.body.embeds[0].title, '✅ Paid · #1050')
  assert.equal(redraw.body.embeds[0].description, '👍 Acknowledged by Keith')
  assert.deepEqual(redraw.body.components, []) // paid and acknowledged: no buttons left
  delete process.env.DISCORD_MENTION
})

test('quiet messages do not ping; a card deleted in Discord is replaced', async () => {
  reset({ cards: { [`order:${ORDER_ID}`]: { channel_id: '999', message_id: '7001' } } })
  process.env.DISCORD_MENTION = '@everyone'
  await cards.postNotification({ ...msg.orderDiscord(order(), 'Note', '📝', 1), quiet: true })
  const line = state.calls.find(c => c.path === '/channels/7001/messages')
  assert.equal(line.body.content, '**📝 Note · #1050** — Jil Lee')
  assert.deepEqual(line.body.allowed_mentions.parse, [])

  // The card was deleted: the thread can't be made (10008), so the message becomes the new card.
  reset({ cards: { [`order:${ORDER_ID}`]: { channel_id: '999', message_id: '7001' } } })
  loader.mocks['./discord'].ensureThread = async () => {
    throw Object.assign(new Error('gone'), { code: 10008 })
  }
  await cards.postNotification(msg.orderDiscord(order(), 'Custom cake paid', '💰', 1))
  assert.deepEqual(state.forgot, ['7001'])
  assert.equal(state.posted.length, 1)
  loader.mocks['./discord'].ensureThread = async (channelId, messageId, name) => {
    state.calls.push({ thread: name, channelId, messageId })
    return messageId
  }
  delete process.env.DISCORD_MENTION
})

test('admin actions redraw the card with a line; nothing happens without a card', async () => {
  reset({
    order: order({ status: 'awaiting_approval', kind: undefined }),
    cards: { [`order:${ORDER_ID}`]: { channel_id: '999', message_id: '7001' } },
  })
  state.order.status = 'paid'
  await cards.refreshOrderCardQuietly(ORDER_ID, '✅ Approved in admin')
  const redraw = state.calls.find(c => c.method === 'PATCH')
  assert.equal(redraw.body.embeds[0].description, '✅ Approved in admin')
  assert.deepEqual(
    redraw.body.components[0].components.map(b => b.custom_id.split(':')[0]),
    ['ack'], // paid, kitchen thread not started yet
  )
  reset()
  await cards.refreshOrderCardQuietly(ORDER_ID, '✅ Approved in admin')
  assert.deepEqual(state.calls, [])
})

test('inquiry became an order: quiet order card, and a linked line on the inquiry card', async () => {
  reset({
    order: order({ status: 'awaiting_payment' }),
    cards: { [`inquiry:${INQUIRY_ID}`]: { channel_id: '888', message_id: '5005' } },
    messages: {
      '/channels/888/messages/5005': {
        embeds: [
          { title: '💬 Custom cake inquiry · #3F42', url: 'https://x', color: 1, fields: [{ name: 'a', value: 'b' }] },
        ],
      },
    },
  })
  await cards.inquiryBecameOrder(order({ status: 'awaiting_payment' }))
  assert.equal(state.posted[0].quiet, true)
  assert.equal(state.posted[0].embed.title, '📨 Awaiting payment · #1050')
  assert.deepEqual(state.posted[0].components, []) // nothing to approve: it waits for payment
  const edit = state.calls.find(c => c.method === 'PATCH')
  assert.equal(edit.path, '/channels/888/messages/5005')
  assert.equal(
    edit.body.embeds[0].description,
    '✅ Became order #1050 → [open the order](https://discord.com/channels/123/999/7001)',
  )
  assert.equal(edit.body.embeds[0].title, '💬 Custom cake inquiry · #3F42')
  assert.deepEqual(edit.body.embeds[0].fields, [{ name: 'a', value: 'b' }])
})

test('order cards say whether it is an online order or a custom cake from an inquiry', () => {
  const type = o => msg.orderDiscord(o, 'x', '🎂', 1).embed.fields.find(f => f.name === '🧾 Order').value
  assert.equal(type(order({ kind: undefined, inquiryId: undefined })), '🛒 Online order')
  assert.equal(
    type(order()),
    '🎨 Custom cake · from [inquiry #3F42](https://sunvillebakerylv.com/admin/inquiries/3f420000-1111-4111-8111-111111111111)',
  )
  assert.equal(type(order({ inquiryId: undefined })), '🎨 Custom cake')
})
