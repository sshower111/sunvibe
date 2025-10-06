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
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [password, setPassword] = useState("")
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState("")

  // Simple password authentication (you can change this)
  const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD

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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Check file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file')
        return
      }
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size must be less than 5MB')
        return
      }
      setSelectedFile(file)
    }
  }

  const uploadImage = async () => {
    if (!selectedFile) {
      alert("Please select an image file")
      return
    }

    setLoading(true)
    setUploadProgress("Uploading image...")

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('password', ADMIN_PASSWORD)

      const response = await fetch('/api/gallery/upload', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (response.ok && data.url) {
        setUploadProgress("Adding to gallery...")

        // Add the uploaded image to the gallery
        const addResponse = await fetch('/api/gallery', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'add',
            url: data.url,
            password: ADMIN_PASSWORD
          })
        })

        if (addResponse.ok) {
          setImages([...images, data.url])
          setSelectedFile(null)
          setUploadProgress("")
          alert("Image uploaded successfully!")
          // Reset file input
          const fileInput = document.getElementById('file-input') as HTMLInputElement
          if (fileInput) fileInput.value = ''
        } else {
          throw new Error('Failed to add image to gallery')
        }
      } else {
        throw new Error(data.error || 'Upload failed')
      }
    } catch (error) {
      console.error('Error uploading image:', error)
      alert(`Error uploading image: ${error}`)
      setUploadProgress("")
    }
    setLoading(false)
  }

  const addImageFromUrl = async () => {
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
              <div className="space-y-6">
                {/* Upload from Computer */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Upload from Computer
                  </label>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <input
                        id="file-input"
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect}
                        className="flex-1 px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-accent file:text-white hover:file:bg-accent/90"
                      />
                      <Button
                        onClick={uploadImage}
                        disabled={loading || !selectedFile}
                        className="bg-accent hover:bg-accent/90"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Upload
                      </Button>
                    </div>
                    {selectedFile && (
                      <p className="text-sm text-muted-foreground">
                        Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                      </p>
                    )}
                    {uploadProgress && (
                      <p className="text-sm text-accent font-medium">
                        {uploadProgress}
                      </p>
                    )}
                  </div>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-muted-foreground">OR</span>
                  </div>
                </div>

                {/* Add from URL */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Add from URL (ImgBB or direct link)
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
                      onClick={addImageFromUrl}
                      disabled={loading}
                      className="bg-accent hover:bg-accent/90"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add
                    </Button>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    <strong>💡 Tip:</strong> Upload images directly from your computer (max 5MB) or paste a URL from ImgBB.
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
