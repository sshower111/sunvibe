'use client'

import { SITE } from '@/lib/site-info'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { NativeSelect } from '@/components/ui/select'
import { ContactCaptcha, type CaptchaHandle } from '@/components/contact-captcha'
import {
  cakeInquirySchema,
  eventTypes,
  budgets,
  flavors,
  fillings,
  CUSTOM_FILLING,
  MAX_CAKE_MESSAGE,
  formatEventTime,
  MAX_PHOTO_BYTES,
  MAX_PHOTOS,
} from '@/lib/cake-inquiry'

import { cakeCatalog, cakeLabel, deliveryOptions } from '@/lib/cake-catalog'
import { prepareGalleryPhoto } from '@/lib/prepare-gallery-photo'
import { formatPhone } from '@/lib/form-helpers'
import { EmailInput } from '@/components/email-input'
import { EventDatePicker } from '@/components/event-date-picker'
import { FieldError, FormAlert } from '@/components/ui/form-message'
import { ImagePlus } from 'lucide-react'
import { useCakePlan } from '@/components/cake-plan'

const steps = ['Your event', 'Your cake', 'Contact & photos', 'Review & send']
const fieldsByStep = [
  ['eventDate', 'eventTime', 'eventType', 'fulfillment', 'deliveryAddress'],
  ['servings', 'size', 'flavor', 'filling', 'cakeMessage', 'budget'],
  ['name', 'email', 'phone', 'notes'],
  ['acknowledged'],
]
const initial = {
  name: '',
  email: '',
  phone: '',
  eventDate: '',
  eventTime: '',
  eventType: 'Birthday',
  servings: '',
  size: 'Not sure',
  flavor: 'Please recommend',
  filling: 'Please recommend',
  cakeMessage: '',
  budget: 'Not sure — please advise',
  fulfillment: 'Pickup',
  deliveryAddress: '',
  notes: '',
  acknowledged: '',
}
type Field = keyof typeof initial
const fieldOrder = fieldsByStep.flat()
function PhotoPreview({ file }: { file: File }) {
  const [url, setUrl] = useState('')
  useEffect(() => {
    const value = URL.createObjectURL(file)
    setUrl(value)
    return () => URL.revokeObjectURL(value)
  }, [file])
  return url ? (
    <img src={url} alt="Your inspiration reference" className="h-16 w-16 shrink-0 rounded-md object-cover" />
  ) : null
}
export function CakeInquiryForm({ minDate }: { minDate: string }) {
  const [data, setData] = useState(initial)
  const [step, setStep] = useState(0)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [photos, setPhotos] = useState<File[]>([])
  const [uploadError, setUploadError] = useState('')
  const [preparing, setPreparing] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const captcha = useRef<CaptchaHandle>(null)
  const requestId = useRef('')
  const sending = useRef(false)
  const heading = useRef<HTMLHeadingElement>(null)
  const feedback = useRef<HTMLDivElement>(null)
  const plan = useCakePlan()?.plan
  const [prefilled, setPrefilled] = useState(false)
  const update = (key: Field, value: string) => {
    setData(current => ({ ...current, [key]: value }))
    setErrors(current => ({ ...current, [key]: '' }))
    requestId.current = ''
  }
  const hints: Partial<Record<Field, string>> = {
    eventDate: 'Choose a date at least 3 days away.',
    eventTime: 'Leave blank if not decided yet.',
    fulfillment:
      data.fulfillment === 'Pickup'
        ? `Pickup: ${SITE.street}, Las Vegas.`
        : 'Delivery availability and destination are confirmed with your quote.',
    cakeMessage: 'Exactly as it should appear. Leave blank for no writing.',
    budget: 'Your budget helps us plan; it isn’t a price quote.',
  }
  const navigate = (value: number) => {
    setStep(value)
    setError('')
    requestAnimationFrame(() => {
      heading.current?.focus()
      heading.current?.scrollIntoView({ block: 'start', behavior: 'instant' })
    })
  }
  // "Use this for my inquiry" in the size finder: copy its answers in, then show the cake step
  // (or the event step first if the date isn't filled in yet). Everything stays editable.
  const dateRef = useRef('')
  dateRef.current = data.eventDate
  useEffect(() => {
    if (!plan) return
    const { id: _id, ...fields } = plan
    setData(current => ({ ...current, ...fields }))
    setErrors({})
    setSent(false)
    setPrefilled(true)
    requestId.current = ''
    navigate(dateRef.current ? 1 : 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan?.id])
  const control = (key: Field) => ({
    id: `cake-${key}`,
    name: key,
    value: data[key],
    'aria-invalid': !!errors[key],
    'aria-describedby':
      [hints[key] && `cake-${key}-hint`, errors[key] && 'cake-form-errors'].filter(Boolean).join(' ') || undefined,
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      update(key, event.target.value),
  })
  // Field problems are listed together above the submit button (see the error summary below).
  const field = (key: Field, label: string, child: React.ReactNode) => (
    <div className="min-w-0">
      <label htmlFor={`cake-${key}`} className="mb-2 block text-sm font-semibold">
        {label}
      </label>
      {child}
      {hints[key] && (
        <p id={`cake-${key}-hint`} className="mt-2 text-sm text-muted-foreground">
          {hints[key]}
        </p>
      )}
    </div>
  )
  const fieldMessages = [...new Set(fieldOrder.map(key => errors[key]).filter(Boolean))]
  const validate = (all = false) => {
    const result = cakeInquirySchema.safeParse(data)
    const issues = result.success
      ? []
      : result.error.issues.filter(issue => all || fieldsByStep[step].includes(String(issue.path[0])))
    if (!issues.length) {
      setErrors({})
      return true
    }
    const next: Record<string, string> = {}
    for (const issue of issues) next[String(issue.path[0])] ||= issue.message
    setErrors(next)
    const first = String(issues[0].path[0])
    const target = fieldsByStep.findIndex(fields => fields.includes(first))
    if (target >= 0) setStep(target)
    requestAnimationFrame(() => document.getElementById(`cake-${first}`)?.focus())
    return false
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (sending.current) return
    if (step < 3) {
      if (validate()) navigate(step + 1)
      return
    }
    if (!validate(true)) return
    sending.current = true
    setBusy(true)
    setError('')
    requestId.current ||= crypto.randomUUID()
    const form = new FormData()
    Object.entries(data).forEach(([key, value]) => form.set(key, value))
    photos.forEach(file => form.append('photos', file))
    form.set('requestId', requestId.current)
    try {
      const token = await captcha.current?.verify()
      if (!token) throw new Error('Unable to verify your request. Please try again.')
      form.set('captchaToken', token)
      const response = await fetch('/api/custom-cakes', { method: 'POST', body: form })
      const result = await response.json()
      if (!response.ok) {
        if (result.fields) {
          const next = Object.fromEntries(
            Object.entries(result.fields as Record<string, string[]>).map(([key, messages]) => [key, messages[0]]),
          )
          setErrors(next)
          const first = Object.keys(next)[0]
          const target = fieldsByStep.findIndex(fields => fields.includes(first))
          if (target >= 0) setStep(target)
          requestAnimationFrame(() => document.getElementById(`cake-${first}`)?.focus())
        }
        throw new Error(result.error || 'Unable to send your inquiry. Please try again.')
      }
      setSent(true)
      setPhotos([])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to send your inquiry. Please try again.')
    } finally {
      sending.current = false
      setBusy(false)
      requestAnimationFrame(() => feedback.current?.focus())
    }
  }
  if (sent)
    return (
      <div
        ref={feedback}
        tabIndex={-1}
        role="status"
        className="rounded-lg border border-success/25 bg-success-tint card-pad"
      >
        <h2 className="heading-2">Your cake inquiry is on its way</h2>
        <p className="mt-4">
          Thanks, {data.name}. We’ve emailed a copy to {data.email} and will contact you with availability and a quote.
        </p>
        <p className="mt-3">Need to add or change something? Reply to that email instead of sending another form.</p>
        <p className="mt-3 font-semibold">Your order and date are not confirmed yet.</p>
        <p className="mt-3">
          Prefer to talk? Call{' '}
          <a href={SITE.phoneHref} className="text-primary underline">
            {SITE.phone}
          </a>
          .
        </p>
      </div>
    )
  return (
    <form method="post" onSubmit={submit} noValidate aria-busy={busy} className="rounded-lg border bg-card card-pad">
      <ol aria-label="Inquiry progress" className="mb-8 grid grid-cols-4 gap-2">
        {steps.map((name, index) => (
          <li
            key={name}
            aria-current={step === index ? 'step' : undefined}
            className={`border-t-4 pt-3 transition-colors ${index <= step ? 'border-primary' : 'border-border'}`}
          >
            <span className={`block text-xs font-semibold ${index <= step ? 'text-primary' : 'text-muted-foreground'}`}>
              {index + 1}
            </span>
            <span
              className={`mt-1 text-xs sm:text-sm ${step === index ? 'block font-semibold' : 'hidden sm:block text-muted-foreground'}`}
            >
              {name}
            </span>
          </li>
        ))}
      </ol>
      {prefilled && step < 2 && (
        <p role="status" className="mb-6 rounded-md bg-surface px-4 py-3 text-sm">
          We filled in your cake from the size finder. Change anything you like.
        </p>
      )}
      <p className="eyebrow mb-1">Step {step + 1} of 4</p>
      <h3 ref={heading} tabIndex={-1} className="heading-3 mb-6 scroll-mt-32 focus:outline-none">
        {steps[step]}
      </h3>
      <fieldset disabled={busy} className="min-w-0 space-y-5">
        <legend className="sr-only">{steps[step]}</legend>
        {step === 0 && (
          <>
            <div className="grid gap-5 sm:grid-cols-2">
              {field(
                'eventType',
                'What are you celebrating?',
                <NativeSelect {...control('eventType')}>
                  {eventTypes.map(value => (
                    <option key={value}>{value}</option>
                  ))}
                </NativeSelect>,
              )}
              {field(
                'eventDate',
                'Event date',
                <EventDatePicker
                  id="cake-eventDate"
                  value={data.eventDate}
                  minDate={minDate}
                  onChange={value => update('eventDate', value)}
                  invalid={!!errors.eventDate}
                  describedBy={control('eventDate')['aria-describedby']}
                />,
              )}
              {field('eventTime', 'Event time (optional)', <Input {...control('eventTime')} type="time" step={900} />)}
            </div>
            {data.fulfillment !== 'Pickup' &&
              field(
                'deliveryAddress',
                'Delivery address / hotel (optional)',
                <Input
                  {...control('deliveryAddress')}
                  autoComplete="street-address"
                  maxLength={500}
                  placeholder="Address, venue, or hotel name"
                />,
              )}
            {field(
              'fulfillment',
              'How would you like to receive your cake?',
              <NativeSelect {...control('fulfillment')}>
                {deliveryOptions.map(value => (
                  <option key={value}>{value}</option>
                ))}
              </NativeSelect>,
            )}
          </>
        )}
        {step === 1 && (
          <>
            <div className="grid gap-5 sm:grid-cols-2">
              {field(
                'servings',
                'How many servings do you need?',
                <Input
                  {...control('servings')}
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={999}
                  required
                  placeholder="e.g., 12"
                />,
              )}
              {field(
                'size',
                'Preferred cake size',
                <NativeSelect {...control('size')}>
                  <option>Not sure</option>
                  {['Round', 'Sheet', 'Multi-tier'].map(category => (
                    <optgroup key={category} label={category}>
                      {cakeCatalog
                        .filter(cake => cake.category === category)
                        .map(cake => (
                          <option key={cake.value} value={cake.value}>
                            {cake.label}
                          </option>
                        ))}
                    </optgroup>
                  ))}
                </NativeSelect>,
              )}
              {field(
                'flavor',
                'Flavor preference',
                <NativeSelect {...control('flavor')}>
                  {flavors.map(value => (
                    <option key={value}>{value}</option>
                  ))}
                </NativeSelect>,
              )}
              {field(
                'filling',
                'Filling preference',
                <NativeSelect {...control('filling')}>
                  {fillings.map(value => (
                    <option key={value}>{value}</option>
                  ))}
                </NativeSelect>,
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              For 4+ tier cakes,{' '}
              <a
                href={SITE.phoneHref}
                className="inline-flex min-h-12 items-center font-semibold text-primary underline underline-offset-4"
              >
                call {SITE.phone}
              </a>
              .
            </p>
            {data.filling === CUSTOM_FILLING && (
              <p className="text-sm text-muted-foreground">
                Tell us the filling you’d like in the notes (next step). We’ll let you know if we can make it.
              </p>
            )}
            {field(
              'cakeMessage',
              'Writing on the cake (optional)',
              <Input
                {...control('cakeMessage')}
                maxLength={MAX_CAKE_MESSAGE}
                autoComplete="off"
                placeholder="e.g., Happy 30th Birthday, Amy!"
              />,
            )}
            {field(
              'budget',
              'Your cake budget',
              <NativeSelect {...control('budget')}>
                {budgets.map(value => (
                  <option key={value}>{value}</option>
                ))}
              </NativeSelect>,
            )}
          </>
        )}
        {step === 2 && (
          <>
            {field(
              'name',
              'Your name',
              <Input {...control('name')} autoComplete="name" maxLength={100} required placeholder="Full name" />,
            )}
            <div className="grid gap-5 sm:grid-cols-2">
              {field(
                'email',
                'Email',
                <EmailInput
                  {...control('email')}
                  autoComplete="email"
                  maxLength={100}
                  required
                  placeholder="you@example.com"
                />,
              )}
              {field(
                'phone',
                'Phone number',
                <Input
                  {...control('phone')}
                  onChange={event => update('phone', formatPhone(event.target.value))}
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  maxLength={14}
                  required
                  placeholder="(702) 555-0123"
                />,
              )}
            </div>
            <div>
              <label htmlFor="cake-photos" className="mb-2 block text-sm font-semibold">
                Inspiration photos (optional)
              </label>
              <p id="cake-photo-help" className="mb-2 text-sm text-muted-foreground">
                Up to {MAX_PHOTOS} photos. JPG, PNG and iPhone photos are fine.
              </p>
              <Input
                id="cake-photos"
                type="file"
                multiple
                className="peer sr-only"
                disabled={preparing || photos.length >= MAX_PHOTOS}
                accept="image/jpeg,image/png,image/webp,image/gif,image/avif,image/heic,image/heif,.heic,.heif"
                aria-describedby={uploadError ? 'cake-photo-help cake-photo-error' : 'cake-photo-help'}
                aria-invalid={!!uploadError}
                onChange={async event => {
                  const selected = Array.from(event.target.files || [])
                  event.target.value = ''
                  if (photos.length + selected.length > MAX_PHOTOS) {
                    setUploadError(`Please choose up to ${MAX_PHOTOS} photos total.`)
                    return
                  }
                  // Phone photos are usually 2–5 MB or HEIC; convert on the device to a JPEG under MAX_PHOTO_BYTES so all photos fit in one request.
                  setPreparing(true)
                  setUploadError('')
                  try {
                    const prepared: File[] = []
                    for (const file of selected)
                      prepared.push(await prepareGalleryPhoto(file, { maxSide: 1600, maxBytes: MAX_PHOTO_BYTES }))
                    setPhotos(current => [...current, ...prepared])
                    requestId.current = ''
                  } catch (error) {
                    setUploadError(
                      error instanceof Error ? error.message : 'This photo could not be added. Try another photo.',
                    )
                  } finally {
                    setPreparing(false)
                  }
                }}
              />
              <label
                htmlFor="cake-photos"
                className={`flex min-h-12 items-center justify-center gap-2 rounded-md border border-dashed bg-surface px-4 py-3 text-sm font-semibold transition-colors ${
                  photos.length >= MAX_PHOTOS || preparing
                    ? 'cursor-not-allowed opacity-50'
                    : 'border-input hover:border-foreground/40 hover:bg-secondary'
                } ${uploadError ? 'border-danger' : ''} peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring`}
              >
                <ImagePlus aria-hidden="true" className="size-5 text-primary" />
                {preparing
                  ? 'Preparing photo…'
                  : photos.length
                    ? `Add more photos (${photos.length} of ${MAX_PHOTOS})`
                    : 'Choose photos'}
              </label>
              <p role="status" className="sr-only">
                {preparing ? 'Preparing photo…' : ''}
              </p>
              {/* Shown next to the picker because it appears the moment photos are chosen, not on submit. */}
              <div role="alert">
                <FieldError id="cake-photo-error">{uploadError}</FieldError>
              </div>
              <ul className="mt-3 space-y-2">
                {photos.map((file, index) => (
                  <li
                    key={file.name + index}
                    className="flex min-w-0 items-center gap-3 rounded-md border bg-card p-2 pr-3"
                  >
                    <PhotoPreview file={file} />
                    <span className="min-w-0 flex-1 break-all text-sm">{file.name}</span>
                    <Button
                      type="button"
                      variant="outline"
                      aria-label={`Remove photo ${index + 1}`}
                      onClick={() => {
                        setPhotos(current => current.filter((_, i) => i !== index))
                        setUploadError('')
                        requestId.current = ''
                      }}
                    >
                      Remove
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
            {field(
              'notes',
              'Design ideas & dietary requests (optional)',
              <Textarea
                {...control('notes')}
                rows={5}
                maxLength={3000}
                placeholder="Colors, theme, allergies, or anything else we should know…"
              />,
            )}
            <details className="text-sm">
              <summary className="min-h-12 cursor-pointer py-3 font-medium">Allergies or dietary requests?</summary>
              <p className="text-muted-foreground">
                Add them to your notes. Please confirm any allergen accommodations directly with the bakery.
              </p>
            </details>
          </>
        )}
        {step === 3 && (
          <>
            <div className="surface rounded-lg card-pad">
              <dl className="space-y-3 text-sm">
                {[
                  [
                    'Event',
                    [data.eventType, data.eventDate, formatEventTime(data.eventTime)].filter(Boolean).join(' · '),
                  ],
                  ['Cake', `${data.servings} servings · ${cakeLabel(data.size)}`],
                  ['Preferences', `${data.flavor} / ${data.filling}`],
                  ['Writing on cake', data.cakeMessage || 'None'],
                  ['Budget', data.budget],
                  ['Pickup / delivery', data.fulfillment],
                  [
                    'Delivery destination',
                    data.fulfillment === 'Pickup' ? 'Bakery pickup' : data.deliveryAddress || 'To be confirmed',
                  ],
                  ['Contact', `${data.name} · ${data.email} · ${data.phone}`],
                  ['Photos', String(photos.length)],
                  ['Notes', data.notes || 'None'],
                ].map(([label, value]) => (
                  <div key={label} className="grid gap-1 sm:grid-cols-[8rem_1fr]">
                    <dt className="font-semibold">{label}</dt>
                    <dd className="whitespace-pre-wrap break-words">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <div className="flex flex-wrap gap-2">
              {steps.slice(0, 3).map((name, index) => (
                <Button type="button" key={name} variant="outline" onClick={() => navigate(index)}>
                  Edit {name.toLowerCase()}
                </Button>
              ))}
            </div>
            <label
              htmlFor="cake-acknowledged"
              className={`flex min-h-12 cursor-pointer items-start gap-3 rounded-md border p-3 text-sm ${errors.acknowledged ? 'border-danger' : ''}`}
            >
              <input
                id="cake-acknowledged"
                type="checkbox"
                className="mt-1 size-5 shrink-0 accent-primary"
                checked={data.acknowledged === 'yes'}
                aria-invalid={!!errors.acknowledged}
                aria-describedby={errors.acknowledged ? 'cake-form-errors' : undefined}
                onChange={event => update('acknowledged', event.target.checked ? 'yes' : '')}
              />
              <span>
                I understand my order is confirmed only after the bakery approves the date, design, price, and pickup or
                delivery.
              </span>
            </label>
            <ContactCaptcha ref={captcha} action="custom_cake" />
            <a
              href="/privacy"
              className="inline-flex min-h-12 min-w-11 items-center text-xs text-muted-foreground underline underline-offset-4"
            >
              Privacy
            </a>
          </>
        )}
        {/* All messages sit right above the buttons, like the contact form. */}
        <div ref={feedback} tabIndex={-1} className="space-y-3 focus:outline-none empty:hidden">
          {fieldMessages.length > 0 && (
            <FormAlert type="error" id="cake-form-errors">
              {fieldMessages.length === 1 ? (
                fieldMessages[0]
              ) : (
                <>
                  Please check the highlighted fields:
                  <ul className="mt-1 list-disc space-y-0.5 pl-5 font-normal">
                    {fieldMessages.map(message => (
                      <li key={message}>{message}</li>
                    ))}
                  </ul>
                </>
              )}
            </FormAlert>
          )}
          {error && <FormAlert type="error">{error}</FormAlert>}
        </div>
        <div className="flex flex-wrap justify-between gap-3 border-t pt-5">
          {step > 0 && (
            <Button type="button" variant="outline" onClick={() => navigate(step - 1)}>
              Back
            </Button>
          )}
          <Button type="submit" loading={busy} className="ml-auto flex-1 sm:flex-none">
            {busy ? 'Sending inquiry…' : step === 3 ? 'Send cake inquiry' : 'Continue'}
          </Button>
        </div>
      </fieldset>
    </form>
  )
}
