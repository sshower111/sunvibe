'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'

// Staff sign-in for the pickup screen (lib/staff-auth.ts), in Chinese. Signed in once, a phone stays signed in.

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
  const signOut = () =>
    fetch('/api/staff/session', { method: 'DELETE' })
      .catch(() => {})
      .then(() => setRole(null))
  return { role, setRole, signOut }
}

export function StaffShell({ children }: { children: React.ReactNode }) {
  return (
    <main lang="zh-Hant" className="min-h-dvh bg-gray-50 px-4 pb-10 pt-[max(1.25rem,env(safe-area-inset-top))]">
      <div className="mx-auto max-w-md space-y-4">
        <img src="/logo-dark.png" alt="Sunville Bakery" width={160} height={39} className="mx-auto h-auto w-40" />
        {children}
      </div>
    </main>
  )
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
    <form onSubmit={submit} className="space-y-4 rounded-xl border bg-white p-5 shadow-sm">
      <h1 className="text-2xl font-bold">員工登入</h1>
      <p className="text-muted-foreground">只需登入一次，這部手機會記住登入。</p>
      <div className="space-y-2">
        <label htmlFor="staff-password" className="block font-medium">
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
      <p role="alert" className="text-danger empty:hidden">
        {error}
      </p>
      <Button type="submit" size="lg" className="h-14 w-full text-lg" disabled={busy}>
        {busy ? '登入中…' : '登入'}
      </Button>
    </form>
  )
}
