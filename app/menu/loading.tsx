import { Navigation } from '@/components/navigation'
import { Skeleton } from '@/components/ui/skeleton'
import { MenuGridSkeleton } from '@/components/menu-grid-skeleton'

// Shown instantly while the menu is fetched from the database.
export default function MenuLoading() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main id="main-content" tabIndex={-1}>
        <div className="site-container page-space" role="status">
          <span className="sr-only">Loading the menu…</span>
          <Skeleton className="mb-3 h-3 w-40" />
          <Skeleton className="mb-6 h-12 w-full max-w-xl" />
          <Skeleton className="mb-8 h-12 w-full" />
          <MenuGridSkeleton />
        </div>
      </main>
    </div>
  )
}
