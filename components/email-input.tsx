'use client'

import { useLayoutEffect, useRef, useState, type ComponentProps } from 'react'
import { Input } from '@/components/ui/input'
import { emailCompletion } from '@/lib/form-helpers'

// Email field with inline domain completion: typing "keith@g" shows a grey "mail.com" after the text.
// Tab, the right arrow (at the end), or tapping the grey text accepts it.
export function EmailInput({ value, onKeyDown, ...props }: ComponentProps<'input'> & { value: string }) {
  const ref = useRef<HTMLInputElement>(null)
  const [mirror, setMirror] = useState<React.CSSProperties>({})
  const [fits, setFits] = useState(true)
  const suffix = emailCompletion(value)

  // Copy the input's padding and font so the grey text lines up exactly after what was typed.
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const css = getComputedStyle(el)
    setMirror({
      paddingLeft: `calc(${css.paddingLeft} + ${css.borderLeftWidth})`,
      font: css.font,
      letterSpacing: css.letterSpacing,
    })
  }, [])
  useLayoutEffect(() => {
    const el = ref.current
    if (el) setFits(el.scrollWidth <= el.clientWidth)
  }, [value])

  function accept() {
    const el = ref.current
    if (!el || !suffix) return
    // Set the value the way typing would, so the form's own onChange runs.
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(el, value + suffix)
    el.dispatchEvent(new Event('input', { bubbles: true }))
    el.focus()
  }

  return (
    <div className="relative">
      <Input
        {...props}
        ref={ref}
        type="email"
        value={value}
        onKeyDown={event => {
          // Email inputs don't expose the caret position (selectionStart is null), so null counts as "at the end".
          const caret = event.currentTarget.selectionStart
          const atEnd = caret === null || caret === value.length
          if (suffix && atEnd && ((event.key === 'Tab' && !event.shiftKey) || event.key === 'ArrowRight')) {
            event.preventDefault()
            accept()
          }
          onKeyDown?.(event)
        }}
      />
      {suffix && fits && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 flex items-center whitespace-pre"
          style={mirror}
        >
          <span className="invisible">{value}</span>
          <span
            className="pointer-events-auto cursor-pointer text-muted-foreground/60"
            onMouseDown={event => {
              event.preventDefault()
              accept()
            }}
          >
            {suffix}
          </span>
        </div>
      )}
    </div>
  )
}
