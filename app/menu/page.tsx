"use client"

import { useState, useEffect } from "react"
import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useCart } from "@/contexts/cart-context"
import { ShoppingCart, Search, ChevronRight, Clock, Phone, MapPin, Info } from "lucide-react"

interface Product {
  id: string
  name: string
  description: string
  price: string
  priceId: string
  image: string
  category: string
}

export default function MenuPage() {
  // Get today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split('T')[0]

  // Check if store is currently open
  const isStoreOpen = () => {
    const now = new Date()
    const day = now.getDay() // 0 = Sunday, 3 = Wednesday
    const hours = now.getHours()
    const minutes = now.getMinutes()
    const currentTime = hours * 60 + minutes // Convert to minutes

    if (day === 3) {
      // Wednesday: 8 AM - 3 PM (480 - 900 minutes)
      return currentTime >= 480 && currentTime < 900
    } else {
      // Other days: 8 AM - 8 PM (480 - 1200 minutes)
      return currentTime >= 480 && currentTime < 1200
    }
  }

  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [checkingOut, setCheckingOut] = useState<string | null>(null)
  const [localPickupTime, setLocalPickupTime] = useState<"ASAP" | "Later">(isStoreOpen() ? "ASAP" : "Later")
  const [selectedTime, setSelectedTime] = useState<string>("")
  const [selectedDate, setSelectedDate] = useState<string>(isStoreOpen() ? "" : today)
  const [showPickupOptions, setShowPickupOptions] = useState(false)
  const [showHoursInfo, setShowHoursInfo] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("All")
  const { addItem, setPickupTime } = useCart()

  // Get current store hours status
  const getStoreStatus = () => {
    const now = new Date()
    const day = now.getDay() // 0 = Sunday, 3 = Wednesday
    const hours = now.getHours()
    const minutes = now.getMinutes()
    const currentTime = hours * 60 + minutes // Convert to minutes

    if (day === 3) {
      // Wednesday: 8 AM - 3 PM (480 - 900 minutes)
      if (currentTime >= 480 && currentTime < 900) {
        return "Pickup Available • Closes at 3pm"
      }
    } else {
      // Other days: 8 AM - 8 PM (480 - 1200 minutes)
      if (currentTime >= 480 && currentTime < 1200) {
        return "Pickup Available • Closes at 8pm"
      }
    }

    // Closed
    if (day === 3) {
      return "Closed • Opens Wed 8am-3pm"
    }
    return "Closed • Opens 8am-8pm"
  }

  const [storeStatus, setStoreStatus] = useState(getStoreStatus())

  // Update store status every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setStoreStatus(getStoreStatus())
    }, 60000) // Update every minute

    return () => clearInterval(interval)
  }, [])

  // Update global pickup time whenever local state changes
  useEffect(() => {
    if (localPickupTime === "ASAP") {
      setPickupTime("ASAP")
    } else {
      const dateStr = selectedDate || today
      const timeStr = selectedTime || ""
      const fullDateTime = timeStr ? `${dateStr} at ${timeStr}` : `${dateStr} (time not selected)`
      setPickupTime(fullDateTime)
    }
  }, [localPickupTime, selectedTime, selectedDate, setPickupTime, today])

  const categories = ["All", ...Array.from(new Set(products.map(p => p.category))).sort()]

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === "All" || product.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  useEffect(() => {
    fetch('/api/products')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch products')
        return res.json()
      })
      .then((data) => {
        setProducts(data)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  const handleBuyNow = async (product: Product) => {
    setCheckingOut(product.id)
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId: product.priceId,
          productName: product.name,
        }),
      })

      const data = await response.json()

      if (data.url) {
        window.location.href = data.url
      } else {
        throw new Error('No checkout URL returned')
      }
    } catch (error) {
      console.error('Checkout error:', error)
      alert('Failed to start checkout. Please try again.')
      setCheckingOut(null)
    }
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <Navigation />

      <div className="pt-24 md:pt-36 pb-8">
        <div className="container mx-auto px-4 lg:px-8 max-w-7xl">
          {/* Combined Store Info & Hours Section */}
          <Card className="mb-4 md:mb-8 cursor-pointer card-modern hover:-translate-y-0.5 transition-all relative z-0" onClick={() => setShowHoursInfo(!showHoursInfo)}>
            <CardContent className="p-3 md:p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h1 className="font-bold text-lg md:text-2xl mb-1">SUNVILLE BAKERY</h1>
                  <p className="text-sm md:text-base text-muted-foreground mb-2">
                    4053 Spring Mountain Rd, Las Vegas, NV 89102
                  </p>
                  <div className="flex items-center gap-2">
                    <Info className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                    <span className="text-sm md:text-base font-medium">{storeStatus}</span>
                  </div>
                </div>
                <ChevronRight className={`h-5 w-5 text-muted-foreground transition-transform ${showHoursInfo ? 'rotate-90' : ''}`} />
              </div>

              {showHoursInfo && (
                <div className="mt-4 pt-4 border-t space-y-4" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 md:h-6 md:w-6 text-muted-foreground mt-0.5" />
                    <div className="text-sm md:text-base">
                      <p className="font-medium mb-1">Hours</p>
                      <p className="text-muted-foreground">Mon-Tue, Thu-Sun: 8:00 AM - 8:00 PM</p>
                      <p className="text-muted-foreground">Wednesday: 8:00 AM - 3:00 PM</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Phone className="h-5 w-5 md:h-6 md:w-6 text-muted-foreground mt-0.5" />
                    <div className="text-sm md:text-base">
                      <p className="font-medium mb-1">Phone</p>
                      <p className="text-muted-foreground">702-889-8897</p>
                    </div>
                  </div>

                  {/* Pickup Time Selection */}
                  <div className="pt-4 border-t">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-sm md:text-base font-medium">Pickup Time:</span>
                      <div className="inline-flex items-center bg-gray-100 rounded-lg p-1">
                        <button
                          onClick={() => {
                            if (isStoreOpen()) {
                              setLocalPickupTime("ASAP")
                              setSelectedTime("")
                              setSelectedDate("")
                            }
                          }}
                          disabled={!isStoreOpen()}
                          className={`px-3 py-1.5 text-sm md:text-base font-medium rounded-md transition-colors ${
                            localPickupTime === "ASAP"
                              ? "bg-white text-foreground shadow-sm"
                              : "text-muted-foreground hover:text-foreground"
                          } ${!isStoreOpen() ? "opacity-50 cursor-not-allowed" : ""}`}
                        >
                          ASAP
                        </button>
                        <button
                          onClick={() => {
                            setLocalPickupTime("Later")
                            setSelectedDate(today)
                          }}
                          className={`px-3 py-1.5 text-sm md:text-base font-medium rounded-md transition-colors ${
                            localPickupTime === "Later"
                              ? "bg-white text-foreground shadow-sm"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          Later
                        </button>
                      </div>
                    </div>

                    {localPickupTime === "Later" && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <label className="text-sm md:text-base font-medium w-20">Date:</label>
                          <input
                            type="date"
                            value={selectedDate}
                            min={today}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="px-3 py-2 border-2 border-gray-200 rounded-xl text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent bg-white shadow-sm"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-sm md:text-base font-medium w-20">Time:</label>
                          <select
                            value={selectedTime}
                            onChange={(e) => setSelectedTime(e.target.value)}
                            className="px-3 py-2 border-2 border-gray-200 rounded-xl text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent bg-white shadow-sm min-w-[120px]"
                          >
                            <option value="">Choose time</option>
                            {(() => {
                              const isWednesday = selectedDate && new Date(selectedDate + 'T00:00:00').getDay() === 3
                              const isToday = selectedDate === today
                              const now = new Date()
                              const currentHour = now.getHours()
                              const currentMinute = now.getMinutes()

                              // Helper function to check if time slot is in the past
                              const isPastTime = (hour: number, minute: number) => {
                                if (!isToday) return false
                                if (hour < currentHour) return true
                                if (hour === currentHour && minute <= currentMinute) return true
                                return false
                              }

                              const allTimes = [
                                { value: "08:00 AM", hour: 8, minute: 0 },
                                { value: "08:30 AM", hour: 8, minute: 30 },
                                { value: "09:00 AM", hour: 9, minute: 0 },
                                { value: "09:30 AM", hour: 9, minute: 30 },
                                { value: "10:00 AM", hour: 10, minute: 0 },
                                { value: "10:30 AM", hour: 10, minute: 30 },
                                { value: "11:00 AM", hour: 11, minute: 0 },
                                { value: "11:30 AM", hour: 11, minute: 30 },
                                { value: "12:00 PM", hour: 12, minute: 0 },
                                { value: "12:30 PM", hour: 12, minute: 30 },
                                { value: "01:00 PM", hour: 13, minute: 0 },
                                { value: "01:30 PM", hour: 13, minute: 30 },
                                { value: "02:00 PM", hour: 14, minute: 0 },
                                { value: "02:30 PM", hour: 14, minute: 30 },
                              ]

                              const eveningTimes = [
                                { value: "03:00 PM", hour: 15, minute: 0 },
                                { value: "03:30 PM", hour: 15, minute: 30 },
                                { value: "04:00 PM", hour: 16, minute: 0 },
                                { value: "04:30 PM", hour: 16, minute: 30 },
                                { value: "05:00 PM", hour: 17, minute: 0 },
                                { value: "05:30 PM", hour: 17, minute: 30 },
                                { value: "06:00 PM", hour: 18, minute: 0 },
                                { value: "06:30 PM", hour: 18, minute: 30 },
                                { value: "07:00 PM", hour: 19, minute: 0 },
                                { value: "07:30 PM", hour: 19, minute: 30 },
                                { value: "08:00 PM", hour: 20, minute: 0 },
                              ]

                              const timesToShow = isWednesday ? allTimes : [...allTimes, ...eveningTimes]

                              return timesToShow
                                .filter(time => !isPastTime(time.hour, time.minute))
                                .map(time => (
                                  <option key={time.value} value={time.value}>
                                    {time.value}
                                  </option>
                                ))
                            })()}
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Search and Categories */}
          <div className="mb-10">
            <div className="relative mb-8">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground/60 z-10" />
              <input
                type="text"
                placeholder="Search for delicious treats..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-14 pr-6 py-5 text-base bg-white border-2 border-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent shadow-md hover:shadow-lg transition-all relative z-10"
              />
            </div>
            <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-hide relative">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-6 py-3.5 text-base rounded-full whitespace-nowrap font-semibold transition-all shadow-md ${
                    selectedCategory === category
                      ? 'gradient-accent text-white ring-2 ring-accent/30 hover:shadow-lg hover:-translate-y-0.5'
                      : 'bg-white text-foreground hover:bg-accent/5 border border-border hover:shadow-lg hover:-translate-y-0.5'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {loading && (
            <div className="text-center py-12">
              <p className="text-xl text-muted-foreground">Loading menu...</p>
            </div>
          )}

          {error && (
            <div className="text-center py-12">
              <p className="text-xl text-red-500">Error loading menu: {error}</p>
            </div>
          )}

          {!loading && !error && (
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-4 mb-8">
            {filteredProducts.map((product, index) => (
              <Card
                key={product.id}
                className="group overflow-hidden rounded-xl md:rounded-2xl shadow-md hover:shadow-lg border border-border/50 hover:-translate-y-1 transition-all duration-300 relative"
              >
                <div className="relative h-28 md:h-56 bg-gradient-to-br from-muted to-muted/50 overflow-hidden">
                  <img
                    src={product.image || "/placeholder.svg"}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>
                <CardContent className="p-2 md:p-5 relative">
                  <h3 className="font-bold text-sm md:text-lg mb-0.5 md:mb-2 font-serif text-primary group-hover:text-accent transition-colors line-clamp-1">
                    {product.name}
                  </h3>
                  {product.description && (
                    <p className="hidden md:block text-sm text-muted-foreground mb-3 line-clamp-2 leading-relaxed">
                      {product.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between mt-1 md:mt-4">
                    <p className="text-base md:text-xl font-bold text-accent">
                      ${product.price}
                    </p>
                    <button
                      onClick={() => {
                        addItem({
                          id: product.id,
                          name: product.name,
                          price: product.price,
                          priceId: product.priceId,
                          image: product.image,
                        })
                      }}
                      className="rounded-full h-8 w-8 md:h-11 md:w-11 gradient-accent text-white shadow-lg hover:shadow-2xl transition-all hover:scale-110 flex items-center justify-center text-lg md:text-2xl font-bold ring-2 ring-accent/20 hover:ring-accent/40"
                    >
                      +
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))}
            </div>
          )}
        </div>
      </div>

      <Footer />
    </main>
  )
}
