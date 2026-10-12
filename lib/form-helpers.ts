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

/** Address suggestions for an email field: "keith@g" → ["keith@gmail.com"]. Empty when nothing is typed or the address is complete. */
export function emailSuggestions(value: string, limit = 5): string[] {
  const at = value.indexOf('@')
  const name = (at === -1 ? value : value.slice(0, at)).trim()
  if (!name || /\s/.test(value) || value.indexOf('@', at + 1) !== -1) return []
  const typed = at === -1 ? '' : value.slice(at + 1).toLowerCase()
  if (EMAIL_DOMAINS.includes(typed)) return []
  return EMAIL_DOMAINS.filter(domain => domain.startsWith(typed))
    .slice(0, limit)
    .map(domain => `${name}@${domain}`)
}
