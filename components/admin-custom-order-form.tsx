'use client'
import { useId, useState } from 'react'
import { cakeCatalog, deliveryOptions, findCake } from '@/lib/cake-catalog'
import {
  fillingText,
  isCustomFilling,
  isCustomFlavor,
  flavors,
  fillings,
  MAX_CAKE_MESSAGE,
  tierNames,
  type StoredCakeInquiry,
} from '@/lib/cake-inquiry'
import { customOrderSchema, PAY_LINK_DAYS } from '@/lib/cake-order'
import { adminPost } from '@/lib/admin-api'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { NativeSelect } from './ui/select'
import { Textarea } from './ui/textarea'

// A custom cake order with a pay link: "Approve & send pay link" on an inquiry (details filled in from it), or
// Cake orders → New custom order (no inquiry: the customer's name, phone and email are typed in).
const pick = (value: string, skip: string[]) => (skip.includes(value) ? '' : value)
/** Different flavor per tier: 'Top: Vanilla · Bottom: Chocolate'. */
const byTier = (inquiry: StoredCakeInquiry | undefined, key: 'flavor' | 'filling') =>
  inquiry?.tierFlavors
    ?.map((t, i) => `${tierNames(inquiry.tierFlavors!.length)[i]}: ${fillingText(t[key], inquiry.customFilling)}`)
    .join(' · ')
    .slice(0, 100)

export function AdminCustomOrderForm({
  inquiry,
  onCreated,
  onCancel,
}: {
  /** Leave out for a new custom order from scratch: the form starts open and asks for the customer. */
  inquiry?: StoredCakeInquiry
  /** orderId: the new order (from scratch only). */
  onCreated: (message: string, orderId?: string) => void
  onCancel?: () => void
}) {
  const uid = useId()
  const [open, setOpen] = useState(!inquiry)
  const [customer, setCustomer] = useState({ name: '', phone: '', email: '' })
  const [test, setTest] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [withDeposit, setWithDeposit] = useState(false)
  const [data, setData] = useState({
    size: inquiry ? pick(inquiry.size, ['Not sure']) : '',
    flavor: !inquiry
      ? ''
      : (byTier(inquiry, 'flavor') ??
        (isCustomFlavor(inquiry.flavor) ? inquiry.customFlavor || '' : pick(inquiry.flavor, ['Please recommend']))),
    filling: !inquiry
      ? ''
      : (byTier(inquiry, 'filling') ??
        (isCustomFilling(inquiry.filling) ? inquiry.customFilling || '' : pick(inquiry.filling, ['Please recommend']))),
    cakeMessage: inquiry?.cakeMessage || '',
    pickupDate: inquiry?.eventDate ?? '',
    pickupTime: inquiry?.eventTime || '',
    fulfillment: (inquiry?.fulfillment as string) ?? 'Pickup',
    deliveryAddress: inquiry?.deliveryAddress || '',
    notes: '',
    price: '',
    deposit: '',
  })
  const update = (key: keyof typeof data, value: string) => setData(d => ({ ...d, [key]: value }))
  const delivery = data.fulfillment !== 'Pickup'
  const id = (name: string) => `${uid}-${name}`
  const label = 'mb-1 block text-sm font-semibold'

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setError('')
    const order = {
      ...data,
      ...(inquiry ? { inquiryId: inquiry.id } : { customer, ...(test ? { test: true } : {}) }),
      deposit: withDeposit ? data.deposit : undefined,
    }
    const checked = customOrderSchema.safeParse(order)
    if (!checked.success) return setError(checked.error.issues[0].message)
    if (withDeposit && !checked.data.deposit) return setError('Enter the deposit amount.')
    const due = checked.data.deposit || checked.data.price
    const to = inquiry ? inquiry.email : test ? 'the bakery inbox (test)' : checked.data.customer!.email
    if (!window.confirm(`Email ${to} a pay link for $${due.toFixed(2)}?`)) return
    setBusy(true)
    try {
      const r = inquiry
        ? await adminPost('/api/admin/cake-inquiries', { action: 'create_order', order })
        : await adminPost('/api/admin/cake-orders', { action: 'create_custom', order })
      setOpen(false)
      onCreated(
        r.emailed
          ? `Order ${r.ref} created and the pay link was emailed to ${r.sentTo}.${inquiry ? " It's in Cake orders." : ''}`
          : `Order ${r.ref} created, but the email could not be sent. Use "Copy pay link" on the order.`,
        r.id,
      )
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  if (!open) return <Button onClick={() => setOpen(true)}>Approve &amp; send pay link</Button>
  return (
    <form onSubmit={submit} className="space-y-3 rounded-lg border bg-background p-3" noValidate>
      <h4 className="font-semibold">{inquiry ? 'Approve: final details and price' : 'Customer'}</h4>
      {!inquiry && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor={id('name')} className={label}>
              Name
            </label>
            <Input
              id={id('name')}
              autoComplete="off"
              value={customer.name}
              onChange={e => setCustomer(c => ({ ...c, name: e.target.value }))}
            />
          </div>
          <div>
            <label htmlFor={id('phone')} className={label}>
              Phone
            </label>
            <Input
              id={id('phone')}
              type="tel"
              autoComplete="off"
              value={customer.phone}
              onChange={e => setCustomer(c => ({ ...c, phone: e.target.value }))}
            />
          </div>
          <div>
            <label htmlFor={id('email')} className={label}>
              Email (the pay link goes here)
            </label>
            <Input
              id={id('email')}
              type="email"
              autoComplete="off"
              value={customer.email}
              onChange={e => setCustomer(c => ({ ...c, email: e.target.value }))}
            />
          </div>
        </div>
      )}
      {!inquiry && <h4 className="pt-2 font-semibold">Cake, date and price</h4>}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor={id('size')} className={label}>
            Size
          </label>
          <NativeSelect id={id('size')} value={data.size} onChange={e => update('size', e.target.value)}>
            <option value="">Choose…</option>
            {/* The customer's own tier combination is not on the price sheet; keep it choosable. */}
            {[
              ...cakeCatalog,
              ...(!inquiry || cakeCatalog.some(c => c.value === inquiry.size) ? [] : [findCake(inquiry.size)]),
            ]
              .filter(c => c !== null)
              .map(c => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
          </NativeSelect>
        </div>
        <div>
          <label htmlFor={id('flavor')} className={label}>
            Flavor
          </label>
          <Input
            id={id('flavor')}
            list={id('flavors')}
            value={data.flavor}
            onChange={e => update('flavor', e.target.value)}
          />
          <datalist id={id('flavors')}>
            {flavors.slice(1, -1).map(f => (
              <option key={f} value={f} />
            ))}
          </datalist>
        </div>
        <div>
          <label htmlFor={id('filling')} className={label}>
            Filling
          </label>
          <Input
            id={id('filling')}
            list={id('fillings')}
            value={data.filling}
            onChange={e => update('filling', e.target.value)}
          />
          <datalist id={id('fillings')}>
            {fillings.slice(1, -1).map(f => (
              <option key={f} value={f} />
            ))}
          </datalist>
        </div>
        <div>
          <label htmlFor={id('message')} className={label}>
            Writing on the cake
          </label>
          <Input
            id={id('message')}
            maxLength={MAX_CAKE_MESSAGE}
            value={data.cakeMessage}
            onChange={e => update('cakeMessage', e.target.value)}
          />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor={id('fulfillment')} className={label}>
            Pickup / delivery
          </label>
          <NativeSelect
            id={id('fulfillment')}
            value={data.fulfillment}
            onChange={e => update('fulfillment', e.target.value)}
          >
            {deliveryOptions.map(o => (
              <option key={o}>{o}</option>
            ))}
          </NativeSelect>
        </div>
        <div>
          <label htmlFor={id('date')} className={label}>
            {delivery ? 'Delivery date' : 'Pickup date'}
          </label>
          <Input
            id={id('date')}
            type="date"
            value={data.pickupDate}
            onChange={e => update('pickupDate', e.target.value)}
          />
        </div>
        <div>
          <label htmlFor={id('time')} className={label}>
            Time
          </label>
          <Input
            id={id('time')}
            type="time"
            value={data.pickupTime}
            onChange={e => update('pickupTime', e.target.value)}
          />
        </div>
      </div>
      {delivery && (
        <div>
          <label htmlFor={id('address')} className={label}>
            Delivery address
          </label>
          <Input
            id={id('address')}
            value={data.deliveryAddress}
            onChange={e => update('deliveryAddress', e.target.value)}
          />
        </div>
      )}
      <div>
        <label htmlFor={id('notes')} className={label}>
          Design notes (shown to the customer)
        </label>
        <Textarea
          id={id('notes')}
          rows={2}
          maxLength={1000}
          value={data.notes}
          placeholder="e.g. White buttercream, pink roses, gold “30” topper"
          onChange={e => update('notes', e.target.value)}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor={id('price')} className={label}>
            Total price ($){delivery ? ', including delivery' : ''}
          </label>
          <Input
            id={id('price')}
            type="number"
            inputMode="decimal"
            min="1"
            step="0.01"
            value={data.price}
            onChange={e => update('price', e.target.value)}
          />
        </div>
        <fieldset>
          <legend className={label}>Customer pays now</legend>
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <label className="flex min-h-12 items-center gap-2">
              <input type="radio" checked={!withDeposit} onChange={() => setWithDeposit(false)} /> Full amount
            </label>
            <label className="flex min-h-12 items-center gap-2">
              <input type="radio" checked={withDeposit} onChange={() => setWithDeposit(true)} /> Deposit
            </label>
          </div>
          {withDeposit && (
            <Input
              aria-label="Deposit amount ($)"
              type="number"
              inputMode="decimal"
              min="1"
              step="0.01"
              placeholder="Deposit $"
              value={data.deposit}
              onChange={e => update('deposit', e.target.value)}
            />
          )}
        </fieldset>
      </div>
      {!inquiry && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={test} onChange={e => setTest(e.target.checked)} /> Test order (emails go to
          the bakery inbox, marked TEST)
        </label>
      )}
      <p className="text-xs text-muted-foreground">
        The customer gets an email with these details and a pay link valid for {PAY_LINK_DAYS} days.
        {inquiry ? ' Once paid, the inquiry changes to Confirmed & paid.' : ''}
      </p>
      <p role="alert" className="text-sm text-danger empty:hidden">
        {error}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={busy}>
          {busy ? 'Sending…' : inquiry ? 'Approve & email pay link' : 'Create & email pay link'}
        </Button>
        <Button type="button" variant="outline" onClick={() => (onCancel ? onCancel() : setOpen(false))}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
