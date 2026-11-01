'use strict'
// Writes the exact Claude requests the site would send (system prompt, inquiry prompt, photos, output schema) for
// run_eval.py, so the prompt lives in one place: lib/inquiry-assistant.ts.
//
//   node evals/inquiry-assistant/export_requests.cjs                    → out/requests.jsonl from cases.json
//   node --env-file=.env.local evals/inquiry-assistant/export_requests.cjs --real
//                                                                       → out/real-requests.jsonl from saved inquiries
// Real inquiries have no expected answers; run_eval.py only applies the checks that hold for every inquiry.
// Names, emails, phones and addresses are never included (lib/inquiry-assistant.ts inquiryForModel).
const fs = require('node:fs')
const path = require('node:path')
const { createLoader } = require('../../tests/helpers/load-ts.cjs')
const { betaZodOutputFormat } = require('@anthropic-ai/sdk/helpers/beta/zod')

const { load } = createLoader()
const ai = load('lib/inquiry-assistant.ts')
const { ASSISTANT_MODEL, imageForModel } = load('lib/inquiry-assistant-server.ts')
const schema = betaZodOutputFormat(ai.assistantOutputSchema).schema
const outDir = path.join(__dirname, 'out')
fs.mkdirSync(outDir, { recursive: true })

const addDays = (date, days) => {
  const d = new Date(date + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}
const request = (inquiry, photos = []) => ({
  model: ASSISTANT_MODEL,
  promptVersion: ai.PROMPT_VERSION,
  system: ai.SYSTEM_PROMPT,
  user: ai.userPrompt(inquiry),
  images: photos,
  schema,
})

async function main() {
  const real = process.argv.includes('--real')
  const lines = []
  if (real) {
    const { listCakeInquiries } = load('lib/cake-inquiries-store.ts')
    const { readInquiryPhoto } = load('lib/inquiry-photos.ts')
    for (const inquiry of (await listCakeInquiries()).filter(i => !i.test)) {
      const photos = []
      for (const name of inquiry.photos ?? []) {
        try {
          // Resized exactly as the site does before sending.
          for (const image of await imageForModel({ name, data: await readInquiryPhoto(inquiry.id, name) }))
            photos.push({ mediaType: image.source.media_type, data: image.source.data })
        } catch {
          // A photo that can't be read is left out, as on the site.
        }
      }
      lines.push({ id: 'real-' + inquiry.id.slice(0, 8), expect: null, request: request(inquiry, photos) })
    }
  } else {
    const today = ai.vegasToday()
    for (const c of JSON.parse(fs.readFileSync(path.join(__dirname, 'cases.json'), 'utf8'))) {
      const { daysAhead, ...fields } = c.inquiry
      const inquiry = {
        id: '00000000-0000-4000-8000-000000000000',
        createdAt: new Date().toISOString(),
        photoCount: 0,
        eventTime: '',
        deliveryAddress: '',
        ...fields,
        eventDate: addDays(today, daysAhead),
      }
      lines.push({ id: c.id, about: c.about, expect: c.expect, request: request(inquiry) })
    }
  }
  const file = path.join(outDir, real ? 'real-requests.jsonl' : 'requests.jsonl')
  fs.writeFileSync(file, lines.map(line => JSON.stringify(line)).join('\n') + '\n')
  console.log(`Wrote ${lines.length} requests to ${path.relative(process.cwd(), file)}`)
  process.exit(0) // the database pool would otherwise keep the process open
}
main().catch(error => {
  console.error(error)
  process.exit(1)
})
