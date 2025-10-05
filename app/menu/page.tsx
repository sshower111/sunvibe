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
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [checkingOut, setCheckingOut] = useState<string | null>(null)
  const [localPickupTime, setLocalPickupTime] = useState<"ASAP" | "Later">("ASAP")
  const [selectedTime, setSelectedTime] = useState<string>("")
  const [selectedDate, setSelectedDate] = useState<string>("")
  const [showPickupOptions, setShowPickupOptions] = useState(false)
  const [showHoursInfo, setShowHoursInfo] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("All")
  const { addItem, setPickupTime } = useCart()

  // Get today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split('T')[0]

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

      <div className="pt-36 pb-8">
        <div className="container mx-auto px-4 lg:px-8 max-w-7xl">
          {/* Store Info Section */}
          <Card className="mb-4 cursor-pointer hover:shadow-md transition-shadow relative z-0" onClick={() => setShowPickupOptions(!showPickupOptions)}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h1 className="font-bold text-2xl mb-2">SUNVILLE BAKERY</h1>
                  <p className="text-base text-muted-foreground">
                    4503 Spring Mountain Road, Las Vegas, NV 89102
                  </p>
                  <div className="flex items-center gap-2 mt-3">
                    <span className="text-base font-medium">Pickup</span>
                    <span className="text-base text-muted-foreground">
                      {localPickupTime === "ASAP"
                        ? "ASAP"
                        : (selectedDate && selectedTime
                            ? `${selectedDate} at ${selectedTime}`
                            : selectedDate || "Later")}
                    </span>
                  </div>

                  {showPickupOptions && (
                    <div className="mt-4 pt-4 border-t" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-3 mb-4">
                        <span className="text-base font-medium">Pickup Time:</span>
                        <div className="inline-flex items-center bg-gray-100 rounded-lg p-1.5">
                          <button
                            onClick={() => {
                              setLocalPickupTime("ASAP")
                              setSelectedTime("")
                              setSelectedDate("")
                            }}
                            className={`px-4 py-2 text-base font-medium rounded-md transition-colors ${
                              localPickupTime === "ASAP"
                                ? "bg-white text-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            ASAP
                          </button>
                          <button
                            onClick={() => {
                              setLocalPickupTime("Later")
                              setSelectedDate(today)
                            }}
                            className={`px-4 py-2 text-base font-medium rounded-md transition-colors ${
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
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <label className="text-base font-medium">Select Date:</label>
                            <input
                              type="date"
                              value={selectedDate}
                              min={today}
                              onChange={(e) => setSelectedDate(e.target.value)}
                              className="px-4 py-3 border-2 border-gray-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent bg-white shadow-sm"
                            />
                          </div>
                          <div className="flex items-center gap-3">
                            <label className="text-base font-medium">Select Time:</label>
                            <select
                              value={selectedTime}
                              onChange={(e) => setSelectedTime(e.target.value)}
                              className="px-4 py-3 border-2 border-gray-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent bg-white shadow-sm min-w-[150px]"
                            >
                            <option value="">Choose time</option>
                            <option value="08:00 AM">8:00 AM</option>
                            <option value="08:30 AM">8:30 AM</option>
                            <option value="09:00 AM">9:00 AM</option>
                            <option value="09:30 AM">9:30 AM</option>
                            <option value="10:00 AM">10:00 AM</option>
                            <option value="10:30 AM">10:30 AM</option>
                            <option value="11:00 AM">11:00 AM</option>
                            <option value="11:30 AM">11:30 AM</option>
                            <option value="12:00 PM">12:00 PM</option>
                            <option value="12:30 PM">12:30 PM</option>
                            <option value="01:00 PM">1:00 PM</option>
                            <option value="01:30 PM">1:30 PM</option>
                            <option value="02:00 PM">2:00 PM</option>
                            <option value="02:30 PM">2:30 PM</option>
                            {(() => {
                              // Check if selected date is a Wednesday
                              const isWednesday = selectedDate && new Date(selectedDate + 'T00:00:00').getDay() === 3
                              return !isWednesday ? (
                                <>
                                  <option value="03:00 PM">3:00 PM</option>
                                  <option value="03:30 PM">3:30 PM</option>
                                  <option value="04:00 PM">4:00 PM</option>
                                  <option value="04:30 PM">4:30 PM</option>
                                  <option value="05:00 PM">5:00 PM</option>
                                  <option value="05:30 PM">5:30 PM</option>
                                  <option value="06:00 PM">6:00 PM</option>
                                  <option value="06:30 PM">6:30 PM</option>
                                  <option value="07:00 PM">7:00 PM</option>
                                  <option value="07:30 PM">7:30 PM</option>
                                  <option value="08:00 PM">8:00 PM</option>
                                </>
                              ) : null
                            })()}
                          </select>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <ChevronRight className={`h-5 w-5 text-muted-foreground transition-transform ${showPickupOptions ? 'rotate-90' : ''}`} />
              </div>
            </CardContent>
          </Card>

          {/* Hours Info Section */}
          <Card
            className="mb-6 cursor-pointer hover:shadow-md transition-shadow relative z-0"
            onClick={() => setShowHoursInfo(!showHoursInfo)}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Info className="h-6 w-6 text-primary" />
                  <span className="text-base font-medium">Pickup Available • Closes at 8pm</span>
                </div>
                <ChevronRight className={`h-6 w-6 text-muted-foreground transition-transform ${showHoursInfo ? 'rotate-90' : ''}`} />
              </div>
              {showHoursInfo && (
                <div className="mt-4 pt-4 border-t space-y-4">
                  <div className="flex items-start gap-3">
                    <Clock className="h-6 w-6 text-muted-foreground mt-0.5" />
                    <div className="text-base">
                      <p className="font-medium mb-2">Hours</p>
                      <p className="text-muted-foreground">Mon-Tue, Thu-Sun: 8:00 AM - 8:00 PM</p>
                      <p className="text-muted-foreground">Wednesday: 8:00 AM - 3:00 PM</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Phone className="h-6 w-6 text-muted-foreground mt-0.5" />
                    <div className="text-base">
                      <p className="font-medium mb-2">Phone</p>
                      <p className="text-muted-foreground">702-889-8897</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <MapPin className="h-6 w-6 text-muted-foreground mt-0.5" />
                    <div className="text-base">
                      <p className="font-medium mb-2">Address</p>
                      <p className="text-muted-foreground">4503 Spring Mountain Road, Las Vegas, NV 89102</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Search and Categories */}
          <div className="mb-8">
            <div className="relative mb-5">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search menu..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-5 py-4 text-base border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent shadow-sm"
              />
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-5 py-3 text-base rounded-xl whitespace-nowrap font-semibold transition-all shadow-sm ${
                    selectedCategory === category
                      ? 'bg-primary text-primary-foreground shadow-md'
                      : 'bg-white text-foreground hover:bg-gray-100 hover:shadow-md'
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {filteredProducts.map((product, index) => (
              <Card
                key={product.id}
                className="overflow-hidden hover:shadow-lg transition-shadow relative"
              >
                <div className="relative h-48 bg-gray-100">
                  <img
                    src={product.image || "/placeholder.svg"}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <CardContent className="p-3">
                  <h3 className="font-bold text-base mb-0.5">{product.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    ${product.price} • {Math.round(parseFloat(product.price) * 100)}-{Math.round(parseFloat(product.price) * 150)} Cal
                  </p>
                </CardContent>
                <button
                  onClick={() => addItem({
                    id: product.id,
                    name: product.name,
                    price: product.price,
                    priceId: product.priceId,
                    image: product.image,
                  })}
                  className="absolute bottom-3 right-3 rounded-full h-9 w-9 bg-white border-2 border-gray-300 hover:border-accent hover:bg-accent hover:text-white transition-all hover:scale-110 flex items-center justify-center text-xl font-semibold shadow-md hover:shadow-lg"
                >
                  +
                </button>
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
