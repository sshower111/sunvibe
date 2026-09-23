"use client"

import { useRef, useState } from "react"
import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { Card, CardContent } from "@/components/ui/card"

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: ""
  })
  const feedbackRef = useRef<HTMLDivElement>(null)
  const sendingRef = useRef(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState("")
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
    const digitsOnly = phone.replace(/\D/g, "")
    return digitsOnly.length >= 10 && digitsOnly.length <= 11
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (sendingRef.current) return
    setSubmitted(false)
    setError("")

    // Validate email and phone before submitting
    const errors: { email?: string; phone?: string } = {}

    if (!validateEmail(formData.email)) {
      errors.email = "Please enter a valid email address"
    }

    if (!validatePhone(formData.phone)) {
      errors.phone = "Please enter a valid 10-11 digit phone number"
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors)
      requestAnimationFrame(() => document.getElementById(errors.email ? "email" : "phone")?.focus())
      return
    }

    if (!formData.name.trim() || !formData.message.trim()) {
      setError("Please enter your name and a message.")
      requestAnimationFrame(() => feedbackRef.current?.focus())
      return
    }
    sendingRef.current = true
    setSubmitting(true)

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, name: formData.name.trim(), email: formData.email.trim(), phone: formData.phone.trim(), message: formData.message.trim() })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setSubmitted(true)
        setFormData({ name: "", email: "", phone: "", message: "" })
        setValidationErrors({})
      } else {
        setError(data.error || "Failed to send message. Please try again.")
      }
    } catch (err) {
      setError("Failed to send message. Please try again.")
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
        [name]: undefined
      }))
    }

    setSubmitted(false)
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-background/30 to-white flex flex-col">
      <Navigation />

      <main className="flex-1 pt-20 md:pt-28 pb-10 sm:pb-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-[1280px]">
          <div className="mb-5 sm:mb-8">
            <h1 className="font-serif text-3xl md:text-4xl font-light text-primary mb-3 tracking-[-0.02em] leading-tight">
              Contact us
            </h1>

            <p className="hidden sm:block text-base text-muted-foreground max-w-2xl leading-relaxed">
              Send a message for general questions. For orders, please call.
            </p>
            <a href="tel:+17028899887" className="hidden sm:inline-flex mt-2 min-h-11 items-center font-medium text-primary underline underline-offset-4 lg:hidden">Call 702-889-9887</a>
          </div>

          <div className="grid items-start gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <aside aria-label="Visit and contact Sunville Bakery" className="hidden sm:block order-2 min-w-0 lg:order-1">
            <div id="contact-store-details" className="space-y-5 rounded-xl bg-white py-4 sm:border sm:p-6">
            <div><h2 className="font-serif text-2xl text-primary">Visit or call us</h2><p className="mt-2 text-sm text-muted-foreground">For time-sensitive questions, please call during store hours.</p></div>
            <div><h3 className="font-semibold">Phone</h3><a className="inline-flex min-h-11 items-center text-primary underline underline-offset-4" href="tel:+17028899887">702-889-9887</a></div>
            <div><h3 className="font-semibold">Location</h3><address className="mt-2 not-italic text-muted-foreground">4053 Spring Mountain Rd<br />Las Vegas, NV 89102</address><a href="https://www.google.com/maps/search/?api=1&query=4053+Spring+Mountain+Rd+Las+Vegas+NV+89102" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center text-primary underline underline-offset-4">Get directions<span className="sr-only"> (opens a new tab)</span></a></div>
            <div><h3 className="mb-2 font-semibold">Hours · Pacific Time</h3><p className="text-sm leading-7 text-muted-foreground">Mon–Tue, Thu–Sun: 8 AM–8 PM<br />Wednesday: 8 AM–3 PM</p></div>
            <div><h3 className="font-semibold">Email</h3><a href="mailto:sunvillebakerylv@gmail.com" className="inline-flex min-h-11 items-center break-all text-primary underline underline-offset-4">sunvillebakerylv@gmail.com</a></div>
            </div>
          </aside>
          <div className="order-1 min-w-0 lg:order-2">
            <Card className="gap-0 border-0 bg-transparent py-0 shadow-none sm:rounded-2xl sm:border sm:border-border sm:bg-white sm:py-6 sm:shadow-sm">
              <CardContent className="p-0 sm:p-6">
                <h2 className="hidden sm:block font-serif text-2xl md:text-3xl font-normal text-primary mb-4 tracking-tight">Send us a Message</h2>

                <div ref={feedbackRef} tabIndex={-1} className="focus:outline-none">
                {submitted && (
                  <div role="status" className="mb-6 p-4 bg-green-50 border-2 border-green-200 rounded-xl animate-in fade-in slide-in-from-top-2 duration-300">
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
                <p className="hidden sm:block mb-4 text-sm text-muted-foreground">* Required fields. For questions, not order confirmation.</p>
                <form onSubmit={handleSubmit} aria-busy={submitting} className="space-y-4 sm:space-y-5">
                  <fieldset disabled={submitting} className="space-y-4 sm:space-y-5">
                  <div>
                    <label htmlFor="name" className="block text-sm sm:text-base font-medium mb-1.5 sm:mb-3 text-foreground">
                      Name
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      autoComplete="name"
                      maxLength={100}
                      required
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full px-3 py-3 sm:px-5 sm:py-4 border border-border rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-300 text-base"
                      placeholder="Your name"
                    />
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm sm:text-base font-medium mb-1.5 sm:mb-3 text-foreground">
                      Email
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      autoComplete="email"
                      maxLength={100}
                      aria-invalid={!!validationErrors.email}
                      aria-describedby={validationErrors.email ? "email-error" : undefined}
                      required
                      value={formData.email}
                      onChange={handleChange}
                      className={`w-full px-3 py-3 sm:px-5 sm:py-4 border ${
                        validationErrors.email ? "border-red-500" : "border-border"
                      } rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-300 text-base`}
                      placeholder="your.email@example.com"
                    />
                    {validationErrors.email && (
                      <p id="email-error" className="mt-2 text-sm text-red-600">{validationErrors.email}</p>
                    )}
                  </div>

                  <div id="optional-phone" className={validationErrors.phone ? "block" : "hidden sm:block"}>
                    <label htmlFor="phone" className="block text-sm sm:text-base font-medium mb-1.5 sm:mb-3 text-foreground">
                      Phone Number (Optional)
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      autoComplete="tel"
                      aria-invalid={!!validationErrors.phone}
                      aria-describedby={validationErrors.phone ? "phone-error" : undefined}
                      value={formData.phone}
                      onChange={handleChange}
                      maxLength={30}
                      className={`w-full px-3 py-3 sm:px-5 sm:py-4 border ${
                        validationErrors.phone ? "border-red-500" : "border-border"
                      } rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-300 text-base`}
                      placeholder="(702) 123-4567"
                    />
                    {validationErrors.phone && (
                      <p id="phone-error" className="mt-2 text-sm text-red-600">{validationErrors.phone}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="message" className="block text-sm sm:text-base font-medium mb-1.5 sm:mb-3 text-foreground">
                      Message
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      maxLength={5000}
                      required
                      value={formData.message}
                      onChange={handleChange}
                      rows={4}
                      className="w-full px-3 py-3 sm:px-5 sm:py-4 border border-border rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-300 min-h-28 sm:min-h-40 resize-y text-base"
                      placeholder="Tell us what you'd like to know..."
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full min-h-12 px-6 py-3 sm:py-4 bg-primary text-primary-foreground font-semibold text-sm sm:text-base rounded-lg sm:rounded-xl transition-all duration-300 hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  >
                    {submitting ? "Sending..." : "Send Message"}
                  </button>
                  <p className="text-xs text-muted-foreground sm:hidden">For orders, <a href="tel:+17028899887" className="inline-block py-2 underline underline-offset-4">call the bakery</a>.</p>
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
