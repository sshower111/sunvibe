'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { adminPost } from '@/lib/admin-api'

/** Admin → Settings: the name that signs the AI reply drafts on cake inquiries. */
export function AdminReplySigner() {
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const request = (body: Record<string, unknown>) => adminPost('/api/admin/cake-inquiries', body)

  useEffect(() => {
    request({ action: 'get_signer' })
      .then(r => setName(r.signer))
      .catch(() => {})
  }, [])

  async function save() {
    setBusy(true)
    try {
      await request({ action: 'signer', name })
      setMessage('Saved')
    } catch (e) {
      setMessage((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <label htmlFor="reply-signer" className="heading-3 mb-2 block">
        Reply signature
      </label>
      <div className="flex max-w-sm gap-2">
        <Input id="reply-signer" value={name} maxLength={40} onChange={e => setName(e.target.value)} />
        <Button disabled={busy || !name.trim()} onClick={save}>
          Save
        </Button>
      </div>
      <p role="status" className="mt-1 text-sm text-muted-foreground empty:hidden">
        {message}
      </p>
    </div>
  )
}
