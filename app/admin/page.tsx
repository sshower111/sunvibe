"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"

interface Product {
  id: string
  name: string
  price: string
  priceId: string
  active: boolean
}

interface GalleryImage {
  url: string
}

export default function AdminPage() {
  const [password, setPassword] = useState("")
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [activeTab, setActiveTab] = useState<"menu" | "gallery" | "settings">("menu")
  const [maintenanceMode, setMaintenanceMode] = useState(false)

  // Menu state
  const [products, setProducts] = useState<Product[]>([])
  const [editingPrice, setEditingPrice] = useState<string>("")
  const [editingId, setEditingId] = useState<string>("")

  // Gallery state
  const [images, setImages] = useState<string[]>([])
  const [newImageUrl, setNewImageUrl] = useState("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  // Check authentication on mount
  useEffect(() => {
    const savedAuth = localStorage.getItem("sunville-admin-auth")
    const savedPassword = localStorage.getItem("sunville-admin-password")
    if (savedAuth === "true" && savedPassword) {
      setPassword(savedPassword)
      setIsAuthenticated(true)
    }
  }, [])

  useEffect(() => {
    if (isAuthenticated) {
      if (activeTab === "menu") {
        fetchProducts()
      } else if (activeTab === "gallery") {
        fetchGalleryImages()
      } else if (activeTab === "settings") {
        fetchMaintenanceStatus()
      }
    }
  }, [isAuthenticated, activeTab])

  const fetchProducts = async () => {
    const response = await fetch('/api/admin/products/list', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    })
    const data = await response.json()
    setProducts(data.products || [])
  }

  const fetchGalleryImages = async () => {
    const response = await fetch('/api/gallery')
    const data = await response.json()
    setImages(data.images || [])
  }

  const fetchMaintenanceStatus = async () => {
    const response = await fetch('/api/admin/maintenance')
    const data = await response.json()
    setMaintenanceMode(data.maintenanceMode || false)
  }

  const handleLogin = async () => {
    // Verify password with backend
    const response = await fetch('/api/admin/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    })

    if (response.ok) {
      setIsAuthenticated(true)
      localStorage.setItem("sunville-admin-auth", "true")
      localStorage.setItem("sunville-admin-password", password)
    } else {
      alert("Wrong password!")
    }
  }

  const handleLogout = () => {
    setIsAuthenticated(false)
    localStorage.removeItem("sunville-admin-auth")
    localStorage.removeItem("sunville-admin-password")
    setPassword("")
  }

  const toggleMaintenanceMode = async () => {
    const response = await fetch('/api/admin/maintenance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        password,
        maintenanceMode: !maintenanceMode
      })
    })

    if (response.ok) {
      setMaintenanceMode(!maintenanceMode)
    }
  }

  // Menu functions
  const updatePrice = async (productId: string, priceId: string, newPrice: string) => {
    const response = await fetch('/api/admin/products/price', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, priceId, price: newPrice, password })
    })
    if (response.ok) {
      setEditingId("")
      setEditingPrice("")
      fetchProducts()
    }
  }

  const toggleProduct = async (productId: string, active: boolean) => {
    await fetch('/api/admin/products/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, active: !active, password })
    })
    fetchProducts()
  }

  // Gallery functions
  const uploadImage = async () => {
    if (!selectedFile) return null

    const formData = new FormData()
    formData.append('file', selectedFile)
    formData.append('password', password)

    const response = await fetch('/api/gallery/upload', {
      method: 'POST',
      body: formData
    })
    const data = await response.json()
    return data.url
  }

  const addImageFromFile = async () => {
    const url = await uploadImage()
    if (url) {
      await fetch('/api/gallery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add', url, password })
      })
      setSelectedFile(null)
      fetchGalleryImages()
    }
  }

  const addImageFromUrl = async () => {
    if (!newImageUrl.trim()) return

    await fetch('/api/gallery', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add', url: newImageUrl, password })
    })
    setNewImageUrl("")
    fetchGalleryImages()
  }

  const removeImage = async (url: string) => {
    if (!confirm("Delete this image?")) return

    await fetch('/api/gallery', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'remove', url, password })
    })
    fetchGalleryImages()
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded border max-w-sm w-full">
          <h1 className="text-xl font-bold mb-4">Admin Login</h1>
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
            className="w-full px-3 py-2 border rounded mb-4"
          />
          <Button onClick={handleLogin} className="w-full">
            Login
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Admin Panel</h1>
          <Button onClick={handleLogout} variant="outline">
            Logout
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab("menu")}
            className={`px-4 py-2 rounded ${activeTab === "menu" ? "bg-black text-white" : "bg-white"}`}
          >
            Menu
          </button>
          <button
            onClick={() => setActiveTab("gallery")}
            className={`px-4 py-2 rounded ${activeTab === "gallery" ? "bg-black text-white" : "bg-white"}`}
          >
            Gallery
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={`px-4 py-2 rounded ${activeTab === "settings" ? "bg-black text-white" : "bg-white"}`}
          >
            Settings
          </button>
        </div>

        {/* Menu Tab */}
        {activeTab === "menu" && (
          <div className="bg-white rounded border">
            <div className="p-4 border-b flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Add products in <a href="https://dashboard.stripe.com/products" target="_blank" className="underline">Stripe</a>
              </p>
              <p className="text-sm font-medium">
                Total Items: {products.length}
              </p>
            </div>
            <table className="w-full">
              <thead className="border-b">
                <tr className="text-left">
                  <th className="p-4">Product</th>
                  <th className="p-4">Price</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id} className="border-b">
                    <td className="p-4">{product.name}</td>
                    <td className="p-4">
                      {editingId === product.id ? (
                        <input
                          type="number"
                          step="0.01"
                          value={editingPrice}
                          onChange={(e) => setEditingPrice(e.target.value)}
                          className="w-24 px-2 py-1 border rounded"
                          autoFocus
                        />
                      ) : (
                        `$${product.price}`
                      )}
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-sm ${product.active ? "bg-green-100" : "bg-gray-100"}`}>
                        {product.active ? "Visible" : "Hidden"}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        {editingId === product.id ? (
                          <>
                            <button
                              onClick={() => updatePrice(product.id, product.priceId, editingPrice)}
                              className="px-3 py-1 bg-black text-white rounded text-sm"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => {
                                setEditingId("")
                                setEditingPrice("")
                              }}
                              className="px-3 py-1 border rounded text-sm"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => {
                                setEditingId(product.id)
                                setEditingPrice(product.price)
                              }}
                              className="px-3 py-1 border rounded text-sm"
                            >
                              Edit Price
                            </button>
                            <button
                              onClick={() => toggleProduct(product.id, product.active)}
                              className="px-3 py-1 border rounded text-sm"
                            >
                              {product.active ? "Hide" : "Show"}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Gallery Tab */}
        {activeTab === "gallery" && (
          <div>
            {/* Add Image */}
            <div className="bg-white rounded border p-4 mb-6">
              <h2 className="font-bold mb-4">Add Image</h2>

              {/* Upload file */}
              <div className="mb-4">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="mb-2"
                />
                <button
                  onClick={addImageFromFile}
                  disabled={!selectedFile}
                  className="px-4 py-2 bg-black text-white rounded disabled:opacity-50"
                >
                  Upload
                </button>
              </div>

              <div className="text-center text-sm text-gray-500 my-2">OR</div>

              {/* Add from URL */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Image URL"
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  className="flex-1 px-3 py-2 border rounded"
                />
                <button
                  onClick={addImageFromUrl}
                  className="px-4 py-2 bg-black text-white rounded"
                >
                  Add URL
                </button>
              </div>
            </div>

            {/* Image Grid */}
            <div className="grid grid-cols-4 gap-4">
              {images.map((image, index) => (
                <div key={index} className="bg-white rounded border overflow-hidden">
                  <img src={image} alt="" className="w-full h-48 object-cover" />
                  <div className="p-2">
                    <button
                      onClick={() => removeImage(image)}
                      className="w-full px-3 py-1 border rounded text-sm hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === "settings" && (
          <div className="bg-white rounded border p-6">
            <h2 className="text-xl font-bold mb-6">Settings</h2>

            <div className="space-y-6">
              {/* Maintenance Mode */}
              <div className="border-b pb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold mb-2">Maintenance Mode</h3>
                    <p className="text-sm text-gray-600">
                      When enabled, customers will see a maintenance message and cannot place orders.
                    </p>
                  </div>
                  <button
                    onClick={toggleMaintenanceMode}
                    className={`px-6 py-3 rounded font-medium ${
                      maintenanceMode
                        ? "bg-red-500 text-white hover:bg-red-600"
                        : "bg-green-500 text-white hover:bg-green-600"
                    }`}
                  >
                    {maintenanceMode ? "Disable" : "Enable"}
                  </button>
                </div>
                <div className="mt-4">
                  <span className={`px-3 py-1 rounded text-sm font-medium ${
                    maintenanceMode
                      ? "bg-red-100 text-red-800"
                      : "bg-green-100 text-green-800"
                  }`}>
                    Status: {maintenanceMode ? "Maintenance Mode ON" : "Site Online"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
