// Run with: node scripts/test-cake-inquiry.cjs
// All email and CAPTCHA providers are mocked; no messages leave this process.
const fs = require('node:fs')
const vm = require('node:vm')
const assert = require('node:assert/strict')
const ts = require('typescript')
const path = require('node:path')
const root = path.resolve(__dirname, '..')
function load(file, overrides = {}) {
  const code = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText
  const module = { exports: {} }
  vm.runInNewContext(code, { module, exports: module.exports, require: name => overrides[name] || require(name), Buffer, Response, Request, FormData, File, console, process: { env: { TURNSTILE_SECRET_KEY: 'mock', TURNSTILE_ALLOWED_HOSTNAMES: 'example.test', RESEND_API_KEY: 'mock' } } }, { filename: file })
  return module.exports
}
const catalog = load('lib/cake-catalog.ts')
const schema = load('lib/cake-inquiry.ts', { './cake-catalog': catalog })
let verified = true, emailError = false, mail = [], limited = false
const route = load('app/api/custom-cakes/route.ts', {
  '@/lib/cake-inquiry': schema,
  '@/lib/cake-catalog': catalog,
  '@/lib/turnstile': { verifyTurnstile: async (_, action) => { assert.equal(action, 'custom_cake'); return verified } },
  '@/lib/security': { rateLimiter: { check: () => !limited }, getClientIp: () => 'test', escapeHtml: value => value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c])) },
  resend: { Resend: class { emails = { send: async (body, options) => { mail.push({ body, options }); return emailError ? { error: { message: 'mock failure' } } : { data: { id: 'mock' }, error: null } } } } },
})
const valid = { name: '<script>test</script>', email: 'cake@example.com', phone: '7025550100', eventDate: '2099-01-20', eventType: 'Birthday', servings: '12', size: '8-inch', flavor: 'Please recommend', filling: 'Please recommend', budget: 'Not sure — please advise', fulfillment: 'Pickup', deliveryAddress: '', notes: '<img src=x> allergy request', acknowledged: 'yes', requestId: '11111111-1111-4111-8111-111111111111', captchaToken: 'mock' }
async function post(overrides = {}, photos = []) {
  const form = new FormData()
  for (const [key,value] of Object.entries({ ...valid, ...overrides })) form.set(key,value)
  for (const file of photos) form.append('photos',file)
  return route.POST(new Request('http://example.test/api/custom-cakes', { method: 'POST', body: form }))
}
;(async () => {
  assert.equal(schema.earliestCakeDate(new Date('2026-09-24T01:00:00Z')), '2026-09-26')
  assert.equal((await post({ eventDate: '2026-02-30' })).status, 400)
  assert.equal((await post({ eventDate: '2000-01-01' })).status, 400)
  assert.equal((await post({ email: 'invalid' })).status, 400)
  assert.equal((await post({ acknowledged: '' })).status, 400)
  assert.equal((await post({}, [new File(['fake'], 'fake.jpg', { type: 'image/jpeg' })])).status, 400)
  assert.equal((await post({}, [new File([new Uint8Array(schema.MAX_PHOTO_BYTES + 1)], 'big.png', { type: 'image/png' })])).status, 400)
  const png = new File([Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64')], '../unsafe.png', { type: 'image/png' })
  assert.equal((await post({}, [png,png,png,png])).status,400)
  verified=false; assert.equal((await post()).status,403); assert.equal(mail.length,0)
  verified=true; assert.equal((await post({}, [png])).status,200)
  assert(!mail[0].body.html.includes('<script>')); assert(mail[0].body.html.includes('&lt;script&gt;'))
  assert.equal(mail[0].body.attachments[0].filename,'cake-reference-1.png')
  assert.equal(mail[0].body.replyTo,valid.email)
  assert.equal(mail[0].options.idempotencyKey,'cake-'+valid.requestId)
  emailError=true; assert.equal((await post()).status,502)
  limited=true; assert.equal((await post()).status,429); limited=false
  const large = new Request('http://example.test/api/custom-cakes', { method:'POST',headers:{'Content-Type':'multipart/form-data; boundary=test'},body:new Uint8Array(3 * schema.MAX_PHOTO_BYTES + 65537) })
  assert.equal((await route.POST(large)).status,413)
  console.log('PASS: Pacific dates, invalid fields, consent, spoofed/large/excess photos, CAPTCHA, escaped email, safe filenames, reply-to, idempotency, provider failure, rate limiting and stream limit. No real emails sent.')
})().catch(error => { console.error(error); process.exitCode=1 })
