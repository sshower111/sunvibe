"use client"

import { useState, useEffect } from "react"
import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { Card, CardContent } from "@/components/ui/card"
import { Search, ChevronRight, Clock, Phone, Info } from "lucide-react"

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
  const [showHoursInfo, setShowHoursInfo] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("All")

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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5 mb-16">
            {filteredProducts.map((product) => {
              const hasImage = product.image &&
                               product.image.trim() !== '' &&
                               !product.image.includes('/placeholder') &&
                               product.image !== 'null' &&
                               product.image !== 'undefined'
              return (
              <Card
                key={product.id}
                className={`group overflow-hidden rounded-lg shadow-md hover:shadow-xl border border-border/30 hover:border-accent/30 hover:-translate-y-1 transition-all duration-300 relative flex flex-col ${hasImage ? 'min-h-[260px] md:min-h-[280px]' : 'min-h-[120px] md:min-h-[130px]'}`}
              >
                {hasImage && (
                  <div className="relative h-32 md:h-36 bg-gradient-to-br from-muted/50 to-muted/30 overflow-hidden flex-shrink-0">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </div>
                )}
                <CardContent className={`${hasImage ? 'p-3 md:p-4' : 'p-3 md:p-3.5'} relative flex flex-col flex-grow justify-between`}>
                  <div>
                    <h3 className={`font-serif font-semibold text-primary group-hover:text-accent transition-colors duration-300 tracking-tight ${hasImage ? 'text-base md:text-lg mb-1 md:mb-2 line-clamp-2' : 'text-sm md:text-base mb-1 line-clamp-1'}`}>
                      {product.name}
                    </h3>
                    {product.description && hasImage && (
                      <p className="hidden md:block text-xs text-muted-foreground/70 mb-2 line-clamp-2 leading-snug">
                        {product.description}
                      </p>
                    )}
                  </div>
                  <div className={`flex items-center justify-between ${hasImage ? 'pt-2 md:pt-3' : 'pt-1.5'}`}>
                    <p className={`font-bold text-primary ${hasImage ? 'text-xl md:text-2xl' : 'text-lg md:text-xl'}`}>
                      ${product.price}
                    </p>
                  </div>
                </CardContent>
              </Card>
              )
            })}
            </div>
          )}
        </div>
      </div>

      <Footer />
    </main>
  )
}
