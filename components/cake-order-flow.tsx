'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { SITE } from '@/lib/site-info'
import { cn } from '@/lib/utils'
import { addDays, storeDate } from '@/lib/occasion-dates'
import { cakeCatalog, findCake } from '@/lib/cake-catalog'
import { MAX_CAKE_MESSAGE } from '@/lib/cake-inquiry'
import {
  cakePrice,
  decideOrder,
  formatPickupTime,
  formatVegasTime,
  CONFIRM_BADGE,
  INSTANT_NOTICE_HOURS,
  isInstantCake,
  ORDER_FILLINGS,
  ORDER_FLAVORS,
  ORDER_SIZES,
  pickupSlots,
} from '@/lib/cake-order'
import { formatPhone } from '@/lib/form-helpers'
import { ContactCaptcha, type CaptchaHandle } from '@/components/contact-captcha'
import { EmailInput } from '@/components/email-input'
import { EventDatePicker, formatEventDate } from '@/components/event-date-picker'
import { SquareCard, type SquareCardHandle, type SquareConfig } from '@/components/square-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/select'
import { FormAlert } from '@/components/ui/form-message'
import { CakePreview, filling as fillingColor, sponge as spongeColor } from '@/components/cake-preview'

// Checkout for menu cakes (/order-cake, from the menu's Cakes chip; ?size= preselects a size). The 8" display cake is charged when ordered; every other
// size is held on the card until the kitchen confirms (lib/cake-order.ts). Custom designs go to /custom-cakes.

const steps = ['Cake', 'Pickup', 'Pay'] as const
const PAY = 2
const money = (n: number) => '$' + (Number.isInteger(n) ? n : n.toFixed(2))
const sizes = cakeCatalog.filter(cake => (ORDER_SIZES as readonly string[]).includes(cake.value))
// Round cakes and sheet cakes are chosen from their own rows.
const sizeGroups = [
  { title: 'Round cakes', cols: 'sm:grid-cols-4', items: sizes.filter(cake => cake.category === 'Round') },
  { title: 'Sheet cakes', cols: 'grid-cols-3', items: sizes.filter(cake => cake.category === 'Sheet') },
]
/** Phones and tablets: the one-column layout (the cake drawing beside the steps starts at lg). */
const narrow = () => window.matchMedia('(max-width: 1023px)').matches

const empty = {
  size: '',
  flavor: '',
  filling: '',
  cakeMessage: '',
  date: '',
  time: '',
  name: '',
  email: '',
  phone: '',
}
type Data = typeof empty

/** Lead time for the chosen size: express pickup (8"), or the kitchen confirms first. */
function CakeLeadBadge({ size }: { size: string }) {
  const instant = isInstantCake(size)
  return (
    <span
      className={cn(
        'inline-flex w-fit items-center rounded-full px-3 py-1 text-left text-xs font-semibold',
        instant ? 'border border-subtle bg-base text-ink' : 'bg-primary/10 text-primary',
      )}
    >
      {instant ? `${INSTANT_NOTICE_HOURS}-Hour Express Pickup` : CONFIRM_BADGE}
    </span>
  )
}

/** A large tap tile. */
function Choice({
  selected,
  onClick,
  title,
  sub,
  dot,
}: {
  selected: boolean
  onClick: () => void
  title: string
  sub?: string
  /** The food's own color, shown as a small dot before the title. */
  dot?: string
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        'flex min-h-16 w-full cursor-pointer flex-col items-center justify-center rounded-xl border border-subtle bg-base px-3 py-3 text-center transition-colors hover:border-input hover:bg-surface',
        selected && 'border-primary bg-primary text-primary-foreground hover:border-primary hover:bg-primary',
      )}
    >
      <span className="flex items-center gap-2 font-semibold sm:text-lg">
        {dot && (
          <span
            aria-hidden="true"
            style={{ backgroundColor: dot }}
            className={cn('size-2.5 shrink-0 rounded-full ring-1', selected ? 'ring-white/70' : 'ring-ink/15')}
          />
        )}
        {title}
      </span>
      {sub && (
        <span className={cn('mt-1 text-sm', selected ? 'text-primary-foreground/85' : 'text-muted-foreground')}>
          {sub}
        </span>
      )}
    </button>
  )
}

function Pills({
  name,
  legend,
  options,
  value,
  onChange,
  colors,
}: {
  name: string
  legend: string
  options: readonly string[]
  value: string
  onChange: (value: string) => void
  colors: Record<string, string>
}) {
  return (
    <fieldset id={name}>
      <legend className="mb-3 text-sm font-semibold">{legend}</legend>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {options.map(option => (
          <Choice
            key={option}
            title={option}
            dot={colors[option]}
            selected={value === option}
            onClick={() => onChange(option)}
          />
        ))}
      </div>
    </fieldset>
  )
}

export function CakeOrderFlow({ square, initialSize = '' }: { square: SquareConfig | null; initialSize?: string }) {
  const [data, setData] = useState<Data>(() => ({
    ...empty,
    size: (ORDER_SIZES as readonly string[]).includes(initialSize) ? initialSize : '',
  }))
  const [step, setStep] = useState(0)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [cardReady, setCardReady] = useState(false)
  const [now, setNow] = useState(() => new Date())
  const [done, setDone] = useState<{ held: boolean; ref: string; approveBy?: string; receiptUrl?: string } | null>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const top = useRef<HTMLDivElement>(null)
  const card = useRef<SquareCardHandle>(null)
  const captcha = useRef<CaptchaHandle>(null)
  const requestId = useRef('')

  // Pickup times depend on the current time.
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(timer)
  }, [])

  const set = <K extends keyof Data>(key: K, value: Data[K]) => {
    setData(d => ({ ...d, [key]: value }))
    setError('')
    requestId.current = ''
  }
  const go = (next: number) => {
    if (next !== PAY) setCardReady(false)
    setStep(next)
    setError('')
    requestAnimationFrame(() => {
      heading.current?.focus({ preventScroll: true })
      const box = top.current?.getBoundingClientRect()
      if (box && (box.top < 0 || (narrow() && box.top > 1))) top.current?.scrollIntoView({ block: 'start' })
    })
  }
  // Phones and tablets: after an answer, bring the next question into view.
  const reveal = (id: string) =>
    requestAnimationFrame(() => {
      const target = document.getElementById(id)
      if (!narrow() || !target) return
      const cover = (document.querySelector('header')?.getBoundingClientRect().bottom ?? 0) + 12
      const box = target.getBoundingClientRect()
      if (box.top >= cover && box.bottom <= window.innerHeight - 96) return
      window.scrollBy({ top: box.top - cover, behavior: 'smooth' })
    })

  const cake = findCake(data.size)
  const instant = isInstantCake(data.size)
  const price = data.size && data.filling ? cakePrice(data.size, data.filling) : null
  // The first day with a pickup time for this size (none left today after the last slot).
  const minDate = useMemo(() => {
    const today = storeDate(now)
    const days = [0, 1, 2].map(n => addDays(today, n))
    return (data.size && days.find(day => pickupSlots(day, data.size, now).length)) || today
  }, [data.size, now])
  const slots = useMemo(
    () => (data.date && data.size ? pickupSlots(data.date, data.size, now) : []),
    [data.date, data.size, now],
  )
  const decision = data.date && data.time ? decideOrder(data.size, data.date, data.time, now) : null
  const held = !!(decision?.ok && decision.needsApproval)
  // A size change can make the chosen pickup time too soon.
  useEffect(() => {
    if (data.date && data.date < minDate) setData(d => ({ ...d, date: '', time: '' }))
    else if (data.time && !slots.includes(data.time)) setData(d => ({ ...d, time: '' }))
  }, [minDate, slots]) // eslint-disable-line react-hooks/exhaustive-deps

  function check(): string {
    if (step === 0) {
      if (!data.size) return 'Choose a size.'
      if (!data.flavor) return 'Choose a flavor.'
      if (!data.filling) return 'Choose a filling.'
    }
    if (step === 1) {
      if (!data.date) return 'Choose a pickup date.'
      if (!data.time) return 'Choose a pickup time.'
      if (decision && !decision.ok) return decision.error
    }
    if (step === PAY) {
      if (!data.name.trim()) return 'Enter your name.'
      if (data.phone.replace(/\D/g, '').length < 10) return 'Enter your phone number.'
      if (!/^\S+@\S+\.\S+$/.test(data.email.trim())) return 'Enter a valid email address.'
    }
    return ''
  }
  function next(event: React.FormEvent) {
    event.preventDefault()
    const problem = check()
    if (problem) return setError(problem)
    if (step < PAY) go(step + 1)
    else void submit()
  }

  /** wallet: Apple Pay or Google Pay instead of the card; it must be called before the first await. */
  async function submit(wallet?: () => Promise<string>) {
    if (busy) return
    setBusy(true)
    setError('')
    requestId.current ||= crypto.randomUUID()
    try {
      if (price === null || (!wallet && (!card.current || !cardReady)))
        throw new Error('Please wait for the card form to load.')
      const cardToken = await (wallet ? wallet() : card.current!.tokenize(price, data))
      const captchaToken = await captcha.current?.verify()
      if (!captchaToken) throw new Error('Please try verification again.')
      const response = await fetch('/api/cake-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: requestId.current,
          name: data.name,
          email: data.email,
          phone: data.phone,
          size: data.size,
          flavor: data.flavor,
          filling: data.filling,
          cakeMessage: data.cakeMessage,
          pickupDate: data.date,
          pickupTime: data.time,
          notes: '',
          cardToken,
          captchaToken,
        }),
      })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(body.error || `Please try again or call ${SITE.phone}.`)
      setDone(body)
      requestAnimationFrame(() => top.current?.scrollIntoView({ block: 'start' }))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Please try again.')
    } finally {
      setBusy(false)
    }
  }

  if (!square)
    return (
      <div className="mx-auto max-w-2xl space-y-3 rounded-lg border bg-card card-pad">
        <h2 className="heading-2">Online cake orders are coming soon</h2>
        <p>
          Call{' '}
          <a href={SITE.phoneHref} className="font-semibold text-primary underline">
            {SITE.phone}
          </a>{' '}
          to order a cake.
        </p>
      </div>
    )

  if (done)
    return (
      <div ref={top} role="status" className="mx-auto max-w-2xl space-y-4 rounded-lg border bg-card card-pad">
        <h2 className="heading-2">{done.held ? 'Order received' : 'Order confirmed'}</h2>
        {done.held ? (
          <p>
            Your order {done.ref} needs a quick check from our kitchen. Your card has a hold for{' '}
            {price !== null && money(price)} but has not been charged. We’ll email you by{' '}
            {done.approveBy && formatVegasTime(done.approveBy)} (Las Vegas time).
          </p>
        ) : (
          <p>Thank you! Your order {done.ref} is paid. We’ve emailed your confirmation.</p>
        )}
        {done.receiptUrl && !done.held && (
          <a href={done.receiptUrl} target="_blank" rel="noreferrer" className="font-semibold text-primary underline">
            View your receipt
          </a>
        )}
        <p className="text-sm text-muted-foreground">Pickup at {SITE.address}.</p>
        <p className="text-sm text-muted-foreground">
          Questions? Call{' '}
          <a href={SITE.phoneHref} className="text-primary underline">
            {SITE.phone}
          </a>
          .
        </p>
      </div>
    )

  const label = 'mb-2 block text-sm font-semibold'
  const summary: [string, string][] = [
    ['Cake', cake?.label ?? ''],
    ['Flavor', data.flavor && data.filling ? `${data.flavor} · ${data.filling} filling` : ''],
    ['Writing', data.cakeMessage],
    ['Pickup', data.date && data.time ? `${formatEventDate(data.date)} · ${formatPickupTime(data.time)}` : ''],
  ]
  const preview = (
    <CakePreview
      size={data.size}
      flavor={data.flavor}
      fillingName={data.filling}
      design="simple"
      message={data.cakeMessage}
      className="h-auto w-full"
    />
  )

  return (
    <div ref={top} className="mx-auto grid max-w-6xl items-start gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
      {/* Wide screens: the cake stays in view beside the questions. */}
      <aside
        aria-label="Your cake"
        className="card-surface sticky top-[calc(var(--header-height)+1.5rem)] order-last hidden p-6 lg:block"
      >
        <p className="heading-3">Your cake</p>
        <div className="mt-4">{preview}</div>
        {cake && (
          <>
            <p className="mt-3 text-sm text-ink-muted">
              {cake.label} · serves {cake.servings}
            </p>
            {price !== null && <p className="price mt-2 text-2xl text-primary">{money(price)}</p>}
          </>
        )}
      </aside>
      <form onSubmit={next} noValidate aria-busy={busy} className="relative min-w-0 sm:card-surface sm:card-pad">
        <ol aria-label="Progress" className="mb-4 grid grid-cols-3 gap-2 sm:mb-6">
          {steps.map((name, index) => (
            <li
              key={name}
              aria-current={step === index ? 'step' : undefined}
              className={cn('border-t-4 pt-3 transition-colors', index <= step ? 'border-primary' : 'border-border')}
            >
              <span
                className={cn('block text-xs font-semibold', index <= step ? 'text-primary' : 'text-muted-foreground')}
              >
                {index + 1}
              </span>
              <span
                className={cn(
                  'mt-1 block text-xs sm:text-sm',
                  step === index ? 'font-semibold' : 'text-muted-foreground',
                )}
              >
                {name}
              </span>
            </li>
          ))}
        </ol>
        {step > 0 && (
          <button
            type="button"
            onClick={() => go(step - 1)}
            className="mb-2 inline-flex min-h-11 cursor-pointer items-center text-sm font-semibold text-muted-foreground hover:text-foreground"
          >
            ← Back
          </button>
        )}
        <h2
          ref={heading}
          tabIndex={-1}
          className="mb-6 text-center font-serif text-[clamp(1.75rem,4vw,2.75rem)] leading-tight text-primary focus:outline-none sm:mb-8"
        >
          {['Your cake', 'Pickup', 'Your details & payment'][step]}
        </h2>

        <fieldset disabled={busy} className="mx-auto min-w-0 max-w-3xl space-y-6">
          <legend className="sr-only">{steps[step]}</legend>

          {step === 0 && (
            <>
              <fieldset id="flow-size">
                <legend className="mb-3 text-sm font-semibold">Size</legend>
                <div className="space-y-4">
                  {sizeGroups.map(group => (
                    <div key={group.title} role="group" aria-label={group.title}>
                      <p className="mb-2 text-xs font-medium text-muted-foreground">{group.title}</p>
                      <div className={cn('grid grid-cols-2 gap-3', group.cols)}>
                        {group.items.map(item => (
                          <Choice
                            key={item.value}
                            title={item.label.replace(' round', '')}
                            sub={`Serves ${item.servings}`}
                            selected={data.size === item.value}
                            onClick={() => {
                              set('size', item.value)
                              reveal('flow-flavor')
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                {data.size && (
                  <div className="mt-3">
                    <CakeLeadBadge size={data.size} />
                  </div>
                )}
              </fieldset>
              {/* Phones and tablets: the cake as it is chosen. */}
              {cake && <div className="mx-auto max-w-56 rounded-lg bg-surface p-4 lg:hidden">{preview}</div>}
              <Pills
                name="flow-flavor"
                legend="Cake flavor"
                options={ORDER_FLAVORS}
                colors={spongeColor}
                value={data.flavor}
                onChange={value => {
                  set('flavor', value)
                  reveal('flow-filling')
                }}
              />
              <Pills
                name="flow-filling"
                legend="Filling"
                options={ORDER_FILLINGS}
                colors={fillingColor}
                value={data.filling}
                onChange={value => {
                  set('filling', value)
                  reveal('flow-writing')
                }}
              />
              <div id="flow-writing">
                <label htmlFor="flow-message" className={label}>
                  Writing on the cake (optional)
                </label>
                <Input
                  id="flow-message"
                  maxLength={MAX_CAKE_MESSAGE}
                  autoComplete="off"
                  placeholder="Happy Birthday Amy"
                  value={data.cakeMessage}
                  onChange={e => set('cakeMessage', e.target.value)}
                />
              </div>
              <p className="text-center text-sm">
                <Link href="/custom-cakes" className="font-semibold text-primary underline underline-offset-4">
                  Custom design or tiers? Request a quote
                </Link>
              </p>
            </>
          )}

          {step === 1 && (
            <>
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="flow-date" className={label}>
                    Date
                  </label>
                  <EventDatePicker
                    id="flow-date"
                    value={data.date}
                    minDate={minDate}
                    onChange={value => set('date', value)}
                  />
                </div>
                <div>
                  <label htmlFor="flow-time" className={label}>
                    Time
                  </label>
                  <NativeSelect
                    id="flow-time"
                    value={data.time}
                    disabled={!data.date || !slots.length}
                    onChange={e => set('time', e.target.value)}
                  >
                    <option value="">
                      {data.date && !slots.length ? 'No times left, pick another day' : 'Choose…'}
                    </option>
                    {slots.map(t => (
                      <option key={t} value={t}>
                        {formatPickupTime(t)}
                      </option>
                    ))}
                  </NativeSelect>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{SITE.address}</p>
              {held && decision?.ok && decision.needsApproval && (
                <p className="rounded-md bg-surface px-4 py-3 text-sm">
                  Our kitchen confirms this cake by {formatVegasTime(decision.approveBy.toISOString())}. Your card is
                  held until then, not charged.
                </p>
              )}
            </>
          )}

          {step === PAY && (
            <>
              <dl className="divide-y rounded-lg border">
                {summary
                  .filter(([, value]) => value)
                  .map(([name, value]) => (
                    <div key={name} className="flex items-center justify-between gap-4 px-4 py-2">
                      <div className="min-w-0 py-1">
                        <dt className="text-sm text-muted-foreground">{name}</dt>
                        <dd className="font-semibold">{value}</dd>
                      </div>
                      <button
                        type="button"
                        onClick={() => go(name === 'Pickup' ? 1 : 0)}
                        className="min-h-11 shrink-0 cursor-pointer px-2 text-sm font-semibold text-primary"
                        aria-label={`Change ${name.toLowerCase()}`}
                      >
                        Change
                      </button>
                    </div>
                  ))}
                <div className="flex items-baseline justify-between gap-4 px-4 py-3">
                  <dt className="font-semibold">Total</dt>
                  <dd className="price text-2xl font-semibold text-primary">{price !== null && money(price)}</dd>
                </div>
              </dl>
              <div>
                <label htmlFor="flow-name" className={label}>
                  Name
                </label>
                <Input
                  id="flow-name"
                  autoComplete="name"
                  maxLength={100}
                  value={data.name}
                  onChange={e => set('name', e.target.value)}
                />
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="flow-phone" className={label}>
                    Phone
                  </label>
                  <Input
                    id="flow-phone"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    maxLength={14}
                    placeholder="(702) 555-0123"
                    value={data.phone}
                    onChange={e => set('phone', formatPhone(e.target.value))}
                  />
                </div>
                <div>
                  <label htmlFor="flow-email" className={label}>
                    Email
                  </label>
                  <EmailInput
                    id="flow-email"
                    type="email"
                    autoComplete="email"
                    maxLength={100}
                    placeholder="you@example.com"
                    value={data.email}
                    onChange={e => set('email', e.target.value)}
                  />
                </div>
              </div>
              <SquareCard
                ref={card}
                square={square}
                onReady={() => setCardReady(true)}
                onError={message => setError(`${message} Or call ${SITE.phone}.`)}
                amount={price ?? 0}
                disabled={busy}
                onWallet={tokenize => {
                  const problem = check()
                  if (problem) return setError(problem)
                  void submit(tokenize)
                }}
              />
              {!cardReady && <p className="text-sm text-muted-foreground">Loading secure card form…</p>}
              <ContactCaptcha ref={captcha} action="cake_order" />
            </>
          )}

          {error && <FormAlert type="error">{error}</FormAlert>}
          <div
            className={cn(
              'flex justify-center border-t pt-6',
              'max-sm:sticky max-sm:bottom-0 max-sm:z-20 max-sm:-mx-[var(--gutter)] max-sm:bg-card max-sm:px-[var(--gutter)] max-sm:pt-3 max-sm:pb-[max(0.75rem,env(safe-area-inset-bottom))] max-sm:shadow-pop',
            )}
          >
            <Button
              type="submit"
              loading={busy}
              disabled={busy || (step === PAY && !cardReady)}
              className="w-full sm:w-auto sm:min-w-48"
            >
              {step < PAY
                ? 'Next'
                : busy
                  ? 'Processing…'
                  : held || !instant
                    ? `Place order (hold ${money(price ?? 0)})`
                    : `Pay ${money(price ?? 0)}`}
            </Button>
          </div>
          {step === PAY && (
            <p className="text-xs text-muted-foreground">Card details go straight to Square; we never see them.</p>
          )}
        </fieldset>
      </form>
    </div>
  )
}
