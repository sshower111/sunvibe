import { splitName } from '@/lib/bilingual'
import { cn } from '@/lib/utils'

// English name as the heading, Chinese name below it in large red characters.
export function ItemName({
  name,
  as: Tag = 'h2',
  className,
  zhClassName,
}: {
  name: string
  as?: 'h2' | 'h3' | 'span' | 'p'
  className?: string
  zhClassName?: string
}) {
  const { en, zh } = splitName(name)
  return (
    <Tag className={cn('heading-3 [--heading-color:var(--ink)]', className)}>
      {en}
      {zh && (
        <span lang="zh-Hant" className={cn('han-label mt-1 block', zhClassName)}>
          {zh}
        </span>
      )}
    </Tag>
  )
}

// Stands in for a missing photo: the Chinese name large in red on box paper, like a shelf label.
// Decorative, since the card already names the item.
export function ShelfLabel({ name, nameAlt, className }: { name: string; nameAlt?: string; className?: string }) {
  const { en, zh } = splitName(nameAlt ? name + ' ' + nameAlt : name)
  return (
    <span
      aria-hidden="true"
      lang={zh ? 'zh-Hant' : undefined}
      className={cn(
        'flex aspect-[4/3] items-center justify-center bg-surface p-3 text-center text-brand',
        zh ? 'han text-5xl' : 'font-serif text-3xl',
        className,
      )}
    >
      {zh || en}
    </span>
  )
}
