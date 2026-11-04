import { after, NextRequest, NextResponse } from 'next/server'
import { handleInteraction, verifyDiscordRequest, type Interaction } from '@/lib/discord-interactions'

export const runtime = 'nodejs'
export const maxDuration = 60

// Discord button presses (lib/discord-interactions.ts). This URL goes in the Discord app's
// General Information → Interactions Endpoint URL. Requests without Discord's signature are refused (401).
export async function POST(request: NextRequest) {
  const key = process.env.DISCORD_PUBLIC_KEY
  const body = await request.text()
  const signed = verifyDiscordRequest(
    key ?? '',
    request.headers.get('x-signature-ed25519'),
    request.headers.get('x-signature-timestamp'),
    body,
  )
  if (!key || !signed) return new NextResponse('Invalid request signature', { status: 401 })
  try {
    const interaction = JSON.parse(body) as Interaction
    const response = await handleInteraction(interaction, work =>
      after(() => work().catch(error => console.error('Discord button work failed', (error as Error).message))),
    )
    return NextResponse.json(response)
  } catch (error) {
    console.error('Discord interaction failed', (error as Error).message)
    return NextResponse.json({
      type: 4,
      data: { content: 'Something went wrong. Please use the admin app.', flags: 64 },
    })
  }
}
