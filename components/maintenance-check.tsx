"use client"

import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"

export function MaintenanceCheck({ children }: { children: React.ReactNode }) {
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const pathname = usePathname()

  // Check if current path is admin route
  const isAdminRoute = pathname?.startsWith('/admin')

  useEffect(() => {
    const checkMaintenance = async () => {
      try {
        const response = await fetch('/api/admin/maintenance')
        const data = await response.json()
        setIsMaintenanceMode(data.maintenanceMode || false)
      } catch (error) {
        console.error("Failed to check maintenance mode:", error)
      } finally {
        setIsLoading(false)
      }
    }

    checkMaintenance()
  }, [])

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  // Skip maintenance check for admin routes
  if (isMaintenanceMode && !isAdminRoute) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="mb-6">
            <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold mb-2">Under Maintenance</h1>
            <p className="text-gray-600 mb-4">
              We're currently performing scheduled maintenance to improve our services.
            </p>
            <p className="text-sm text-gray-500">
              Please check back soon. We apologize for any inconvenience.
            </p>
          </div>
          <div className="border-t pt-6">
            <p className="text-sm font-medium mb-2">Contact Us:</p>
            <p className="text-sm text-gray-600">
              📍 4053 Spring Mountain Rd, Las Vegas, NV 89102
            </p>
            <p className="text-sm text-gray-600">
              📞 (702) 909-2253
            </p>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
