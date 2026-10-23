'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { SITE } from '@/lib/site-info'
import { MAX_CAKE_MESSAGE } from '@/lib/cake-inquiry'
import { storeDate } from '@/lib/occasion-dates'
import {
  cakeOrderSchema,
  cakePrice,
  decideOrder,
  formatPickupTime,
  formatVegasTime,
  ORDER_FILLINGS,
  ORDER_FLAVORS,
  ORDER_SIZES,
  pickupSlots,
  sizeLabel,
} from '@/lib/cake-order'
import { formatPhone } from '@/lib/form-helpers'
import { EmailInput } from './email-input'
import { ContactCaptcha, type CaptchaHandle } from './contact-captcha'
import { EventDatePicker } from './event-date-picker'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { NativeSelect } from './ui/select'
import { Textarea } from './ui/textarea'
import { FormAlert } from './ui/form-message'

type SquareCard = {
  attach: (selector: string) => Promise<void>
  tokenize: (
    verification?: Record<string, unknown>,
  ) => Promise<{ status: string; token?: string; errors?: { message: string }[] }>
  destroy: () => Promise<void>
}
type SquareWindow = Window & {
  Square?: { payments: (appId: string, locationId: string) => { card: () => Promise<SquareCard> } }
}
export type SquareConfig = { applicationId: string; locationId: string; environment: 'production' | 'sandbox' }

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

const money = (n: number) => '$' + n.toFixed(2)
const empty = {
  name: '',
  email: '',
  phone: '',
  size: '8-inch',
  flavor: '',
  filling: '',
  cakeMessage: '',
  pickupDate: '',
  pickupTime: '',
  notes: '',
}

export function CakeOrderForm({ square }: { square: SquareConfig }) {
  const [data, setData] = useState(empty)
  const [now, setNow] = useState(() => new Date())
  const [cardReady, setCardReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState<{ held: boolean; ref: string; approveBy?: string; receiptUrl?: string } | null>(null)
  const card = useRef<SquareCard | null>(null)
  const captcha = useRef<CaptchaHandle>(null)
  const requestId = useRef('')
  const update = (key: keyof typeof empty, value: string) => setData(d => ({ ...d, [key]: value }))

  // Pickup times depend on the current time; refresh them every minute.
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(timer)
  }, [])
  useEffect(() => {
    let active = true
    loadSquare(square.environment)
      .then(async () => {
        const payments = (window as SquareWindow).Square!.payments(square.applicationId, square.locationId)
        const created = await payments.card()
        if (!active) return void created.destroy()
        await created.attach('#cake-card')
        card.current = created
        setCardReady(true)
      })
      .catch(() => active && setError(`The card form could not load. Refresh the page or call ${SITE.phone}.`))
    return () => {
      active = false
      void card.current?.destroy()
      card.current = null
    }
  }, [square])

  const today = storeDate(now)
  const slots = useMemo(() => (data.pickupDate ? pickupSlots(data.pickupDate, now) : []), [data.pickupDate, now])
  const price = data.filling ? cakePrice(data.size, data.filling) : null
  const decision =
    data.pickupDate && data.pickupTime ? decideOrder(data.size, data.pickupDate, data.pickupTime, now) : null
  const held = !!(decision?.ok && decision.needsApproval)
  useEffect(() => {
    if (data.pickupTime && !slots.includes(data.pickupTime)) update('pickupTime', '')
  }, [slots]) // eslint-disable-line react-hooks/exhaustive-deps

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (busy) return
    setError('')
    requestId.current ||= crypto.randomUUID()
    const checked = cakeOrderSchema.safeParse({ ...data, requestId: requestId.current })
    if (!checked.success) return setError(checked.error.issues[0].message)
    if (decision && !decision.ok) return setError(decision.error)
    if (!card.current || price === null) return setError('Please wait for the card form to load.')
    setBusy(true)
    try {
      const [first, ...rest] = data.name.trim().split(/\s+/)
      const result = await card.current.tokenize({
        amount: price.toFixed(2),
        currencyCode: 'USD',
        intent: 'CHARGE',
        customerInitiated: true,
        sellerKeyedIn: false,
        billingContact: { givenName: first, familyName: rest.join(' '), email: data.email, phone: data.phone },
      })
      if (result.status !== 'OK' || !result.token)
        throw new Error(result.errors?.[0]?.message || 'Please check your card details.')
      const captchaToken = await captcha.current?.verify()
      if (!captchaToken) throw new Error('Please try verification again.')
      const response = await fetch('/api/cake-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...checked.data, cardToken: result.token, captchaToken }),
      })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(body.error || `Please try again or call ${SITE.phone}.`)
      setDone(body)
      window.scrollTo({ top: 0 })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Please try again.')
    } finally {
      setBusy(false)
    }
  }

  if (done)
    return (
      <div className="space-y-4 rounded-xl border bg-card card-pad">
        <h2 className="heading-2">{done.held ? 'Order received' : 'Order confirmed'}</h2>
        {done.held ? (
          <p>
            Your order {done.ref} needs a quick check from us. Your card has a hold for {price !== null && money(price)}{' '}
            but has not been charged. We'll email you by {done.approveBy && formatVegasTime(done.approveBy)} (Las Vegas
            time). If we can't make it, the hold is released.
          </p>
        ) : (
          <p>Thank you! Your order {done.ref} is paid. We've emailed your confirmation.</p>
        )}
        {done.receiptUrl && !done.held && (
          <a
            href={done.receiptUrl}
            className="inline-flex min-h-12 items-center font-semibold text-primary underline"
            target="_blank"
            rel="noreferrer"
          >
            View your receipt
          </a>
        )}
        <p className="text-sm text-muted-foreground">
          Pickup at {SITE.address}. Questions? Call {SITE.phone}.
        </p>
      </div>
    )

  const field = 'mb-1 block text-sm font-semibold'
  return (
    <form onSubmit={submit} className="space-y-8" noValidate>
      <fieldset className="space-y-4">
        <legend className="heading-3 mb-2">1. Your cake</legend>
        <div>
          <label htmlFor="order-size" className={field}>
            Size
          </label>
          <NativeSelect id="order-size" value={data.size} onChange={e => update('size', e.target.value)}>
            {ORDER_SIZES.map(size => (
              <option key={size} value={size}>
                {sizeLabel(size)}
              </option>
            ))}
          </NativeSelect>
          <p className="mt-2 text-sm text-muted-foreground">
            Not sure which size? See how many people each size serves in{' '}
            <a href="/custom-cakes#serving-guide" target="_blank" className="font-semibold text-primary underline">
              Sizes &amp; prices
            </a>
            .
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="order-flavor" className={field}>
              Cake flavor
            </label>
            <NativeSelect id="order-flavor" value={data.flavor} onChange={e => update('flavor', e.target.value)}>
              <option value="">Choose…</option>
              {ORDER_FLAVORS.map(f => (
                <option key={f}>{f}</option>
              ))}
            </NativeSelect>
          </div>
          <div>
            <label htmlFor="order-filling" className={field}>
              Filling
            </label>
            <NativeSelect id="order-filling" value={data.filling} onChange={e => update('filling', e.target.value)}>
              <option value="">Choose…</option>
              {ORDER_FILLINGS.map(f => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </NativeSelect>
          </div>
        </div>
        <div>
          <label htmlFor="order-message" className={field}>
            Writing on the cake (optional)
          </label>
          <Input
            id="order-message"
            maxLength={MAX_CAKE_MESSAGE}
            value={data.cakeMessage}
            onChange={e => update('cakeMessage', e.target.value)}
            placeholder="Happy Birthday Amy"
          />
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="heading-3 mb-2">2. Pickup</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="order-date" className={field}>
              Pickup date
            </label>
            <EventDatePicker
              id="order-date"
              value={data.pickupDate}
              minDate={today}
              onChange={value => update('pickupDate', value)}
            />
          </div>
          <div>
            <label htmlFor="order-time" className={field}>
              Pickup time
            </label>
            <NativeSelect
              id="order-time"
              value={data.pickupTime}
              disabled={!data.pickupDate || !slots.length}
              onChange={e => update('pickupTime', e.target.value)}
            >
              <option value="">
                {data.pickupDate && !slots.length ? 'No times left — pick another day' : 'Choose…'}
              </option>
              {slots.map(t => (
                <option key={t} value={t}>
                  {formatPickupTime(t)}
                </option>
              ))}
            </NativeSelect>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Pickup only, at {SITE.address}. Same-day orders need at least {3} hours' notice.
        </p>
        {held && decision?.ok && decision.needsApproval && (
          <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            {decision.reason === 'Same-day order' ? 'Same-day orders' : 'Next-day orders for this size'} need a quick
            check from us. Your card will be held, not charged, and we'll confirm by{' '}
            {formatVegasTime(decision.approveBy.toISOString())}. If we can't make it, the hold is released.
          </p>
        )}
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="heading-3 mb-2">3. Your details</legend>
        <div>
          <label htmlFor="order-name" className={field}>
            Name
          </label>
          <Input id="order-name" autoComplete="name" value={data.name} onChange={e => update('name', e.target.value)} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="order-phone" className={field}>
              Phone
            </label>
            <Input
              id="order-phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              maxLength={14}
              placeholder="(702) 555-0123"
              value={data.phone}
              onChange={e => update('phone', formatPhone(e.target.value))}
            />
          </div>
          <div>
            <label htmlFor="order-email" className={field}>
              Email
            </label>
            <EmailInput
              id="order-email"
              type="email"
              autoComplete="email"
              maxLength={100}
              placeholder="you@example.com"
              value={data.email}
              onChange={e => update('email', e.target.value)}
            />
          </div>
        </div>
        <div>
          <label htmlFor="order-notes" className={field}>
            Notes (optional)
          </label>
          <Textarea
            id="order-notes"
            rows={2}
            maxLength={500}
            value={data.notes}
            onChange={e => update('notes', e.target.value)}
          />
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="heading-3 mb-2">4. Payment</legend>
        <div id="cake-card" className="min-h-24" />
        {!cardReady && !error && <p className="text-sm text-muted-foreground">Loading secure card form…</p>}
        <ContactCaptcha ref={captcha} action="cake_order" />
        {error && <FormAlert type="error">{error}</FormAlert>}
        <Button type="submit" className="w-full sm:w-auto" disabled={busy || !cardReady}>
          {busy
            ? 'Processing…'
            : price === null
              ? 'Place order'
              : held
                ? `Place order (hold ${money(price)})`
                : `Pay ${money(price)}`}
        </Button>
        <p className="text-xs text-muted-foreground">
          Card details go straight to Square, our payment processor; we never see your card number.
        </p>
      </fieldset>
    </form>
  )
}
