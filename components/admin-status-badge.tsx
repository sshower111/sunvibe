const tones = {
  amber: 'border-amber-300 bg-amber-50 text-amber-900',
  blue: 'border-blue-300 bg-blue-50 text-blue-900',
  green: 'border-green-300 bg-green-50 text-green-900',
  red: 'border-red-300 bg-red-50 text-red-900',
  gray: 'border-border bg-secondary text-muted-foreground',
}
export type BadgeTone = keyof typeof tones

// Small rounded status label, e.g. "Needs approval" or "Paid".
export function AdminStatusBadge({ tone, children }: { tone: BadgeTone; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold ${tones[tone]}`}
    >
      <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      {children}
    </span>
  )
}
