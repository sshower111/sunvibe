'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { adminPost, SignedOutError } from '@/lib/admin-api'
import { useAdmin } from '@/components/admin-shell'

type Device = { id: string; label: string; endpoint: string; createdAt: string; lastOkAt?: string }
type Status = { publicKey: string | null; devices: Device[] }

const isHomeScreenApp = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true
const isIos = () =>
  /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
const canPush = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
/** A name for this device in the list, e.g. "iPhone" or "Mac · Chrome". */
function deviceLabel() {
  const ua = navigator.userAgent
  const device = /iPhone/.test(ua)
    ? 'iPhone'
    : /iPad/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
      ? 'iPad'
      : /Android/.test(ua)
        ? 'Android'
        : /Mac/.test(ua)
          ? 'Mac'
          : /Windows/.test(ua)
            ? 'Windows'
            : 'Computer'
  if (device === 'iPhone' || device === 'iPad') return device
  const browser = /Edg\//.test(ua)
    ? 'Edge'
    : /Chrome\//.test(ua)
      ? 'Chrome'
      : /Firefox\//.test(ua)
        ? 'Firefox'
        : 'Safari'
  return `${device} · ${browser}`
}
/** VAPID public key (base64url) → bytes for pushManager.subscribe. */
function keyBytes(base64url: string) {
  const base64 = (base64url + '='.repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/')
  return Uint8Array.from(atob(base64), c => c.charCodeAt(0))
}
const shortDate = (iso: string) =>
  new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })

export function AdminNotifications() {
  const { signedOut } = useAdmin()
  const [status, setStatus] = useState<Status | null>(null)
  const [thisEndpoint, setThisEndpoint] = useState<string | null>(null)
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default')
  const [needsInstall, setNeedsInstall] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ error: boolean; text: string } | null>(null)

  const call = useCallback(
    async (body: Record<string, unknown>) => {
      try {
        return (await adminPost('/api/admin/push', body)) as Status & {
          sent?: number
          failed?: number
          discord?: boolean
        }
      } catch (error) {
        if (error instanceof SignedOutError) signedOut()
        throw error
      }
    },
    [signedOut],
  )

  useEffect(() => {
    // iPhone and iPad only allow notifications for sites added to the Home Screen.
    setNeedsInstall(isIos() && !isHomeScreenApp())
    if (!canPush()) {
      setPermission('unsupported')
    } else {
      setPermission(Notification.permission)
      navigator.serviceWorker.ready
        .then(reg => reg.pushManager.getSubscription())
        .then(sub => setThisEndpoint(sub?.endpoint ?? null))
        .catch(() => {})
    }
    call({ action: 'status' })
      .then(setStatus)
      .catch(e => setMessage({ error: true, text: (e as Error).message }))
  }, [call])

  async function run(task: () => Promise<string | void>) {
    setBusy(true)
    setMessage(null)
    try {
      const text = await task()
      if (text) setMessage({ error: false, text })
    } catch (e) {
      setMessage({ error: true, text: (e as Error).message || 'Something went wrong. Please retry.' })
    } finally {
      setBusy(false)
    }
  }

  // Must run straight from the button tap: iPhone only asks for permission after a tap.
  const enable = () =>
    run(async () => {
      if (!status?.publicKey) throw new Error('Notifications are not set up on the server yet (VAPID keys).')
      const result = await Notification.requestPermission()
      setPermission(result)
      if (result !== 'granted') throw new Error('Notifications were not allowed.')
      const reg = await navigator.serviceWorker.register('/admin/sw.js', { scope: '/admin' })
      await navigator.serviceWorker.ready
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(status.publicKey) }))
      const json = sub.toJSON()
      setStatus(
        await call({
          action: 'subscribe',
          label: deviceLabel(),
          subscription: { endpoint: sub.endpoint, keys: json.keys },
        }),
      )
      setThisEndpoint(sub.endpoint)
      return 'Notifications are on for this device.'
    })

  const sendTest = () =>
    run(async () => {
      const r = await call({ action: 'test' })
      const devices = r.sent ? `Test sent to ${r.sent} device${r.sent === 1 ? '' : 's'}.` : 'No device received it.'
      return devices + (r.discord ? ' Discord got it too.' : '')
    })

  const remove = (device: Device) =>
    run(async () => {
      if (!window.confirm(`Stop notifications on ${device.label || 'this device'}?`)) return
      if (device.endpoint === thisEndpoint) {
        const reg = await navigator.serviceWorker.getRegistration('/admin')
        await (await reg?.pushManager.getSubscription())?.unsubscribe()
        setThisEndpoint(null)
      }
      setStatus(await call({ action: 'remove', id: device.id }))
    })

  const devices = status?.devices ?? []
  const thisDeviceOn = !!thisEndpoint && devices.some(d => d.endpoint === thisEndpoint)

  return (
    <section
      aria-labelledby="notifications-heading"
      className="space-y-3 rounded-xl bg-white shadow-[var(--shadow-card)] p-4 sm:p-6"
    >
      <h2 id="notifications-heading" className="heading-2">
        Notifications
      </h2>

      {needsInstall ? (
        <ol className="list-decimal space-y-1 pl-5 text-sm">
          <li>
            In Safari, tap <strong>Share</strong> → <strong>Add to Home Screen</strong> → <strong>Add</strong>.
          </li>
          <li>
            Open <strong>Sunville Admin</strong> from the Home Screen and sign in.
          </li>
          <li>
            Come back to <strong>More → Settings</strong> and turn on notifications.
          </li>
        </ol>
      ) : permission === 'unsupported' ? (
        <p className="text-sm">This browser can&apos;t receive notifications.</p>
      ) : permission === 'denied' ? (
        <p className="text-sm">
          Notifications are blocked for this app. Turn them on in{' '}
          {isIos() ? 'iPhone Settings → Notifications → Sunville Admin' : "the browser's site settings"}.
        </p>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          {thisDeviceOn ? (
            <p className="text-sm font-medium text-green-800">On for this device</p>
          ) : (
            <Button onClick={enable} disabled={busy || !status}>
              Turn on notifications
            </Button>
          )}
          {devices.length > 0 && (
            <Button variant="outline" onClick={sendTest} disabled={busy}>
              Send test notification
            </Button>
          )}
        </div>
      )}

      <p
        role={message?.error ? 'alert' : 'status'}
        className={'text-sm empty:hidden ' + (message?.error ? 'text-danger' : 'text-success')}
      >
        {message?.text}
      </p>

      {devices.length > 0 && (
        <ul className="divide-y rounded-lg border">
          {devices.map(d => (
            <li key={d.id} className="flex items-center gap-3 px-3 py-2 text-sm">
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  {d.label || 'Device'}
                  {d.endpoint === thisEndpoint && <span className="text-muted-foreground"> · this device</span>}
                </p>
                <p className="text-xs text-muted-foreground">
                  Added {shortDate(d.createdAt)}
                  {d.lastOkAt && <> · last notified {shortDate(d.lastOkAt)}</>}
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={() => remove(d)} disabled={busy}>
                Remove
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
