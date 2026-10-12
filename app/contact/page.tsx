'use client'
import { formatPhone, emailSuggestions } from '@/lib/form-helpers'

import { hasMeaningfulMessage } from '@/lib/contact-validation'
import { useRef, useState } from 'react'
import { Navigation } from '@/components/navigation'
import { Footer } from '@/components/footer'
import { ContactCaptcha, type CaptchaHandle } from '@/components/contact-captcha'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
  })
  const website = useRef<HTMLInputElement>(null)
  const captcha = useRef<CaptchaHandle>(null)
  const feedbackRef = useRef<HTMLDivElement>(null)
  const sendingRef = useRef(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [validationErrors, setValidationErrors] = useState<{
    email?: string
    phone?: string
  }>({})

  // Validation functions
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const validatePhone = (phone: string): boolean => {
    if (!phone) return true // Phone is optional
    const digitsOnly = phone.replace(/\D/g, '')
    return digitsOnly.length === 10
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (sendingRef.current) return
    setSubmitted(false)
    setError('')

    // Validate email and phone before submitting
    const errors: { email?: string; phone?: string } = {}

    if (!validateEmail(formData.email)) {
      errors.email = 'Please enter a valid email address'
    }

    if (!validatePhone(formData.phone)) {
      errors.phone = 'Please enter a 10-digit phone number'
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors)
      requestAnimationFrame(() => document.getElementById(errors.email ? 'email' : 'phone')?.focus())
      return
    }

    if (!formData.name.trim() || !formData.message.trim()) {
      setError('Please enter your name and a message.')
      requestAnimationFrame(() => feedbackRef.current?.focus())
      return
    }
    if (!hasMeaningfulMessage(formData.message)) {
      setError('Please describe your question in words, not just numbers or a link.')
      requestAnimationFrame(() => feedbackRef.current?.focus())
      return
    }
    sendingRef.current = true
    setSubmitting(true)

    try {
      const captchaToken = await captcha.current?.verify()
      if (!captchaToken) throw new Error('Unable to verify your request. Please try again.')
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          website: website.current?.value || '',
          captchaToken,
          name: formData.name.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim(),
          message: formData.message.trim(),
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setSubmitted(true)
        setFormData({ name: '', email: '', phone: '', message: '' })
        setValidationErrors({})
      } else {
        setError(data.error || 'Failed to send message. Please try again.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message. Please try again.')
    } finally {
      sendingRef.current = false
      setSubmitting(false)
      requestAnimationFrame(() => feedbackRef.current?.focus())
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target

    // Clear validation error for the field being edited
    if (validationErrors[name as keyof typeof validationErrors]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: undefined,
      }))
    }

    setSubmitted(false)
    setFormData(prev => ({ ...prev, [name]: name === 'phone' ? formatPhone(value) : value }))
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />

      <main id="main-content" tabIndex={-1} className="flex-1 page-space">
        <div className="site-container">
          <div className="mx-auto max-w-2xl">
            <h1 className="heading-1 mb-5 sm:mb-8">Contact us</h1>
            <div className="min-w-0">
              <Card className="gap-0 border-0 bg-transparent py-0 shadow-none sm:rounded-xl sm:border sm:border-border sm:bg-white sm:py-6 sm:shadow-sm">
                <CardContent className="p-0 sm:p-6">
                  <h2 className="sr-only">Send us a message</h2>

                  <div ref={feedbackRef} tabIndex={-1} className="focus:outline-none">
                    {submitted && (
                      <div
                        role="status"
                        className="mb-6 p-4 bg-green-50 border-2 border-green-200 rounded-xl animate-in fade-in slide-in-from-top-2 duration-300"
                      >
                        <p className="text-green-800 font-semibold text-base sm:text-lg">
                          ✓ Message sent successfully! We'll get back to you soon.
                        </p>
                      </div>
                    )}

                    {error && (
                      <div role="alert" className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-xl">
                        <p className="text-red-800 font-semibold text-base sm:text-lg">{error}</p>
                      </div>
                    )}
                  </div>
                  <form method="post" onSubmit={handleSubmit} aria-busy={submitting} className="space-y-4 sm:space-y-5">
                    <div hidden aria-hidden="true">
                      <label>
                        Leave this blank
                        <input ref={website} name="website" type="text" tabIndex={-1} autoComplete="off" />
                      </label>
                    </div>
                    <fieldset disabled={submitting} className="space-y-4 sm:space-y-5">
                      <div>
                        <label htmlFor="name" className="mb-2 block text-sm font-semibold text-foreground">
                          Name
                        </label>
                        <Input
                          type="text"
                          id="name"
                          name="name"
                          autoComplete="name"
                          maxLength={100}
                          required
                          value={formData.name}
                          onChange={handleChange}

                          placeholder="Your name"
                        />
                      </div>

                      <div>
                        <label htmlFor="email" className="mb-2 block text-sm font-semibold text-foreground">
                          Email
                        </label>
                        <Input
                          type="email"
                          id="email"
                          name="email"
                          autoComplete="email"
                          list="email-suggestions"
                          maxLength={100}
                          aria-invalid={!!validationErrors.email}
                          aria-describedby={validationErrors.email ? 'email-error' : undefined}
                          required
                          value={formData.email}
                          onChange={handleChange}

                          placeholder="your.email@example.com"
                        />
                        <datalist id="email-suggestions">
                          {emailSuggestions(formData.email).map(option => (
                            <option key={option} value={option} />
                          ))}
                        </datalist>
                        {validationErrors.email && (
                          <p id="email-error" className="mt-2 text-sm text-red-600">
                            {validationErrors.email}
                          </p>
                        )}
                      </div>

                      <div id="optional-phone" className={validationErrors.phone ? 'block' : 'hidden sm:block'}>
                        <label htmlFor="phone" className="mb-2 block text-sm font-semibold text-foreground">
                          Phone Number (Optional)
                        </label>
                        <Input
                          type="tel"
                          id="phone"
                          name="phone"
                          autoComplete="tel"
                          aria-invalid={!!validationErrors.phone}
                          aria-describedby={validationErrors.phone ? 'phone-error' : undefined}
                          value={formData.phone}
                          onChange={handleChange}
                          inputMode="numeric"
                          maxLength={14}

                          placeholder="(702) 123-4567"
                        />
                        {validationErrors.phone && (
                          <p id="phone-error" className="mt-2 text-sm text-red-600">
                            {validationErrors.phone}
                          </p>
                        )}
                      </div>

                      <div>
                        <label htmlFor="message" className="mb-2 block text-sm font-semibold text-foreground">
                          Message
                        </label>
                        <Textarea
                          id="message"
                          name="message"
                          maxLength={5000}
                          required
                          value={formData.message}
                          onChange={handleChange}
                          rows={4}

                          placeholder="Tell us what you'd like to know..."
                        />
                      </div>

                      <ContactCaptcha ref={captcha} />
                      <a
                        href="/privacy"
                        className="inline-flex min-h-12 items-center text-xs text-muted-foreground underline underline-offset-4"
                      >
                        Privacy
                      </a>
                      <Button type="submit" disabled={submitting} className="w-full">
                        {submitting ? 'Sending...' : 'Send Message'}
                      </Button>
                    </fieldset>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
