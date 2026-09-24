"use client"

import { useState, useEffect } from "react"
import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { AdminProductEditor } from "@/components/admin-product-editor"
import { Card, CardContent } from "@/components/ui/card"
import { Eye, EyeOff } from "lucide-react"

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

  const ADMIN_PASSWORD = password

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

  const handleLogin = async () => {
    try {
      const response = await fetch('/api/admin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (response.ok) setIsAuthenticated(true)
      else alert("Incorrect password or too many attempts. Please try again.")
    } catch {
      alert("Unable to sign in. Please try again.")
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

  if (!isAuthenticated) {
    return (
      <main id="main-content" tabIndex={-1} className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="p-8">
            <h1 className="heading-1 mb-6 text-center">Menu Admin Login</h1>
            <div className="space-y-4">
              <input
                type="password"
                placeholder="Enter admin password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                className="form-control w-full"
              />
              <Button onClick={handleLogin} className="w-full">
                Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    )
  }

  return (
    <main id="main-content" tabIndex={-1} className="min-h-screen bg-gray-50">
      <Navigation />

      <div className="pt-36 pb-16">
        <div className="site-container">
          <div className="mb-8">
            <h1 className="heading-1 mb-2">Menu Management</h1>
            <p className="text-muted-foreground">Edit item names, descriptions, and prices, or show/hide products</p>
            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>💡 Tip:</strong> To add new products or change images, go to your{" "}
                <a href="https://dashboard.stripe.com/products" target="_blank" className="underline font-semibold">
                  Stripe Dashboard
                </a>
                . Changes will appear here automatically.
              </p>
            </div>
          </div>

          {/* Products Table */}
          <div className="bg-white rounded-lg border overflow-x-auto">
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
                          <p className="mt-1 max-w-lg whitespace-pre-wrap break-words text-sm text-muted-foreground">{product.description || "No description"}</p>
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
<AdminProductEditor product={product} password={password} disabled={loading} onSaved={updated => {
                            setProducts(current => current.map(item => item.id === updated.id ? { ...item, ...updated } : item))
                          }} />
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

      <Footer />
    </main>
  )
}
