import 'server-only'

/** Reads a request body, stopping as soon as it exceeds maxBytes (the Content-Length header can't be trusted). */
export async function readBody(
  request: Request,
  maxBytes: number,
): Promise<{ ok: true; body: Buffer } | { ok: false; reason: 'empty' | 'too-large' }> {
  const reader = request.body?.getReader()
  if (!reader) return { ok: false, reason: 'empty' }
  const chunks: Uint8Array[] = []
  let bytes = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    bytes += value.byteLength
    if (bytes > maxBytes) {
      await reader.cancel()
      return { ok: false, reason: 'too-large' }
    }
    chunks.push(value)
  }
  return { ok: true, body: Buffer.concat(chunks) }
}

/** Parses a multipart body read with readBody. */
export function parseForm(request: Request, body: Buffer) {
  return new Response(new Uint8Array(body), {
    headers: { 'Content-Type': request.headers.get('content-type')! },
  }).formData()
}
