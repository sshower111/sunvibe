import { NextRequest } from 'next/server'
import { databaseProductRequest } from '@/lib/database-product-api'

export function POST(req: NextRequest) { return databaseProductRequest(req, 'update') }
