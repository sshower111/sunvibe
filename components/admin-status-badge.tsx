const tones = {
  amber: 'bg-amber-100/80 text-amber-900',
  blue: 'bg-blue-100/70 text-blue-900',
  green: 'bg-green-100/70 text-green-900',
  red: 'bg-red-100/70 text-red-900',
  gray: 'bg-[var(--admin-fill)] text-muted-foreground',
}
export type BadgeTone = keyof typeof tones

// Small rounded status label, e.g. "Needs approval" or "Paid".
export function AdminStatusBadge({ tone, children }: { tone: BadgeTone; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${tones[tone]}`}
    >
      <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      {children}
    </span>
  )
}
