'use client'
import { forwardRef, useEffect, useId, useImperativeHandle, useRef, useState } from 'react'
import { SITE } from '@/lib/site-info'

// Square's card field (Web Payments SDK). Card numbers are typed into Square's own frame and turned into a
// one-time token; they never reach this site. Used by the cake order form and the custom cake pay page.
// With onWallet, Apple Pay and Google Pay buttons show above the card on devices that support them.
// Apple Pay also needs the domain registered in the Square Dashboard (docs/CAKE-ORDERS.md).

type TokenResult = { status: string; token?: string; errors?: { message: string }[] }
type Card = {
  attach: (selector: string) => Promise<void>
  tokenize: (verification?: Record<string, unknown>) => Promise<TokenResult>
  destroy: () => Promise<void>
}
type Wallet = {
  attach?: (selector: string, options: Record<string, string>) => Promise<void>
  tokenize: () => Promise<TokenResult>
  destroy: () => Promise<void>
}
type PaymentRequest = { update: (options: Record<string, unknown>) => void }
type Payments = {
  card: () => Promise<Card>
  paymentRequest: (options: Record<string, unknown>) => PaymentRequest
  applePay: (request: PaymentRequest) => Promise<Wallet>
  googlePay: (request: PaymentRequest) => Promise<Wallet>
}
type SquareWindow = Window & {
  Square?: { payments: (appId: string, locationId: string) => Payments }
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

const total = (amount: number) => ({ amount: amount.toFixed(2), label: SITE.name })
/** A wallet token, or an error for the customer (closing the Apple Pay or Google Pay sheet counts as cancelling). */
async function walletToken(wallet: Wallet) {
  const result = await wallet.tokenize()
  if (result.status !== 'OK' || !result.token) throw new Error(result.errors?.[0]?.message || 'Payment was cancelled.')
  return result.token
}

export const SquareCard = forwardRef<
  SquareCardHandle,
  {
    square: SquareConfig
    onReady: () => void
    onError: (message: string) => void
    /** Amount shown in the Apple Pay / Google Pay sheet. */
    amount?: number
    /**
     * A wallet button was pressed. Check the form and call tokenize straight away, before any await:
     * Apple Pay only opens from the tap itself.
     */
    onWallet?: (tokenize: () => Promise<string>) => void
    disabled?: boolean
  }
>(function SquareCard({ square, onReady, onError, amount = 0, onWallet, disabled }, ref) {
  const id = 'square-card-' + useId().replace(/[^a-zA-Z0-9]/g, '')
  const card = useRef<Card | null>(null)
  const request = useRef<PaymentRequest | null>(null)
  const [apple, setApple] = useState<Wallet | null>(null)
  const [google, setGoogle] = useState<Wallet | null>(null)
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
    const wallets: Wallet[] = []
    loadSquare(square.environment)
      .then(async () => {
        const payments = (window as SquareWindow).Square!.payments(square.applicationId, square.locationId)
        const created = await payments.card()
        if (!active) return void created.destroy()
        await created.attach('#' + id)
        card.current = created
        onReady()
        if (!onWallet) return
        // Wallets are extras: a device or browser without them just shows the card.
        request.current = payments.paymentRequest({ countryCode: 'US', currencyCode: 'USD', total: total(amount) })
        try {
          const wallet = await payments.applePay(request.current)
          wallets.push(wallet)
          if (active) setApple(wallet)
        } catch {}
        try {
          const wallet = await payments.googlePay(request.current)
          wallets.push(wallet)
          await wallet.attach!(`#${id}-google`, { buttonColor: 'black', buttonSizeMode: 'fill', buttonType: 'long' })
          if (active) setGoogle(wallet)
        } catch {}
      })
      .catch(() => active && onError('The card form could not load. Refresh the page.'))
    return () => {
      active = false
      void card.current?.destroy()
      card.current = null
      wallets.forEach(wallet => void wallet.destroy().catch(() => {}))
      setApple(null)
      setGoogle(null)
    }
  }, [square]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => request.current?.update({ total: total(amount) }), [amount])

  return (
    <div className="space-y-4">
      {onWallet && (
        <div className={apple || google ? 'space-y-3' : 'hidden'}>
          {apple && (
            <button
              type="button"
              aria-label="Pay with Apple Pay"
              disabled={disabled}
              onClick={() => onWallet(() => walletToken(apple))}
              className="apple-pay-button block h-12 w-full cursor-pointer rounded-md disabled:opacity-50"
            />
          )}
          {/* Google Pay draws its own button in here. */}
          <div
            id={`${id}-google`}
            role="presentation"
            onClick={() => google && !disabled && onWallet(() => walletToken(google))}
            className={google ? 'h-12' : 'hidden'}
          />
          <p className="flex items-center gap-3 text-sm text-muted-foreground before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">
            or pay by card
          </p>
        </div>
      )}
      <div id={id} className="min-h-24" />
    </div>
  )
})
