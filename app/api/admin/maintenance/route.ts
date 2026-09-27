import { NextResponse } from "next/server"

// Maintenance mode is controlled by the MAINTENANCE_MODE environment variable in Vercel.
// The admin Settings tab shows the current state and how to change it; there is no toggle API.
export async function GET() {
  return NextResponse.json({ maintenanceMode: process.env.MAINTENANCE_MODE === "true" })
}
