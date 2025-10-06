"use client"

import { useState, useEffect } from "react"
import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Trash2, Plus, Image as ImageIcon } from "lucide-react"

export default function AdminGalleryPage() {
  const [images, setImages] = useState<string[]>([])
  const [newImageUrl, setNewImageUrl] = useState("")
  const [password, setPassword] = useState("")
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(false)

  // Simple password authentication (you can change this)
  const ADMIN_PASSWORD = "sunville2024"

  useEffect(() => {
    if (isAuthenticated) {
      fetchGalleryImages()
    }
  }, [isAuthenticated])

  const fetchGalleryImages = async () => {
    try {
      const response = await fetch('/api/gallery')
      const data = await response.json()
      setImages(data.images || [])
    } catch (error) {
      console.error('Error fetching images:', error)
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

  const addImage = async () => {
    if (!newImageUrl.trim()) {
      alert("Please enter an image URL")
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/gallery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add',
          url: newImageUrl,
          password: ADMIN_PASSWORD
        })
      })

      if (response.ok) {
        setImages([...images, newImageUrl])
        setNewImageUrl("")
        alert("Image added successfully!")
      } else {
        alert("Failed to add image")
      }
    } catch (error) {
      console.error('Error adding image:', error)
      alert("Error adding image")
    }
    setLoading(false)
  }

  const removeImage = async (url: string) => {
    if (!confirm("Are you sure you want to remove this image?")) return

    setLoading(true)
    try {
      const response = await fetch('/api/gallery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'remove',
          url,
          password: ADMIN_PASSWORD
        })
      })

      if (response.ok) {
        setImages(images.filter(img => img !== url))
        alert("Image removed successfully!")
      } else {
        alert("Failed to remove image")
      }
    } catch (error) {
      console.error('Error removing image:', error)
      alert("Error removing image")
    }
    setLoading(false)
  }

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="p-8">
            <h1 className="text-2xl font-bold mb-6 text-center">Admin Login</h1>
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
        <div className="container mx-auto px-4 lg:px-8 max-w-6xl">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">Gallery Management</h1>
            <p className="text-muted-foreground">Add or remove images from your gallery</p>
          </div>

          {/* Add Image Section */}
          <Card className="mb-8">
            <CardContent className="p-6">
              <h2 className="text-xl font-bold mb-4">Add New Image</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Image URL (from ImgBB or direct link)
                  </label>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      placeholder="https://i.ibb.co/your-image-url.jpg"
                      value={newImageUrl}
                      onChange={(e) => setNewImageUrl(e.target.value)}
                      className="flex-1 px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                    <Button
                      onClick={addImage}
                      disabled={loading}
                      className="bg-accent hover:bg-accent/90"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Image
                    </Button>
                  </div>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    <strong>How to get image URL:</strong><br/>
                    1. Go to <a href="https://imgbb.com" target="_blank" className="underline">imgbb.com</a><br/>
                    2. Upload your image<br/>
                    3. Copy the "Direct link" (starts with https://i.ibb.co/)<br/>
                    4. Paste it above and click "Add Image"
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Current Images */}
          <div className="mb-4">
            <h2 className="text-xl font-bold mb-4">Current Images ({images.length})</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {images.map((image, index) => (
              <Card key={index} className="overflow-hidden">
                <div className="relative aspect-square">
                  <img
                    src={image}
                    alt={`Gallery ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-muted-foreground truncate flex-1">
                      {image}
                    </p>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => removeImage(image)}
                      disabled={loading}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {images.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <ImageIcon className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p>No images yet. Add your first image above!</p>
            </div>
          )}
        </div>
      </div>

      <Footer />
    </main>
  )
}
