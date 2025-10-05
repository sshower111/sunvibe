"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function SuccessPage() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get("session_id")
  const [orderDetails, setOrderDetails] = useState<any>(null)

  useEffect(() => {
    if (sessionId) {
      // You can optionally fetch order details from Stripe using the session_id
      console.log("Checkout session:", sessionId)
    }
  }, [sessionId])

  return (
    <main className="min-h-screen">
      <Navigation />

      <div className="pt-24 pb-32 bg-gray-50">
        <div className="container mx-auto px-4 lg:px-8 max-w-2xl">
          <div className="bg-white rounded-lg shadow-lg p-8 md:p-12 text-center">
            <div className="mb-6">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-10 h-10 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h1 className="font-serif text-4xl md:text-5xl font-bold text-primary mb-4">
                Order Confirmed!
              </h1>
              <div className="w-24 h-1 bg-accent mx-auto mb-6" />
            </div>

            <p className="text-lg text-muted-foreground mb-8">
              Thank you for your order! Your delicious treats will be prepared fresh and ready for
              pickup.
            </p>

            <div className="bg-gray-50 rounded-lg p-6 mb-8">
              <h2 className="font-serif text-xl font-bold text-primary mb-4">What's Next?</h2>
              <ul className="text-left text-muted-foreground space-y-3">
                <li className="flex items-start gap-3">
                  <span className="text-accent font-bold">1.</span>
                  <span>You'll receive a confirmation email with your order details</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-accent font-bold">2.</span>
                  <span>We'll start preparing your items fresh</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-accent font-bold">3.</span>
                  <span>Pick up your order at our bakery during business hours</span>
                </li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/menu">
                <Button variant="outline" className="w-full sm:w-auto">
                  Continue Shopping
                </Button>
              </Link>
              <Link href="/">
                <Button className="w-full sm:w-auto bg-accent hover:bg-accent/90">
                  Back to Home
                </Button>
              </Link>
            </div>

            {sessionId && (
              <p className="text-sm text-muted-foreground mt-8">
                Order reference: {sessionId.slice(0, 20)}...
              </p>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </main>
  )
}
