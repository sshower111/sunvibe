// Browser helper for admin API calls. Auth is the httpOnly session cookie set at sign-in.
export class SignedOutError extends Error {
  constructor() {
    super('Your session ended. Please sign in again.')
  }
}

export async function adminPost<T = any>(url: string, body: Record<string, unknown> | FormData = {}): Promise<T> {
  const form = body instanceof FormData
  // Give up after 60 seconds so buttons never stay greyed out if a request hangs (photo uploads included).
  const response = await fetch(url, {
    method: 'POST',
    ...(form ? {} : { headers: { 'Content-Type': 'application/json' } }),
    body: form ? body : JSON.stringify(body),
    signal: AbortSignal.timeout(60_000),
  }).catch(error => {
    throw new Error(
      error?.name === 'TimeoutError'
        ? 'The server took too long to answer. Please press Refresh or reload the page.'
        : 'Could not reach the server. Check your connection and retry.',
    )
  })
  const data = await response.json().catch(() => ({}))
  if (response.status === 401) throw new SignedOutError()
  if (!response.ok) throw new Error(data.error || 'Something went wrong. Please retry.')
  return data as T
}
