'use client'

import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

// Settings → Staff phones: a QR code that sets up a worker's phone for the pickup screen (/staff). They scan it
// with the phone camera and sign in with the staff password once (lib/staff-auth.ts).

export function AdminStaffPhones() {
  const [info, setInfo] = useState<{ configured: boolean; setupUrl: string } | null>(null)
  const [qr, setQr] = useState('')
  useEffect(() => {
    fetch('/api/admin/staff', { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : null))
      .then(async d => {
        if (!d) return
        setInfo(d)
        setQr(await QRCode.toDataURL(d.setupUrl, { width: 440, margin: 2 }))
      })
      .catch(() => {})
  }, [])
  return (
    <section aria-labelledby="staff-heading" className="space-y-3 rounded-xl border bg-white p-4 sm:p-6">
      <h2 id="staff-heading" className="heading-2">
        Staff phones
      </h2>
      <p>
        Workers can scan customers&apos; pickup QR codes and confirm pickups. They only see the order they scanned, and
        can&apos;t open admin or change anything else.
      </p>
      {info && !info.configured && (
        <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-amber-900">
          Set a staff password first: Vercel → Project → Settings → Environment Variables → add{' '}
          <code>STAFF_PASSWORD</code>, then redeploy. Until then only the admin password works there.
        </p>
      )}
      <ol className="list-decimal space-y-1 pl-6">
        <li>On the worker&apos;s phone, open the camera and scan this code.</li>
        <li>Enter the staff password once. That&apos;s it: the phone stays signed in.</li>
      </ol>
      {qr && (
        <img src={qr} alt="QR code to set up a staff phone" width={220} height={220} className="rounded-lg border" />
      )}
      {info && (
        <p className="break-all text-sm text-muted-foreground">
          Or send them this link: <a href={info.setupUrl}>{info.setupUrl}</a>
        </p>
      )}
      <p className="text-sm text-muted-foreground">
        To sign every staff phone out (e.g. someone leaves), change <code>STAFF_PASSWORD</code> in Vercel and redeploy.
      </p>
    </section>
  )
}
