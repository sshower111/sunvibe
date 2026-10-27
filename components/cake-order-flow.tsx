'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import { ArrowLeft, ArrowRight, ImagePlus } from 'lucide-react'
import { SITE } from '@/lib/site-info'
import { cn } from '@/lib/utils'
import { storeDate } from '@/lib/occasion-dates'
import { cakeCatalog, deliveryOptions, type CakeSpec } from '@/lib/cake-catalog'
import {
  earliestCakeDate,
  eventTypes,
  fillings,
  flavors,
  formatEventTime,
  MAX_CAKE_MESSAGE,
  MAX_PHOTO_BYTES,
  MAX_PHOTOS,
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
import { deliveryFee, finderShapes, largestServings, priceRange, recommend, startingPrice } from '@/lib/cake-finder'
import { formatPhone } from '@/lib/form-helpers'
import { prepareGalleryPhoto } from '@/lib/prepare-gallery-photo'
import { flavorArt, fillingArt, NotSureArt } from '@/components/cake-illustrations'
import { ContactCaptcha, type CaptchaHandle } from '@/components/contact-captcha'
import { EmailInput } from '@/components/email-input'
import { EventDatePicker, formatEventDate } from '@/components/event-date-picker'
import { SquareCard, type SquareCardHandle, type SquareConfig } from '@/components/square-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { FormAlert } from '@/components/ui/form-message'

// One cake order flow for /order-cake and /custom-cakes. Each answer is part of the order; nothing is asked twice.
// At the end it either takes payment now (everyday size, simple design, pickup, a pickup time we offer)
// through /api/cake-orders, or sends a custom cake inquiry for a quote through /api/custom-cakes.

const sections = ['Party size', 'Shape', 'Size', 'Flavor', 'Filling', 'Design', 'Date', 'Your details'] as const
const PICKUP = deliveryOptions[0]
const SIMPLE = 'simple'
const CUSTOM = 'custom'
const shapeArt: Record<string, string> = {
  Round: '/illustrations/cake-round.png',
  Sheet: '/illustrations/cake-sheet.png',
  'Multi-tier': '/illustrations/cake-tiered.png',
}
const guestPresets = [10, 20, 30, 50, 75, 100]
const money = (n: number) => '$' + (Number.isInteger(n) ? n : n.toFixed(2))
const sizeShort = (cake: CakeSpec) => cake.label.replace(' round', '').replace('-inch', '"')

const empty = {
  guests: '',
  shape: '',
  size: '',
  flavor: '',
  filling: '',
  design: '',
  cakeMessage: '',
  eventType: '',
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

/** A large picture tile, like a card in a quiz, that answers the question. */
function Tile({
  selected,
  onClick,
  title,
  sub,
  art,
  badge,
}: {
  selected: boolean
  onClick: () => void
  title: string
  sub?: string
  art?: React.ReactNode
  badge?: string
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        'relative flex min-h-24 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border bg-card px-3 py-4 text-center transition-colors hover:border-foreground/40 hover:bg-secondary',
        selected && 'border-primary bg-surface text-primary ring-1 ring-primary hover:border-primary hover:bg-surface',
      )}
    >
      {badge && (
        <span className="absolute top-2 right-2 rounded-full bg-primary px-2 py-0.5 text-[0.7rem] font-semibold text-primary-foreground">
          {badge}
        </span>
      )}
      {art && <span className="flex size-16 items-center justify-center text-ink sm:size-20">{art}</span>}
      <span className="text-sm font-semibold">{title}</span>
      {sub && <span className="-mt-1 text-xs text-muted-foreground">{sub}</span>}
    </button>
  )
}
const ShapeArt = ({ shape }: { shape: string }) =>
  shapeArt[shape] ? (
    <Image src={shapeArt[shape]} alt="" width={80} height={80} className="size-full object-contain" />
  ) : (
    <NotSureArt className="size-full" />
  )

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
    if (next !== sections.length - 1) setCardReady(false)
    setStep(next)
    setError('')
    requestAnimationFrame(() => {
      heading.current?.focus({ preventScroll: true })
      const box = top.current?.getBoundingClientRect()
      if (box && box.top < 0) top.current?.scrollIntoView({ block: 'start' })
    })
  }
  // Single-choice tiles answer and move on, so the selection shows for a moment first.
  const pick = <K extends keyof Data>(key: K, value: Data[K]) => {
    set(key, value)
    setTimeout(() => go(step + 1), 180)
  }

  const guests = Number(data.guests)
  const cake = cakeCatalog.find(c => c.value === data.size) ?? null
  const result = useMemo(
    () => (guests > 0 && data.shape ? recommend(guests, data.shape as never, 'Please recommend') : null),
    [guests, data.shape],
  )
  const sizeOptions = useMemo(() => {
    if (!result?.best) return []
    const same = cakeCatalog.filter(c => c.category === result.best!.category).sort((a, b) => a.servings - b.servings)
    const i = same.indexOf(result.best)
    return [same[i - 1], result.best, result.bigger, ...result.others].filter(
      (c, index, list): c is CakeSpec => !!c && list.indexOf(c) === index,
    )
  }, [result])

  // Pay now: an everyday size, a listed flavor and filling, simple design, pickup, and a pickup time we offer.
  const payNow =
    !!square &&
    data.design === SIMPLE &&
    (ORDER_SIZES as readonly string[]).includes(data.size) &&
    ORDER_FLAVORS.includes(data.flavor as never) &&
    ORDER_FILLINGS.includes(data.filling as never) &&
    data.fulfillment === PICKUP
  const today = storeDate(now)
  const minDate = payNow ? today : earliestCakeDate(now)
  const slots = useMemo(() => (payNow && data.date ? pickupSlots(data.date, now) : []), [payNow, data.date, now])
  const decision = payNow && data.date && data.time ? decideOrder(data.size, data.date, data.time, now) : null
  const held = !!(decision?.ok && decision.needsApproval)
  // Keep the date and time valid when the path changes (e.g. switching to delivery needs 3 days' notice).
  useEffect(() => {
    if (data.date && data.date < minDate) setData(d => ({ ...d, date: '', time: '' }))
    else if (payNow && data.time && data.date && !slots.includes(data.time)) setData(d => ({ ...d, time: '' }))
  }, [minDate, payNow, slots]) // eslint-disable-line react-hooks/exhaustive-deps

  const cakePrice = cake ? startingPrice(cake, data.filling) : null
  const fee = deliveryFee(data.fulfillment)
  const total = cakePrice !== null && fee !== null ? cakePrice + fee : null

  const summary: [string, string][] = [
    ['Guests', data.guests],
    ['Size', cake?.label ?? (data.size === 'Not sure' ? 'We’ll suggest' : '')],
    ['Flavor', data.flavor === 'Please recommend' ? 'We’ll recommend' : data.flavor],
    ['Filling', data.filling === 'Please recommend' ? 'We’ll recommend' : data.filling],
    ['Design', data.design === CUSTOM ? 'Custom design' : data.design === SIMPLE ? 'Simple' : ''],
    [
      data.fulfillment === PICKUP ? 'Pickup' : 'Delivery',
      step >= 6 && data.date
        ? [formatEventDate(data.date), payNow ? data.time && formatPickupTime(data.time) : formatEventTime(data.time)]
            .filter(Boolean)
            .join(' · ')
        : '',
    ],
  ]
  const priceText =
    total !== null
      ? money(total)
      : cake && cakePrice === null
        ? money(priceRange(cake)[0])
        : cakePrice !== null
          ? `${money(cakePrice)} + delivery`
          : ''

  // What each step needs before Continue.
  function check(): string {
    if (step === 0 && !(/^\d{1,3}$/.test(data.guests) && guests >= 1)) return 'Enter how many guests, from 1 to 999.'
    if (step === 1 && !data.shape) return 'Choose a shape.'
    if (step === 2 && !data.size) return 'Choose a size.'
    if (step === 3 && !data.flavor) return 'Choose a flavor.'
    if (step === 4 && !data.filling) return 'Choose a filling.'
    if (step === 5 && !data.design) return 'Choose simple or custom design.'
    if (step === 6) {
      if (!data.date) return 'Choose a date.'
      if (payNow && !data.time) return 'Choose a pickup time.'
      if (payNow && decision && !decision.ok) return decision.error
    }
    if (step === 7) {
      if (!data.name.trim()) return 'Enter your name.'
      if (data.phone.replace(/\D/g, '').length < 10) return 'Enter your phone number.'
      if (!/^\S+@\S+\.\S+$/.test(data.email.trim())) return 'Enter a valid email address.'
      if (!payNow && !data.acknowledged) return 'Please tick the box to confirm this is a quote request.'
    }
    return ''
  }
  function next(event?: React.FormEvent) {
    event?.preventDefault()
    const problem = check()
    if (problem) return setError(problem)
    if (step < sections.length - 1) go(step + 1)
    else void submit()
  }

  async function submit() {
    if (busy) return
    setBusy(true)
    setError('')
    requestId.current ||= crypto.randomUUID()
    try {
      if (payNow) {
        if (!card.current || !cardReady || cakePrice === null) throw new Error('Please wait for the card form to load.')
        const cardToken = await card.current.tokenize(cakePrice, data)
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
        setDone({ kind: 'paid', ...body })
      } else {
        const form = new FormData()
        const fields: Record<string, string> = {
          name: data.name,
          email: data.email,
          phone: data.phone,
          eventDate: data.date,
          eventTime: data.time,
          eventType: data.eventType || 'Other',
          servings: data.guests,
          size: data.size || 'Not sure',
          flavor: data.flavor,
          filling: data.filling,
          cakeMessage: data.cakeMessage,
          budget: 'Not sure — please advise',
          fulfillment: data.fulfillment,
          deliveryAddress: data.fulfillment === PICKUP ? '' : data.deliveryAddress,
          notes: data.notes,
          acknowledged: 'yes',
          requestId: requestId.current,
        }
        Object.entries(fields).forEach(([key, value]) => form.set(key, value))
        photos.forEach(file => form.append('photos', file))
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

  const shell = (content: React.ReactNode) => (
    <div
      ref={top}
      className="scroll-mt-32 overflow-hidden rounded-xl border bg-card lg:grid lg:min-h-[40rem] lg:grid-cols-[16rem_1fr]"
    >
      <aside className="relative bg-gradient-to-br from-brand via-brand to-brand-deep px-5 py-4 text-white lg:px-7 lg:py-8">
        <p className="font-serif text-lg lg:text-2xl">Your cake</p>
        <dl className="mt-1 hidden space-y-3 text-sm lg:mt-6 lg:block">
          {summary.map(([label, value]) => (
            <div key={label}>
              <dt className="text-white/70">{label}</dt>
              <dd className="font-semibold">{value || '—'}</dd>
            </div>
          ))}
        </dl>
        <p className="text-sm text-white/90 lg:hidden">
          {[data.guests && `${data.guests} guests`, cake && sizeShort(cake), data.flavor, data.filling]
            .filter(v => v && v !== 'Please recommend')
            .join(' · ') || 'Answer a few questions to build your cake.'}
        </p>
        {priceText && (
          <div className="mt-2 border-white/30 lg:mt-8 lg:border-t lg:pt-5">
            <p className="text-sm text-white/70">{payNow ? 'Total' : 'Starting at'}</p>
            <p className="text-2xl font-semibold tabular-nums lg:text-3xl">{priceText}</p>
          </div>
        )}
        <div aria-hidden="true" className="absolute right-0 bottom-0 left-0 h-1.5 bg-gold lg:hidden" />
      </aside>
      <div className="flex min-w-0 flex-col">{content}</div>
    </div>
  )

  if (done)
    return shell(
      <div role="status" className="space-y-4 card-pad lg:px-14 lg:py-12">
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
      </div>,
    )

  const label = 'mb-2 block text-sm font-semibold'
  const continueButton = (text = 'Continue') => (
    <Button type="submit" loading={busy} disabled={busy || (step === 7 && payNow && !cardReady)} className="mt-8">
      {text}
      {!busy && <ArrowRight aria-hidden="true" />}
    </Button>
  )
  const questions = [
    'How many guests?',
    'What shape would you like?',
    result?.best ? `Our pick for ${guests} guests` : 'Let’s plan it together',
    'Pick a cake flavor',
    'Pick a filling',
    'How should it look?',
    data.fulfillment === PICKUP ? 'When do you need it?' : 'When and where?',
    payNow ? 'Your details & payment' : 'Your details',
  ]

  return shell(
    <form onSubmit={next} noValidate aria-busy={busy} className="flex flex-1 flex-col">
      <div className="flex min-h-14 items-center px-5 pt-3 lg:px-8">
        {step > 0 && (
          <button
            type="button"
            onClick={() => go(step - 1)}
            className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft aria-hidden="true" className="size-4" /> Previous
          </button>
        )}
      </div>

      <div className="mx-auto w-full max-w-2xl flex-1 px-5 pb-10 lg:px-8">
        <p className="eyebrow text-primary">{sections[step]}</p>
        <h2 ref={heading} tabIndex={-1} className="heading-2 mt-1 mb-6 focus:outline-none">
          {questions[step]}
        </h2>

        {step === 0 && (
          <>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
              {guestPresets.map(value => (
                <Tile
                  key={value}
                  title={value === 100 ? '100+' : String(value)}
                  selected={data.guests === String(value)}
                  onClick={() => pick('guests', String(value))}
                />
              ))}
            </div>
            <div className="mt-5 max-w-48">
              <label htmlFor="flow-guests" className={label}>
                Or type a number
              </label>
              <Input
                id="flow-guests"
                type="number"
                inputMode="numeric"
                min={1}
                max={999}
                placeholder="e.g., 24"
                value={data.guests}
                onChange={e => set('guests', e.target.value)}
              />
            </div>
            {continueButton()}
          </>
        )}

        {step === 1 && (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {finderShapes.map(shape => (
                <Tile
                  key={shape.value}
                  title={shape.label}
                  sub={shape.hint}
                  art={<ShapeArt shape={shape.value} />}
                  selected={data.shape === shape.value}
                  onClick={() => {
                    // A new shape means a new size suggestion.
                    setData(d => ({ ...d, size: '' }))
                    pick('shape', shape.value)
                  }}
                />
              ))}
            </div>
            {data.shape && continueButton()}
          </>
        )}

        {step === 2 &&
          (result?.best ? (
            <>
              {result.switched && (
                <p className="-mt-3 mb-5 text-sm text-muted-foreground">
                  Our {finderShapes.find(s => s.value === data.shape)?.label.toLowerCase()} cakes don’t serve that many.
                </p>
              )}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {sizeOptions.map(item => (
                  <Tile
                    key={item.value}
                    title={item.label}
                    sub={`Serves ${item.servings} · from ${money(priceRange(item)[0])}`}
                    badge={item === result.best ? 'Best fit' : undefined}
                    art={<ShapeArt shape={item.category} />}
                    selected={(data.size || result.best!.value) === item.value}
                    onClick={() => pick('size', item.value)}
                  />
                ))}
              </div>
              <Button
                type="button"
                className="mt-8"
                onClick={() => {
                  if (!data.size) set('size', result.best!.value)
                  go(step + 1)
                }}
              >
                Continue <ArrowRight aria-hidden="true" />
              </Button>
            </>
          ) : (
            <>
              <p>
                Our largest cake serves {largestServings}. For a bigger party we can make more than one cake; we’ll plan
                it with you.
              </p>
              <Button
                type="button"
                className="mt-8"
                onClick={() => {
                  set('size', 'Not sure')
                  go(step + 1)
                }}
              >
                Continue <ArrowRight aria-hidden="true" />
              </Button>
            </>
          ))}

        {step === 3 && (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {flavors.map(flavor => {
                const Art = flavorArt[flavor]
                return (
                  <Tile
                    key={flavor}
                    title={flavor === 'Please recommend' ? 'Not sure' : flavor}
                    art={Art ? <Art className="size-full" /> : <NotSureArt className="size-full" />}
                    selected={data.flavor === flavor}
                    onClick={() => pick('flavor', flavor)}
                  />
                )
              })}
            </div>
            {data.flavor && continueButton()}
          </>
        )}

        {step === 4 && (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {fillings.map(filling => {
                const Art = fillingArt[filling]
                const price = cake ? startingPrice(cake, filling) : null
                return (
                  <Tile
                    key={filling}
                    title={
                      filling === 'Please recommend'
                        ? 'Not sure'
                        : filling.startsWith('Something else')
                          ? 'Something else'
                          : filling
                    }
                    sub={price !== null && cake?.category !== 'Multi-tier' ? money(price) : undefined}
                    art={Art ? <Art className="size-full" /> : <NotSureArt className="size-full" />}
                    selected={data.filling === filling}
                    onClick={() => pick('filling', filling)}
                  />
                )
              })}
            </div>
            {data.filling && continueButton()}
          </>
        )}

        {step === 5 && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3">
              <Tile
                title="Simple"
                sub="Our classic look, with writing"
                art={<ShapeArt shape="Round" />}
                selected={data.design === SIMPLE}
                onClick={() => set('design', SIMPLE)}
              />
              <Tile
                title="Custom design"
                sub="Theme, colors, decorations"
                art={<ShapeArt shape="Multi-tier" />}
                selected={data.design === CUSTOM}
                onClick={() => set('design', CUSTOM)}
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
            {data.design === CUSTOM && (
              <>
                <fieldset>
                  <legend className={label}>What’s the occasion?</legend>
                  <div className="flex flex-wrap gap-2">
                    {eventTypes.map(type => (
                      <label key={type} className="cursor-pointer">
                        <input
                          type="radio"
                          name="flow-occasion"
                          value={type}
                          checked={data.eventType === type}
                          onChange={() => set('eventType', type)}
                          className="peer sr-only"
                        />
                        <span className="inline-flex min-h-11 items-center rounded-full border bg-card px-4 text-sm transition-colors peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-foreground peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring hover:border-foreground/40">
                          {type}
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>
                <div>
                  <span className={label}>Inspiration photos (optional)</span>
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
                      'flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed bg-surface px-4 py-3 text-sm font-semibold peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring hover:bg-secondary',
                      (preparing || photos.length >= MAX_PHOTOS) && 'cursor-not-allowed opacity-50',
                    )}
                  >
                    <ImagePlus aria-hidden="true" className="size-5 text-primary" />
                    {preparing
                      ? 'Preparing photo…'
                      : photos.length
                        ? `Add more (${photos.length} of ${MAX_PHOTOS})`
                        : 'Add photos'}
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
            {data.design && continueButton()}
          </div>
        )}

        {step === 6 && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {deliveryOptions.map(option => {
                const [title, cost] = option.split(' — ')
                return (
                  <Tile
                    key={option}
                    title={title.replace(' (within 10 miles)', '')}
                    sub={option === PICKUP ? 'Free' : cost}
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
            {payNow && held && decision?.ok && decision.needsApproval && (
              <p className="rounded-md bg-surface px-4 py-3 text-sm">
                We’ll confirm this order by {formatVegasTime(decision.approveBy.toISOString())}. Your card is held until
                then, not charged.
              </p>
            )}
            {!payNow && (
              <p className="rounded-md bg-surface px-4 py-3 text-sm">
                We’ll send you a quote before you pay. Please allow at least 3 days.
              </p>
            )}
            {continueButton()}
          </div>
        )}

        {step === 7 && (
          <div className="space-y-5">
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
            {error && <FormAlert type="error">{error}</FormAlert>}
            {continueButton(
              busy
                ? payNow
                  ? 'Processing…'
                  : 'Sending…'
                : payNow
                  ? held
                    ? `Place order (hold ${money(cakePrice ?? 0)})`
                    : `Pay ${money(cakePrice ?? 0)}`
                  : 'Send for a quote',
            )}
            {payNow && (
              <p className="text-xs text-muted-foreground">Card details go straight to Square; we never see them.</p>
            )}
          </div>
        )}

        {error && step < 7 && (
          <div className="mt-5">
            <FormAlert type="error">{error}</FormAlert>
          </div>
        )}
      </div>

      <ol aria-label="Progress" className="grid grid-cols-8 gap-1.5 border-t px-5 py-4 lg:gap-3 lg:px-8">
        {sections.map((name, index) => (
          <li key={name} aria-current={index === step ? 'step' : undefined}>
            <span
              aria-hidden="true"
              className={cn(
                'hidden truncate text-xs lg:block',
                index === step ? 'font-semibold text-primary' : 'text-muted-foreground',
              )}
            >
              {name}
            </span>
            <span
              aria-hidden="true"
              className={cn('mt-1.5 block h-1 rounded-full', index <= step ? 'bg-primary' : 'bg-surface')}
            />
            <span className="sr-only">
              {name}
              {index < step ? ' (done)' : ''}
            </span>
          </li>
        ))}
      </ol>
    </form>,
  )
}
