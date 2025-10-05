"use client"

import { useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useCart } from "@/contexts/cart-context"

function SuccessContent() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get("session_id")
  const { clearCart } = useCart()

  useEffect(() => {
    if (sessionId) {
      // Clear the cart after successful checkout
      clearCart()
      console.log("Checkout session:", sessionId)
    }
  }, [sessionId, clearCart])

  return (
    <>
      <Navigation />

      <div className="flex-1 pt-32 pb-16 bg-gray-50">
        <div className="container mx-auto px-4 lg:px-8 max-w-2xl">
          <div className="bg-white rounded-lg shadow-lg p-6 md:p-10 text-center">
            <div className="mb-8">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
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
              <h1 className="font-serif text-3xl md:text-4xl font-bold text-primary mb-3">
                Order Confirmed!
              </h1>
              <div className="w-24 h-1 bg-accent mx-auto" />
            </div>

            <p className="text-base md:text-lg text-muted-foreground mb-8 max-w-lg mx-auto">
              Thank you for your order! Your delicious treats will be prepared fresh and ready for pickup.
            </p>

            <div className="bg-gray-50 rounded-lg p-6 mb-8 text-left max-w-lg mx-auto">
              <h2 className="font-serif text-lg md:text-xl font-bold text-primary mb-4 text-center">What's Next?</h2>
              <ul className="text-muted-foreground space-y-4">
                <li className="flex items-start gap-3">
                  <span className="text-accent font-bold text-lg shrink-0">1.</span>
                  <span className="text-sm md:text-base">You'll receive a confirmation email with your order details</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-accent font-bold text-lg shrink-0">2.</span>
                  <span className="text-sm md:text-base">We'll start preparing your items fresh</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-accent font-bold text-lg shrink-0">3.</span>
                  <span className="text-sm md:text-base">Pick up your order at our bakery during business hours</span>
                </li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
              <Link href="/menu" className="w-full sm:w-auto">
                <Button
                  variant="outline"
                  className="w-full px-6"
                >
                  Continue Shopping
                </Button>
              </Link>
              <Link href="/" className="w-full sm:w-auto">
                <Button
                  className="w-full bg-accent hover:bg-accent/90 px-6"
                >
                  Back to Home
                </Button>
              </Link>
            </div>

            {sessionId && (
              <p className="text-xs md:text-sm text-muted-foreground pt-6 border-t border-gray-200">
                Order reference: {sessionId.slice(0, 20)}...
              </p>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </>
  )
}

export default function SuccessPage() {
  return (
    <main className="min-h-screen flex flex-col">
      <Suspense fallback={
        <div className="min-h-screen flex flex-col">
          <Navigation />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading...</p>
            </div>
          </div>
          <Footer />
        </div>
      }>
        <SuccessContent />
      </Suspense>
    </main>
  )
}
