'use client'
import { formatPhone } from '@/lib/form-helpers'
import { EmailInput } from '@/components/email-input'

import { hasMeaningfulMessage } from '@/lib/contact-validation'
import { useRef, useState } from 'react'
import { Navigation } from '@/components/navigation'
import { Footer } from '@/components/footer'
import { ContactCaptcha, type CaptchaHandle } from '@/components/contact-captcha'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { FormAlert } from '@/components/ui/form-message'

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
  type FieldErrors = { name?: string; email?: string; phone?: string; message?: string }
  const [validationErrors, setValidationErrors] = useState<FieldErrors>({})

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

    // Check every field first and show each problem under its field.
    const errors: FieldErrors = {}
    if (!formData.name.trim()) errors.name = 'Please enter your name.'
    if (!formData.email.trim()) errors.email = 'Please enter your email.'
    else if (!validateEmail(formData.email.trim())) errors.email = 'Please enter a valid email, like name@gmail.com.'
    if (!validatePhone(formData.phone)) errors.phone = 'Please enter a 10-digit phone number.'
    if (!formData.message.trim()) errors.message = 'Please enter a message.'
    else if (!hasMeaningfulMessage(formData.message))
      errors.message = 'Please describe your question in words, not just numbers or a link.'

    const first = (['name', 'email', 'phone', 'message'] as const).find(field => errors[field])
    if (first) {
      setValidationErrors(errors)
      requestAnimationFrame(() => document.getElementById(first)?.focus())
      return
    }
    setValidationErrors({})
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

  // Shown together right above the Send button; the fields themselves turn red.
  const fieldMessages = (['name', 'email', 'phone', 'message'] as const)
    .map(field => validationErrors[field])
    .filter((m): m is string => !!m)

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

                  <form
                    method="post"
                    noValidate
                    onSubmit={handleSubmit}
                    aria-busy={submitting}
                    className="space-y-4 sm:space-y-5"
                  >
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
                          aria-invalid={!!validationErrors.name}
                          aria-describedby={validationErrors.name ? 'form-errors' : undefined}
                          placeholder="Your name"
                        />
                      </div>

                      <div>
                        <label htmlFor="email" className="mb-2 block text-sm font-semibold text-foreground">
                          Email
                        </label>
                        <EmailInput
                          id="email"
                          name="email"
                          autoComplete="email"
                          maxLength={100}
                          aria-invalid={!!validationErrors.email}
                          aria-describedby={validationErrors.email ? 'form-errors' : undefined}
                          required
                          value={formData.email}
                          onChange={handleChange}
                          placeholder="your.email@example.com"
                        />
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
                          aria-describedby={validationErrors.phone ? 'form-errors' : undefined}
                          value={formData.phone}
                          onChange={handleChange}
                          inputMode="numeric"
                          maxLength={14}
                          placeholder="(702) 123-4567"
                        />
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
                          aria-invalid={!!validationErrors.message}
                          aria-describedby={validationErrors.message ? 'form-errors' : undefined}
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
                      <div ref={feedbackRef} tabIndex={-1} className="focus:outline-none empty:hidden">
                        {submitted && <FormAlert type="success">Message sent. We'll get back to you soon.</FormAlert>}
                        {fieldMessages.length > 0 && (
                          <FormAlert type="error" id="form-errors">
                            {fieldMessages.length === 1 ? (
                              fieldMessages[0]
                            ) : (
                              <>
                                Please check the highlighted fields:
                                <ul className="mt-1 list-disc space-y-0.5 pl-5 font-normal">
                                  {fieldMessages.map(m => (
                                    <li key={m}>{m}</li>
                                  ))}
                                </ul>
                              </>
                            )}
                          </FormAlert>
                        )}
                        {error && <FormAlert type="error">{error}</FormAlert>}
                      </div>
                      <Button type="submit" loading={submitting} className="w-full">
                        {submitting ? 'Sending…' : 'Send Message'}
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
