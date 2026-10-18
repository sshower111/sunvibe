import { Skeleton } from '@/components/ui/skeleton'

// Placeholder cards in the same shape as the real menu cards (row on phones, photo on top from 640px).
export function MenuGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div aria-hidden="true" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex gap-3 overflow-hidden rounded-lg border bg-card p-3 sm:block sm:p-0">
          <Skeleton className="size-28 shrink-0 sm:aspect-square sm:h-auto sm:w-full sm:rounded-none" />
          <div className="flex-1 space-y-2 sm:p-4">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-5 w-16" />
          </div>
        </div>
      ))}
    </div>
  )
}
