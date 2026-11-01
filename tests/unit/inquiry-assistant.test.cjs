'use strict'
// AI notes for cake inquiries: what the model is sent (no contact details), the code-computed quote and checks,
// reply drafts, and failure handling. The Anthropic SDK and the database are mocked; nothing leaves this process.
// Run: pnpm test
const assert = require('node:assert/strict')
const { test } = require('node:test')
const sharp = require('sharp')
const { createLoader } = require('../helpers/load-ts.cjs')

/** A real image of the given size, like an uploaded reference photo. */
const photo = (width, height, format = 'png') =>
  sharp({ create: { width, height, channels: 3, background: '#f4c2c2' } })
    [format]()
    .toBuffer()

process.env.CAMPAIGN_STORAGE_SECRET = 'test-secret'
const requests = []
let reply = () => ({ stop_reason: 'end_turn', parsed_output: output() })
const queries = []

const { load } = createLoader({
  mocks: {
    '@anthropic-ai/sdk': {
      __esModule: true,
      default: class {
        beta = {
          messages: {
            parse: async params => {
              requests.push(params)
              return { model: 'claude-opus-5-5', usage: { input_tokens: 100, output_tokens: 50 }, ...reply() }
            },
          },
        }
      },
    },
    './inquiry-photos': {
      inquiryPhotoMime: name => ({ jpg: 'image/jpeg', png: 'image/png' })[name.split('.')[1]],
      readInquiryPhoto: async () => photo(600, 400, 'jpeg'),
    },
    './database': {
      verifiedDatabase:
        async () =>
        async (strings, ...values) => (queries.push({ text: strings.join('?'), values }), []),
    },
  },
})
const ai = load('lib/inquiry-assistant.ts')
const server = load('lib/inquiry-assistant-server.ts')

function output(change = {}) {
  return {
    headline: 'Unicorn birthday, 30 guests',
    summaryZh: '獨角獸蛋糕，30位客人。',
    suggestedSize: '12-inch',
    sizeReason: 'Serves 40.',
    flavorIdeas: [],
    designExtra: 40,
    designExtraReason: 'Drip and topper.',
    customFillingPriceGroup: null,
    flags: [],
    questions: ['Which hotel?'],
    askOwnerZh: [],
    emailBody: 'Thank you! The total would be {{total}}, including delivery.',
    textBody: 'Thanks! Total {{total}}.',
    ...change,
  }
}
const inquiry = (change = {}) => ({
  id: '3f6c2a1e-1111-4222-8333-444455556666',
  createdAt: '2026-11-01T10:00:00Z',
  photoCount: 0,
  name: 'Jordan Rivera',
  email: 'jordan@example.com',
  phone: '7025550100',
  eventDate: '2026-11-08',
  eventTime: '15:00',
  eventType: 'Birthday',
  servings: '30',
  size: 'Not sure',
  flavor: 'Vanilla',
  filling: 'Strawberry',
  cakeMessage: 'Happy 8th',
  budget: '$100–$200',
  fulfillment: 'Casino / Hotel delivery — $50',
  deliveryAddress: '123 Secret St',
  notes: 'Unicorn theme',
  ...change,
})
const note = change => ({
  output: output(change),
  model: 'm',
  promptVersion: 'v',
  createdAt: '',
  inputTokens: 0,
  outputTokens: 0,
  latencyMs: 0,
})
const now = new Date('2026-11-01T18:00:00Z')

test('the model never sees the customer’s name, email, phone or address', () => {
  const prompt = ai.userPrompt(inquiry(), now)
  for (const secret of ['Jordan', 'Rivera', 'jordan@example.com', '7025550100', 'Secret St'])
    assert(!prompt.includes(secret))
  assert(prompt.includes('<inquiry>') && prompt.includes('Unicorn theme'))
  assert(prompt.includes('Days until the event: 7'))
})

test('prices are computed by code from the catalog, not by the model', () => {
  // Not sure → the suggested size; Strawberry is in the Mixed Fruit price group ($128 for 12-inch).
  assert.deepEqual(ai.quoteFor(inquiry(), output()), {
    size: '12-inch',
    base: 128,
    baseIsFrom: false,
    designExtra: 40,
    delivery: 50,
    total: 218,
  })
  // The customer's own size is kept; a filling to recommend is quoted "from" the lowest price.
  const q = ai.quoteFor(inquiry({ size: '8-inch', filling: 'Please recommend', fulfillment: 'Pickup' }), output())
  assert.equal(q.size, '8-inch')
  assert.equal(q.base, 36)
  assert.equal(q.baseIsFrom, true)
  assert.equal(q.total, 76)
  // Tiered cakes have one price; "Other delivery" leaves the total open.
  assert.equal(ai.quoteFor(inquiry({ size: 'tier-8-12' }), output()).base, 238)
  assert.equal(ai.quoteFor(inquiry({ fulfillment: 'Other delivery — please advise' }), output()).total, null)
  // A tier combination that isn't on the price sheet has no price.
  assert.equal(ai.quoteFor(inquiry({ size: 'tier-6-8' }), output()).total, null)
})

test('a typed filling is priced in the column the model picked, and the owner confirms it', () => {
  const custom = inquiry({
    size: '8-inch',
    filling: 'Something else',
    customFilling: 'Passion fruit',
    fulfillment: 'Pickup',
  })
  // 8-inch prices by column: $36 / $40 / $42 / $60.
  const q = ai.quoteFor(custom, output({ customFillingPriceGroup: 3 }))
  assert.equal(q.base, 60)
  assert.equal(q.baseIsFrom, false)
  const checks = ai.codeChecks(custom, output({ customFillingPriceGroup: 3 }), q, now)
  assert(checks.some(c => c.startsWith('Passion fruit filling priced like Durian / Coconut')))
  // No column chosen (or notes saved before this field existed): the lowest price, marked "from".
  const old = output()
  delete old.customFillingPriceGroup
  assert.deepEqual([ai.quoteFor(custom, old).base, ai.quoteFor(custom, old).baseIsFrom], [36, true])
  assert(ai.userPrompt(custom, now).includes('"customFilling": "Passion fruit"'))
})

test('code checks guests, budget, short notice and open prices', () => {
  const small = inquiry({ size: '6-inch', budget: 'Under $100' })
  const checks = ai.codeChecks(
    small,
    output({ flags: [{ kind: 'needs_ordering', note: 'Topper' }] }),
    ai.quoteFor(small, output()),
    now,
  )
  assert(checks.some(c => c.includes('serves 8, but 30 guests')))
  assert(checks.some(c => c.includes('over the customer')))
  assert(checks.some(c => c.includes('Only 7 days')))
  const other = inquiry({ fulfillment: 'Other delivery — please advise', size: 'tier-6-8' })
  const open = ai.codeChecks(other, output(), ai.quoteFor(other, output()), now)
  assert(open.includes('Delivery fee still to quote.'))
  assert(open.some(c => c.startsWith('Custom tier combination')))
  // A suggested size that is too small is caught too.
  const unsure = inquiry({ budget: '$200–$350' })
  const tooSmall = output({ suggestedSize: '10-inch' })
  assert(
    ai
      .codeChecks(unsure, tooSmall, ai.quoteFor(unsure, tooSmall), now)
      .includes('10-inch round (suggested) serves 25, but 30 guests are expected.'),
  )
  const fine = inquiry({ budget: '$200–$350' })
  assert.deepEqual(ai.codeChecks(fine, output(), ai.quoteFor(fine, output()), now), [])
})

test('drafts get the first name, the computed total and the signature', () => {
  const email = ai.emailDraft(inquiry(), note(), 'May')
  assert(email.startsWith('Hi Jordan,\n\nThank you! The total would be $218, including delivery.'))
  assert(email.endsWith('\nMay\nSunville Bakery'))
  assert.equal(ai.emailDraft(inquiry(), note(), 'May'), email, 'same closing every time')
  assert.equal(ai.textDraft(inquiry(), note(), 'Kim'), 'Hi Jordan! Thanks! Total $218. – Kim, Sunville Bakery')
  const open = inquiry({ fulfillment: 'Other delivery — please advise' })
  assert(ai.emailDraft(open, note(), 'May').includes('[total]'))
  const owner = ai.askOwnerText(inquiry({ photoCount: 2 }), note({ askOwnerZh: ['可以做嗎？'] }))
  assert(owner.includes('獨角獸蛋糕') && owner.includes('• 可以做嗎？') && owner.includes('Unicorn theme'))
  assert(owner.includes('2 張參考圖片'))
})

test('the output schema only allows listed sizes and the $25–50 design range', () => {
  assert(ai.assistantOutputSchema.safeParse(output()).success)
  assert(!ai.assistantOutputSchema.safeParse(output({ designExtra: 20 })).success)
  assert(!ai.assistantOutputSchema.safeParse(output({ designExtra: 60 })).success)
  assert(!ai.assistantOutputSchema.safeParse(output({ suggestedSize: '9-inch' })).success)
  assert(!ai.assistantOutputSchema.safeParse(output({ flags: [{ kind: 'other', note: '' }] })).success)
})

test('the Claude request: model, fallbacks, structured output, photos and no contact details', async () => {
  process.env.ANTHROPIC_API_KEY = 'mock'
  requests.length = 0
  queries.length = 0
  const result = await server.runInquiryAssistant(inquiry(), [
    { name: '1.png', data: await photo(1400, 1050) },
    { name: '2.gif', data: Buffer.from('not allowed') },
    { name: '3.jpg', data: Buffer.from('not really a photo') },
  ])
  assert.equal(result.output.headline, 'Unicorn birthday, 30 guests')
  assert.equal(result.inputTokens, 100)
  const [request] = requests
  assert.equal(request.model, 'claude-opus-5-5')
  assert.equal(request.fallbacks, 'default')
  assert.deepEqual(request.betas, ['server-side-fallback-2026-07-01'])
  assert.equal(request.output_config.effort, 'medium')
  assert.equal(request.output_config.format.type, 'json_schema')
  const content = request.messages[0].content
  assert.equal(content.filter(c => c.type === 'image').length, 1, 'unsupported or unreadable photos are left out')
  // Sent smaller (800px on the long side) as JPEG, keeping the shape.
  assert.equal(content[0].source.media_type, 'image/jpeg')
  const sent = await sharp(Buffer.from(content[0].source.data, 'base64')).metadata()
  assert.deepEqual([sent.width, sent.height, sent.format], [800, 600, 'jpeg'])
  assert(!JSON.stringify(request).includes('jordan@example.com'))
  // Saved encrypted, with cost and speed in the clear.
  assert.equal(queries.length, 1)
  assert(queries[0].text.includes('bakery_cake_inquiry_notes'))
  assert(!queries[0].values.some(v => String(v).includes('Unicorn')), 'notes are encrypted')
  assert(queries[0].values.includes(100) && queries[0].values.includes('claude-opus-5-5'))
})

test('saved photos are read for "Redo AI notes"', async () => {
  requests.length = 0
  await server.runInquiryAssistant(inquiry({ photos: ['1.jpg'], photoCount: 1 }))
  const sent = await sharp(Buffer.from(requests[0].messages[0].content[0].source.data, 'base64')).metadata()
  assert.deepEqual([sent.width, sent.height], [600, 400], 'small photos are not enlarged')
})

test('a refusal, a cut-off or an unreadable answer gives no notes instead of an error', async () => {
  const errors = console.error
  console.error = () => {}
  try {
    for (const bad of [
      { stop_reason: 'refusal', parsed_output: null },
      { stop_reason: 'max_tokens', parsed_output: null },
      { stop_reason: 'end_turn', parsed_output: null },
    ]) {
      reply = () => bad
      queries.length = 0
      assert.equal(await server.runInquiryAssistant(inquiry(), []), null)
      assert.equal(queries.length, 0, 'nothing saved')
    }
  } finally {
    console.error = errors
    reply = () => ({ stop_reason: 'end_turn', parsed_output: output() })
  }
  delete process.env.ANTHROPIC_API_KEY
  requests.length = 0
  assert.equal(await server.runInquiryAssistant(inquiry(), []), null, 'off without a key')
  assert.equal(requests.length, 0)
})
