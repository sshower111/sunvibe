import { usesDatabase } from './database'
import { readOrders, writeOrder, setOrderStatus } from './database-content'
import 'server-only'
import { readJson, updateJson } from './json-store'
import type { PreOrder } from './pre-order'
export type { PreOrder } from './pre-order'
export async function listOrders() { if(usesDatabase('content')) return readOrders(); return (await readJson<PreOrder[]>('pre-orders.json',[])).sort((a,b)=>b.createdAt.localeCompare(a.createdAt)) }
export async function saveOrder(order:PreOrder) { if(usesDatabase('content')) return writeOrder(order); let saved=order; await updateJson<PreOrder[]>('pre-orders.json',[],rows=>{const prior=rows.find(row=>row.id===order.id);if(prior){const same=['campaignId','name','phone','email','pickupDate','fulfillment','notes'].every(key=>prior[key as keyof PreOrder]===order[key as keyof PreOrder]) && JSON.stringify(prior.items)===JSON.stringify(order.items);if(!same)throw new Error('Reservation request changed; use a new request ID');saved=prior;return rows}return [...rows,order]});return saved }
export async function updateOrderStatus(id:string,status:PreOrder['status']) { if(usesDatabase('content')) return setOrderStatus(id,status); await updateJson<PreOrder[]>('pre-orders.json',[],rows=>{if(!rows.some(r=>r.id===id))throw new Error('Order not found');return rows.map(r=>r.id===id?{...r,status}:r)}) }
