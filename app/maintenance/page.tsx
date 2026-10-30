import type { Metadata } from 'next'
import { MapPin, Phone } from 'lucide-react'
import { SITE } from '@/lib/site-info'

// Shown for every public page while MAINTENANCE_MODE=true (see middleware.ts). Admin stays reachable.
export const metadata: Metadata = {
  title: 'Back soon | Sunville Bakery',
  robots: { index: false, follow: false },
}

export default function MaintenancePage() {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="flex min-h-screen items-center justify-center border-t-[6px] border-gold bg-surface p-4"
    >
      <div className="w-full max-w-md rounded-lg border bg-card card-pad">
        <img src="/logo-dark.png" width={509} height={123} alt="Sunville Bakery" className="h-10 w-auto" />
        <h1 className="heading-2 mt-8">The website is getting a quick update</h1>
        <p className="mt-3 text-pretty-body">In the meantime, call us about today’s buns or a cake order.</p>
        <div className="mt-6 space-y-1 border-t pt-4 text-sm">
          <a href={SITE.phoneHref} className="flex min-h-11 items-center gap-2 font-semibold text-primary">
            <Phone aria-hidden="true" className="h-4 w-4" />
            {SITE.phone}
          </a>
          <a
            href={SITE.directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-11 items-center gap-2 text-ink-muted"
          >
            <MapPin aria-hidden="true" className="h-4 w-4" />
            {SITE.address}
            <span className="sr-only"> (opens a new tab)</span>
          </a>
        </div>
      </div>
    </main>
  )
}
