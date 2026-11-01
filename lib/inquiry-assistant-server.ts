import 'server-only'
import Anthropic from '@anthropic-ai/sdk'
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod'
import { verifiedDatabase } from './database'
import { decode, encode } from './storage-crypto'
import { inquiryPhotoMime, readInquiryPhoto } from './inquiry-photos'
import type { StoredCakeInquiry } from './cake-inquiry'
import {
  assistantOutputSchema,
  DEFAULT_SIGNER,
  PROMPT_VERSION,
  SYSTEM_PROMPT,
  userPrompt,
  type AssistantNote,
} from './inquiry-assistant'

// Runs the inquiry assistant (lib/inquiry-assistant.ts) with Claude and stores the result. Off when
// ANTHROPIC_API_KEY is not set. A failure is logged and never affects the inquiry itself.

export const ASSISTANT_MODEL = 'claude-opus-5-5'
type Inquiry = Omit<StoredCakeInquiry, 'status' | 'staffNotes'>
type Photo = { name: string; data: Buffer }

export const assistantEnabled = () => !!process.env.ANTHROPIC_API_KEY

let client: Anthropic | undefined
const anthropic = () => (client ??= new Anthropic({ timeout: 90_000, maxRetries: 1 }))

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
type ImageType = (typeof IMAGE_TYPES)[number]

/** Asks Claude for notes on one inquiry. Throws when the answer is refused, cut off or doesn't match the schema. */
export async function analyzeInquiry(inquiry: Inquiry, photos: Photo[], now = new Date()): Promise<AssistantNote> {
  const started = Date.now()
  const images = photos.flatMap(photo => {
    const mediaType = inquiryPhotoMime(photo.name)
    return (IMAGE_TYPES as readonly string[]).includes(mediaType)
      ? [
          {
            type: 'image' as const,
            source: {
              type: 'base64' as const,
              media_type: mediaType as ImageType,
              data: photo.data.toString('base64'),
            },
          },
        ]
      : []
  })
  const response = await anthropic().beta.messages.parse({
    model: ASSISTANT_MODEL,
    max_tokens: 16000,
    // If a safety check declines the request, the API retries it on a suitable model in the same call.
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'medium', format: betaZodOutputFormat(assistantOutputSchema) },
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: [...images, { type: 'text', text: userPrompt(inquiry, now) }] }],
  })
  if (response.stop_reason === 'refusal') throw new Error('The model declined this inquiry')
  if (response.stop_reason === 'max_tokens') throw new Error('The answer was cut off')
  if (!response.parsed_output) throw new Error('The answer did not match the expected fields')
  return {
    output: response.parsed_output,
    model: response.model,
    promptVersion: PROMPT_VERSION,
    createdAt: new Date().toISOString(),
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    latencyMs: Date.now() - started,
  }
}

async function saveNote(inquiryId: string, note: AssistantNote) {
  const sql = await verifiedDatabase('content')
  await sql`INSERT INTO bakery_cake_inquiry_notes(inquiry_id,payload,model,prompt_version,input_tokens,output_tokens,latency_ms,created_at)
    VALUES(${inquiryId},${encode(note)},${note.model},${note.promptVersion},${note.inputTokens},${note.outputTokens},${note.latencyMs},${note.createdAt})
    ON CONFLICT(inquiry_id) DO UPDATE SET payload=EXCLUDED.payload,model=EXCLUDED.model,prompt_version=EXCLUDED.prompt_version,
    input_tokens=EXCLUDED.input_tokens,output_tokens=EXCLUDED.output_tokens,latency_ms=EXCLUDED.latency_ms,created_at=EXCLUDED.created_at`
}

/** Notes for the admin list, by inquiry id. Empty when the table doesn't exist yet (db/010 not run). */
export async function listInquiryNotes(): Promise<Record<string, AssistantNote>> {
  try {
    const sql = await verifiedDatabase('content')
    const rows = await sql`SELECT inquiry_id,payload FROM bakery_cake_inquiry_notes`
    return Object.fromEntries(rows.map(r => [r.inquiry_id as string, decode(r.payload) as AssistantNote]))
  } catch (error) {
    console.error('Inquiry notes unavailable', error)
    return {}
  }
}

/**
 * Analyzes an inquiry and stores the notes. Photos are the uploaded files for a new inquiry; when left out, the
 * inquiry's saved photos are read from storage (for "Regenerate"). Returns null when off or when anything failed.
 */
export async function runInquiryAssistant(inquiry: Inquiry, photos?: Photo[]): Promise<AssistantNote | null> {
  if (!assistantEnabled()) return null
  try {
    const images =
      photos ??
      (await Promise.all(
        (inquiry.photos ?? []).map(async name => ({ name, data: await readInquiryPhoto(inquiry.id, name) })),
      ))
    const note = await analyzeInquiry(inquiry, images)
    await saveNote(inquiry.id, note)
    return note
  } catch (error) {
    console.error('Inquiry assistant failed', inquiry.id, error)
    return null
  }
}

/** The name that signs reply drafts (admin → Settings). */
export async function getReplySigner() {
  try {
    const sql = await verifiedDatabase('content')
    const rows = await sql`SELECT value FROM bakery_settings WHERE key='reply_signer'`
    return (rows[0]?.value as string) || DEFAULT_SIGNER
  } catch {
    return DEFAULT_SIGNER
  }
}

export async function setReplySigner(name: string) {
  const sql = await verifiedDatabase('content')
  await sql`INSERT INTO bakery_settings(key,value) VALUES('reply_signer',${name})
    ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value,updated_at=now()`
}
