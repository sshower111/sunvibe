import { Navigation } from '@/components/navigation'
import { Skeleton } from '@/components/ui/skeleton'

// Shown instantly while the menu is fetched from the database.
export default function MenuLoading() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main id="main-content" tabIndex={-1}>
        <div className="site-container page-space" role="status">
          <span className="sr-only">Loading the menu…</span>
          <Skeleton className="mb-3 h-4 w-48" />
          <Skeleton className="mb-6 h-12 w-full max-w-xl" />
          <Skeleton className="mb-8 h-12 w-full" />
          <div className="menu-card-grid grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="flex gap-3 overflow-hidden rounded-lg border bg-card p-3 sm:block sm:p-0">
                <Skeleton className="h-28 w-24 shrink-0 sm:h-44 sm:w-full sm:rounded-none" />
                <div className="flex-1 space-y-2 sm:p-4">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-5 w-16" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
