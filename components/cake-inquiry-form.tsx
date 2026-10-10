"use client"

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { NativeSelect } from '@/components/ui/select'
import { ContactCaptcha, type CaptchaHandle } from '@/components/contact-captcha'
import { cakeInquirySchema, eventTypes, budgets, flavors, fillings, MAX_PHOTO_BYTES, MAX_PHOTOS } from '@/lib/cake-inquiry'

import { cakeCatalog, cakeLabel, deliveryOptions } from '@/lib/cake-catalog'
import { prepareGalleryPhoto } from '@/lib/prepare-gallery-photo'

const steps = ['Your event', 'Your cake', 'Contact & photos', 'Review & send']
const fieldsByStep = [['eventDate', 'eventType', 'fulfillment', 'deliveryAddress'], ['servings', 'size', 'flavor', 'filling', 'budget'], ['name', 'email', 'phone', 'notes'], ['acknowledged']]
const initial = { name: '', email: '', phone: '', eventDate: '', eventType: 'Birthday', servings: '', size: 'Not sure', flavor: 'Please recommend', filling: 'Please recommend', budget: 'Not sure — please advise', fulfillment: 'Pickup', deliveryAddress: '', notes: '', acknowledged: '' }
type Field = keyof typeof initial
// Keeps at most 10 digits and formats them as (702) 555-0123 while typing.
function formatPhone(value: string) {
  const d = value.replace(/\D/g, '').replace(/^1(?=\d{10})/, '').slice(0, 10)
  if (d.length < 4) return d
  if (d.length < 7) return `(${d.slice(0, 3)}) ${d.slice(3)}`
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`
}
function PhotoPreview({ file }: { file: File }) {
  const [url, setUrl] = useState('')
  useEffect(() => { const value = URL.createObjectURL(file); setUrl(value); return () => URL.revokeObjectURL(value) }, [file])
  return url ? <img src={url} alt="Your inspiration reference" className="h-16 w-16 shrink-0 rounded-lg object-cover" /> : null
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
  const update = (key: Field, value: string) => { setData(current => ({ ...current, [key]: value })); setErrors(current => ({ ...current, [key]: '' })); requestId.current = '' }
  const navigate = (value: number) => { setStep(value); setError(''); requestAnimationFrame(() => { heading.current?.focus(); heading.current?.scrollIntoView({ block: 'start', behavior: 'instant' }) }) }
  const control = (key: Field) => ({ id: `cake-${key}`, name: key, value: data[key], 'aria-invalid': !!errors[key], 'aria-describedby': errors[key] ? `cake-${key}-error` : undefined, onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => update(key, event.target.value) })
  const field = (key: Field, label: string, child: React.ReactNode) => <div className="min-w-0"><label htmlFor={`cake-${key}`} className="mb-2 block text-sm font-semibold">{label}</label>{child}{errors[key] && <p id={`cake-${key}-error`} className="mt-2 text-sm text-red-700">{errors[key]}</p>}</div>
  const validate = (all = false) => {
    const result = cakeInquirySchema.safeParse(data)
    const issues = result.success ? [] : result.error.issues.filter(issue => all || fieldsByStep[step].includes(String(issue.path[0])))
    if (!issues.length) { setErrors({}); return true }
    const next: Record<string, string> = {}
    for (const issue of issues) next[String(issue.path[0])] ||= issue.message
    setErrors(next)
    const first = String(issues[0].path[0]); const target = fieldsByStep.findIndex(fields => fields.includes(first))
    if (target >= 0) setStep(target)
    requestAnimationFrame(() => document.getElementById(`cake-${first}`)?.focus())
    return false
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (sending.current) return
    if (step < 3) { if (validate()) navigate(step + 1); return }
    if (!validate(true)) return
    sending.current = true; setBusy(true); setError('')
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
          const next = Object.fromEntries(Object.entries(result.fields as Record<string, string[]>).map(([key, messages]) => [key, messages[0]]))
          setErrors(next)
          const first = Object.keys(next)[0]; const target = fieldsByStep.findIndex(fields => fields.includes(first))
          if (target >= 0) setStep(target)
          requestAnimationFrame(() => document.getElementById(`cake-${first}`)?.focus())
        }
        throw new Error(result.error || 'Unable to send your inquiry. Please try again.')
      }
      setSent(true); setPhotos([])
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to send your inquiry. Please try again.') }
    finally { sending.current = false; setBusy(false); requestAnimationFrame(() => feedback.current?.focus()) }
  }
  if (sent) return <div ref={feedback} tabIndex={-1} role="status" className="rounded-xl border border-green-800/20 bg-green-50 p-6 sm:p-8"><h2 className="heading-2">Your cake inquiry is on its way</h2><p className="mt-4">Thanks, {data.name}. We’ll contact you with availability and a quote.</p><p className="mt-3 font-semibold">Your order and date are not confirmed yet.</p><p className="mt-3">Need to follow up? Call <a href="tel:+17028899887" className="text-primary underline">702-889-9887</a>.</p></div>
  return <form method="post" onSubmit={submit} noValidate aria-busy={busy} className="rounded-xl border border-border bg-card p-5 shadow-sm sm:p-8">
    <ol aria-label="Inquiry progress" className="mb-8 grid grid-cols-4 gap-2">
      {steps.map((name, index) => <li key={name} aria-current={step === index ? 'step' : undefined} className={`border-t-4 pt-3 ${index <= step ? 'border-primary' : 'border-border'}`}><span className="block text-xs font-semibold text-primary">{index + 1}</span><span className={`mt-1 text-xs sm:text-sm ${step === index ? 'block font-semibold' : 'hidden sm:block text-muted-foreground'}`}>{name}</span></li>)}
    </ol>
    <h3 ref={heading} tabIndex={-1} className="heading-3 mb-2 scroll-mt-32 focus:outline-none">{steps[step]}</h3>
    <p className="mb-6 text-sm text-muted-foreground">Step {step + 1} of 4</p>
    <fieldset disabled={busy} className="min-w-0 space-y-5">
      <legend className="sr-only">{steps[step]}</legend>
      {step === 0 && <>
        <div className="grid gap-5 sm:grid-cols-2">
          {field('eventType', 'What are you celebrating?', <NativeSelect {...control('eventType')}>{eventTypes.map(value => <option key={value}>{value}</option>)}</NativeSelect>)}
          {field('eventDate', 'Event date', <Input {...control('eventDate')} type="date" required min={minDate} />)}
        </div>
        <p className="text-sm text-muted-foreground">Choose a date at least 3 days away.</p>
        {data.fulfillment !== 'Pickup' && field('deliveryAddress', 'Delivery address / hotel (optional)', <Input {...control('deliveryAddress')} autoComplete="street-address" maxLength={500} placeholder="Address, venue, or hotel name" />)}
        {field('fulfillment', 'How would you like to receive your cake?', <NativeSelect {...control('fulfillment')}>{deliveryOptions.map(value => <option key={value}>{value}</option>)}</NativeSelect>)}
        <p className="text-sm text-muted-foreground">{data.fulfillment === 'Pickup' ? 'Pickup: 4053 Spring Mountain Rd, Las Vegas.' : 'Delivery availability and destination are confirmed with your quote.'}</p>
      </>}
      {step === 1 && <>
        <div className="grid gap-5 sm:grid-cols-2">
          {field('servings', 'How many servings do you need?', <Input {...control('servings')} type="number" inputMode="numeric" min={1} max={999} required placeholder="e.g., 12" />)}
          {field('size', 'Preferred cake size', <NativeSelect {...control('size')}><option>Not sure</option>{['Round', 'Sheet', 'Multi-tier'].map(category => <optgroup key={category} label={category}>{cakeCatalog.filter(cake => cake.category === category).map(cake => <option key={cake.value} value={cake.value}>{cake.label}</option>)}</optgroup>)}</NativeSelect>)}
          {field('flavor', 'Flavor preference', <NativeSelect {...control('flavor')}>{flavors.map(value => <option key={value}>{value}</option>)}</NativeSelect>)}
          {field('filling', 'Filling preference', <NativeSelect {...control('filling')}>{fillings.map(value => <option key={value}>{value}</option>)}</NativeSelect>)}
        </div>
        <p className="text-sm text-muted-foreground">For 4+ tier cakes, <a href="tel:+17028899887" className="inline-flex min-h-12 items-center font-semibold text-primary underline underline-offset-4">call 702-889-9887</a>.</p>
        {data.filling === 'Custom filling / describe in notes' && <p className="text-sm text-muted-foreground">Describe your preferred filling in the notes.</p>}
        {field('budget', 'Your cake budget', <NativeSelect {...control('budget')}>{budgets.map(value => <option key={value}>{value}</option>)}</NativeSelect>)}
        <p className="text-sm text-muted-foreground">Your budget helps us plan; it isn’t a price quote.</p>
      </>}
      {step === 2 && <>
        {field('name', 'Your name', <Input {...control('name')} autoComplete="name" maxLength={100} required placeholder="Full name" />)}
        <div className="grid gap-5 sm:grid-cols-2">
          {field('email', 'Email', <Input {...control('email')} type="email" autoComplete="email" maxLength={100} required placeholder="you@example.com" />)}
          {field('phone', 'Phone number', <Input {...control('phone')} onChange={event => update('phone', formatPhone(event.target.value))} type="tel" inputMode="numeric" autoComplete="tel-national" maxLength={14} required placeholder="(702) 555-0123" />)}
        </div>
        <div><label htmlFor="cake-photos" className="mb-2 block text-sm font-semibold">Inspiration photos (optional)</label><p id="cake-photo-help" className="sr-only">Up to 5 photos.</p><Input id="cake-photos" type="file" multiple disabled={preparing} accept="image/jpeg,image/png,image/webp,image/gif,image/avif,image/heic,image/heif,.heic,.heif" aria-describedby={uploadError ? 'cake-photo-help cake-photo-error' : 'cake-photo-help'} aria-invalid={!!uploadError} onChange={async event => {
          const selected = Array.from(event.target.files || []); event.target.value = ''
          if (photos.length + selected.length > MAX_PHOTOS) { setUploadError(`Please choose up to ${MAX_PHOTOS} photos total.`); return }
          // Phone photos are usually 2–5 MB or HEIC; convert on the device to a JPEG under MAX_PHOTO_BYTES so all photos fit in one request.
          setPreparing(true); setUploadError('')
          try {
            const prepared: File[] = []
            for (const file of selected) prepared.push(await prepareGalleryPhoto(file, { maxSide: 1600, maxBytes: MAX_PHOTO_BYTES }))
            setPhotos(current => [...current, ...prepared]); requestId.current = ''
          } catch (error) { setUploadError(error instanceof Error ? error.message : 'This photo could not be added. Try another photo.') }
          finally { setPreparing(false) }
        }} />{preparing && <p role="status" className="mt-2 text-sm text-muted-foreground">Preparing photo…</p>}{uploadError && <p id="cake-photo-error" role="alert" className="mt-2 text-sm text-red-700">{uploadError}</p>}
        <ul className="mt-3 space-y-2">{photos.map((file, index) => <li key={file.name + index} className="flex min-w-0 items-center gap-3 rounded-lg bg-secondary p-3"><PhotoPreview file={file} /><span className="min-w-0 flex-1 break-all text-sm">{file.name}</span><Button type="button" variant="outline" aria-label={`Remove photo ${index + 1}`} onClick={() => { setPhotos(current => current.filter((_, i) => i !== index)); setUploadError(''); requestId.current = '' }}>Remove</Button></li>)}</ul></div>
        {field('notes', 'Design ideas & dietary requests (optional)', <Textarea {...control('notes')} rows={5} maxLength={3000} placeholder="Colors, theme, message on the cake, allergies, or anything else we should know…" />)}
        <details className="text-sm"><summary className="min-h-12 cursor-pointer py-3 font-medium">Allergies or dietary requests?</summary><p className="text-muted-foreground">Add them to your notes. Please confirm any allergen accommodations directly with the bakery.</p></details>
      </>}
      {step === 3 && <>
        <div className="rounded-lg bg-secondary p-4"><dl className="space-y-3 text-sm">{[['Event', `${data.eventType} · ${data.eventDate}`], ['Cake', `${data.servings} servings · ${cakeLabel(data.size)}`], ['Preferences', `${data.flavor} / ${data.filling}`], ['Budget', data.budget], ['Pickup / delivery', data.fulfillment], ['Delivery destination', data.fulfillment === 'Pickup' ? 'Bakery pickup' : data.deliveryAddress || 'To be confirmed'], ['Contact', `${data.name} · ${data.email} · ${data.phone}`], ['Photos', String(photos.length)], ['Notes', data.notes || 'None']].map(([label, value]) => <div key={label} className="grid gap-1 sm:grid-cols-[8rem_1fr]"><dt className="font-semibold">{label}</dt><dd className="whitespace-pre-wrap break-words">{value}</dd></div>)}</dl></div>
        <div className="flex flex-wrap gap-2">{steps.slice(0,3).map((name,index) => <Button type="button" key={name} variant="outline" onClick={() => navigate(index)}>Edit {name.toLowerCase()}</Button>)}</div>
        <label htmlFor="cake-acknowledged" className="flex min-h-12 cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm"><input id="cake-acknowledged" type="checkbox" className="mt-1 size-5 shrink-0 accent-primary" checked={data.acknowledged === 'yes'} aria-invalid={!!errors.acknowledged} aria-describedby={errors.acknowledged ? 'cake-acknowledged-error' : undefined} onChange={event => update('acknowledged', event.target.checked ? 'yes' : '')} /><span>I understand my order is confirmed only after the bakery approves the date, design, price, and pickup or delivery.</span></label>
        {errors.acknowledged && <p id="cake-acknowledged-error" className="text-sm text-red-700">{errors.acknowledged}</p>}
        <ContactCaptcha ref={captcha} action="custom_cake" /><a href="/privacy" className="inline-flex min-h-12 items-center text-xs text-muted-foreground underline underline-offset-4">Privacy</a>
      </>}
      <div ref={feedback} tabIndex={-1} className="focus:outline-none">{error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}</div>
      <div className="flex flex-wrap justify-between gap-3 border-t pt-5">{step > 0 && <Button type="button" variant="outline" onClick={() => navigate(step - 1)}>Back</Button>}<Button type="submit" disabled={busy} className="ml-auto flex-1 sm:flex-none">{busy ? 'Sending inquiry…' : step === 3 ? 'Send cake inquiry' : 'Continue'}</Button></div>
    </fieldset>
  </form>
}
