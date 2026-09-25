"use client"

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'

type TurnstileApi = {
  render: (container: HTMLElement, options: Record<string, unknown>) => string
  remove: (id: string) => void
  reset: (id: string) => void
  execute: (id: string) => void
}
type TurnstileWindow = Window & { turnstile?: TurnstileApi }
export type CaptchaHandle = { verify: () => Promise<string> }
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


// Widget mode is configured as Invisible in Cloudflare. No token/status UI is
// shown while filling out the form; each submit requests a fresh, single-use token.
export const ContactCaptcha = forwardRef<CaptchaHandle, { action?: 'contact' | 'custom_cake' | 'pre_order' }>(function ContactCaptcha({ action = 'contact' }, ref) {
  const sitekey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
  const container = useRef<HTMLDivElement>(null)
  const verify = useRef<() => Promise<string>>(() => Promise.reject(new Error('Please try sending again.')))
  useImperativeHandle(ref, () => ({ verify: () => verify.current() }), [])
  useEffect(() => {
    let active = true
    let api: TurnstileApi | undefined
    let widget: string | undefined
    let timer: ReturnType<typeof setTimeout> | undefined
    let pending: { resolve: (token: string) => void; reject: (error: Error) => void } | undefined
    const fail = (message: string) => {
      clearTimeout(timer)
      const current = pending; pending = undefined
      current?.reject(new Error(message))
    }
    // Load the small provider API ahead of submission, but do not run a challenge yet.
    let ready: Promise<void> | undefined
    const initialize = (): Promise<void> => ready ||= (sitekey ? loadTurnstile().then(loaded => {
      if (!active || !container.current) throw new Error('Form closed.')
      api = loaded
      widget = api.render(container.current, {
        sitekey, action, execution: 'execute', appearance: 'interaction-only',
        'response-field': false, retry: 'never', 'refresh-expired': 'manual',
        callback: (token: string) => {
          if (!active || !pending) return
          clearTimeout(timer)
          const current = pending; pending = undefined
          token ? current.resolve(token) : current.reject(new Error('Unable to verify your request. Please try again.'))
        },
        'expired-callback': () => fail('Your request expired. Please send it again.'),
        'timeout-callback': () => fail('Unable to verify your request. Please try again.'),
        'error-callback': () => { fail('Unable to verify your request. Please try again or call 702-889-9887.'); return true },
      })
    }) : Promise.reject(new Error('Online messages are temporarily unavailable. Please call 702-889-9887.'))).catch(error => { ready = undefined; throw error })
    // Prevent an unhandled rejection before a visitor presses Send.
    void initialize().catch(() => {})
    verify.current = async () => {
      if (pending) throw new Error('Your request is already being sent.')
      await initialize()
      if (!active || !api || widget === undefined) throw new Error('Please try sending again.')
      api.reset(widget)
      return new Promise<string>((resolve, reject) => {
        pending = { resolve, reject }
        timer = setTimeout(() => fail('Unable to verify your request. Please try again or call 702-889-9887.'), 30000)
        try { api!.execute(widget!) } catch { fail('Unable to verify your request. Please try again.') }
      })
    }
    return () => {
      active = false
      fail('Form closed.')
      if (widget !== undefined) api?.remove(widget)
    }
  }, [sitekey, action])
  return <div ref={container} />
})
