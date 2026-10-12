import { NextRequest } from 'next/server'
import { databaseProductRequest } from '@/lib/database-product-api'

// Create a menu item.
export function POST(req: NextRequest) { return databaseProductRequest(req, 'POST') }
