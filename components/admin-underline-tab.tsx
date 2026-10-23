import type { ButtonHTMLAttributes } from 'react'

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> & {
  active: boolean
  size?: 'md' | 'sm'
}

// Text tab with an underline: a faint underline grows in on hover, a solid one marks the active tab.
export function UnderlineTab({ active, size = 'md', className = '', ...props }: Props) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={`relative shrink-0 font-medium transition-colors after:absolute after:bottom-0 after:h-0.5 after:origin-center after:rounded-full after:bg-primary after:transition-transform after:duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset ${
        size === 'md' ? 'px-3 py-3 text-sm after:inset-x-3' : 'px-2 py-2 text-sm after:inset-x-2'
      } ${
        active
          ? 'text-primary after:scale-x-100'
          : 'text-muted-foreground after:scale-x-0 after:opacity-40 hover:text-foreground hover:after:scale-x-100'
      } ${className}`}
      {...props}
    />
  )
}
