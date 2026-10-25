/** Detects JPEG, PNG, WebP or GIF from a file's first bytes. Null for anything else. */
export function imageTypeOf(data: Uint8Array): { ext: 'jpg' | 'png' | 'webp' | 'gif'; mime: string } | null {
  const b = Buffer.from(data.buffer, data.byteOffset, data.byteLength)
  if (b.length > 12 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { ext: 'jpg', mime: 'image/jpeg' }
  if (b.length > 24 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])))
    return { ext: 'png', mime: 'image/png' }
  if (b.length > 16 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP')
    return { ext: 'webp', mime: 'image/webp' }
  if (b.length > 10 && (b.toString('ascii', 0, 6) === 'GIF87a' || b.toString('ascii', 0, 6) === 'GIF89a'))
    return { ext: 'gif', mime: 'image/gif' }
  return null
}
