import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

const ADMIN_PASSWORD = "sunville2024"

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'lib', 'gallery-images.ts')
    const fileContent = await fs.readFile(filePath, 'utf-8')

    // Extract URLs from the file
    const urlMatches = fileContent.match(/"(https?:\/\/[^"]+)"/g)
    const images = urlMatches ? urlMatches.map(match => match.replace(/"/g, '')) : []

    return NextResponse.json({ images })
  } catch (error) {
    console.error('Error reading gallery images:', error)
    return NextResponse.json({ error: 'Failed to read images' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action, url, password } = body

    // Verify password
    if (password !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const filePath = path.join(process.cwd(), 'lib', 'gallery-images.ts')
    let fileContent = await fs.readFile(filePath, 'utf-8')

    if (action === 'add') {
      // Add new image URL before the closing bracket
      const insertPosition = fileContent.lastIndexOf(']')
      const newImageLine = `  "${url}",\n`
      fileContent = fileContent.slice(0, insertPosition) + newImageLine + fileContent.slice(insertPosition)
    } else if (action === 'remove') {
      // Remove the image URL line
      const lines = fileContent.split('\n')
      const filteredLines = lines.filter(line => !line.includes(`"${url}"`))
      fileContent = filteredLines.join('\n')
    }

    // Write back to file
    await fs.writeFile(filePath, fileContent, 'utf-8')

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating gallery:', error)
    return NextResponse.json({ error: 'Failed to update gallery' }, { status: 500 })
  }
}
