"use client"

import { useState } from "react"
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
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError("")

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (response.ok) {
        setSubmitted(true)
        setFormData({ name: "", email: "", phone: "", message: "" })
      } else {
        setError(data.error || "Failed to send message. Please try again.")
      }
    } catch (err) {
      setError("Failed to send message. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-background/30 to-white flex flex-col">
      <Navigation />

      <main className="flex-1 pt-36 pb-24">
        <div className="container mx-auto px-8 lg:px-16 max-w-[1400px]">
          <div className="text-center mb-20">
            <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl font-light text-primary mb-6 tracking-[-0.02em] leading-tight">
              Get in Touch
            </h1>
            <div className="w-20 h-[3px] bg-accent mx-auto mb-8" />
            <p className="text-lg sm:text-xl text-muted-foreground/70 max-w-2xl mx-auto leading-relaxed">
              We'd love to hear from you! Send us a message and we'll get back to you as soon as possible.
            </p>
          </div>

          {/* Contact Form */}
          <div className="max-w-2xl mx-auto">
            <Card className="shadow-2xl border-border/40 rounded-2xl overflow-hidden">
              <CardContent className="p-8 md:p-12">
                <h2 className="font-serif text-2xl md:text-3xl font-normal text-primary mb-8 tracking-tight">Send us a Message</h2>

                {submitted && (
                  <div className="mb-8 p-5 bg-green-50 border-2 border-green-200 rounded-xl animate-in fade-in slide-in-from-top-2 duration-300">
                    <p className="text-green-800 font-semibold text-lg">
                      ✓ Message sent successfully! We'll get back to you soon.
                    </p>
                  </div>
                )}

                {error && (
                  <div className="mb-8 p-5 bg-red-50 border-2 border-red-200 rounded-xl">
                    <p className="text-red-800 font-semibold text-lg">{error}</p>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-8">
                  <div>
                    <label htmlFor="name" className="block text-base font-semibold mb-3 text-foreground">
                      Name *
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      required
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full px-5 py-4 border-2 border-border/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-all duration-300 text-base"
                      placeholder="Your name"
                    />
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-base font-semibold mb-3 text-foreground">
                      Email *
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full px-5 py-4 border-2 border-border/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-all duration-300 text-base"
                      placeholder="your.email@example.com"
                    />
                  </div>

                  <div>
                    <label htmlFor="phone" className="block text-base font-semibold mb-3 text-foreground">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className="w-full px-5 py-4 border-2 border-border/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-all duration-300 text-base"
                      placeholder="(702) 123-4567"
                    />
                  </div>

                  <div>
                    <label htmlFor="message" className="block text-base font-semibold mb-3 text-foreground">
                      Message *
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      required
                      value={formData.message}
                      onChange={handleChange}
                      rows={6}
                      className="w-full px-5 py-4 border-2 border-border/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-all duration-300 resize-none text-base"
                      placeholder="Tell us what you'd like to know..."
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full px-12 py-4 bg-accent text-white font-semibold text-base tracking-[0.08em] uppercase rounded-xl transition-all duration-300 hover:bg-accent/90 hover:scale-105 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  >
                    {submitting ? "Sending..." : "Send Message"}
                  </button>
                </form>
              </CardContent>
            </Card>

            {/* Contact Information */}
            <div className="mt-16 grid md:grid-cols-2 gap-8">
              <Card className="shadow-lg border-border/40 rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300">
                <CardContent className="p-8">
                  <h3 className="font-serif text-xl font-normal text-primary mb-4">Visit Us</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    4053 Spring Mountain Rd<br />
                    Las Vegas, NV 89102
                  </p>
                </CardContent>
              </Card>

              <Card className="shadow-lg border-border/40 rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300">
                <CardContent className="p-8">
                  <h3 className="font-serif text-xl font-normal text-primary mb-4">Call Us</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    <a href="tel:702-889-8897" className="hover:text-accent transition-colors duration-300">
                      702-889-8897
                    </a>
                  </p>
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
