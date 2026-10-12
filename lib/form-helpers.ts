// Shared form helpers (browser-safe).

/** Keeps at most 10 digits and formats them as (702) 555-0123 while typing. A leading US "1" is dropped. */
export function formatPhone(value: string) {
  const d = value
    .replace(/\D/g, '')
    .replace(/^1(?=\d{10})/, '')
    .slice(0, 10)
  if (d.length < 4) return d
  if (d.length < 7) return `(${d.slice(0, 3)}) ${d.slice(3)}`
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`
}

const EMAIL_DOMAINS = [
  'gmail.com',
  'yahoo.com',
  'icloud.com',
  'hotmail.com',
  'outlook.com',
  'aol.com',
  'live.com',
  'msn.com',
]

/** Inline completion for an email field: "keith@g" → "mail.com". Empty until "@" is typed or when nothing fits. */
export function emailCompletion(value: string): string {
  const at = value.indexOf('@')
  if (at < 1 || value.indexOf('@', at + 1) !== -1 || /\s/.test(value)) return ''
  const typed = value.slice(at + 1).toLowerCase()
  const domain = EMAIL_DOMAINS.find(d => d.startsWith(typed) && d !== typed)
  return domain ? domain.slice(typed.length) : ''
}
