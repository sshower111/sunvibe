import { NextRequest, NextResponse } from "next/server"

export async function GET() {
  // Read from environment variable
  const maintenanceMode = process.env.MAINTENANCE_MODE === "true"
  return NextResponse.json({ maintenanceMode })
}

export async function POST(request: NextRequest) {
  try {
    const { password, maintenanceMode } = await request.json()
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD

    if (password !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Note: On Vercel, you need to update the environment variable in the dashboard
    // This endpoint will show instructions for now
    return NextResponse.json({
      success: false,
      message: "To enable/disable maintenance mode on Vercel, please update the MAINTENANCE_MODE environment variable in your Vercel dashboard (Settings → Environment Variables)",
      currentMode: process.env.MAINTENANCE_MODE === "true"
    })
  } catch (error) {
    return NextResponse.json({ error: "Failed to update maintenance mode" }, { status: 500 })
  }
}
