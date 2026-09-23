export async function verifyTurnstile(token: unknown, action: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY
  const hostnames = (process.env.TURNSTILE_ALLOWED_HOSTNAMES || '').split(',').map(value => value.trim()).filter(Boolean)
  if (!secret || hostnames.length === 0 || typeof token !== 'string' || !token || token.length > 2048) return false
  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret, response: token }),
      signal: AbortSignal.timeout(8000),
      cache: 'no-store',
    })
    if (!response.ok) return false
    const result = await response.json()
    return result.success === true && result.action === action && hostnames.includes(result.hostname)
  } catch {
    return false
  }
}
