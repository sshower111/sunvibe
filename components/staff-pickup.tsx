'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { isDelivery, orderRef, sizeLabel, zhPickup, type StoredCakeOrder } from '@/lib/cake-order'
import { zhOption } from '@/lib/email-zh'
import { Button } from './ui/button'
import { StaffSignIn, useStaffSession } from './staff-sign-in'

// The pickup screen, in Chinese for the bakery staff: opened by scanning the QR code in the customer's
// confirmation email (lib/pickup-qr.ts). The order at a glance and one button to confirm the pickup or delivery.
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
const NOT_READY: Partial<Record<StoredCakeOrder['status'], string>> = {
  awaiting_payment: '客人還未付款',
  expired: '客人還未付款',
  awaiting_approval: '訂單還未確認',
  checking_kitchen: '訂單還未確認',
  hold_expired: '訂單還未確認',
  processing: '正在付款，請稍後刷新',
  declined: '訂單已取消',
  refunded: '訂單已退款',
  failed: '付款失敗',
}

function Page({ children }: { children: React.ReactNode }) {
  return (
    <main lang="zh-Hant" className="min-h-dvh bg-white">
      <div className="mx-auto max-w-md px-5 pb-48 pt-[max(1.5rem,env(safe-area-inset-top))]">{children}</div>
    </main>
  )
}

export function StaffPickup({ id }: { id: string }) {
  const { role, setRole } = useStaffSession()
  return (
    <Page>
      {role === undefined && <p className="pt-10 text-center text-muted-foreground">載入中…</p>}
      {role === null && <StaffSignIn onSignedIn={() => setRole('staff')} />}
      {role && <PickupOrder id={id} admin={role === 'admin'} onSignedOut={() => setRole(null)} />}
    </Page>
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
    () => request('get').catch(e => setError((e as Error).message || '找不到這張訂單。')),
    [request],
  )
  useEffect(() => {
    void load()
  }, [load])

  if (!order)
    return error ? (
      <div className="space-y-4 pt-10 text-center">
        <p role="alert" className="text-lg text-danger">
          {error}
        </p>
        <Button variant="outline" onClick={() => void load()}>
          重試
        </Button>
      </div>
    ) : (
      <p className="pt-10 text-center text-muted-foreground">載入中…</p>
    )

  const delivery = isDelivery(order)
  const done = order.status === 'picked_up'
  const ready = order.status === 'paid' || order.status === 'deposit_paid'
  const balance = order.deposit && order.status === 'deposit_paid' ? order.price - order.deposit : 0
  const verb = delivery ? '送達' : '取貨'
  const confirm = () => {
    if (!window.confirm(`確認已${verb}？`)) return
    setBusy(true)
    request('confirm')
      .catch(e => setError((e as Error).message || '未能更新，請重試。'))
      .finally(() => setBusy(false))
  }
  const details: [string, string][] = [
    ['蛋糕上的字', order.cakeMessage],
    ['備註', order.notes],
    ...(delivery ? ([['地址', order.deliveryAddress ?? '']] as [string, string][]) : []),
  ].filter(([, value]) => value) as [string, string][]

  return (
    <>
      <header className="space-y-1">
        <p className="text-muted-foreground">
          {order.test && '測試 · '}
          {delivery ? '送貨' : '取貨'} · {orderRef(order)}
        </p>
        <h1 className="font-sans text-3xl font-semibold text-foreground">{order.name}</h1>
        <p className="text-lg">{zhPickup(order.pickupDate, order.pickupTime)}</p>
        <a href={'tel:' + order.phone.replace(/[^+0-9]/g, '')} className="inline-block text-lg text-primary">
          {order.phone}
        </a>
      </header>

      <dl className="mt-6 grid grid-cols-3 gap-3 border-y py-5 text-lg">
        {[
          ['尺寸', zhOption(sizeLabel(order.size))],
          ['口味', zhOption(order.flavor)],
          ['餡料', zhOption(order.filling)],
        ].map(([label, value]) => (
          <div key={label}>
            <dt className="text-sm text-muted-foreground">{label}</dt>
            <dd className="font-medium">{value}</dd>
          </div>
        ))}
      </dl>

      {details.length > 0 && (
        <dl className="space-y-4 border-b py-5 text-lg">
          {details.map(([label, value]) => (
            <div key={label}>
              <dt className="text-sm text-muted-foreground">{label}</dt>
              <dd className="whitespace-pre-wrap break-words font-medium">{value}</dd>
            </div>
          ))}
        </dl>
      )}

      {!done && !ready && (
        <p className="py-5 text-lg font-semibold text-danger">{NOT_READY[order.status] ?? '現在不能取貨'}</p>
      )}
      {ready && balance === 0 && <p className="py-5 text-lg text-muted-foreground">已付全款</p>}

      {admin && (
        <Link href={`/admin/orders?open=${order.id}`} className="text-sm text-muted-foreground underline">
          Open in admin
        </Link>
      )}

      {(ready || done) && (
        <div className="fixed inset-x-0 bottom-0 border-t bg-white px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4">
          <div className="mx-auto max-w-md">
            <p role="alert" className="mb-2 text-center text-danger empty:hidden">
              {error}
            </p>
            {!done && balance > 0 && (
              <p className="mb-3 flex items-baseline justify-between gap-3">
                <span className="text-2xl font-semibold text-danger">收取餘款 {money(balance)}</span>
                <span className="text-sm text-muted-foreground">
                  總價 {money(order.price)} · 訂金 {money(order.deposit!)}
                </span>
              </p>
            )}
            {done ? (
              <p className="flex h-16 items-center justify-center gap-2 rounded-xl bg-green-50 text-xl font-semibold text-green-800">
                ✓ 已{doneAt?.action === 'delivered' || (delivery && !doneAt) ? '送達' : '取貨'}
                {doneAt && <span className="text-[1rem] font-normal">{zhTime(doneAt.at)}</span>}
              </p>
            ) : (
              <Button size="lg" className="h-16 w-full text-xl" onClick={confirm} disabled={busy}>
                {busy ? '更新中…' : `確認已${verb}`}
              </Button>
            )}
          </div>
        </div>
      )}
    </>
  )
}
