'use client'
import { forwardRef, useEffect, useId, useImperativeHandle, useRef } from 'react'

// Square's card field (Web Payments SDK). Card numbers are typed into Square's own frame and turned into a
// one-time token; they never reach this site. Used by the cake order form and the custom cake pay page.

type Card = {
  attach: (selector: string) => Promise<void>
  tokenize: (
    verification?: Record<string, unknown>,
  ) => Promise<{ status: string; token?: string; errors?: { message: string }[] }>
  destroy: () => Promise<void>
}
type SquareWindow = Window & {
  Square?: { payments: (appId: string, locationId: string) => { card: () => Promise<Card> } }
}
export type SquareConfig = { applicationId: string; locationId: string; environment: 'production' | 'sandbox' }
export type SquareCardHandle = {
  /** Returns a one-time card token, or throws with a message for the customer. */
  tokenize: (amount: number, contact: { name: string; email: string; phone: string }) => Promise<string>
}

let loading: Promise<void> | undefined
function loadSquare(environment: SquareConfig['environment']) {
  return (loading ||= new Promise<void>((resolve, reject) => {
    if ((window as SquareWindow).Square) return resolve()
    const script = document.createElement('script')
    script.src = `https://${environment === 'production' ? '' : 'sandbox.'}web.squarecdn.com/v1/square.js`
    script.async = true
    script.nonce = document.querySelector<HTMLScriptElement>('script[nonce]')?.nonce || ''
    script.onload = () => resolve()
    script.onerror = () => {
      loading = undefined
      script.remove()
      reject(new Error('The card form could not load.'))
    }
    document.head.appendChild(script)
  }))
}

export const SquareCard = forwardRef<
  SquareCardHandle,
  { square: SquareConfig; onReady: () => void; onError: (message: string) => void }
>(function SquareCard({ square, onReady, onError }, ref) {
  const id = 'square-card-' + useId().replace(/[^a-zA-Z0-9]/g, '')
  const card = useRef<Card | null>(null)
  useImperativeHandle(ref, () => ({
    async tokenize(amount, contact) {
      if (!card.current) throw new Error('Please wait for the card form to load.')
      const [first, ...rest] = contact.name.trim().split(/\s+/)
      const result = await card.current.tokenize({
        amount: amount.toFixed(2),
        currencyCode: 'USD',
        intent: 'CHARGE',
        customerInitiated: true,
        sellerKeyedIn: false,
        billingContact: { givenName: first, familyName: rest.join(' '), email: contact.email, phone: contact.phone },
      })
      if (result.status !== 'OK' || !result.token)
        throw new Error(result.errors?.[0]?.message || 'Please check your card details.')
      return result.token
    },
  }))
  useEffect(() => {
    let active = true
    loadSquare(square.environment)
      .then(async () => {
        const created = await (window as SquareWindow).Square!.payments(square.applicationId, square.locationId).card()
        if (!active) return void created.destroy()
        await created.attach('#' + id)
        card.current = created
        onReady()
      })
      .catch(() => active && onError('The card form could not load. Refresh the page.'))
    return () => {
      active = false
      void card.current?.destroy()
      card.current = null
    }
  }, [square]) // eslint-disable-line react-hooks/exhaustive-deps
  return <div id={id} className="min-h-24" />
})
