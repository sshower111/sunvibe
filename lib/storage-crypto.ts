import 'server-only'
import { createHash, randomBytes, createCipheriv, createDecipheriv } from 'node:crypto'
const keyFrom = (value: string) => createHash('sha256').update(value).digest()
/** The only key used to encrypt. It does not depend on ADMIN_PASSWORD, so changing the password never locks data. */
function encryptionKey() {
  const value = process.env.CAMPAIGN_STORAGE_SECRET
  if (!value) throw new Error('Storage encryption not configured (CAMPAIGN_STORAGE_SECRET)')
  return keyFrom(value)
}
/**
 * Keys tried when decrypting, current first. Data saved while CAMPAIGN_STORAGE_SECRET was unset was encrypted
 * with a key derived from ADMIN_PASSWORD; it stays readable here until re-encrypted (lib/storage-reencrypt.ts).
 */
function decryptionKeys() {
  const current = process.env.CAMPAIGN_STORAGE_SECRET
  const legacy = process.env.ADMIN_PASSWORD
  const keys: { key: Buffer; legacy: boolean }[] = []
  if (current) keys.push({ key: keyFrom(current), legacy: false })
  if (legacy && legacy !== current) keys.push({ key: keyFrom(legacy), legacy: true })
  if (!keys.length) throw new Error('Storage encryption not configured (CAMPAIGN_STORAGE_SECRET)')
  return keys
}
/** Runs a decryption with each key until one passes the GCM check; says whether the legacy key was needed. */
function withDecryptionKey<T>(attempt: (key: Buffer) => T) {
  let failure: unknown
  for (const { key, legacy } of decryptionKeys()) {
    try {
      return { value: attempt(key), legacy }
    } catch (error) {
      failure = error
    }
  }
  throw failure
}
export function encode(value: unknown) {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv)
  const data = Buffer.concat([cipher.update(JSON.stringify(value)), cipher.final()])
  return JSON.stringify({
    v: 1,
    iv: iv.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
    data: data.toString('base64'),
  })
}
function decodeWith(text: string, key: Buffer) {
  const value = JSON.parse(text)
  const cipher = createDecipheriv('aes-256-gcm', key, Buffer.from(value.iv, 'base64'))
  cipher.setAuthTag(Buffer.from(value.tag, 'base64'))
  return JSON.parse(Buffer.concat([cipher.update(Buffer.from(value.data, 'base64')), cipher.final()]).toString())
}
export function decode(text: string) {
  return withDecryptionKey(key => decodeWith(text, key)).value
}
/** The same value encrypted with the current key, or null when it already uses it. */
export function reencode(text: string): string | null {
  const { value, legacy } = withDecryptionKey(key => decodeWith(text, key))
  return legacy ? encode(value) : null
}
/** Encrypts raw bytes (iv + tag + data) with the same key as encode(). */
export function encryptBytes(data: Buffer) {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv)
  const body = Buffer.concat([cipher.update(data), cipher.final()])
  return Buffer.concat([iv, cipher.getAuthTag(), body])
}
function decryptBytesWith(data: Buffer, key: Buffer) {
  const cipher = createDecipheriv('aes-256-gcm', key, data.subarray(0, 12))
  cipher.setAuthTag(data.subarray(12, 28))
  return Buffer.concat([cipher.update(data.subarray(28)), cipher.final()])
}
export function decryptBytes(data: Buffer) {
  return withDecryptionKey(key => decryptBytesWith(data, key)).value
}
/** The same bytes encrypted with the current key, or null when they already use it. */
export function reencryptBytes(data: Buffer): Buffer | null {
  const { value, legacy } = withDecryptionKey(key => decryptBytesWith(data, key))
  return legacy ? encryptBytes(value) : null
}
