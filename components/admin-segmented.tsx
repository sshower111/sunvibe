// Filter pills with counts (e.g. "Open 3 | All 12"). Scrolls sideways on narrow phones instead of wrapping.
export function AdminSegmented<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: { id: T; label: string; count?: number }[]
  value: T
  onChange: (id: T) => void
}) {
  return (
    <div className="max-w-full overflow-x-auto [scrollbar-width:none]">
      <div role="group" aria-label={label} className="inline-flex gap-1 rounded-lg border bg-secondary p-1">
        {options.map(o => {
          const active = o.id === value
          return (
            <button
              key={o.id}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(o.id)}
              className={`inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-md px-3 py-1.5 text-sm transition-colors ${
                active
                  ? 'bg-white font-semibold text-foreground shadow-sm ring-1 ring-border'
                  : 'text-muted-foreground hover:bg-white/70 hover:text-foreground'
              }`}
            >
              {o.label}
              {o.count !== undefined && (
                <span
                  className={`min-w-6 rounded-full px-1.5 text-center text-xs font-semibold leading-5 ${
                    active ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {o.count}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
