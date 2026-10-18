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
