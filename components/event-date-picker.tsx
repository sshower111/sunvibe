'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

// Calendar for the cake event date. Phone browsers (iPhone Safari in particular) ignore `min` on
// <input type="date">, so a native picker still lets people pick past dates. Here, days before
// `minDate` (3 days out, Las Vegas time) can't be chosen at all. Dates are 'YYYY-MM-DD' strings.
const weekdays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const MONTHS_AHEAD = 12

const toDate = (value: string) => new Date(value + 'T12:00:00Z')
const toValue = (date: Date) => date.toISOString().slice(0, 10)
const monthStart = (value: string) => value.slice(0, 7) + '-01'
const addMonths = (value: string, count: number) => {
  const date = toDate(monthStart(value))
  date.setUTCMonth(date.getUTCMonth() + count)
  return toValue(date)
}
const format = (value: string, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', ...options }).format(toDate(value))

export function formatEventDate(value: string) {
  return format(value, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
}

type Props = {
  id: string
  value: string
  minDate: string
  onChange: (value: string) => void
  invalid?: boolean
  describedBy?: string
}

export function EventDatePicker({ id, value, minDate, onChange, invalid, describedBy }: Props) {
  const [open, setOpen] = useState(false)
  const first = monthStart(minDate)
  const last = addMonths(minDate, MONTHS_AHEAD)
  const [month, setMonth] = useState(() => monthStart(value && value >= minDate ? value : minDate))

  const start = toDate(month)
  const blanks = start.getUTCDay()
  const days = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0)).getUTCDate()
  const cells = Array.from({ length: days }, (_, i) => month.slice(0, 8) + String(i + 1).padStart(2, '0'))

  return (
    <>
      <button
        type="button"
        id={id}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        aria-haspopup="dialog"
        onClick={() => {
          setMonth(monthStart(value && value >= minDate ? value : minDate))
          setOpen(true)
        }}
        className="form-control flex items-center justify-between gap-3 text-left"
      >
        <span className={value ? '' : 'text-muted-foreground'}>{value ? formatEventDate(value) : 'Choose a date'}</span>
        <CalendarDays aria-hidden="true" className="h-5 w-5 shrink-0 text-muted-foreground" />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-white p-4 sm:max-w-sm sm:p-6">
          <DialogTitle className="pr-12 text-lg font-semibold">Event date</DialogTitle>
          <DialogDescription className="-mt-2 text-sm text-muted-foreground">
            Earliest available: {formatEventDate(minDate)}
          </DialogDescription>
          <div className="flex items-center justify-between">
            <button
              type="button"
              aria-label="Previous month"
              disabled={month <= first}
              onClick={() => setMonth(addMonths(month, -1))}
              className="flex h-11 w-11 items-center justify-center rounded-full text-primary hover:bg-secondary disabled:opacity-30"
            >
              <ChevronLeft aria-hidden="true" className="h-5 w-5" />
            </button>
            <p aria-live="polite" className="font-semibold">
              {format(month, { month: 'long', year: 'numeric' })}
            </p>
            <button
              type="button"
              aria-label="Next month"
              disabled={month >= monthStart(last)}
              onClick={() => setMonth(addMonths(month, 1))}
              className="flex h-11 w-11 items-center justify-center rounded-full text-primary hover:bg-secondary disabled:opacity-30"
            >
              <ChevronRight aria-hidden="true" className="h-5 w-5" />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center">
            {weekdays.map(day => (
              <span key={day} aria-hidden="true" className="py-1 text-xs font-semibold text-muted-foreground">
                {day}
              </span>
            ))}
            {Array.from({ length: blanks }, (_, i) => (
              <span key={'blank' + i} />
            ))}
            {cells.map(day => {
              const blocked = day < minDate || day > last
              const chosen = day === value
              return (
                <button
                  key={day}
                  type="button"
                  disabled={blocked}
                  aria-pressed={chosen}
                  aria-label={formatEventDate(day) + (blocked ? ' (not available)' : '')}
                  onClick={() => {
                    onChange(day)
                    setOpen(false)
                  }}
                  className={cn(
                    'flex aspect-square min-h-10 items-center justify-center rounded-full text-sm',
                    blocked && 'cursor-not-allowed text-muted-foreground/50 line-through',
                    !blocked && !chosen && 'font-medium hover:bg-secondary',
                    chosen && 'bg-primary font-semibold text-primary-foreground',
                  )}
                >
                  {Number(day.slice(8))}
                </button>
              )
            })}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
