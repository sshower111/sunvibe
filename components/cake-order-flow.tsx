'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ImagePlus } from 'lucide-react'
import { SITE } from '@/lib/site-info'
import { cn } from '@/lib/utils'
import { storeDate } from '@/lib/occasion-dates'
import {
  cakeCatalog,
  deliveryOptions,
  findCake,
  MAX_TIERS,
  TIER_SIZES,
  tierSizes,
  tierValue,
  type CakeSpec,
} from '@/lib/cake-catalog'
import {
  earliestCakeDate,
  fillings,
  flavors,
  formatEventTime,
  MAX_CAKE_MESSAGE,
  MAX_PHOTO_BYTES,
  MAX_PHOTOS,
  tierFlavorLines,
  tierNames,
  type TierFlavor,
} from '@/lib/cake-inquiry'
import {
  decideOrder,
  formatPickupTime,
  formatVegasTime,
  ORDER_FILLINGS,
  ORDER_FLAVORS,
  ORDER_SIZES,
  pickupSlots,
} from '@/lib/cake-order'
import { deliveryFee, largestServings, priceRange, recommend, startingPrice } from '@/lib/cake-finder'
import { formatPhone } from '@/lib/form-helpers'
import { prepareGalleryPhoto } from '@/lib/prepare-gallery-photo'
import { ContactCaptcha, type CaptchaHandle } from '@/components/contact-captcha'
import { EmailInput } from '@/components/email-input'
import { EventDatePicker, formatEventDate } from '@/components/event-date-picker'
import { SquareCard, type SquareCardHandle, type SquareConfig } from '@/components/square-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { FormAlert } from '@/components/ui/form-message'
import { CakePreview } from '@/components/cake-preview'

// The cake order on /order-cake (everyday and custom cakes). Every answer is part of the order; nothing is asked twice.
// It ends with payment now (everyday size, listed flavor and filling, simple design, pickup at a time we offer)
// through /api/cake-orders, or with a quote request (custom cake inquiry) through /api/custom-cakes.

// Planning steps first (no commitment), then a summary, then contact and payment only if they choose to go ahead.
const steps = ['Party size', 'Flavor', 'Design', 'Date'] as const
const REVIEW = 4
const DETAILS = 5
const PICKUP = deliveryOptions[0]
const guestPresets = [10, 20, 30, 50, 75, 100]
const money = (n: number) => '$' + (Number.isInteger(n) ? n : n.toFixed(2))
const showOption = (value: string) =>
  value === 'Please recommend' ? 'Not sure' : value.startsWith('Something else') ? 'Something else' : value
/** Real choices first; "Not sure" (stored as 'Please recommend') goes last. */
const notSureLast = (options: readonly string[]) => [
  ...options.filter(o => o !== 'Please recommend'),
  'Please recommend',
]
const fromPrice = (cake: CakeSpec) => {
  const range = priceRange(cake)
  return range ? `from ${money(range[0])}` : 'price quoted'
}
/** Phones and tablets: the one-column layout (the cake drawing beside the steps starts at lg). */
const narrow = () => window.matchMedia('(max-width: 1023px)').matches
/** Tier sizes the builder starts with, top first. */
const startTiers = (count: number) => (count === 3 ? [8, 10, 12] : [6, 10])

const empty = {
  guests: '',
  size: '',
  flavor: '',
  filling: '',
  // Tiered cakes: the same flavor throughout, or one per tier (top first).
  sameTiers: true,
  tierFlavors: [] as TierFlavor[],
  design: '' as '' | 'simple' | 'custom',
  cakeMessage: '',
  notes: '',
  fulfillment: PICKUP as string,
  deliveryAddress: '',
  date: '',
  time: '',
  name: '',
  email: '',
  phone: '',
  acknowledged: false,
}
type Data = typeof empty

/** A large tap tile (B style): guests, sizes, design, pickup or delivery. */
function Choice({
  selected,
  onClick,
  title,
  sub,
  badge,
  big,
}: {
  selected: boolean
  onClick: () => void
  title: string
  sub?: string
  badge?: string
  /** Size cards: larger serif title. */
  big?: boolean
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        'relative flex w-full cursor-pointer flex-col items-center justify-center rounded-lg border bg-card px-3 text-center transition-colors hover:border-foreground/40 hover:bg-secondary',
        big ? 'min-h-24 py-4 sm:min-h-28 sm:py-5' : 'min-h-16 py-3',
        selected && 'border-primary ring-1 ring-primary hover:border-primary',
        selected && (big ? 'bg-card hover:bg-card' : 'bg-primary text-primary-foreground hover:bg-primary'),
      )}
    >
      {badge && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-xs font-semibold whitespace-nowrap text-primary-foreground">
          {badge}
        </span>
      )}
      <span className={big ? 'font-serif text-xl text-primary sm:text-2xl' : 'font-semibold sm:text-lg'}>{title}</span>
      {sub && (
        <span className={cn('mt-1 text-sm', selected && !big ? 'text-primary-foreground/85' : 'text-muted-foreground')}>
          {sub}
        </span>
      )}
    </button>
  )
}

/** Flavor or filling: a grid of tap tiles under a label. */
function Pills({
  legend,
  options,
  value,
  onChange,
}: {
  name: string
  legend: string
  options: readonly string[]
  value: string
  onChange: (value: string) => void
}) {
  return (
    <fieldset>
      <legend className="mb-3 text-sm font-semibold">{legend}</legend>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {options.map(option => (
          <Choice
            key={option}
            title={showOption(option)}
            selected={value === option}
            onClick={() => onChange(option)}
          />
        ))}
      </div>
    </fieldset>
  )
}

function PhotoPreview({ file }: { file: File }) {
  const [url, setUrl] = useState('')
  useEffect(() => {
    const value = URL.createObjectURL(file)
    setUrl(value)
    return () => URL.revokeObjectURL(value)
  }, [file])
  return url ? <img src={url} alt="Your inspiration photo" className="size-16 rounded-md object-cover" /> : null
}

export function CakeOrderFlow({ square }: { square: SquareConfig | null }) {
  const [data, setData] = useState<Data>(empty)
  const [step, setStep] = useState(0)
  const [error, setError] = useState('')
  const [photos, setPhotos] = useState<File[]>([])
  // Step 1: show every size instead of only the suggestions.
  const [showAll, setShowAll] = useState(false)
  // Step 1: the customer's own tiers (sizes top first), while building them.
  const [builder, setBuilder] = useState<number[] | null>(null)
  const [preparing, setPreparing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [cardReady, setCardReady] = useState(false)
  const [now, setNow] = useState(() => new Date())
  const [done, setDone] = useState<
    { kind: 'paid'; held: boolean; ref: string; approveBy?: string; receiptUrl?: string } | { kind: 'quote' } | null
  >(null)
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
    if (next !== DETAILS) setCardReady(false)
    setStep(next)
    setError('')
    requestAnimationFrame(() => {
      heading.current?.focus({ preventScroll: true })
      const box = top.current?.getBoundingClientRect()
      // Phones and tablets: every step starts with the progress bar just under the header, past the page title.
      if (box && (box.top < 0 || (narrow() && box.top > 1))) top.current?.scrollIntoView({ block: 'start' })
    })
  }
  // Step 1 on phones: bring the size suggestions into view once there is a guest count.
  const suggestions = useRef<HTMLFieldSetElement>(null)
  const showSuggestions = () =>
    requestAnimationFrame(() => {
      if (narrow()) suggestions.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    })

  // Step 1: size choices for the guest count, best fit first.
  const guests = /^\d{1,3}$/.test(data.guests) ? Number(data.guests) : 0
  const result = useMemo(() => (guests > 0 ? recommend(guests, 'Any', 'Please recommend') : null), [guests])
  const sizeOptions = useMemo(() => {
    if (!result?.best) return []
    return [result.best, ...result.others, result.bigger].filter(
      (c, index, list): c is CakeSpec => !!c && list.indexOf(c) === index,
    )
  }, [result])
  // A size the customer picked (from suggestions or all sizes) wins; otherwise the best fit.
  const picked = findCake(data.size)
  const size = picked ? data.size : (result?.best?.value ?? (guests > 0 ? 'Not sure' : ''))
  const cake = findCake(size)
  const builtValid = !builder || !!tierSizes(tierValue(builder))
  function build(sizes: number[]) {
    setBuilder(sizes)
    set('size', tierSizes(tierValue(sizes)) ? tierValue(sizes) : '')
  }

  // Step 2: a tiered cake can have a different flavor and filling in each tier.
  const tierCount = tierSizes(size)?.length ?? 1
  const perTier = tierCount > 1 && !data.sameTiers
  const tierChoices: TierFlavor[] = Array.from(
    { length: tierCount },
    (_, i) => data.tierFlavors[i] ?? ({ flavor: data.flavor, filling: data.filling } as TierFlavor),
  )
  const setTier = (index: number, key: keyof TierFlavor, value: string) =>
    set(
      'tierFlavors',
      tierChoices.map((t, i) => (i === index ? { ...t, [key]: value } : t)),
    )
  const flavorLines = perTier ? tierFlavorLines(size, tierChoices, showOption) : []

  // Pay now only for an everyday cake picked up at a time we offer; everything else is quoted.
  // A classic look on one of these can be ready the same day; the design step says so.
  const everyday =
    !!square &&
    (ORDER_SIZES as readonly string[]).includes(size) &&
    ORDER_FLAVORS.includes(data.flavor as never) &&
    ORDER_FILLINGS.includes(data.filling as never)
  const payNow = everyday && data.design === 'simple' && data.fulfillment === PICKUP
  const minDate = payNow ? storeDate(now) : earliestCakeDate(now)
  const slots = useMemo(() => (payNow && data.date ? pickupSlots(data.date, now) : []), [payNow, data.date, now])
  const decision = payNow && data.date && data.time ? decideOrder(size, data.date, data.time, now) : null
  const held = !!(decision?.ok && decision.needsApproval)
  // Keep the date and time valid when the ending changes (a quote needs 3 days' notice).
  useEffect(() => {
    if (data.date && data.date < minDate) setData(d => ({ ...d, date: '', time: '' }))
    else if (payNow && data.time && !slots.includes(data.time)) setData(d => ({ ...d, time: '' }))
  }, [minDate, payNow, slots]) // eslint-disable-line react-hooks/exhaustive-deps

  const cakePrice = cake && data.filling ? startingPrice(cake, data.filling) : null
  const fee = deliveryFee(data.fulfillment)
  const priceText =
    cakePrice !== null
      ? fee === null
        ? `${money(cakePrice)} + delivery`
        : money(cakePrice + fee)
      : cake
        ? priceRange(cake)
          ? money(priceRange(cake)![0] + (fee ?? 0))
          : 'We’ll quote'
        : ''

  function check(): string {
    if (step === 0) {
      if (!builtValid) return 'Each tier needs to be smaller than the one below it.'
      if (!guests && !picked) return 'Enter how many guests, or pick a size.'
    }
    if (step === 1) {
      if (perTier) {
        const missing = tierChoices.findIndex(t => !t.flavor || !t.filling)
        if (missing >= 0)
          return `Choose a flavor and filling for the ${tierNames(tierCount)[missing].toLowerCase()} tier.`
      } else {
        if (!data.flavor) return 'Choose a flavor.'
        if (!data.filling) return 'Choose a filling.'
      }
    }
    if (step === 2 && !data.design) return 'Choose a classic look or a custom cake.'
    if (step === 3) {
      if (!data.date) return 'Choose a date.'
      if (payNow && !data.time) return 'Choose a pickup time.'
      if (decision && !decision.ok) return decision.error
    }
    if (step === DETAILS) {
      if (!data.name.trim()) return 'Enter your name.'
      if (data.phone.replace(/\D/g, '').length < 10) return 'Enter your phone number.'
      if (!/^\S+@\S+\.\S+$/.test(data.email.trim())) return 'Enter a valid email address.'
      if (!payNow && !data.acknowledged) return 'Please tick the box to confirm this is a quote request.'
    }
    return ''
  }
  function next(event: React.FormEvent) {
    event.preventDefault()
    const problem = check()
    if (problem) return setError(problem)
    if (step === 0) set('size', size)
    if (step < DETAILS) go(step + 1)
    else void submit()
  }

  /** wallet: Apple Pay or Google Pay instead of the card; it must be called before the first await. */
  async function submit(wallet?: () => Promise<string>) {
    if (busy) return
    setBusy(true)
    setError('')
    requestId.current ||= crypto.randomUUID()
    try {
      if (payNow) {
        if (cakePrice === null || (!wallet && (!card.current || !cardReady)))
          throw new Error('Please wait for the card form to load.')
        const cardToken = await (wallet ? wallet() : card.current!.tokenize(cakePrice, data))
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
            size,
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
        setDone({ kind: 'paid', ...body })
      } else {
        const form = new FormData()
        const fields: Record<string, string> = {
          name: data.name,
          email: data.email,
          phone: data.phone,
          eventDate: data.date,
          eventTime: data.time,
          eventType: 'Other',
          servings: String(guests || cake?.servings || 1),
          size,
          // Different tiers: flavor and filling hold the top tier, and every tier is sent as well.
          flavor: perTier ? tierChoices[0].flavor : data.flavor,
          filling: perTier ? tierChoices[0].filling : data.filling,
          tierFlavors: perTier ? JSON.stringify(tierChoices) : '',
          cakeMessage: data.cakeMessage,
          budget: 'Not sure — please advise',
          fulfillment: data.fulfillment,
          deliveryAddress: data.fulfillment === PICKUP ? '' : data.deliveryAddress,
          notes: data.design === 'custom' ? data.notes : '',
          acknowledged: 'yes',
          requestId: requestId.current,
        }
        Object.entries(fields).forEach(([key, value]) => form.set(key, value))
        if (data.design === 'custom') photos.forEach(file => form.append('photos', file))
        const captchaToken = await captcha.current?.verify()
        if (!captchaToken) throw new Error('Please try verification again.')
        form.set('captchaToken', captchaToken)
        const response = await fetch('/api/custom-cakes', { method: 'POST', body: form })
        const body = await response.json().catch(() => ({}))
        if (!response.ok) {
          const first = body.fields && Object.values(body.fields as Record<string, string[]>)[0]?.[0]
          throw new Error(first || body.error || 'Unable to send your request. Please try again.')
        }
        setDone({ kind: 'quote' })
      }
      requestAnimationFrame(() => top.current?.scrollIntoView({ block: 'start' }))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Please try again.')
    } finally {
      setBusy(false)
    }
  }

  if (done)
    return (
      <div ref={top} role="status" className="space-y-4 rounded-lg border bg-card card-pad">
        {done.kind === 'paid' ? (
          <>
            <h2 className="heading-2">{done.held ? 'Order received' : 'Order confirmed'}</h2>
            {done.held ? (
              <p>
                Your order {done.ref} needs a quick check from us. Your card has a hold for{' '}
                {cakePrice !== null && money(cakePrice)} but has not been charged. We’ll email you by{' '}
                {done.approveBy && formatVegasTime(done.approveBy)} (Las Vegas time).
              </p>
            ) : (
              <p>Thank you! Your order {done.ref} is paid. We’ve emailed your confirmation.</p>
            )}
            {done.receiptUrl && !done.held && (
              <a
                href={done.receiptUrl}
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-primary underline"
              >
                View your receipt
              </a>
            )}
            <p className="text-sm text-muted-foreground">Pickup at {SITE.address}.</p>
          </>
        ) : (
          <>
            <h2 className="heading-2">Request sent</h2>
            <p>
              Thanks, {data.name}. We’ve emailed a copy to {data.email} and will reply with a quote. Your order isn’t
              confirmed until we do.
            </p>
            <p className="text-sm text-muted-foreground">To change something, just reply to that email.</p>
          </>
        )}
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
  // [label, value, the step that asks it]
  const summary: [string, string, number][] = [
    ['Guests', data.guests || (cake ? 'Not sure yet' : ''), 0],
    ['Cake', cake?.label ?? (size === 'Not sure' ? 'We’ll suggest' : ''), 0],
    ['Flavor', perTier ? flavorLines.join('\n') : data.flavor && showOption(data.flavor), 1],
    ['Filling', perTier ? '' : data.filling && showOption(data.filling), 1],
    ['Design', data.design === 'custom' ? 'Custom cake' : data.design === 'simple' ? 'Classic look' : '', 2],
    ['Photos', data.design === 'custom' ? (photos.length ? `${photos.length} added` : 'None yet, add one?') : '', 2],
    [
      data.fulfillment === PICKUP ? 'Pickup' : 'Delivery',
      data.date
        ? [formatEventDate(data.date), payNow ? data.time && formatPickupTime(data.time) : formatEventTime(data.time)]
            .filter(Boolean)
            .join(' · ')
        : '',
      3,
    ],
  ]

  const preview = (
    <CakePreview
      size={cake ? size : ''}
      flavor={data.flavor}
      fillingName={data.filling}
      tiers={perTier ? tierChoices : undefined}
      design={data.design}
      message={data.cakeMessage}
      className="h-auto w-full"
    />
  )
  // One line under the drawing: what has been chosen so far.
  const chosen = [
    cake?.label,
    perTier && 'A different flavor in each tier',
    !perTier && data.flavor && data.flavor !== 'Please recommend' && data.flavor,
    !perTier && data.filling && showOption(data.filling) !== 'Not sure' && showOption(data.filling) + ' filling',
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <div ref={top} className="mx-auto grid max-w-6xl items-start gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
      {/* Wide screens: the cake stays in view beside the questions. */}
      <aside
        aria-label="Your cake"
        className="sticky top-[calc(var(--header-height)+1.5rem)] order-last hidden rounded-lg bg-surface p-6 lg:block"
      >
        <p className="heading-3">Your cake</p>
        <div className="mt-4">{preview}</div>
        <p className="mt-3 min-h-12 text-sm text-ink-muted">{chosen || 'Choose a size to start'}</p>
        {cake && <p className="mt-1 text-sm text-ink-muted">Serves {cake.servings}</p>}
      </aside>
      <form
        onSubmit={next}
        noValidate
        aria-busy={busy}
        className="relative min-w-0 sm:rounded-lg sm:border sm:bg-card sm:card-pad"
      >
        {/* Phones and tablets: a small drawing of the cake above the steps, once there is a size. */}
        {/* Not on the first step: the size suggestions already show the cake, and the strip would push them down. */}
        {cake && step > 0 && (
          <div className="mb-6 flex items-center gap-4 rounded-lg bg-surface p-3 lg:hidden">
            <div className="w-32 shrink-0">{preview}</div>
            <div className="min-w-0">
              <p className="heading-3 text-base">Your cake</p>
              <p className="text-sm text-ink-muted">{chosen}</p>
              <p className="text-sm text-ink-muted">Serves {cake.servings}</p>
            </div>
          </div>
        )}
        <ol aria-label="Progress" className="mb-4 grid grid-cols-4 gap-2 sm:mb-6">
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
                  'mt-1 text-xs sm:text-sm',
                  step === index ? 'block font-semibold' : 'hidden text-muted-foreground sm:block',
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
        <h3
          ref={heading}
          tabIndex={-1}
          className="mb-6 text-center font-serif text-[clamp(1.75rem,4vw,2.75rem)] leading-tight text-primary focus:outline-none sm:mb-8"
        >
          {
            [
              'How many guests?',
              'Flavor & filling',
              'Classic look or custom cake?',
              'When, and pickup or delivery?',
              'Here’s your cake',
              payNow ? 'Your details & payment' : 'Your details',
            ][step]
          }
        </h3>

        <fieldset disabled={busy} className="mx-auto min-w-0 max-w-3xl space-y-6">
          <legend className="sr-only">{steps[step] ?? (step === REVIEW ? 'Summary' : 'Your details')}</legend>

          {step === 0 && (
            <>
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
                {guestPresets.map(value => (
                  <Choice
                    key={value}
                    title={value === 100 ? '100+' : String(value)}
                    selected={data.guests === String(value)}
                    onClick={() => {
                      setData(d => ({ ...d, guests: String(value), size: '' }))
                      setShowAll(false)
                      setBuilder(null)
                      showSuggestions()
                    }}
                  />
                ))}
              </div>
              <div className="mx-auto flex max-w-xs items-center justify-center gap-3">
                <label htmlFor="flow-guests" className="shrink-0 text-sm font-semibold">
                  Or type a number
                </label>
                <Input
                  id="flow-guests"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={999}
                  placeholder="e.g., 24"
                  enterKeyHint="done"
                  value={data.guests}
                  // Done / Enter closes the keyboard and shows the suggestions instead of skipping ahead.
                  onKeyDown={e => {
                    if (e.key !== 'Enter') return
                    e.preventDefault()
                    e.currentTarget.blur()
                  }}
                  onBlur={() => guests > 0 && showSuggestions()}
                  onChange={e => {
                    setData(d => ({ ...d, guests: e.target.value, size: '' }))
                    setShowAll(false)
                    setBuilder(null)
                  }}
                />
              </div>
              {result &&
                !showAll &&
                (result.best ? (
                  // scroll-mb keeps the cards clear of the Next bar pinned to the bottom on phones.
                  <fieldset ref={suggestions} className="scroll-mb-28">
                    <legend className="mb-5 w-full text-center text-sm text-muted-foreground">We suggest</legend>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3">
                      {sizeOptions.map(item => (
                        <Choice
                          key={item.value}
                          title={item.label}
                          sub={`Serves ${item.servings} · ${fromPrice(item)}`}
                          badge={item === result.best ? 'Best fit' : undefined}
                          big
                          selected={size === item.value}
                          onClick={() => {
                            set('size', item.value)
                            setBuilder(null)
                          }}
                        />
                      ))}
                    </div>
                  </fieldset>
                ) : (
                  <p>
                    Our largest cake serves {largestServings}. For a bigger party we can make more than one cake; we’ll
                    plan it with you.
                  </p>
                ))}
              {builder && (
                <fieldset className="rounded-lg border bg-surface p-4 sm:p-5">
                  <legend className="sr-only">Build your own tiered cake</legend>
                  <p className="font-semibold">Your own tiered cake</p>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    {[2, MAX_TIERS].map(count => (
                      <Choice
                        key={count}
                        title={`${count} tiers`}
                        selected={builder.length === count}
                        onClick={() => build(startTiers(count))}
                      />
                    ))}
                  </div>
                  <div className={cn('mt-4 grid gap-3', builder.length === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2')}>
                    {builder.map((inches, index) => (
                      <div key={index}>
                        <label htmlFor={`flow-tier-${index}`} className={label}>
                          {tierNames(builder.length)[index]} tier
                        </label>
                        <NativeSelect
                          id={`flow-tier-${index}`}
                          value={inches}
                          onChange={e => build(builder.map((n, i) => (i === index ? Number(e.target.value) : n)))}
                        >
                          {TIER_SIZES.map(n => (
                            <option key={n} value={n}>
                              {n}-inch
                            </option>
                          ))}
                        </NativeSelect>
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 text-sm" role="status">
                    {builtValid && cake
                      ? `${cake.label} · serves ${cake.servings} · ${fromPrice(cake)}`
                      : 'Each tier needs to be smaller than the one below it.'}
                  </p>
                </fieldset>
              )}
              {!showAll ? (
                <div className="flex flex-wrap justify-center gap-x-6">
                  <button
                    type="button"
                    onClick={() => setShowAll(true)}
                    className="inline-flex min-h-11 cursor-pointer items-center text-sm font-semibold text-primary underline underline-offset-4"
                  >
                    {guests ? 'See all sizes' : 'Not sure yet? Pick a size instead'}
                  </button>
                  {!builder && (
                    <button
                      type="button"
                      onClick={() => build(startTiers(2))}
                      className="inline-flex min-h-11 cursor-pointer items-center text-sm font-semibold text-primary underline underline-offset-4"
                    >
                      Build your own tiered cake
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-5">
                  {(['Round', 'Sheet', 'Multi-tier'] as const).map(category => (
                    <fieldset key={category}>
                      <legend className="mb-3 text-sm font-semibold">
                        {category === 'Multi-tier' ? 'Tiered' : category}
                      </legend>
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        {cakeCatalog
                          .filter(c => c.category === category)
                          .map(item => (
                            <Choice
                              key={item.value}
                              title={item.label.replace(' round', '')}
                              sub={`Serves ${item.servings}`}
                              selected={size === item.value}
                              onClick={() => {
                                set('size', item.value)
                                setBuilder(null)
                              }}
                            />
                          ))}
                        {category === 'Multi-tier' && (
                          <Choice
                            title="Your own tiers"
                            sub="Pick each size"
                            selected={!!builder}
                            onClick={() => build(builder ?? startTiers(2))}
                          />
                        )}
                      </div>
                    </fieldset>
                  ))}
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => setShowAll(false)}
                      className="inline-flex min-h-11 cursor-pointer items-center text-sm font-semibold text-primary underline underline-offset-4"
                    >
                      {guests ? 'Back to suggestions' : 'Hide sizes'}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {step === 1 && (
            <>
              {tierCount > 1 && (
                <div className="grid grid-cols-2 gap-3">
                  <Choice title="Same in every tier" selected={data.sameTiers} onClick={() => set('sameTiers', true)} />
                  <Choice
                    title="Different for each tier"
                    selected={!data.sameTiers}
                    onClick={() => setData(d => ({ ...d, sameTiers: false, tierFlavors: tierChoices }))}
                  />
                </div>
              )}
              {perTier ? (
                tierChoices.map((tier, index) => (
                  <section key={index} className="space-y-5 border-t pt-5">
                    <h4 className="heading-3">
                      {tierNames(tierCount)[index]} tier · {tierSizes(size)![index]}-inch
                    </h4>
                    <Pills
                      name={`flow-flavor-${index}`}
                      legend="Cake flavor"
                      options={notSureLast(flavors)}
                      value={tier.flavor}
                      onChange={value => setTier(index, 'flavor', value)}
                    />
                    <Pills
                      name={`flow-filling-${index}`}
                      legend="Filling"
                      options={notSureLast(fillings)}
                      value={tier.filling}
                      onChange={value => setTier(index, 'filling', value)}
                    />
                  </section>
                ))
              ) : (
                <>
                  <Pills
                    name="flow-flavor"
                    legend="Cake flavor"
                    options={notSureLast(flavors)}
                    value={data.flavor}
                    onChange={value => set('flavor', value)}
                  />
                  <Pills
                    name="flow-filling"
                    legend="Filling"
                    options={notSureLast(fillings)}
                    value={data.filling}
                    onChange={value => set('filling', value)}
                  />
                </>
              )}
            </>
          )}

          {step === 2 && (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <Choice
                  title="Classic look"
                  sub={
                    everyday
                      ? 'Cream finish, piped border and your writing. Can be ready today.'
                      : 'Cream finish, piped border and your writing'
                  }
                  selected={data.design === 'simple'}
                  onClick={() => set('design', 'simple')}
                />
                <Choice
                  title="Custom cake"
                  sub="Your theme, colors and decorations. We’ll quote it."
                  selected={data.design === 'custom'}
                  onClick={() => set('design', 'custom')}
                />
              </div>
              {data.design && (
                <div>
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
              )}
              {data.design === 'custom' && (
                <>
                  <div className="rounded-lg border border-dashed border-primary/40 bg-surface p-4 sm:p-5">
                    <p className="mb-4 font-semibold">Have a picture? We’d love to see it</p>
                    <input
                      id="flow-photos"
                      type="file"
                      multiple
                      className="peer sr-only"
                      disabled={preparing || photos.length >= MAX_PHOTOS}
                      accept="image/jpeg,image/png,image/webp,image/gif,image/avif,image/heic,image/heif,.heic,.heif"
                      onChange={async event => {
                        const selected = Array.from(event.target.files || [])
                        event.target.value = ''
                        if (photos.length + selected.length > MAX_PHOTOS)
                          return setError(`Please choose up to ${MAX_PHOTOS} photos.`)
                        setPreparing(true)
                        setError('')
                        try {
                          const prepared: File[] = []
                          for (const file of selected)
                            prepared.push(await prepareGalleryPhoto(file, { maxSide: 1600, maxBytes: MAX_PHOTO_BYTES }))
                          setPhotos(current => [...current, ...prepared])
                          requestId.current = ''
                        } catch (e) {
                          setError(e instanceof Error ? e.message : 'This photo could not be added.')
                        } finally {
                          setPreparing(false)
                        }
                      }}
                    />
                    <label
                      htmlFor="flow-photos"
                      className={cn(
                        'flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-md border bg-card px-4 py-3 text-sm font-semibold peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring hover:bg-secondary',
                        (preparing || photos.length >= MAX_PHOTOS) && 'cursor-not-allowed opacity-50',
                      )}
                    >
                      <ImagePlus aria-hidden="true" className="size-5 text-primary" />
                      {preparing
                        ? 'Preparing photo…'
                        : photos.length
                          ? `Add more (${photos.length} of ${MAX_PHOTOS})`
                          : 'Add your photos'}
                    </label>
                    {photos.length > 0 && (
                      <ul className="mt-3 flex flex-wrap gap-3">
                        {photos.map((file, index) => (
                          <li key={file.name + index} className="relative">
                            <PhotoPreview file={file} />
                            <button
                              type="button"
                              aria-label={`Remove photo ${index + 1}`}
                              onClick={() => setPhotos(current => current.filter((_, i) => i !== index))}
                              className="absolute -top-2 -right-2 flex size-6 cursor-pointer items-center justify-center rounded-full bg-ink text-xs text-white"
                            >
                              ×
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div>
                    <label htmlFor="flow-notes" className={label}>
                      Design ideas & dietary requests (optional)
                    </label>
                    <Textarea
                      id="flow-notes"
                      rows={4}
                      maxLength={3000}
                      placeholder="Colors, theme, allergies…"
                      value={data.notes}
                      onChange={e => set('notes', e.target.value)}
                    />
                  </div>
                </>
              )}
            </>
          )}

          {step === 3 && (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                {deliveryOptions.map(option => {
                  const [title, cost] = option.split(' — ')
                  return (
                    <Choice
                      key={option}
                      title={title}
                      sub={option === PICKUP ? SITE.street : cost}
                      selected={data.fulfillment === option}
                      onClick={() => set('fulfillment', option)}
                    />
                  )
                })}
              </div>
              {data.fulfillment !== PICKUP && (
                <div>
                  <label htmlFor="flow-address" className={label}>
                    Delivery address or hotel
                  </label>
                  <Input
                    id="flow-address"
                    autoComplete="street-address"
                    maxLength={500}
                    value={data.deliveryAddress}
                    onChange={e => set('deliveryAddress', e.target.value)}
                  />
                </div>
              )}
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
                    {payNow ? 'Pickup time' : 'Time (optional)'}
                  </label>
                  {payNow ? (
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
                  ) : (
                    <Input
                      id="flow-time"
                      type="time"
                      step={900}
                      value={data.time}
                      onChange={e => set('time', e.target.value)}
                    />
                  )}
                </div>
              </div>
              {held && decision?.ok && decision.needsApproval && (
                <p className="rounded-md bg-surface px-4 py-3 text-sm">
                  We’ll confirm this order by {formatVegasTime(decision.approveBy.toISOString())}. Your card is held
                  until then, not charged.
                </p>
              )}
              {!payNow && (
                <p className="rounded-md bg-surface px-4 py-3 text-sm">
                  We’ll send you a quote before you pay. Please allow at least 3 days.
                </p>
              )}
            </>
          )}

          {step === REVIEW && (
            <div className="space-y-6">
              <dl className="divide-y rounded-lg border">
                {summary
                  .filter(([, value]) => value)
                  .map(([name, value, to]) => (
                    <div key={name} className="flex items-center justify-between gap-4 px-4 py-2">
                      <div className="min-w-0 py-1">
                        <dt className="text-sm text-muted-foreground">{name}</dt>
                        <dd className="font-semibold whitespace-pre-line">{value}</dd>
                      </div>
                      <button
                        type="button"
                        onClick={() => go(to)}
                        className="min-h-11 shrink-0 cursor-pointer px-2 text-sm font-semibold text-primary"
                        aria-label={`Change ${name.toLowerCase()}`}
                      >
                        Change
                      </button>
                    </div>
                  ))}
              </dl>
              {priceText && (
                <div className="flex items-baseline justify-between gap-4 rounded-lg bg-surface px-4 py-3">
                  <span className="font-semibold">Estimated price</span>
                  <span className="price text-3xl font-semibold text-primary">{priceText}</span>
                </div>
              )}
              <div className="flex flex-col items-center gap-3">
                <Button type="submit" className="w-full sm:w-auto sm:min-w-64">
                  {payNow ? `Order & pay ${money(cakePrice ?? 0)}` : 'Request a quote'}
                </Button>
                <a
                  href={SITE.phoneHref}
                  className="inline-flex min-h-11 items-center text-sm font-semibold text-primary underline underline-offset-4"
                >
                  Or call us about this cake: {SITE.phone}
                </a>
              </div>
            </div>
          )}

          {step === DETAILS && (
            <>
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
              {payNow && square ? (
                <>
                  <SquareCard
                    ref={card}
                    square={square}
                    onReady={() => setCardReady(true)}
                    onError={message => setError(`${message} Or call ${SITE.phone}.`)}
                    amount={cakePrice ?? 0}
                    disabled={busy}
                    onWallet={tokenize => {
                      const problem = check()
                      if (problem) return setError(problem)
                      void submit(tokenize)
                    }}
                  />
                  {!cardReady && <p className="text-sm text-muted-foreground">Loading secure card form…</p>}
                </>
              ) : (
                <label className="flex min-h-12 cursor-pointer items-start gap-3 rounded-md border p-3 text-sm">
                  <input
                    type="checkbox"
                    className="mt-1 size-5 shrink-0 accent-primary"
                    checked={data.acknowledged}
                    onChange={e => set('acknowledged', e.target.checked)}
                  />
                  <span>I understand this is a request for a quote, not a confirmed order.</span>
                </label>
              )}
              <ContactCaptcha
                key={payNow ? 'pay' : 'quote'}
                ref={captcha}
                action={payNow ? 'cake_order' : 'custom_cake'}
              />
            </>
          )}

          {error && <FormAlert type="error">{error}</FormAlert>}
          <div
            className={cn(
              'flex justify-center border-t pt-6',
              'max-sm:sticky max-sm:bottom-0 max-sm:z-20 max-sm:-mx-[var(--gutter)] max-sm:bg-card max-sm:px-[var(--gutter)] max-sm:pt-3 max-sm:pb-[max(0.75rem,env(safe-area-inset-bottom))] max-sm:shadow-pop',
              step === REVIEW && 'hidden',
            )}
          >
            <Button
              type="submit"
              loading={busy}
              disabled={busy || (step === DETAILS && payNow && !cardReady)}
              className="w-full sm:w-auto sm:min-w-48"
            >
              {step < DETAILS
                ? 'Next'
                : busy
                  ? payNow
                    ? 'Processing…'
                    : 'Sending…'
                  : payNow
                    ? held
                      ? `Place order (hold ${money(cakePrice ?? 0)})`
                      : `Pay ${money(cakePrice ?? 0)}`
                    : 'Send for a quote'}
            </Button>
          </div>
          {step === DETAILS && payNow && (
            <p className="text-xs text-muted-foreground">Card details go straight to Square; we never see them.</p>
          )}
        </fieldset>
      </form>
    </div>
  )
}
