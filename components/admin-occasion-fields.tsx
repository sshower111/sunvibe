'use client'
import type { Campaign } from '@/lib/campaign-model'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'
import { OccasionPhotoPicker } from './occasion-photo-picker'

type Item = Campaign['items'][number]

// Labelled text input with a character counter (limits match the campaign schema).
export function TextField({
  label,
  value,
  onChange: change,
  area = false,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  area?: boolean
}) {
  const limits: Record<string, number> = {
    'Campaign name': 150,
    Occasion: 100,
    Headline: 160,
    Message: 350,
    'Second-language line (optional)': 350,
    'CTA label': 80,
    'Page title': 180,
    Introduction: 1500,
    'Item name': 150,
    'Second-language name': 150,
  }
  const max = limits[label]
  return (
    <label className="block text-sm font-medium">
      <span className="mb-1 flex items-center justify-between gap-3">
        <span>{label}</span>
        {max && (
          <span className="text-xs font-normal tabular-nums text-muted-foreground">
            {value.length}/{max}
          </span>
        )}
      </span>
      {area ? (
        <Textarea aria-label={label} maxLength={max} value={value} onChange={e => change(e.target.value)} />
      ) : (
        <Input aria-label={label} maxLength={max} value={value} onChange={e => change(e.target.value)} />
      )}
    </label>
  )
}

// One festival item in the Occasions editor: summary row plus expandable edit fields.
export function OccasionItemEditor({
  item,
  images,
  editing,
  onToggleEdit,
  onDone,
  onChange,
  onRemove,
}: {
  item: Item
  images: { url: string; label: string }[]
  editing: boolean
  onToggleEdit: () => void
  onDone: () => void
  onChange: (patch: Partial<Item>) => void
  onRemove: () => void
}) {
  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-center gap-3">
        {item.photo ? (
          <img src={item.photo} alt="" width={64} height={64} className="h-16 w-16 shrink-0 rounded-lg object-cover" />
        ) : (
          <div
            aria-hidden="true"
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-secondary text-sm text-primary"
          >
            Photo
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="break-words font-semibold">{item.name || 'New item'}</p>
          <p className="text-sm text-primary">$ {item.price.toFixed(2)}</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            aria-expanded={editing}
            aria-label={'Edit ' + (item.name || 'new item')}
            onClick={onToggleEdit}
          >
            Edit
          </Button>
          <Button variant="outline" aria-label={'Remove ' + (item.name || 'new item')} onClick={onRemove}>
            Remove
          </Button>
        </div>
      </div>
      <div hidden={!editing} className="space-y-3 border-t pt-4">
        <TextField label="Item name" value={item.name} onChange={v => onChange({ name: v })} />
        <TextField label="Second-language name" value={item.nameAlt || ''} onChange={v => onChange({ nameAlt: v })} />
        <div className="grid gap-3 sm:grid-cols-2">
          <label>
            Price ($)
            <Input
              type="number"
              step="0.01"
              min="0.01"
              value={item.price || ''}
              onChange={e => onChange({ price: Number(e.target.value) })}
            />
          </label>
          <label>
            Maximum per order (optional)
            <Input
              type="number"
              min={1}
              max={999}
              value={item.maxPerOrder ?? ''}
              onChange={e => onChange({ maxPerOrder: e.target.value ? Number(e.target.value) : undefined })}
            />
          </label>
        </div>
        <OccasionPhotoPicker
          label="Item photo"
          value={item.photo}
          images={images}
          onChange={v => onChange({ photo: v })}
        />
        <Button variant="outline" onClick={onDone}>
          Done editing item
        </Button>
      </div>
    </div>
  )
}
