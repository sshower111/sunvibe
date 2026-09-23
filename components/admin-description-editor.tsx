"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"

export function AdminDescriptionEditor({ product, password, onSaved }: {
  product: { id: string; name: string; description: string }
  password: string
  onSaved: (description: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [saved, setSaved] = useState(false)

  async function save() {
    setSaving(true)
    setError("")
    try {
      const response = await fetch("/api/admin/products/description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.id, description: draft, password }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Failed to save description")
      onSaved(data.description)
      setEditing(false)
      setSaved(true)
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to save description")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mt-2 space-y-2 min-w-48 max-w-lg">
      {editing ? (
        <>
          <label htmlFor={"description-" + product.id} className="block text-sm font-medium">Description for {product.name}</label>
          <textarea id={"description-" + product.id} value={draft}
            onChange={(event) => setDraft(event.target.value)} maxLength={2000} rows={4}
            disabled={saving} autoFocus className="form-control w-full" />
          <p className="text-xs text-gray-500">{draft.length}/2000 characters. Leave blank to remove the description.</p>
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={save} disabled={saving}>{saving ? "Saving..." : "Save Description"}</Button>
            <Button size="sm" variant="outline" disabled={saving} onClick={() => setEditing(false)}>Cancel</Button>
          </div>
        </>
      ) : (
        <>
          <p className="text-sm text-gray-600 whitespace-pre-wrap break-words">{product.description || "No description"}</p>
          <Button size="sm" variant="outline" onClick={() => {
            setDraft(product.description || "")
            setError("")
            setSaved(false)
            setEditing(true)
          }}>Edit Description</Button>
          {saved && <p role="status" className="text-sm text-green-700">Description saved.</p>}
        </>
      )}
    </div>
  )
}
