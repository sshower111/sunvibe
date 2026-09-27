import 'server-only'
import { database } from './database'
import { encode, decode } from './storage-crypto'
import type { Campaign } from './campaign-model'
import type { PreOrder } from './pre-order'
export async function contentDatabase() {
 const sql=database(); const ready=await sql`SELECT scope FROM bakery_migrations WHERE scope='content'`
 if(!ready.length) throw new Error('Content migration has not been verified')
 return sql
}
export async function readCampaigns(): Promise<Campaign[]> { const sql=await contentDatabase(); return (await sql`SELECT payload FROM bakery_campaigns ORDER BY position,id`).map(r=>r.payload as Campaign) }
export async function writeCampaign(c:Campaign) { const sql=await contentDatabase(); await sql`INSERT INTO bakery_campaigns(id,payload,position) VALUES (${c.id},${JSON.stringify(c)}::jsonb,(SELECT COALESCE(MAX(position),0)+1 FROM bakery_campaigns)) ON CONFLICT(id) DO UPDATE SET payload=EXCLUDED.payload` }
export async function removeCampaign(id:string) { const sql=await contentDatabase(); await sql`DELETE FROM bakery_campaigns WHERE id=${id}` }
export async function readOrders():Promise<PreOrder[]> { const sql=await contentDatabase(); return (await sql`SELECT payload,status FROM bakery_orders ORDER BY created_at DESC`).map(r=>({...decode(r.payload),status:r.status})) }
export async function writeOrder(order:PreOrder):Promise<PreOrder> {
 const sql=await contentDatabase()
 const inserted=await sql`INSERT INTO bakery_orders(id,payload,status,created_at) VALUES(${order.id},${encode(order)},${order.status},${order.createdAt}) ON CONFLICT(id) DO NOTHING RETURNING id`
 if(inserted.length) return order
 const rows=await sql`SELECT payload,status FROM bakery_orders WHERE id=${order.id}`
 if(!rows.length) throw new Error('Reservation unavailable')
 const prior:PreOrder={...decode(rows[0].payload),status:rows[0].status}
 const same=['campaignId','name','phone','email','pickupDate','fulfillment','notes'].every(key=>prior[key as keyof PreOrder]===order[key as keyof PreOrder]) && JSON.stringify(prior.items)===JSON.stringify(order.items)
 if(!same) throw new Error('Reservation request changed; use a new request ID')
 return prior
}
export async function setOrderStatus(id:string,status:PreOrder['status']) {const sql=await contentDatabase();const rows=await sql`UPDATE bakery_orders SET status=${status} WHERE id=${id} RETURNING id`;if(!rows.length)throw new Error('Order not found')}
export async function readGallery():Promise<string[]> {const sql=await contentDatabase();return (await sql`SELECT url FROM bakery_gallery ORDER BY position,url`).map(r=>r.url)}
export async function editGallery(action:'add'|'remove',url:string) {const sql=await contentDatabase(); if(action==='remove') await sql`DELETE FROM bakery_gallery WHERE url=${url}`;else await sql`INSERT INTO bakery_gallery(url,position) VALUES(${url},(SELECT COALESCE(MAX(position),0)+1 FROM bakery_gallery)) ON CONFLICT(url) DO NOTHING`}
