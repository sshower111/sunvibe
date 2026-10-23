'use client'
import { useRef, useState } from 'react'
import { SITE } from '@/lib/site-info'
import { SquareCard, type SquareCardHandle, type SquareConfig } from './square-card'
import { Button } from './ui/button'
import { FormAlert } from './ui/form-message'

// Card payment for a custom cake pay link (/pay/<id>).
export function PayForm({
  id,
  amount,
  contact,
  square,
  noCard,
}: {
  id: string
  amount: number
  contact: { name: string; email: string; phone: string }
  square: SquareConfig
  /** Test order on the live site: paid with a button, no card. */
  noCard: boolean
}) {
  const card = useRef<SquareCardHandle>(null)
  const [ready, setReady] = useState(noCard)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState<{ ref: string; receiptUrl?: string } | null>(null)

  async function pay() {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      const cardToken = noCard ? undefined : await card.current!.tokenize(amount, contact)
      const response = await fetch(`/api/pay/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardToken }),
      })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(body.error || `Please try again or call ${SITE.phone}.`)
      setDone(body)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Please try again.')
    } finally {
      setBusy(false)
    }
  }

  if (done)
    return (
      <div className="space-y-3 rounded-md border border-success/25 bg-success-tint p-4 text-success">
        <p className="font-semibold">Payment received — thank you! Your cake {done.ref} is booked.</p>
        <p className="text-sm">We've emailed your receipt.</p>
        {done.receiptUrl && (
          <a href={done.receiptUrl} target="_blank" rel="noreferrer" className="text-sm font-semibold underline">
            View your receipt
          </a>
        )}
      </div>
    )
  return (
    <div className="space-y-4">
      {noCard ? (
        <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          Test order: no card is needed and nothing is charged.
        </p>
      ) : (
        <SquareCard
          ref={card}
          square={square}
          onReady={() => setReady(true)}
          onError={message => setError(`${message} Or call ${SITE.phone}.`)}
        />
      )}
      {error && <FormAlert type="error">{error}</FormAlert>}
      <Button className="w-full sm:w-auto" disabled={busy || !ready} onClick={pay}>
        {busy ? 'Processing…' : `Pay $${amount.toFixed(2)}`}
      </Button>
      <p className="text-xs text-muted-foreground">
        Card details go straight to Square, our payment processor; we never see your card number.
      </p>
    </div>
  )
}
