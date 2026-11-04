'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { isDelivery, orderRef, sizeLabel, zhPickup, type StoredCakeOrder } from '@/lib/cake-order'
import { zhOption } from '@/lib/email-zh'
import { CircleAlert, CircleCheck, Phone } from 'lucide-react'
import { StaffSignIn, card, primaryButton, secondaryButton, useStaffSession } from './staff-sign-in'

// The pickup screen, in Chinese for the bakery staff: opened by scanning the QR code in the customer's
// confirmation email (lib/pickup-qr.ts). The order at a glance and one button to confirm the pickup or delivery.
// Staff phones and admins can use it (app/api/staff/pickup/route.ts); it shows nothing else.

type Done = { at: string; action: string }
const nextButton = secondaryButton + ' h-14 w-full text-lg'
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

export function Page({ children }: { children: React.ReactNode }) {
  return (
    <main lang="zh-Hant" data-staff-ui className="min-h-dvh">
      <div className="mx-auto max-w-md px-4 pb-52 pt-[max(1.5rem,env(safe-area-inset-top))]">{children}</div>
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

/** onNext: in the employee app, goes back to the scanner (a "掃描下一個" button). */
export function PickupOrder({
  id,
  admin,
  onSignedOut,
  onNext,
}: {
  id: string
  admin: boolean
  onSignedOut: () => void
  onNext?: () => void
}) {
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
      <div className="admin-pop-in space-y-5 pt-16 text-center">
        <CircleAlert aria-hidden="true" className="mx-auto size-12 text-danger" strokeWidth={1.75} />
        <p role="alert" className="text-lg font-medium">
          {error}
        </p>
        <button type="button" onClick={() => void load()} className={secondaryButton}>
          重試
        </button>
        {onNext && (
          <button type="button" className={primaryButton} onClick={onNext}>
            掃描下一個
          </button>
        )}
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
      // A short tick on the same moment the screen turns green (Android; iPhones ignore it).
      .then(() => navigator.vibrate?.(12))
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
      <header className="admin-pop-in space-y-1.5 px-1">
        <p className="text-[0.9375rem] font-medium text-muted-foreground">
          {order.test && '測試 · '}
          {delivery ? '送貨' : '取貨'} · {orderRef(order)}
        </p>
        <h1 className="admin-large-title break-words">{order.name}</h1>
        <p className="text-lg font-medium">{zhPickup(order.pickupDate, order.pickupTime)}</p>
        <a
          href={'tel:' + order.phone.replace(/[^+0-9]/g, '')}
          className="admin-pressable mt-1 inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--admin-tint)] px-4 text-[1.0625rem] font-semibold text-primary"
        >
          <Phone aria-hidden="true" className="size-[1.125rem]" />
          {order.phone}
        </a>
      </header>

      <dl className={card + ' mt-6 grid grid-cols-3 divide-x text-lg'}>
        {[
          ['尺寸', zhOption(sizeLabel(order.size))],
          ['口味', zhOption(order.flavor)],
          ['餡料', zhOption(order.filling)],
        ].map(([label, value]) => (
          <div key={label} className="min-w-0 px-4 py-3.5">
            <dt className="text-[0.8125rem] font-medium text-muted-foreground">{label}</dt>
            <dd className="break-words font-semibold">{value}</dd>
          </div>
        ))}
      </dl>

      {details.length > 0 && (
        <dl className={card + ' mt-4 divide-y text-lg'}>
          {details.map(([label, value]) => (
            <div key={label} className="px-4 py-3.5">
              <dt className="text-[0.8125rem] font-medium text-muted-foreground">{label}</dt>
              <dd className="whitespace-pre-wrap break-words font-semibold">{value}</dd>
            </div>
          ))}
        </dl>
      )}

      {!done && !ready && (
        <p className="mt-4 flex items-center gap-3 rounded-2xl bg-red-100/70 px-4 py-4 text-lg font-semibold text-red-800">
          <CircleAlert aria-hidden="true" className="size-6 shrink-0" />
          {NOT_READY[order.status] ?? '現在不能取貨'}
        </p>
      )}
      {ready && balance === 0 && (
        <p className="mt-4 flex items-center gap-2 px-1 text-[1.0625rem] font-medium text-muted-foreground">
          <CircleCheck aria-hidden="true" className="size-5 text-green-700" />
          已付全款
        </p>
      )}

      {admin && (
        <Link
          href={`/admin/orders?open=${order.id}`}
          className="mt-6 inline-block px-1 text-[0.9375rem] font-medium text-primary"
        >
          Open in admin
        </Link>
      )}

      {onNext && !ready && !done && (
        <button type="button" className={nextButton + ' mt-6'} onClick={onNext}>
          掃描下一個
        </button>
      )}

      {(ready || done) && (
        <div className="admin-material admin-edge-top fixed inset-x-0 bottom-0 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
          <div className="mx-auto max-w-md">
            <p role="alert" className="mb-2 text-center font-medium text-danger empty:hidden">
              {error}
            </p>
            {!done && balance > 0 && (
              <div className="mb-3 flex items-baseline justify-between gap-3 px-1">
                <span className="text-[1.75rem] font-bold leading-tight tracking-[-0.02em] text-danger">
                  收取餘款 {money(balance)}
                </span>
                <span className="text-sm text-muted-foreground">
                  總價 {money(order.price)} · 訂金 {money(order.deposit!)}
                </span>
              </div>
            )}
            {done ? (
              <>
                <p className="admin-pop-in flex h-16 items-center justify-center gap-2 rounded-2xl bg-green-100/80 text-xl font-semibold text-green-800">
                  <CircleCheck aria-hidden="true" className="size-6" />已
                  {doneAt?.action === 'delivered' || (delivery && !doneAt) ? '送達' : '取貨'}
                  {doneAt && <span className="text-[1rem] font-normal">{zhTime(doneAt.at)}</span>}
                </p>
                {onNext && (
                  <button type="button" className={nextButton + ' mt-3'} onClick={onNext}>
                    掃描下一個
                  </button>
                )}
              </>
            ) : (
              <button type="button" className={primaryButton} onClick={confirm} disabled={busy}>
                {busy ? '更新中…' : `確認已${verb}`}
              </button>
            )}
          </div>
        </div>
      )}
    </>
  )
}
