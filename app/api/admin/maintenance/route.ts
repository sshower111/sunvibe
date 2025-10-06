import { NextRequest, NextResponse } from "next/server"
import { writeFileSync, readFileSync, existsSync } from "fs"
import { join } from "path"

const MAINTENANCE_FILE = join(process.cwd(), "maintenance.json")

export async function GET() {
  try {
    if (existsSync(MAINTENANCE_FILE)) {
      const data = JSON.parse(readFileSync(MAINTENANCE_FILE, "utf-8"))
      return NextResponse.json({ maintenanceMode: data.enabled || false })
    }
    return NextResponse.json({ maintenanceMode: false })
  } catch (error) {
    return NextResponse.json({ maintenanceMode: false })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { password, maintenanceMode } = await request.json()
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD

    if (password !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    writeFileSync(
      MAINTENANCE_FILE,
      JSON.stringify({ enabled: maintenanceMode }, null, 2)
    )

    return NextResponse.json({ success: true, maintenanceMode })
  } catch (error) {
    return NextResponse.json({ error: "Failed to update maintenance mode" }, { status: 500 })
  }
}
