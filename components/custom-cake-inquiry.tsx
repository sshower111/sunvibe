'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ImagePlus, Plus } from 'lucide-react'
import { SITE } from '@/lib/site-info'
import { cn } from '@/lib/utils'
import { cakeCatalog, deliveryOptions, findCake, type CakeSpec } from '@/lib/cake-catalog'
import { deliveryFee, priceRange, recommend, startingPrice } from '@/lib/cake-finder'
import {
  budgets,
  designStyles,
  earliestCakeDate,
  eventTypes,
  fillings,
  flavors,
  MAX_CAKE_MESSAGE,
  MAX_PHOTO_BYTES,
  MAX_REFERENCE_LINK,
  MAX_REFERENCE_LINKS,
  STYLE_SEPARATOR,
} from '@/lib/cake-inquiry'
import { formatPhone } from '@/lib/form-helpers'
import { prepareGalleryPhoto } from '@/lib/prepare-gallery-photo'
import { ContactCaptcha, type CaptchaHandle } from '@/components/contact-captcha'
import { EmailInput } from '@/components/email-input'
import { EventDatePicker } from '@/components/event-date-picker'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { FormAlert } from '@/components/ui/form-message'

// Custom cake quote request on /custom-cakes (POST /api/custom-cakes): event → design → contact.
// Beside it on wide screens (inline on phones): a size guide to pick the size from, and a starting price.

const steps = ['Event', 'Design', 'Contact'] as const
const PICKUP = deliveryOptions[0]
const DELIVERIES = deliveryOptions.slice(1)
const money = (n: number) => '$' + n
const sizeGroups = [
  ['Round', 'Round'],
  ['Sheet', 'Sheet'],
  ['Multi-tier', 'Tiered'],
] as const
const NOT_SURE = 'Not sure'
const MAX_INSPIRATION = 3
const guestPresets = [10, 20, 30, 50, 75, 100]
/** Phones and tablets. */
const narrow = () => window.matchMedia('(max-width: 1023px)').matches
const notSure = (value: string) => (value === 'Please recommend' ? 'Not sure yet' : value)

const empty = {
  date: '',
  eventType: '',
  guests: '',
  size: NOT_SURE,
  budget: budgets[0] as string,
  delivery: false,
  deliveryOption: '',
  deliveryAddress: '',
  styles: [] as string[],
  links: [''],
  flavor: 'Please recommend',
  filling: 'Please recommend',
  cakeMessage: '',
  notes: '',
  name: '',
  email: '',
  phone: '',
  textOk: false,
}
type Data = typeof empty

function Tile({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        'flex min-h-14 w-full cursor-pointer items-center justify-center rounded-lg border bg-card px-3 py-3 text-center font-semibold transition-colors hover:border-foreground/40 hover:bg-secondary',
        selected && 'border-primary bg-primary text-primary-foreground hover:border-primary hover:bg-primary',
      )}
    >
      {children}
    </button>
  )
}

/** Sizes to tap, with servings and starting prices. "Best fit" marks the suggestion for the guest count. */
function SizeGuide({
  value,
  onChange,
  bestFit,
}: {
  value: string
  onChange: (value: string) => void
  bestFit?: CakeSpec | null
}) {
  const row = (selected: boolean) =>
    cn(
      'flex min-h-11 w-full cursor-pointer items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-secondary',
      selected && 'bg-primary text-primary-foreground hover:bg-primary',
    )
  return (
    <div className="space-y-4">
      <button
        type="button"
        aria-pressed={value === NOT_SURE}
        onClick={() => onChange(NOT_SURE)}
        className={row(value === NOT_SURE)}
      >
        <span className="font-semibold">Not sure, please suggest</span>
      </button>
      {sizeGroups.map(([category, name]) => (
        <div key={category}>
          <p className="mb-1 px-3 text-xs font-semibold tracking-wide text-muted-foreground">{name}</p>
          <ul>
            {cakeCatalog
              .filter(cake => cake.category === category)
              .map(cake => {
                const selected = value === cake.value
                const range = priceRange(cake)
                return (
                  <li key={cake.value}>
                    <button
                      type="button"
                      aria-pressed={selected}
                      onClick={() => onChange(cake.value)}
                      className={row(selected)}
                    >
                      <span className="min-w-0">
                        <span className="font-semibold">
                          {cake.label.replace(' round', '').replace(/^\d-Tier · /, '')}
                        </span>
                        <span
                          className={cn(
                            'block text-xs',
                            selected ? 'text-primary-foreground/85' : 'text-muted-foreground',
                          )}
                        >
                          Serves {cake.servings}
                          {bestFit?.value === cake.value && ' · Best fit'}
                        </span>
                      </span>
                      <span className="price shrink-0">{range ? `from ${money(range[0])}` : 'quoted'}</span>
                    </button>
                  </li>
                )
              })}
          </ul>
        </div>
      ))}
    </div>
  )
}

function PhotoPreview({ file }: { file: File }) {
  const [url, setUrl] = useState('')
  useEffect(() => {
    const value = URL.createObjectURL(file)
    setUrl(value)
    return () => URL.revokeObjectURL(value)
  }, [file])
  return url ? <img src={url} alt="Your inspiration photo" className="size-20 rounded-md object-cover" /> : null
}

export function CustomCakeInquiry() {
  const [data, setData] = useState<Data>(empty)
  const [photos, setPhotos] = useState<File[]>([])
  const [step, setStep] = useState(0)
  const [error, setError] = useState('')
  const [invalid, setInvalid] = useState('')
  const [preparing, setPreparing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const top = useRef<HTMLDivElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const captcha = useRef<CaptchaHandle>(null)
  const requestId = useRef('')
  const minDate = earliestCakeDate()

  const set = <K extends keyof Data>(key: K, value: Data[K]) => {
    setData(d => ({ ...d, [key]: value }))
    setError('')
    setInvalid('')
    requestId.current = ''
  }
  const go = (next: number) => {
    setStep(next)
    setError('')
    setInvalid('')
    requestAnimationFrame(() => {
      heading.current?.focus({ preventScroll: true })
      const box = top.current?.getBoundingClientRect()
      if (box && (box.top < 0 || (narrow() && box.top > 1))) top.current?.scrollIntoView({ block: 'start' })
    })
  }

  const guestCount = (value: string) => (/^\d{1,3}$/.test(value) ? Number(value) : 0)
  const bestFitFor = (count: number) => (count > 0 ? recommend(count, 'Any', 'Please recommend').best : null)
  const guests = guestCount(data.guests)
  const bestFit = useMemo(() => bestFitFor(guests), [guests])
  /** A new guest count selects its best-fit size (the customer can still pick another in the size guide). */
  const setGuests = (value: string) => {
    set('guests', value)
    setData(d => ({ ...d, size: bestFitFor(guestCount(value))?.value ?? NOT_SURE }))
  }
  const fulfillment = data.delivery ? data.deliveryOption : PICKUP
  // Starting price: the cake (by filling when one is chosen) plus delivery. The design is quoted on top.
  const cake = findCake(data.size)
  const cakeFrom = cake ? (startingPrice(cake, data.filling) ?? priceRange(cake)?.[0] ?? null) : null
  const fee = data.delivery ? (data.deliveryOption ? deliveryFee(data.deliveryOption) : null) : 0
  const sizeText = !cake ? 'We’ll suggest one' : cake === bestFit ? `${cake.label} (best fit)` : cake.label
  const estimate = (
    <dl className="space-y-2 text-sm">
      <div className="flex justify-between gap-3">
        <dt className="text-muted-foreground">Cake</dt>
        <dd className="text-right font-semibold">{sizeText}</dd>
      </div>
      <div className="flex justify-between gap-3">
        <dt className="text-muted-foreground">{data.delivery ? 'Delivery' : 'Pickup'}</dt>
        <dd className="text-right font-semibold">
          {!data.delivery ? 'Free' : fee === null ? (data.deliveryOption ? 'Quoted' : 'Choose an option') : money(fee)}
        </dd>
      </div>
      {cakeFrom !== null && (
        <div className="flex items-baseline justify-between gap-3 border-t pt-2">
          <dt className="font-semibold">Starting at</dt>
          <dd className="price text-2xl text-primary">{money(cakeFrom + (fee ?? 0))}</dd>
        </div>
      )}
    </dl>
  )

  /** [message, id of the field to mark] */
  function check(): [string, string] | null {
    if (step === 0) {
      if (!data.date) return ['Choose your event date.', 'ci-date']
      if (!data.eventType) return ['Choose the occasion.', 'ci-event']
      if (!guests) return ['Enter how many guests.', 'ci-guests']
      if (data.delivery && !data.deliveryOption) return ['Choose a delivery option.', 'ci-delivery']
      if (data.delivery && !data.deliveryAddress.trim()) return ['Enter the delivery address or hotel.', 'ci-address']
    }
    if (step === 2) {
      if (!data.name.trim()) return ['Enter your full name.', 'ci-name']
      if (!/^\S+@\S+\.\S+$/.test(data.email.trim())) return ['Enter a valid email address.', 'ci-email']
      if (data.phone.replace(/\D/g, '').length !== 10) return ['Enter your mobile number.', 'ci-phone']
    }
    return null
  }
  function next(event: React.FormEvent) {
    event.preventDefault()
    const problem = check()
    if (problem) {
      setError(problem[0])
      setInvalid(problem[1])
      document.getElementById(problem[1])?.focus()
      return
    }
    if (step < 2) go(step + 1)
    else void submit()
  }

  async function submit() {
    if (busy) return
    setBusy(true)
    setError('')
    requestId.current ||= crypto.randomUUID()
    try {
      const form = new FormData()
      const fields: Record<string, string> = {
        name: data.name,
        email: data.email,
        phone: data.phone,
        eventDate: data.date,
        eventTime: '',
        eventType: data.eventType,
        servings: String(guests),
        size: data.size,
        flavor: data.flavor,
        filling: data.filling,
        cakeMessage: data.cakeMessage,
        budget: data.budget,
        designStyle: designStyles.filter(style => data.styles.includes(style)).join(STYLE_SEPARATOR),
        referenceLink: data.links
          .map(link => link.trim())
          .filter(Boolean)
          .join('\n'),
        textOk: data.textOk ? 'yes' : 'no',
        fulfillment,
        deliveryAddress: data.delivery ? data.deliveryAddress : '',
        notes: data.notes,
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
      setSent(true)
      requestAnimationFrame(() => top.current?.scrollIntoView({ block: 'start' }))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Please try again.')
    } finally {
      setBusy(false)
    }
  }

  if (sent)
    return (
      <div
        ref={top}
        role="status"
        className="mx-auto max-w-2xl space-y-4 rounded-lg border bg-card card-pad text-center"
      >
        <h2 className="heading-2">Inquiry received!</h2>
        <p className="text-lg">
          Our kitchen team reviews custom requests daily and will send your official quote via email/text within 24–48
          hours.
        </p>
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
  const bad = (id: string) => (invalid === id ? 'true' : undefined)

  return (
    <div
      ref={top}
      className="mx-auto grid max-w-6xl scroll-mt-[var(--header-height)] items-start gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]"
    >
      {/* Wide screens: the size guide and starting price stay beside the questions. */}
      <aside
        aria-label="Size guide"
        className="sticky top-[calc(var(--header-height)+1.5rem)] order-last hidden max-h-[calc(100dvh-var(--header-height)-3rem)] overflow-y-auto rounded-lg bg-surface p-5 lg:block"
      >
        <div className="mb-5 rounded-md bg-card p-4">{estimate}</div>
        <p className="heading-3 mb-3">Size guide</p>
        <SizeGuide value={data.size} onChange={value => set('size', value)} bestFit={bestFit} />
      </aside>
      <form
        onSubmit={next}
        noValidate
        aria-busy={busy}
        className="min-w-0 sm:rounded-lg sm:border sm:bg-card sm:card-pad"
      >
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
          {['Your event', 'Your design', 'Your details'][step]}
        </h2>

        <fieldset disabled={busy} className="min-w-0 space-y-6">
          <legend className="sr-only">{steps[step]}</legend>

          {step === 0 && (
            <>
              <div>
                <label htmlFor="ci-date" className={label}>
                  Event date
                </label>
                <EventDatePicker
                  id="ci-date"
                  value={data.date}
                  minDate={minDate}
                  invalid={invalid === 'ci-date'}
                  onChange={value => set('date', value)}
                />
              </div>
              <fieldset id="ci-event" tabIndex={-1} aria-invalid={bad('ci-event')}>
                <legend className={label}>Occasion</legend>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {eventTypes.map(type => (
                    <Tile key={type} selected={data.eventType === type} onClick={() => set('eventType', type)}>
                      {type}
                    </Tile>
                  ))}
                </div>
              </fieldset>
              <fieldset>
                <legend className={label}>Guests</legend>
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
                  {guestPresets.map(value => (
                    <Tile key={value} selected={data.guests === String(value)} onClick={() => setGuests(String(value))}>
                      {value === 100 ? '100+' : value}
                    </Tile>
                  ))}
                </div>
                <div className="mt-3 flex max-w-xs items-center gap-3">
                  <label htmlFor="ci-guests" className="shrink-0 text-sm">
                    Or type a number
                  </label>
                  <Input
                    id="ci-guests"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={999}
                    placeholder="e.g., 24"
                    aria-invalid={bad('ci-guests')}
                    value={data.guests}
                    onChange={e => setGuests(e.target.value)}
                  />
                </div>
              </fieldset>
              {/* Phones and tablets: the size guide in the step (it sits beside the form on wide screens). */}
              <fieldset className="lg:hidden">
                <legend className={label}>Cake size</legend>
                <div className="rounded-lg bg-surface p-3">
                  <SizeGuide value={data.size} onChange={value => set('size', value)} bestFit={bestFit} />
                </div>
              </fieldset>
              <div>
                <label htmlFor="ci-budget" className={label}>
                  Budget
                </label>
                <NativeSelect id="ci-budget" value={data.budget} onChange={e => set('budget', e.target.value)}>
                  {budgets.map(budget => (
                    <option key={budget} value={budget}>
                      {budget === budgets[0] ? 'Not sure yet' : budget}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <fieldset>
                <legend className={label}>Pickup or delivery</legend>
                <div className="grid grid-cols-2 gap-3">
                  <Tile selected={!data.delivery} onClick={() => set('delivery', false)}>
                    <span>
                      Pickup
                      <span className="block text-sm font-normal opacity-85">{SITE.street}</span>
                    </span>
                  </Tile>
                  <Tile selected={data.delivery} onClick={() => set('delivery', true)}>
                    <span>
                      Delivery
                      <span className="block text-sm font-normal opacity-85">from {money(30)}</span>
                    </span>
                  </Tile>
                </div>
              </fieldset>
              {data.delivery && (
                <>
                  <fieldset id="ci-delivery" tabIndex={-1} aria-invalid={bad('ci-delivery')}>
                    <legend className={label}>Delivery to</legend>
                    <div className="grid gap-3 sm:grid-cols-3">
                      {DELIVERIES.map(option => {
                        const [title, cost] = option.split(' — ')
                        return (
                          <Tile
                            key={option}
                            selected={data.deliveryOption === option}
                            onClick={() => set('deliveryOption', option)}
                          >
                            <span>
                              {title}
                              <span className="block text-sm font-normal opacity-85">
                                {cost === 'please advise' ? 'Quoted' : cost}
                              </span>
                            </span>
                          </Tile>
                        )
                      })}
                    </div>
                  </fieldset>
                  <div>
                    <label htmlFor="ci-address" className={label}>
                      Delivery address or hotel
                    </label>
                    <Input
                      id="ci-address"
                      autoComplete="street-address"
                      maxLength={500}
                      aria-invalid={bad('ci-address')}
                      value={data.deliveryAddress}
                      onChange={e => set('deliveryAddress', e.target.value)}
                    />
                  </div>
                </>
              )}
              {/* Phones and tablets: the starting price under the questions. */}
              <div className="rounded-lg bg-surface p-4 lg:hidden">{estimate}</div>
            </>
          )}

          {step === 1 && (
            <>
              <div className="space-y-5 rounded-lg border border-dashed border-primary/40 bg-surface p-4 sm:p-5">
                <p className="text-sm">
                  Adding a photo or link helps our decorators provide the most accurate quote and ensures we match your
                  exact vision!
                </p>
                <div>
                  <input
                    id="ci-photos"
                    type="file"
                    multiple
                    className="peer sr-only"
                    disabled={preparing || photos.length >= MAX_INSPIRATION}
                    accept="image/jpeg,image/png,image/heic,image/heif,.heic,.heif"
                    onChange={async event => {
                      const selected = Array.from(event.target.files || [])
                      event.target.value = ''
                      if (photos.length + selected.length > MAX_INSPIRATION)
                        return setError(`Please choose up to ${MAX_INSPIRATION} photos.`)
                      setPreparing(true)
                      setError('')
                      setInvalid('')
                      try {
                        const prepared: File[] = []
                        for (const file of selected)
                          prepared.push(await prepareGalleryPhoto(file, { maxSide: 1400, maxBytes: MAX_PHOTO_BYTES }))
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
                    htmlFor="ci-photos"
                    className={cn(
                      'flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-md border bg-card px-4 py-3 text-sm font-semibold peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring hover:bg-secondary',
                      (preparing || photos.length >= MAX_INSPIRATION) && 'cursor-not-allowed opacity-50',
                    )}
                  >
                    <ImagePlus aria-hidden="true" className="size-5 text-primary" />
                    {preparing
                      ? 'Preparing photo…'
                      : photos.length
                        ? `Add more (${photos.length} of ${MAX_INSPIRATION})`
                        : 'Upload inspiration photos'}
                  </label>
                  {photos.length > 0 && (
                    <ul className="mt-3 flex flex-wrap gap-3">
                      {photos.map((file, index) => (
                        <li key={file.name + index} className="relative">
                          <PhotoPreview file={file} />
                          <button
                            type="button"
                            aria-label={`Remove photo ${index + 1}`}
                            onClick={() => {
                              setPhotos(current => current.filter((_, i) => i !== index))
                              requestId.current = ''
                            }}
                            className="absolute -top-3 -right-3 flex size-8 cursor-pointer items-center justify-center rounded-full bg-ink text-sm text-white"
                          >
                            ×
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="space-y-2">
                  <label htmlFor="ci-link-0" className={label}>
                    Instagram, Pinterest or web links
                  </label>
                  {data.links.map((link, index) => (
                    <Input
                      key={index}
                      id={`ci-link-${index}`}
                      type="url"
                      inputMode="url"
                      autoComplete="off"
                      maxLength={MAX_REFERENCE_LINK}
                      placeholder="https://"
                      aria-label={index ? `Link ${index + 1}` : undefined}
                      value={link}
                      onChange={e =>
                        set(
                          'links',
                          data.links.map((l, i) => (i === index ? e.target.value : l)),
                        )
                      }
                    />
                  ))}
                  {data.links.length < MAX_REFERENCE_LINKS && (
                    <button
                      type="button"
                      onClick={() => {
                        set('links', [...data.links, ''])
                        requestAnimationFrame(() => document.getElementById(`ci-link-${data.links.length}`)?.focus())
                      }}
                      className="inline-flex min-h-11 cursor-pointer items-center gap-1 text-sm font-semibold text-primary"
                    >
                      <Plus aria-hidden="true" className="size-4" />
                      Add another link
                    </button>
                  )}
                </div>
                <fieldset>
                  <legend className={label}>Styles</legend>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {designStyles.map(style => (
                      <Tile
                        key={style}
                        selected={data.styles.includes(style)}
                        onClick={() => {
                          setData(d => ({
                            ...d,
                            styles: d.styles.includes(style) ? d.styles.filter(s => s !== style) : [...d.styles, style],
                          }))
                          requestId.current = ''
                        }}
                      >
                        {style}
                      </Tile>
                    ))}
                  </div>
                </fieldset>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="ci-flavor" className={label}>
                    Cake flavor
                  </label>
                  <NativeSelect id="ci-flavor" value={data.flavor} onChange={e => set('flavor', e.target.value)}>
                    {flavors.map(flavor => (
                      <option key={flavor} value={flavor}>
                        {notSure(flavor)}
                      </option>
                    ))}
                  </NativeSelect>
                </div>
                <div>
                  <label htmlFor="ci-filling" className={label}>
                    Filling
                  </label>
                  <NativeSelect id="ci-filling" value={data.filling} onChange={e => set('filling', e.target.value)}>
                    {/* A filling we don't list goes in the notes. */}
                    {fillings
                      .filter(filling => !filling.startsWith('Something else'))
                      .map(filling => (
                        <option key={filling} value={filling}>
                          {notSure(filling)}
                        </option>
                      ))}
                  </NativeSelect>
                </div>
              </div>
              <div>
                <label htmlFor="ci-message" className={label}>
                  Writing on the cake or plaque (optional)
                </label>
                <Input
                  id="ci-message"
                  maxLength={MAX_CAKE_MESSAGE}
                  autoComplete="off"
                  placeholder="Happy 30th Birthday Amy"
                  value={data.cakeMessage}
                  onChange={e => set('cakeMessage', e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="ci-notes" className={label}>
                  Details (optional)
                </label>
                <Textarea
                  id="ci-notes"
                  rows={4}
                  maxLength={3000}
                  placeholder="Colors, theme, decorations, allergies…"
                  value={data.notes}
                  onChange={e => set('notes', e.target.value)}
                />
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div>
                <label htmlFor="ci-name" className={label}>
                  Full name
                </label>
                <Input
                  id="ci-name"
                  autoComplete="name"
                  maxLength={100}
                  aria-invalid={bad('ci-name')}
                  value={data.name}
                  onChange={e => set('name', e.target.value)}
                />
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="ci-email" className={label}>
                    Email address
                  </label>
                  <EmailInput
                    id="ci-email"
                    type="email"
                    autoComplete="email"
                    maxLength={100}
                    placeholder="you@example.com"
                    aria-invalid={bad('ci-email')}
                    value={data.email}
                    onChange={e => set('email', e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="ci-phone" className={label}>
                    Mobile phone
                  </label>
                  <Input
                    id="ci-phone"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    maxLength={14}
                    placeholder="(702) 555-0123"
                    aria-invalid={bad('ci-phone')}
                    value={data.phone}
                    onChange={e => set('phone', formatPhone(e.target.value))}
                  />
                </div>
              </div>
              <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-md border p-3 text-sm">
                <input
                  type="checkbox"
                  className="size-5 shrink-0 accent-primary"
                  checked={data.textOk}
                  onChange={e => set('textOk', e.target.checked)}
                />
                <span>OK to text updates regarding this quote.</span>
              </label>
              <ContactCaptcha ref={captcha} action="custom_cake" />
            </>
          )}

          {error && <FormAlert type="error">{error}</FormAlert>}
          <div
            className={cn(
              'flex justify-center border-t pt-6',
              'max-sm:sticky max-sm:bottom-0 max-sm:z-20 max-sm:-mx-[var(--gutter)] max-sm:bg-background max-sm:px-[var(--gutter)] max-sm:pt-3 max-sm:pb-[max(0.75rem,env(safe-area-inset-bottom))] max-sm:shadow-pop',
            )}
          >
            <Button type="submit" loading={busy} disabled={busy || preparing} className="w-full sm:w-auto sm:min-w-56">
              {step < 2 ? 'Next' : busy ? 'Sending…' : 'Request a quote'}
            </Button>
          </div>
        </fieldset>
      </form>
    </div>
  )
}
