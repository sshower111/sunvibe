"use client"

import { useState, useEffect } from "react"
import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useCart } from "@/contexts/cart-context"
import { ShoppingCart, Search, ChevronRight, Clock, Phone, MapPin, Info, Check } from "lucide-react"

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
  const [addedToCart, setAddedToCart] = useState<string | null>(null)
  const [showNotification, setShowNotification] = useState(false)
  const [itemsAddedCount, setItemsAddedCount] = useState(0)
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

  // Handle notification timeout
  useEffect(() => {
    if (showNotification) {
      const timer = setTimeout(() => {
        setShowNotification(false)
        setItemsAddedCount(0)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [showNotification, itemsAddedCount])

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
    <main className="min-h-screen bg-white">
      <Navigation />

      <div className="pt-36 pb-24">
        <div className="container mx-auto px-8 lg:px-16 max-w-[1400px]">
          {/* Combined Store Info & Hours Section */}
          <Card className="mb-12 cursor-pointer shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative z-0 border-border/50 rounded-2xl" onClick={() => setShowHoursInfo(!showHoursInfo)}>
            <CardContent className="p-6 md:p-8">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h1 className="font-serif text-2xl md:text-3xl font-normal mb-3 tracking-tight text-primary">Sunville Bakery</h1>
                  <p className="text-base md:text-lg text-muted-foreground/80 mb-3">
                    4053 Spring Mountain Rd, Las Vegas, NV 89102
                  </p>
                  <div className="flex items-center gap-3">
                    <Info className="h-5 w-5 md:h-6 md:w-6 text-accent" />
                    <span className="text-base md:text-lg font-medium text-foreground">{storeStatus}</span>
                  </div>
                </div>
                <ChevronRight className={`h-6 w-6 text-muted-foreground/60 transition-transform duration-300 ${showHoursInfo ? 'rotate-90' : ''}`} />
              </div>

              {showHoursInfo && (
                <div className="mt-6 pt-6 border-t border-border/50 space-y-6" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-start gap-4">
                    <Clock className="h-6 w-6 md:h-7 md:w-7 text-accent mt-0.5" />
                    <div className="text-base md:text-lg">
                      <p className="font-semibold mb-2 text-foreground">Hours</p>
                      <p className="text-muted-foreground/80 leading-relaxed">Mon-Tue, Thu-Sun: 8:00 AM - 8:00 PM</p>
                      <p className="text-muted-foreground/80 leading-relaxed">Wednesday: 8:00 AM - 3:00 PM</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <Phone className="h-6 w-6 md:h-7 md:w-7 text-accent mt-0.5" />
                    <div className="text-base md:text-lg">
                      <p className="font-semibold mb-2 text-foreground">Phone</p>
                      <p className="text-muted-foreground/80">702-889-8897</p>
                    </div>
                  </div>

                  {/* Pickup Time Selection */}
                  <div className="pt-6 border-t border-border/50">
                    <div className="flex items-center gap-4 mb-4">
                      <span className="text-base md:text-lg font-semibold text-foreground">Pickup Time:</span>
                      <div className="inline-flex items-center bg-muted/50 rounded-xl p-1.5">
                        <button
                          onClick={() => {
                            if (isStoreOpen()) {
                              setLocalPickupTime("ASAP")
                              setSelectedTime("")
                              setSelectedDate("")
                            }
                          }}
                          disabled={!isStoreOpen()}
                          className={`px-5 py-2.5 text-sm md:text-base font-semibold rounded-lg transition-all duration-300 ${
                            localPickupTime === "ASAP"
                              ? "bg-white text-foreground shadow-md"
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
                          className={`px-5 py-2.5 text-sm md:text-base font-semibold rounded-lg transition-all duration-300 ${
                            localPickupTime === "Later"
                              ? "bg-white text-foreground shadow-md"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          Later
                        </button>
                      </div>
                    </div>

                    {localPickupTime === "Later" && (
                      <div className="space-y-3 mt-4">
                        <div className="flex items-center gap-3">
                          <label className="text-base md:text-lg font-semibold w-24 text-foreground">Date:</label>
                          <input
                            type="date"
                            value={selectedDate}
                            min={today}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="px-4 py-3 border-2 border-border/50 rounded-xl text-base md:text-lg focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent bg-white shadow-sm transition-all duration-300"
                          />
                        </div>
                        <div className="flex items-center gap-3">
                          <label className="text-base md:text-lg font-semibold w-24 text-foreground">Time:</label>
                          <select
                            value={selectedTime}
                            onChange={(e) => setSelectedTime(e.target.value)}
                            className="px-4 py-3 border-2 border-border/50 rounded-xl text-base md:text-lg focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent bg-white shadow-sm min-w-[140px] transition-all duration-300"
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
          <div className="mb-16">
            <div className="relative mb-10">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground/50" />
              <input
                type="text"
                placeholder="Search our menu..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-16 pr-8 py-5 text-lg bg-white border-2 border-border/40 rounded-2xl focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all duration-300 shadow-sm hover:shadow-md"
              />
            </div>
            <div className="overflow-x-auto scrollbar-hide border-b-2 border-border/30">
              <div className="flex gap-10 pb-5 min-w-min">
                {categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`text-sm font-semibold tracking-[0.08em] uppercase transition-all duration-300 whitespace-nowrap pb-3 border-b-3 ${
                      selectedCategory === category
                        ? 'text-foreground border-accent scale-105'
                        : 'text-muted-foreground/70 border-transparent hover:text-foreground hover:border-border/50'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10 mb-16">
            {filteredProducts.map((product, index) => {
              const hasImage = product.image &&
                               product.image.trim() !== '' &&
                               !product.image.includes('/placeholder') &&
                               product.image !== 'null' &&
                               product.image !== 'undefined'
              return (
              <Card
                key={product.id}
                className={`group overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl border border-border/40 hover:-translate-y-2 transition-all duration-500 relative flex flex-col ${hasImage ? 'h-full' : ''}`}
              >
                {hasImage && (
                  <div className="relative h-32 md:h-64 bg-gradient-to-br from-muted/50 to-muted/30 overflow-hidden flex-shrink-0">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  </div>
                )}
                <CardContent className="p-4 md:p-7 relative flex flex-col flex-grow">
                  <h3 className="font-serif text-lg md:text-2xl font-normal mb-2 md:mb-3 text-primary group-hover:text-accent transition-colors duration-300 tracking-tight">
                    {product.name}
                  </h3>
                  {product.description && (
                    <p className="hidden md:block text-base text-muted-foreground/75 mb-4 line-clamp-2 leading-relaxed">
                      {product.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between mt-auto pt-3 md:pt-5">
                    <p className="text-xl md:text-2xl font-bold text-accent">
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
                        setAddedToCart(product.id)
                        setTimeout(() => setAddedToCart(null), 600)

                        if (showNotification) {
                          setItemsAddedCount(prev => prev + 1)
                        } else {
                          setItemsAddedCount(1)
                          setShowNotification(true)
                        }
                      }}
                      className="relative rounded-full h-11 w-11 md:h-14 md:w-14 bg-transparent text-foreground border-2 border-foreground hover:border-accent hover:text-accent transition-all duration-300 hover:scale-110 flex items-center justify-center text-2xl md:text-3xl font-bold flex-shrink-0 shadow-md hover:shadow-lg overflow-visible"
                    >
                      {addedToCart === product.id && (
                        <span className="absolute inset-[-2px] rounded-full border-[3px] border-transparent border-t-accent border-r-accent/50 animate-spin" style={{animationDuration: '0.6s'}} />
                      )}
                      <span className={`relative z-10 transition-opacity duration-200 ${addedToCart === product.id ? 'opacity-0' : 'opacity-100'}`}>+</span>
                    </button>
                  </div>
                </CardContent>
              </Card>
              )
            })}
            </div>
          )}
        </div>
      </div>

      {/* Add to Cart Notification */}
      {showNotification && (
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="bg-foreground/95 backdrop-blur-sm text-background px-8 py-5 rounded-2xl shadow-2xl flex items-center gap-4 ">
            <div className="rounded-full p-3">
              <ShoppingCart className="h-6 w-6 text-background" />
            </div>
            <div>
              <p className="font-bold text-xl">
                {itemsAddedCount === 1 ? 'Item Added!' : `${itemsAddedCount} Items Added!`}
              </p>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </main>
  )
}
