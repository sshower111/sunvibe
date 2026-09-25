"use client"
import { useEffect, useState } from 'react'
import { addDays } from '@/lib/occasion-dates'
// The inclusive cutoff closes at midnight at the start of the following LA day.
export function cutoffInstant(date: string) {
  const target = Date.parse(addDays(date, 1) + 'T00:00:00Z')
  let candidate = target
  const formatter = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' })
  for (let i = 0; i < 3; i++) {
    const parts = formatter.formatToParts(new Date(candidate))
    const part = (name: string) => Number(parts.find(p => p.type === name)!.value)
    const represented = Date.UTC(part('year'), part('month') - 1, part('day'), part('hour'), part('minute'), part('second'))
    candidate += target - represented
  }
  return candidate
}
export function OccasionCountdown({ date }: { date: string }) {
  const [minutes, setMinutes] = useState<number | null>(null)
  useEffect(() => {
    const update = () => setMinutes(Math.max(0, Math.ceil((cutoffInstant(date) - Date.now()) / 60000)))
    update(); const timer = setInterval(update, 60000)
    return () => clearInterval(timer)
  }, [date])
  return <span className="inline-flex min-h-11 items-center rounded-full border border-primary-foreground/40 bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">{minutes === null ? 'Order by ' + date : minutes === 0 ? 'Pre-orders are closed' : 'Orders close in ' + Math.floor(minutes / 60) + 'h ' + minutes % 60 + 'm'}</span>
}
