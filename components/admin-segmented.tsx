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
      <div role="group" aria-label={label} className="inline-flex gap-0.5 rounded-[9px] bg-[var(--admin-fill)] p-0.5">
        {options.map(o => {
          const active = o.id === value
          return (
            <button
              key={o.id}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(o.id)}
              className={`admin-pressable inline-flex min-h-8 shrink-0 items-center gap-2 whitespace-nowrap rounded-[7px] px-3 py-1 text-[0.8125rem] ${
                active
                  ? 'bg-white font-semibold text-foreground shadow-[0_3px_8px_rgb(0_0_0/0.12),0_3px_1px_rgb(0_0_0/0.04)]'
                  : 'font-medium text-foreground hover:bg-white/50'
              }`}
            >
              {o.label}
              {o.count !== undefined && (
                <span
                  className={`min-w-6 rounded-full px-1.5 text-center text-xs font-semibold leading-5 ${
                    active ? 'bg-primary text-white' : 'bg-[var(--admin-fill)] text-muted-foreground'
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
