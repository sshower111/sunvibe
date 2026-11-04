'use client'

import { Button } from './ui/button'
import { StaffShell, StaffSignIn, useStaffSession } from './staff-sign-in'

// /staff: a worker's phone is set up by signing in here once. After that, scanning a customer's pickup code with
// the phone camera opens the order straight away.

export function StaffSetup() {
  const { role, setRole, signOut } = useStaffSession()
  return (
    <StaffShell>
      {role === undefined && <p className="text-center text-muted-foreground">載入中…</p>}
      {role === null && <StaffSignIn onSignedIn={() => setRole('staff')} />}
      {role && (
        <section className="space-y-4 rounded-xl border bg-white p-5 text-lg shadow-sm">
          <p className="rounded-xl border-2 border-green-600 bg-green-50 p-4 text-xl font-bold text-green-800">
            ✓ 這部手機已設定好
          </p>
          <ol className="list-decimal space-y-2 pl-6">
            <li>客人來取蛋糕時，打開手機相機。</li>
            <li>對準客人電郵裡的取貨碼（QR code），點一下出現的連結。</li>
            <li>核對訂單，收取餘款（如有），然後按「確認已取貨」或「確認已送達」。</li>
          </ol>
          <p className="text-base text-muted-foreground">
            沒有取貨碼也沒關係：問客人的名字，照平常方法處理。這部手機會一直記住登入，不用再設定。
          </p>
          <Button variant="outline" className="w-full" onClick={() => void signOut()}>
            登出
          </Button>
        </section>
      )}
    </StaffShell>
  )
}
