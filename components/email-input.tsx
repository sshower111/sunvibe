'use client'

import { useId, useRef, useState, type ComponentProps } from 'react'
import { Input } from '@/components/ui/input'
import { emailSuggestions } from '@/lib/form-helpers'

// Email field with a styled suggestion list (keith@ → keith@gmail.com, keith@yahoo.com, …).
// Arrow keys + Enter, or tap, to pick. Matches the menu search suggestions.
export function EmailInput({
  value,
  onKeyDown,
  onFocus,
  onBlur,
  ...props
}: ComponentProps<'input'> & { value: string }) {
  const ref = useRef<HTMLInputElement>(null)
  const listId = useId()
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const options = open ? emailSuggestions(value) : []

  function choose(option: string) {
    const el = ref.current
    if (!el) return
    // Set the value the way typing would, so the form's own onChange runs.
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(el, option)
    el.dispatchEvent(new Event('input', { bubbles: true }))
    setOpen(false)
    setActive(-1)
  }

  return (
    <div className="relative">
      <Input
        {...props}
        ref={ref}
        type="email"
        value={value}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={options.length > 0}
        aria-controls={listId}
        aria-activedescendant={active >= 0 && options[active] ? `${listId}-${active}` : undefined}
        onInput={() => {
          setOpen(true)
          setActive(-1)
        }}
        onFocus={event => {
          setOpen(true)
          onFocus?.(event)
        }}
        onBlur={event => {
          setOpen(false)
          setActive(-1)
          onBlur?.(event)
        }}
        onKeyDown={event => {
          if (options.length) {
            if (event.key === 'ArrowDown') {
              event.preventDefault()
              setActive(i => Math.min(i + 1, options.length - 1))
            } else if (event.key === 'ArrowUp') {
              event.preventDefault()
              setActive(i => Math.max(i - 1, -1))
            } else if (event.key === 'Enter' && active >= 0) {
              event.preventDefault()
              choose(options[active])
            } else if (event.key === 'Escape') setOpen(false)
          }
          onKeyDown?.(event)
        }}
      />
      {options.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Email suggestions"
          className="absolute left-0 right-0 top-full z-40 mt-1 overflow-hidden rounded-lg border bg-popover p-1 shadow-pop"
        >
          {options.map((option, index) => {
            const at = option.indexOf('@')
            return (
              <li
                key={option}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={index === active}
                onMouseDown={event => {
                  event.preventDefault()
                  choose(option)
                }}
                onMouseEnter={() => setActive(index)}
                className={
                  'flex min-h-12 cursor-pointer items-center rounded-sm px-3 text-sm ' +
                  (index === active ? 'bg-secondary' : 'hover:bg-secondary')
                }
              >
                <span className="text-muted-foreground">{option.slice(0, at + 1)}</span>
                <span className="font-medium text-foreground">{option.slice(at + 1)}</span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
