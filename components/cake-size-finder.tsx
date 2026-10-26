'use client'

import { useRef, useState } from 'react'
import { SITE } from '@/lib/site-info'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormAlert } from '@/components/ui/form-message'
import { cakeCatalog, deliveryOptions, priceGroups, type CakeSpec } from '@/lib/cake-catalog'
import { eventTypes, fillings, flavors } from '@/lib/cake-inquiry'
import {
  deliveryFee,
  finderShapes,
  largestServings,
  MAX_GUESTS,
  priceRange,
  recommend,
  startingPrice,
  type FinderShape,
} from '@/lib/cake-finder'
import { useCakePlan } from '@/components/cake-plan'
import { cn } from '@/lib/utils'

const questions = [
  'What are you celebrating?',
  'How many guests will have cake?',
  'What shape would you like?',
  'Pick a flavor and filling',
  'Pickup or delivery?',
] as const
const guestPresets = [10, 20, 30, 50, 75, 100]
const money = (value: number) => `$${value.toFixed(0)}`
const initial = {
  eventType: '',
  guests: '',
  shape: '' as FinderShape | '',
  flavor: 'Please recommend',
  filling: 'Please recommend',
  fulfillment: '',
}

/** A large choice that answers the question and moves on. */
function Choice({
  selected,
  onClick,
  title,
  hint,
}: {
  selected: boolean
  onClick: () => void
  title: string
  hint?: string
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        'flex min-h-14 w-full cursor-pointer flex-col items-start justify-center rounded-lg border bg-card px-4 py-3 text-left transition-colors hover:border-foreground/40 hover:bg-secondary',
        selected && 'border-primary bg-surface ring-1 ring-primary',
      )}
    >
      <span className="font-semibold">{title}</span>
      {hint && <span className="mt-0.5 text-sm text-muted-foreground">{hint}</span>}
    </button>
  )
}

/** Small selectable pill for lists (flavor, filling). Real radios, so arrow keys work. */
function Pills({
  name,
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
      <div className="flex flex-wrap gap-2">
        {options.map(option => (
          <label key={option} className="cursor-pointer">
            <input
              type="radio"
              name={name}
              value={option}
              checked={value === option}
              onChange={() => onChange(option)}
              className="peer sr-only"
            />
            <span className="inline-flex min-h-11 items-center rounded-full border bg-card px-4 text-sm transition-colors hover:border-foreground/40 peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-foreground peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring">
              {option}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}

export function CakeSizeFinder() {
  const planner = useCakePlan()
  const [answers, setAnswers] = useState(initial)
  const [step, setStep] = useState(0)
  const [chosen, setChosen] = useState<string | null>(null)
  const [guestError, setGuestError] = useState('')
  const [applied, setApplied] = useState(false)
  const heading = useRef<HTMLHeadingElement>(null)
  const done = step === questions.length
  const guests = Number(answers.guests)
  const result = done ? recommend(guests, answers.shape || 'Any', answers.filling) : null
  const options = result
    ? [result.best, ...result.others, result.bigger].filter(
        (cake, index, list): cake is CakeSpec => !!cake && list.indexOf(cake) === index,
      )
    : []
  const cake = options.find(item => item.value === chosen) ?? result?.best ?? null

  const go = (next: number) => {
    setStep(next)
    setApplied(false)
    requestAnimationFrame(() => heading.current?.focus())
  }
  const set = <K extends keyof typeof initial>(key: K, value: (typeof initial)[K], advance = false) => {
    setAnswers(current => ({ ...current, [key]: value }))
    setChosen(null)
    if (advance) go(step + 1)
  }
  const submitGuests = (event?: React.FormEvent) => {
    event?.preventDefault()
    const value = answers.guests.trim()
    if (!/^\d{1,3}$/.test(value) || Number(value) < 1) {
      setGuestError(`Enter a number of guests from 1 to ${MAX_GUESTS}.`)
      return
    }
    setGuestError('')
    go(step + 1)
  }
  const applyToInquiry = () => {
    planner?.apply({
      eventType: answers.eventType,
      servings: String(guests),
      size: cake?.value ?? 'Not sure',
      flavor: answers.flavor,
      filling: answers.filling,
      fulfillment: answers.fulfillment,
    })
    setApplied(true)
  }

  const price = (item: CakeSpec) => {
    const exact = startingPrice(item, answers.filling)
    if (exact !== null) return money(exact)
    const [low, high] = priceRange(item)
    return `${money(low)}–${money(high)}`
  }
  const fee = deliveryFee(answers.fulfillment)
  const cakePrice = cake ? startingPrice(cake, answers.filling) : null

  const summary: [string, string, number][] = [
    ['Occasion', answers.eventType, 0],
    ['Guests', answers.guests, 1],
    ['Shape', finderShapes.find(s => s.value === answers.shape)?.label ?? '', 2],
    ['Flavor & filling', `${answers.flavor} / ${answers.filling}`, 3],
    ['Pickup / delivery', answers.fulfillment, 4],
  ]

  return (
    <section id="serving-guide" className="border-y bg-card" aria-labelledby="size-heading">
      <div className="site-container section-space">
        <div className="max-w-2xl">
          <h2 id="size-heading" className="heading-2">
            Find your cake size
          </h2>
          <p className="mt-2 text-pretty-body">
            Answer five quick questions and we’ll suggest the right size and a starting price. You can send it straight
            to your inquiry.
          </p>
        </div>

        <div className="mt-6 max-w-3xl rounded-xl border bg-background card-pad">
          {!done ? (
            <>
              <div className="mb-5">
                <p className="eyebrow">
                  Question {step + 1} of {questions.length}
                </p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface" aria-hidden="true">
                  <div
                    className="h-full rounded-full bg-primary transition-[width] duration-200"
                    style={{ width: `${(step / questions.length) * 100}%` }}
                  />
                </div>
              </div>
              <h3 ref={heading} tabIndex={-1} className="heading-3 mb-5 focus:outline-none">
                {questions[step]}
              </h3>

              {step === 0 && (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {eventTypes.map(value => (
                    <Choice
                      key={value}
                      title={value}
                      selected={answers.eventType === value}
                      onClick={() => set('eventType', value, true)}
                    />
                  ))}
                </div>
              )}

              {step === 1 && (
                <form onSubmit={submitGuests} noValidate className="space-y-4">
                  <div className="flex flex-wrap gap-2" role="group" aria-label="Common party sizes">
                    {guestPresets.map(value => (
                      <Button
                        key={value}
                        type="button"
                        variant={answers.guests === String(value) ? 'default' : 'outline'}
                        aria-pressed={answers.guests === String(value)}
                        onClick={() => {
                          set('guests', String(value))
                          setGuestError('')
                        }}
                      >
                        {value === 100 ? '100+' : value}
                      </Button>
                    ))}
                  </div>
                  <div className="max-w-xs">
                    <label htmlFor="finder-guests" className="mb-2 block text-sm font-semibold">
                      Or type the number
                    </label>
                    <Input
                      id="finder-guests"
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={MAX_GUESTS}
                      placeholder="e.g., 24"
                      value={answers.guests}
                      aria-invalid={!!guestError}
                      aria-describedby="finder-guests-hint"
                      onChange={event => {
                        set('guests', event.target.value)
                        setGuestError('')
                      }}
                    />
                    <p id="finder-guests-hint" className="mt-2 text-sm text-muted-foreground">
                      Count everyone who’ll have a slice, kids included.
                    </p>
                  </div>
                  {guestError && <FormAlert type="error">{guestError}</FormAlert>}
                  <div className="flex flex-wrap justify-between gap-3 border-t pt-5">
                    <Button type="button" variant="outline" onClick={() => go(step - 1)}>
                      Back
                    </Button>
                    <Button type="submit" className="ml-auto">
                      Continue
                    </Button>
                  </div>
                </form>
              )}

              {step === 2 && (
                <>
                  {answers.eventType === 'Wedding' && (
                    <p className="mb-4 text-sm text-muted-foreground">Most weddings choose a tiered cake.</p>
                  )}
                  <div className="grid gap-3 sm:grid-cols-2">
                    {finderShapes.map(shape => (
                      <Choice
                        key={shape.value}
                        title={shape.label}
                        hint={shape.hint}
                        selected={answers.shape === shape.value}
                        onClick={() => set('shape', shape.value, true)}
                      />
                    ))}
                  </div>
                </>
              )}

              {step === 3 && (
                <div className="space-y-6">
                  <Pills
                    name="finder-flavor"
                    legend="Cake flavor"
                    options={flavors}
                    value={answers.flavor}
                    onChange={value => set('flavor', value)}
                  />
                  <Pills
                    name="finder-filling"
                    legend="Filling (this sets the price)"
                    options={fillings}
                    value={answers.filling}
                    onChange={value => set('filling', value)}
                  />
                  {answers.shape === 'Multi-tier' && (
                    <p className="text-sm text-muted-foreground">Tiered cakes are the same price for any filling.</p>
                  )}
                  <div className="flex flex-wrap justify-between gap-3 border-t pt-5">
                    <Button type="button" variant="outline" onClick={() => go(step - 1)}>
                      Back
                    </Button>
                    <Button type="button" className="ml-auto" onClick={() => go(step + 1)}>
                      Continue
                    </Button>
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="grid gap-3 sm:grid-cols-2">
                  {deliveryOptions.map(value => {
                    const [title, cost] = value.split(' — ')
                    return (
                      <Choice
                        key={value}
                        title={title}
                        hint={value === 'Pickup' ? SITE.street : cost}
                        selected={answers.fulfillment === value}
                        onClick={() => set('fulfillment', value, true)}
                      />
                    )
                  })}
                </div>
              )}

              {step !== 1 && step !== 3 && step > 0 && (
                <div className="mt-5 border-t pt-5">
                  <Button type="button" variant="outline" onClick={() => go(step - 1)}>
                    Back
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div aria-live="polite">
              <p className="eyebrow">Our suggestion</p>
              <h3 ref={heading} tabIndex={-1} className="heading-3 mt-1 focus:outline-none">
                {cake ? `${cake.label} for ${guests} guests` : `${guests} guests: let’s plan it together`}
              </h3>

              {result?.switched && (
                <p className="mt-2 text-sm text-muted-foreground">
                  Our {finderShapes.find(s => s.value === answers.shape)?.label.toLowerCase()} cakes don’t serve that
                  many, so here’s the closest fit.
                </p>
              )}
              {cake ? (
                <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_1fr]">
                  <div className="rounded-lg border bg-card p-4">
                    <p className="text-3xl font-semibold text-primary">{cake.servings}</p>
                    <p className="mt-1 text-sm">servings (about 1.5" × 2" slices)</p>
                    {cake.category === 'Multi-tier' && guests < 33 && (
                      <p className="mt-2 text-sm text-muted-foreground">Our smallest tiered cake serves 33.</p>
                    )}
                  </div>
                  <div className="rounded-lg border bg-card p-4">
                    <dl className="space-y-1 text-sm">
                      <div className="flex justify-between gap-4">
                        <dt>Cake</dt>
                        <dd className="price font-semibold">{price(cake)}</dd>
                      </div>
                      {answers.fulfillment !== 'Pickup' && (
                        <div className="flex justify-between gap-4">
                          <dt>Delivery</dt>
                          <dd className="price font-semibold">{fee === null ? 'Quoted' : money(fee)}</dd>
                        </div>
                      )}
                      <div className="flex justify-between gap-4 border-t pt-2 text-base">
                        <dt className="font-semibold">Starting at</dt>
                        <dd className="price text-2xl font-semibold text-primary">
                          {cakePrice !== null && fee !== null
                            ? money(cakePrice + fee)
                            : cakePrice === null
                              ? `from ${money(priceRange(cake)[0] + (fee ?? 0))}`
                              : `${money(cakePrice)} + delivery`}
                        </dd>
                      </div>
                    </dl>
                  </div>
                </div>
              ) : (
                <p className="mt-4">
                  Our largest single cake serves {largestServings}. For a bigger crowd we can make more than one cake.
                  Send an inquiry and we’ll plan it with you, or call{' '}
                  <a href={SITE.phoneHref} className="font-semibold text-primary underline underline-offset-4">
                    {SITE.phone}
                  </a>
                  .
                </p>
              )}
              <p className="mt-3 text-sm text-muted-foreground">
                {cake && startingPrice(cake, answers.filling) === null && cake.category !== 'Multi-tier'
                  ? 'The price depends on the filling; we’ll confirm it with your quote. '
                  : ''}
                Starting price for a simply decorated cake. Design and decorations are quoted after you send your
                inquiry.
              </p>

              {options.length > 1 && (
                <fieldset className="mt-6">
                  <legend className="mb-3 text-sm font-semibold">Sizes that work for your party</legend>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {options.map(item => (
                      <Choice
                        key={item.value}
                        title={item.label + (item === result?.best ? ' (our pick)' : '')}
                        hint={`Serves ${item.servings} · ${price(item)}${item === result?.bigger ? ' · extra slices' : ''}`}
                        selected={item === cake}
                        onClick={() => {
                          setChosen(item.value)
                          setApplied(false)
                        }}
                      />
                    ))}
                  </div>
                </fieldset>
              )}

              <dl className="mt-6 divide-y rounded-lg border bg-card text-sm">
                {summary.map(([label, value, index]) => (
                  <div key={label} className="flex items-center justify-between gap-3 px-4 py-1">
                    <div className="min-w-0 py-2">
                      <dt className="text-muted-foreground">{label}</dt>
                      <dd className="font-semibold break-words">{value}</dd>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      aria-label={`Change ${label.toLowerCase()}`}
                      onClick={() => go(index)}
                    >
                      Change
                    </Button>
                  </div>
                ))}
              </dl>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Button type="button" onClick={applyToInquiry} className="flex-1 sm:flex-none">
                  Use this for my inquiry
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setAnswers(initial)
                    setChosen(null)
                    go(0)
                  }}
                >
                  Start over
                </Button>
              </div>
              {applied && (
                <p role="status" className="mt-3 text-sm text-success">
                  Added to your inquiry below. You can still change anything there.
                </p>
              )}
            </div>
          )}
        </div>

        <details className="mt-6 max-w-3xl rounded-xl border bg-background">
          <summary className="min-h-12 cursor-pointer px-5 py-4 font-semibold text-primary">
            See every size and price
          </summary>
          <div className="overflow-x-auto border-t px-5 pb-5">
            <table className="mt-3 w-full min-w-[36rem] text-sm">
              <caption className="sr-only">Cake sizes, servings and prices by filling</caption>
              <thead>
                <tr className="border-b text-left align-bottom">
                  <th scope="col" className="py-2 pr-3">
                    Size
                  </th>
                  <th scope="col" className="py-2 pr-3">
                    Serves
                  </th>
                  {priceGroups.map(group => (
                    <th key={group} scope="col" className="py-2 pr-3 font-normal text-muted-foreground">
                      {group}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {cakeCatalog.map(item => (
                  <tr key={item.value}>
                    <th scope="row" className="py-2 pr-3 text-left font-semibold">
                      {item.label}
                    </th>
                    <td className="price py-2 pr-3">{item.servings}</td>
                    {item.category === 'Multi-tier' ? (
                      <td colSpan={priceGroups.length} className="price py-2 pr-3 font-semibold text-primary">
                        {money(item.prices[0])} (any filling)
                      </td>
                    ) : (
                      item.prices.map((value, index) => (
                        <td key={index} className="price py-2 pr-3 font-semibold text-primary">
                          {money(value)}
                        </td>
                      ))
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-sm text-muted-foreground">
              Delivery: $30 within 10 miles, $50 to a casino or hotel. Need 4+ tiers? Call{' '}
              <a href={SITE.phoneHref} className="font-semibold text-primary underline underline-offset-4">
                {SITE.phone}
              </a>
              .
            </p>
          </div>
        </details>
      </div>
    </section>
  )
}
