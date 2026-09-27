import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { z } from 'zod'
import { isOccasionAdmin } from './occasion-admin'
import { database } from './database'
import { databaseMenu, menuRow } from './database-menu'
const price = z.string().regex(/^\d{1,6}(?:\.\d{1,2})?$/)
const fields = z.object({ name: z.string().trim().min(1).max(250), description: z.string().trim().max(2000), price,
 category: z.string().trim().min(1).max(150).default('Buns'), image: z.string().max(2048).transform(v => v || '/placeholder.svg').refine(v => v === '/placeholder.svg' || /^https:\/\//.test(v)).default('/placeholder.svg') })
const id = z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/)
function cents(value: string) { const [a,b=''] = value.split('.'); return Number(a)*100 + Number(b.padEnd(2,'0')) }
export async function databaseProductRequest(req: NextRequest, action: string) {
 let body; try { body = await req.json() } catch { return NextResponse.json({error:'Invalid request'}, {status:400}) }
 if (!isOccasionAdmin(body?.password)) return NextResponse.json({error:'Unauthorized'}, {status:401})
 try {
  // Fail closed until an explicit, verified import; no silent fallback to Stripe.
  const products = await databaseMenu(true)
  if(action === 'list') return NextResponse.json({products, source:'supabase'})
  const sql = database()
  let rows
  if(action === 'POST') {
   const value = fields.parse(body); const productId = 'item_' + z.string().uuid().parse(body.requestId).replaceAll('-','')
   rows = await sql`INSERT INTO bakery_menu (id,name,description,price_cents,image,category,position) VALUES (${productId},${value.name},${value.description},${cents(value.price)},${value.image},${value.category},(SELECT COALESCE(MAX(position),0)+1 FROM bakery_menu)) ON CONFLICT (id) DO NOTHING RETURNING *`
   if(!rows.length) { rows = await sql`SELECT * FROM bakery_menu WHERE id=${productId}`; const prior=rows[0]; if(!prior || prior.name!==value.name || prior.description!==value.description || prior.price_cents!==cents(value.price) || prior.image!==value.image || prior.category!==value.category) return NextResponse.json({error:'This request was already saved with different details. Reopen Add item.'},{status:409}) }
  } else {
   const productId=id.parse(body.productId)
   if(action === 'update' || action === 'PUT') {
    const value=fields.parse(body)
    rows=action==='PUT' ? await sql`UPDATE bakery_menu SET name=${value.name},description=${value.description},price_cents=${cents(value.price)},image=${value.image},category=${value.category} WHERE id=${productId} RETURNING *` : await sql`UPDATE bakery_menu SET name=${value.name},description=${value.description},price_cents=${cents(value.price)} WHERE id=${productId} RETURNING *`
   } else if(action==='toggle'||action==='DELETE') {
    const active=action==='DELETE'?false:z.boolean().parse(body.active)
    rows=await sql`UPDATE bakery_menu SET active=${active} WHERE id=${productId} RETURNING *`
   } else if(action==='price') {
    rows=await sql`UPDATE bakery_menu SET price_cents=${cents(price.parse(body.price))} WHERE id=${productId} RETURNING *`
   } else if(action==='description') {
    const description=z.string().trim().max(2000).parse(body.description)
    rows=await sql`UPDATE bakery_menu SET description=${description} WHERE id=${productId} RETURNING *`
   } else return NextResponse.json({error:'Invalid action'},{status:400})
  }
  if(!rows.length) return NextResponse.json({error:'Item not found'},{status:404})
  revalidateTag('menu-products')
  const product=menuRow(rows[0])
  return NextResponse.json({success:true,product,description:product.description,newPriceId:''})
 } catch(error) { return NextResponse.json({error:error instanceof z.ZodError ? error.issues[0].message : 'Unable to save or load menu. Please retry.'},{status:error instanceof z.ZodError?400:503}) }
}
