import { NextRequest } from 'next/server'
import { databaseProductRequest } from '@/lib/database-product-api'

// Admin menu: { action: 'list' | 'create' | 'update' | 'toggle', ... }
export function POST(req: NextRequest) { return databaseProductRequest(req) }
