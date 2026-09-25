import { NextRequest,NextResponse } from 'next/server'
import { isOccasionAdmin } from '@/lib/occasion-admin'
import { listOrders,updateOrderStatus } from '@/lib/pre-orders-store'
import { orderStatuses } from '@/lib/pre-order'
import { z } from 'zod'
export async function POST(req:NextRequest){
 let body;try{body=await req.json()}catch{return NextResponse.json({error:'Invalid request'},{status:400})}
 if(!isOccasionAdmin(body?.password))return NextResponse.json({error:'Unauthorized'},{status:401})
 try{if(body.action==='list')return NextResponse.json({orders:await listOrders()},{headers:{'Cache-Control':'no-store'}})
 const parsed=z.object({id:z.string().uuid(),status:z.enum(orderStatuses),action:z.literal('status')}).safeParse(body)
 if(!parsed.success)return NextResponse.json({error:'Invalid status update'},{status:400})
 await updateOrderStatus(parsed.data.id,parsed.data.status);return NextResponse.json({success:true})
 }catch{return NextResponse.json({error:'Orders unavailable. Please retry.'},{status:503})}}
