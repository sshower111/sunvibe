import { NextResponse } from 'next/server'
// Removed: this endpoint exposed configuration details publicly. Safe to delete this file.
export function GET() { return NextResponse.json({ error: 'Not found' }, { status: 404 }) }
