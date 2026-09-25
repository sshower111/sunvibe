import { NextRequest,NextResponse } from 'next/server'
import { isOccasionAdmin } from '@/lib/occasion-admin'
import { galleryImages } from '@/lib/gallery-images'
import { getMenuProducts } from '@/lib/menu-products'
export async function POST(req:NextRequest){let body;try{body=await req.json()}catch{return NextResponse.json({error:'Invalid request'},{status:400})}if(!isOccasionAdmin(body?.password))return NextResponse.json({error:'Unauthorized'},{status:401});try{const products=await getMenuProducts();return NextResponse.json({images:[...galleryImages.map(url=>({url,label:'Bakery gallery'})),...products.filter(p=>p.image&&!p.image.includes('placeholder')).map(p=>({url:p.image,label:p.name}))]})}catch{return NextResponse.json({images:galleryImages.map(url=>({url,label:'Bakery gallery'}))})}}
