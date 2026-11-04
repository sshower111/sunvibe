'use client'

import { useEffect, useState } from 'react'
import { AdminStorageKey } from '@/components/admin-storage-key'
import { AdminNotifications } from '@/components/admin-notifications'

export function AdminSettings() {
  const [maintenanceMode, setMaintenanceMode] = useState<boolean | null>(null)
  useEffect(() => {
    fetch('/api/admin/maintenance')
      .then(r => r.json())
      .then(d => setMaintenanceMode(!!d.maintenanceMode))
      .catch(() => {})
  }, [])

  return (
    <div className="space-y-4">
      <AdminNotifications />
      <section
        aria-labelledby="settings-heading"
        className="space-y-4 rounded-xl bg-white shadow-[var(--shadow-card)] p-4 sm:p-6"
      >
        <h2 id="settings-heading" className="heading-2">
          Settings
        </h2>
        <div>
          <h3 className="heading-3 mb-2">Maintenance mode</h3>
          <p className="mb-3">
            <span
              className={
                'rounded px-3 py-1 text-sm font-medium ' +
                (maintenanceMode ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800')
              }
            >
              {maintenanceMode === null ? 'Checking…' : maintenanceMode ? 'Maintenance mode is ON' : 'Site is online'}
            </span>
          </p>
          <p className="text-sm text-muted-foreground">
            When on, customers see a maintenance message. To change it, set <code>MAINTENANCE_MODE</code> to{' '}
            <code>true</code> or <code>false</code> in Vercel → Project → Settings → Environment Variables, then
            redeploy.
          </p>
        </div>
        <AdminStorageKey />
      </section>
    </div>
  )
}
