'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { isDelivery, kitchenText, orderRef, type StoredCakeOrder } from '@/lib/cake-order'
import { Button } from './ui/button'
import { StaffShell, StaffSignIn, useStaffSession } from './staff-sign-in'

// The pickup screen, in Chinese for the bakery staff: opened by scanning the QR code in the customer's
// confirmation email (lib/pickup-qr.ts). Shows the order and confirms the pickup (or delivery) with one tap.
// Staff phones and admins can use it (app/api/staff/pickup/route.ts); it shows nothing else.

type Done = { at: string; action: string }
const money = (n: number) => '$' + (Number.isInteger(n) ? n : n.toFixed(2))
const zhTime = (iso: string) =>
  new Date(iso).toLocaleString('zh-Hant', {
    timeZone: 'America/Los_Angeles',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })

export function StaffPickup({ id }: { id: string }) {
  const { role, setRole } = useStaffSession()
  if (role === undefined)
    return (
      <StaffShell>
        <p className="text-center text-muted-foreground">載入中…</p>
      </StaffShell>
    )
  if (role === null)
    return (
      <StaffShell>
        <StaffSignIn onSignedIn={() => setRole('staff')} />
      </StaffShell>
    )
  return (
    <StaffShell>
      <PickupOrder id={id} admin={role === 'admin'} onSignedOut={() => setRole(null)} />
    </StaffShell>
  )
}

function PickupOrder({ id, admin, onSignedOut }: { id: string; admin: boolean; onSignedOut: () => void }) {
  const [order, setOrder] = useState<StoredCakeOrder | null>(null)
  const [doneAt, setDoneAt] = useState<Done | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const request = useCallback(
    async (action: 'get' | 'confirm') => {
      const r = await fetch('/api/staff/pickup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, id }),
      })
      if (r.status === 401) onSignedOut()
      const data = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(data.error || '網絡有問題，請重試。')
      setOrder(data.order)
      setDoneAt(data.doneAt)
      setError('')
    },
    [id, onSignedOut],
  )
  const load = useCallback(
    () => request('get').catch(e => setError((e as Error).message || '找不到這張訂單，或網絡有問題。請重試。')),
    [request],
  )
  useEffect(() => {
    void load()
  }, [load])

  if (!order)
    return (
      <section className="space-y-3">
        {error ? (
          <>
            <p role="alert" className="text-lg text-danger">
              {error}
            </p>
            <Button onClick={() => void load()}>重試</Button>
          </>
        ) : (
          <p className="text-muted-foreground">載入中…</p>
        )}
      </section>
    )

  const delivery = isDelivery(order)
  const done = order.status === 'picked_up'
  const ready = order.status === 'paid' || order.status === 'deposit_paid'
  const balance = order.deposit && order.status === 'deposit_paid' ? order.price - order.deposit : 0
  const rows = kitchenText(order)
    .split('\n')
    .map(line => {
      const [label, ...value] = line.split('：')
      return [label, value.join('：')] as const
    })
  const confirm = () => {
    if (!window.confirm(`確認 ${orderRef(order)} ${delivery ? '已送達' : '已取貨'}？`)) return
    setBusy(true)
    request('confirm')
      .catch(e => setError((e as Error).message || '未能更新，請重試。'))
      .finally(() => setBusy(false))
  }
  const blocked: Partial<Record<StoredCakeOrder['status'], string>> = {
    awaiting_payment: '客人還未付款。請先收款。',
    expired: '付款連結已過期，客人還未付款。',
    awaiting_approval: '訂單還未確認（未收款）。',
    checking_kitchen: '訂單還未確認（未收款）。',
    hold_expired: '訂單還未確認（未收款）。',
    processing: '正在付款中，請稍等再刷新。',
    declined: '此訂單已取消。',
    refunded: '此訂單已退款。',
    failed: '此訂單付款失敗。',
  }

  return (
    <section className="space-y-4">
      <header>
        <p className="text-sm text-muted-foreground">{delivery ? '送貨' : '取貨'}</p>
        <h1 className="text-2xl font-bold">
          {order.test && (
            <span className="mr-2 rounded bg-amber-100 px-1.5 py-0.5 align-middle text-sm text-amber-900">測試</span>
          )}
          訂單 {orderRef(order)} · {order.name}
        </h1>
      </header>

      {done && (
        <p className="rounded-xl border-2 border-green-600 bg-green-50 p-4 text-xl font-bold text-green-800">
          ✓ {doneAt?.action === 'delivered' || (delivery && !doneAt) ? '已送達' : '已取貨'}
          {doneAt && <span className="ml-2 text-[1rem] font-normal">{zhTime(doneAt.at)}</span>}
        </p>
      )}
      {!done && !ready && (
        <p className="rounded-xl border-2 border-red-600 bg-red-50 p-4 text-lg font-bold text-red-800">
          {blocked[order.status] ?? '此訂單現在不能取貨。'}
        </p>
      )}
      {!done && balance > 0 && (
        <p className="rounded-xl border-2 border-red-600 bg-red-50 p-4 text-xl font-bold text-red-800">
          請收取餘款 {money(balance)}
          <span className="block text-[1rem] font-normal">
            總價 {money(order.price)}，已付訂金 {money(order.deposit!)}
          </span>
        </p>
      )}
      {!done && ready && balance === 0 && (
        <p className="rounded-xl bg-green-50 p-3 text-lg font-semibold text-green-800">已付全款 {money(order.price)}</p>
      )}

      <dl className="divide-y rounded-xl border bg-white text-lg">
        {rows.map(([label, value]) => (
          <div key={label} className="grid grid-cols-[5.5rem_1fr] gap-2 px-4 py-3">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="whitespace-pre-wrap break-words font-medium">
              {label === '電話' ? (
                <a href={'tel:' + value.replace(/[^+0-9]/g, '')} className="text-primary underline">
                  {value}
                </a>
              ) : (
                value
              )}
            </dd>
          </div>
        ))}
      </dl>

      <p role="alert" className="text-danger empty:hidden">
        {error}
      </p>
      {ready && (
        <Button size="lg" className="h-16 w-full text-xl" onClick={confirm} disabled={busy}>
          {busy ? '更新中…' : delivery ? '確認已送達' : '確認已取貨'}
        </Button>
      )}
      {admin && (
        <Link href={`/admin/orders?open=${order.id}`} className="block text-center text-sm text-primary underline">
          Open in Cake orders (English)
        </Link>
      )}
    </section>
  )
}
