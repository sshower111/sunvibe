'use client'

import { useCallback, useEffect, useState } from 'react'
import { Input } from './ui/input'

// Staff sign-in for the pickup screen (lib/staff-auth.ts), in Chinese. Signed in once, a phone stays signed in.

// Shared look for the staff screens (Apple-style, app/globals.css): white grouped cards on grey, big filled buttons
// that shrink slightly the moment they are pressed.
export const card = 'overflow-hidden rounded-2xl bg-white shadow-[var(--shadow-card)]'
export const primaryButton =
  'admin-pressable flex h-14 w-full items-center justify-center rounded-2xl bg-primary text-lg font-semibold text-white active:bg-[color-mix(in_srgb,var(--primary)_82%,black)] disabled:opacity-60'
export const secondaryButton =
  'admin-pressable inline-flex h-12 items-center justify-center rounded-xl bg-[var(--admin-fill)] px-6 text-[1.0625rem] font-semibold text-primary'

export type StaffRole = 'staff' | 'admin'

/** Who is signed in on this phone: undefined while checking, null when signed out. */
export function useStaffSession() {
  const [role, setRole] = useState<StaffRole | null | undefined>(undefined)
  const check = useCallback(() => {
    fetch('/api/staff/session', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => setRole(d.role ?? null))
      .catch(() => setRole(null))
  }, [])
  useEffect(check, [check])
  return { role, setRole }
}

export function StaffSignIn({ onSignedIn }: { onSignedIn: () => void }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const r = await fetch('/api/staff/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const data = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(data.error || '登入失敗，請重試。')
      setPassword('')
      onSignedIn()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <form onSubmit={submit} className="admin-pop-in space-y-5 pt-12">
      <img src="/logo-dark.png" alt="Sunville Bakery" width={160} height={39} className="mx-auto h-auto w-40" />
      <h1 className="admin-large-title pt-4 text-center">員工登入</h1>
      <div className={card + ' space-y-2 p-4'}>
        <label htmlFor="staff-password" className="block text-sm font-medium text-muted-foreground">
          密碼
        </label>
        <Input
          id="staff-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          autoFocus
          disabled={busy}
        />
      </div>
      <p role="alert" className="px-1 font-medium text-danger empty:hidden">
        {error}
      </p>
      <button type="submit" className={primaryButton} disabled={busy}>
        {busy ? '登入中…' : '登入'}
      </button>
    </form>
  )
}
