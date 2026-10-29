'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { adminPost } from '@/lib/admin-api'

type Summary = { checked: number; legacy: number; updated: number; failed: string[] }

/** Admin → Settings: moves saved customer data off the old password-based key (see docs/ADMIN_GUIDE.md). */
export function AdminStorageKey() {
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<{ action: 'check' | 'reencrypt'; summary: Summary } | null>(null)
  const [error, setError] = useState('')

  async function run(action: 'check' | 'reencrypt') {
    setBusy(true)
    setError('')
    try {
      setResult({ action, summary: await adminPost<Summary>('/api/admin/storage-key', { action }) })
    } catch (failure) {
      setResult(null)
      setError(failure instanceof Error ? failure.message : 'Something went wrong. Please retry.')
    } finally {
      setBusy(false)
    }
  }

  const summary = result?.summary
  return (
    <div>
      <h3 className="heading-3 mb-2">Encryption key</h3>
      <p className="mb-3 text-sm text-muted-foreground">
        Customer details are encrypted with <code>CAMPAIGN_STORAGE_SECRET</code>. Older records may still use the admin
        password. Check, then re-encrypt them before changing <code>ADMIN_PASSWORD</code>.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" disabled={busy} onClick={() => run('check')}>
          Check
        </Button>
        <Button disabled={busy} onClick={() => run('reencrypt')}>
          Re-encrypt old records
        </Button>
      </div>
      {error && (
        <p className="mt-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}
      {summary && (
        <p className="mt-3 text-sm" role="status">
          {result.action === 'check'
            ? `${summary.legacy} of ${summary.checked} records still use the admin password.`
            : `Re-encrypted ${summary.updated} of ${summary.legacy} old records (${summary.checked} checked).`}
          {summary.failed.length > 0 && ` Could not process: ${summary.failed.join(', ')}.`}
        </p>
      )}
    </div>
  )
}
