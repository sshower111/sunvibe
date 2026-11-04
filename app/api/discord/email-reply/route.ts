import { timingSafeEqual } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { postEmailReply } from '@/lib/discord-replies'

export const runtime = 'nodejs'

// Customer email replies from the Gmail script (scripts/gmail-replies-to-discord.gs), posted in the inquiry's or
// order's Discord thread (lib/discord-replies.ts). Needs "Authorization: Bearer <EMAIL_REPLY_SECRET>".
const bodySchema = z.object({
  fromName: z.string().trim().max(200).default(''),
  fromEmail: z.string().trim().max(320).default(''),
  subject: z.string().trim().max(500).default(''),
  text: z.string().max(20_000).default(''),
  gmailUrl: z.string().max(500).optional(),
})

function authorized(request: NextRequest) {
  const secret = process.env.EMAIL_REPLY_SECRET
  const given = request.headers.get('authorization') ?? ''
  const expected = 'Bearer ' + secret
  return !!secret && given.length === expected.length && timingSafeEqual(Buffer.from(given), Buffer.from(expected))
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  try {
    return NextResponse.json({ ok: true, postedIn: await postEmailReply(parsed.data) })
  } catch (error) {
    console.error('Email reply not posted to Discord', (error as Error).message)
    return NextResponse.json({ error: 'Retry later' }, { status: 503 })
  }
}
