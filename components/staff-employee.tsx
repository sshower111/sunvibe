'use client'

import { StaffSignIn, useStaffSession } from './staff-sign-in'

// /employee: just the staff sign-in (lib/staff-auth.ts); once signed in, one line saying so.
export function StaffEmployee() {
  const { role, setRole } = useStaffSession()
  return (
    <main lang="zh-Hant" className="min-h-dvh bg-white">
      <div className="mx-auto max-w-md px-5 pt-[max(1.5rem,env(safe-area-inset-top))]">
        {role === undefined && <p className="pt-10 text-center text-muted-foreground">載入中…</p>}
        {role === null && <StaffSignIn onSignedIn={() => setRole('staff')} />}
        {role && <p className="pt-16 text-center text-2xl font-semibold text-green-800">✓ 已登入</p>}
      </div>
    </main>
  )
}
