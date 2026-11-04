'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import jsQR from 'jsqr'
import { Button } from './ui/button'
import { StaffSignIn, useStaffSession } from './staff-sign-in'
import { Page, PickupOrder } from './staff-pickup'

// /employee, the "Sunville QR" Home Screen app: sign in once, then it opens straight to a camera scanner. Scanning a
// customer's pickup QR code (lib/pickup-qr.ts) shows the order right here, in the app, instead of in Safari, which
// is where the iPhone Camera app would open it.

const PICKUP_LINK = /\/pickup\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?:[/?#]|$)/i
/** The order id in a scanned pickup code, or null for any other QR code. */
export function pickupIdFrom(text: string) {
  try {
    const url = new URL(text)
    if (url.hostname !== location.hostname) return null
    return url.pathname.match(PICKUP_LINK)?.[1] ?? null
  } catch {
    return null
  }
}

export function StaffEmployee() {
  const { role, setRole } = useStaffSession()
  const [orderId, setOrderId] = useState<string | null>(null)
  return (
    <Page>
      {role === undefined && <p className="pt-10 text-center text-muted-foreground">載入中…</p>}
      {role === null && <StaffSignIn onSignedIn={() => setRole('staff')} />}
      {role && !orderId && <Scanner onScan={setOrderId} />}
      {role && orderId && (
        <PickupOrder
          key={orderId}
          id={orderId}
          admin={role === 'admin'}
          onSignedOut={() => setRole(null)}
          onNext={() => setOrderId(null)}
        />
      )}
    </Page>
  )
}

function Scanner({ onScan }: { onScan: (orderId: string) => void }) {
  const video = useRef<HTMLVideoElement>(null)
  const [state, setState] = useState<'starting' | 'scanning' | 'denied' | 'unavailable'>('starting')
  const [notPickup, setNotPickup] = useState(false)
  const [attempt, setAttempt] = useState(0)

  const found = useCallback((text: string) => {
    const id = pickupIdFrom(text)
    if (id) return id
    setNotPickup(true)
    return null
  }, [])

  useEffect(() => {
    let stream: MediaStream | undefined
    let frame = 0
    let stopped = false
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d', { willReadFrequently: true })
    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) return setState('unavailable')
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        })
      } catch (error) {
        return setState((error as Error).name === 'NotAllowedError' ? 'denied' : 'unavailable')
      }
      if (stopped || !video.current) return stream.getTracks().forEach(t => t.stop())
      video.current.srcObject = stream
      await video.current.play().catch(() => {})
      setState('scanning')
      let last = 0
      const tick = (now: number) => {
        if (stopped) return
        frame = requestAnimationFrame(tick)
        const v = video.current
        if (!v || !context || v.readyState < 2 || now - last < 150) return
        last = now
        // A smaller copy is enough to read the code and keeps older phones fast.
        const scale = Math.min(1, 640 / Math.max(v.videoWidth, v.videoHeight))
        canvas.width = Math.round(v.videoWidth * scale)
        canvas.height = Math.round(v.videoHeight * scale)
        context.drawImage(v, 0, 0, canvas.width, canvas.height)
        const code = jsQR(context.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height, {
          inversionAttempts: 'dontInvert',
        })
        const id = code?.data ? found(code.data) : null
        if (id) {
          stopped = true
          navigator.vibrate?.(50)
          onScan(id)
        }
      }
      frame = requestAnimationFrame(tick)
    }
    void start()
    return () => {
      stopped = true
      cancelAnimationFrame(frame)
      stream?.getTracks().forEach(t => t.stop())
    }
  }, [attempt, found, onScan])

  useEffect(() => {
    if (!notPickup) return
    const timer = setTimeout(() => setNotPickup(false), 2500)
    return () => clearTimeout(timer)
  }, [notPickup])

  return (
    <section className="space-y-4 pt-4">
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-black">
        <video ref={video} muted playsInline className="size-full object-cover" aria-label="相機" />
        {state === 'scanning' && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-[18%] rounded-2xl border-4 border-white/90"
          />
        )}
      </div>
      {state === 'scanning' && (
        <p className="text-center text-lg text-muted-foreground">
          {notPickup ? <span className="text-danger">這不是取貨碼</span> : '對準客人電郵裡的 QR code'}
        </p>
      )}
      {(state === 'denied' || state === 'unavailable') && (
        <div className="space-y-3 text-center">
          <p className="text-lg text-danger">
            {state === 'denied' ? '未能使用相機。請在設定中允許使用相機，然後重試。' : '這部手機未能開啟相機。'}
          </p>
          <Button variant="outline" onClick={() => setAttempt(n => n + 1)}>
            重試
          </Button>
        </div>
      )}
    </section>
  )
}
