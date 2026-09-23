"use client"

import { Button } from '@/components/ui/button'
import { useEffect, useRef, useState } from 'react'

type TurnstileApi = {
  render: (container: HTMLElement, options: Record<string, unknown>) => string
  remove: (id: string) => void
}
type TurnstileWindow = Window & { turnstile?: TurnstileApi }
let loading: Promise<TurnstileApi> | undefined

function loadTurnstile(): Promise<TurnstileApi> {
  if (loading) return loading
  loading = new Promise<TurnstileApi>((resolve, reject) => {
    const existing = (window as TurnstileWindow).turnstile
    if (existing) { resolve(existing); return }
    const script = document.createElement('script')
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    script.async = true
    // Reuse the current document nonce, including after client-side navigation.
    script.nonce = document.querySelector<HTMLScriptElement>('script[nonce]')?.nonce || ''
    const fail = () => {
      window.clearTimeout(timer)
      script.remove()
      reject(new Error('Verification script could not load'))
    }
    const timer = window.setTimeout(fail, 15000)
    script.onerror = fail
    script.onload = () => {
      const api = (window as TurnstileWindow).turnstile
      if (!api) { fail(); return }
      window.clearTimeout(timer)
      resolve(api)
    }
    document.head.appendChild(script)
  }).catch(error => { loading = undefined; throw error })
  return loading
}

export function ContactCaptcha({ onToken, resetKey, action = "contact" }: { onToken: (token: string) => void; resetKey: number; action?: "contact" | "custom_cake" }) {
  const sitekey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
  const container = useRef<HTMLDivElement>(null)
  const callback = useRef(onToken)
  callback.current = onToken
  const [status, setStatus] = useState<'loading' | 'verifying' | 'verified' | 'error'>('loading')
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!sitekey) return
    let active = true
    let api: TurnstileApi | undefined
    let widget: string | undefined
    setStatus('loading')
    setError('')
    callback.current('')
    const fail = (message: string) => {
      if (!active) return
      window.clearTimeout(timer)
      callback.current('')
      setError(message)
      setStatus('error')
    }
    const timer = window.setTimeout(() => fail('Verification is taking longer than expected. Please retry. If it keeps failing, check your connection or try another browser.'), 45000)
    loadTurnstile().then(loaded => {
      if (!active || !container.current) return
      api = loaded
      setStatus('verifying')
      widget = api.render(container.current, {
        sitekey, action, size: 'flexible', appearance: 'always',
        callback: (token: string) => {
          if (!active) return
          window.clearTimeout(timer)
          setError('')
          setStatus('verified')
          callback.current(token)
        },
        'expired-callback': () => fail('Verification expired. Please verify again.'),
        'timeout-callback': () => fail('Verification timed out. Please retry.'),
        'error-callback': (code: string) => {
          fail(code === '110200'
            ? 'Verification is not configured for this website address. Please contact the bakery.'
            : 'Verification could not complete. Please retry or check whether your browser is blocking Cloudflare.')
          return true
        },
      })
    }).catch(() => fail('Verification could not load. Please retry or check your connection.'))
    return () => {
      active = false
      window.clearTimeout(timer)
      if (widget !== undefined) api?.remove(widget)
    }
  }, [sitekey, resetKey, attempt, action])

  if (!sitekey) return <p role="status" className="text-sm text-muted-foreground">Online messages are temporarily unavailable. Please call the bakery.</p>
  return <div className="min-w-0 space-y-2">
    <div ref={container} />
    <p role="status" aria-live="polite" className="text-sm text-muted-foreground">
      {status === 'loading' && 'Loading security verification…'}
      {status === 'verifying' && 'Verifying your connection… You can submit when verification finishes.'}
      {status === 'verified' && 'Verification complete. You can submit your inquiry.'}
    </p>
    {status === 'error' && <div>
      <p role="alert" className="text-sm text-red-700">{error}</p>
      <Button variant="outline" type="button" onClick={() => setAttempt(value => value + 1)} className="mt-2">Retry verification</Button>
    </div>}
  </div>
}
