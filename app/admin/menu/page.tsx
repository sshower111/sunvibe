"use client"

import { useState, useEffect } from "react"
import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Eye, EyeOff, DollarSign, X } from "lucide-react"

interface Product {
  id: string
  name: string
  description: string
  price: string
  priceId: string
  image: string
  category: string
  active: boolean
}

export default function AdminMenuPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [password, setPassword] = useState("")
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(false)
  const [editingPrice, setEditingPrice] = useState<{ productId: string, priceId: string, currentPrice: string } | null>(null)
  const [newPrice, setNewPrice] = useState("")

  const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD

  useEffect(() => {
    if (isAuthenticated) {
      fetchProducts()
    }
  }, [isAuthenticated])

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/admin/products/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: ADMIN_PASSWORD })
      })
      const data = await response.json()
      setProducts(data.products || [])
    } catch (error) {
      console.error('Error fetching products:', error)
    }
  }

  const handleLogin = () => {
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true)
      setPassword("")
    } else {
      alert("Incorrect password!")
    }
  }

  const handleToggleActive = async (product: Product) => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/products/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          active: !product.active,
          password: ADMIN_PASSWORD,
        })
      })

      if (response.ok) {
        fetchProducts()
      } else {
        const error = await response.json()
        alert(`Failed to toggle product: ${error.error}`)
      }
    } catch (error) {
      console.error('Error toggling product:', error)
      alert("Error toggling product")
    }
    setLoading(false)
  }

  const handleEditPrice = (product: Product) => {
    setEditingPrice({
      productId: product.id,
      priceId: product.priceId,
      currentPrice: product.price
    })
    setNewPrice(product.price)
  }

  const handleSavePrice = async () => {
    if (!editingPrice) return

    setLoading(true)
    try {
      const response = await fetch('/api/admin/products/price', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: editingPrice.productId,
          priceId: editingPrice.priceId,
          price: newPrice,
          password: ADMIN_PASSWORD,
        })
      })

      if (response.ok) {
        alert("Price updated successfully!")
        setEditingPrice(null)
        fetchProducts()
      } else {
        const error = await response.json()
        alert(`Failed to update price: ${error.error}`)
      }
    } catch (error) {
      console.error('Error updating price:', error)
      alert("Error updating price")
    }
    setLoading(false)
  }

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="p-8">
            <h1 className="text-2xl font-bold mb-6 text-center">Menu Admin Login</h1>
            <div className="space-y-4">
              <input
                type="password"
                placeholder="Enter admin password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
              />
              <Button onClick={handleLogin} className="w-full bg-accent hover:bg-accent/90">
                Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <Navigation />

      <div className="pt-36 pb-16">
        <div className="container mx-auto px-4 lg:px-8 max-w-7xl">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">Menu Management</h1>
            <p className="text-muted-foreground">Quick price updates and show/hide products</p>
            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>💡 Tip:</strong> To add new products, change images, or edit descriptions, go to your{" "}
                <a href="https://dashboard.stripe.com/products" target="_blank" className="underline font-semibold">
                  Stripe Dashboard
                </a>
                . Changes will appear here automatically.
              </p>
            </div>
          </div>

          {/* Products Table */}
          <div className="bg-white rounded-lg border overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left p-4 font-semibold">Product</th>
                  <th className="text-left p-4 font-semibold">Category</th>
                  <th className="text-left p-4 font-semibold">Price</th>
                  <th className="text-center p-4 font-semibold">Status</th>
                  <th className="text-center p-4 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id} className="border-b hover:bg-gray-50">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={product.image}
                          alt={product.name}
                          className="w-16 h-16 object-cover rounded"
                        />
                        <div>
                          <p className="font-medium">{product.name}</p>
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {product.description}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-1 bg-gray-100 rounded text-sm">
                        {product.category}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="text-lg font-bold text-accent">
                        ${product.price}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      {product.active ? (
                        <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                          Visible
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm font-medium">
                          Hidden
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditPrice(product)}
                          disabled={loading}
                          title="Edit price"
                        >
                          <DollarSign className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant={product.active ? "outline" : "default"}
                          onClick={() => handleToggleActive(product)}
                          disabled={loading}
                          title={product.active ? "Hide from menu" : "Show on menu"}
                        >
                          {product.active ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {products.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <p>No products found. Add products in your Stripe Dashboard.</p>
            </div>
          )}
        </div>
      </div>

      {/* Edit Price Modal */}
      {editingPrice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <CardContent className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Update Price</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingPrice(null)}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">New Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newPrice}
                    onChange={(e) => setNewPrice(e.target.value)}
                    className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-lg"
                    placeholder="15.00"
                    autoFocus
                  />
                  <p className="text-sm text-muted-foreground mt-2">
                    Current price: ${editingPrice.currentPrice}
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={handleSavePrice}
                    disabled={loading || !newPrice || newPrice === editingPrice.currentPrice}
                    className="flex-1 bg-accent hover:bg-accent/90"
                  >
                    {loading ? "Updating..." : "Update Price"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setEditingPrice(null)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Footer />
    </main>
  )
}
