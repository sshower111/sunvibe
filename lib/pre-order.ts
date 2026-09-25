import { z } from 'zod'
import { dateSchema, storeDate, addDays } from './occasion-dates'
import type { Campaign } from './campaign-model'
import { campaignStatus } from './campaign-model'
import { deliveryOptions } from './cake-catalog'
export const orderStatuses = ['new','called','confirmed','picked_up','cancelled'] as const
export const preOrderSchema = z.object({
 requestId:z.string().uuid(), campaignId:z.string().regex(/^[a-zA-Z0-9-]{1,100}$/),
 name:z.string().trim().min(1,'Enter your name.').max(100),
 phone:z.string().trim().min(7).max(30).regex(/^[+\d\s().-]+$/).refine(v=>v.replace(/\D/g,'').length>=7,'Enter a valid phone number.'),
 email:z.union([z.literal(''),z.string().trim().email().max(100)]).optional(),
 pickupDate:dateSchema, fulfillment:z.enum(deliveryOptions), notes:z.string().trim().max(1000).default(''), acknowledged:z.literal('yes'),
 items:z.array(z.object({itemId:z.string().max(100),qty:z.number().int().min(1).max(999)})).min(1,'Select at least one item.').max(40)
}).refine(v=>new Set(v.items.map(i=>i.itemId)).size===v.items.length,'Duplicate items are not allowed')
export function priceOrder(input:z.infer<typeof preOrderSchema>,campaign:Campaign,now=new Date()) {
 const today=storeDate(now)
 if(campaignStatus(campaign,now)!=='active'||today>campaign.orderCutoff)throw new Error('Pre-orders are closed. Please call the bakery.')
 if(input.pickupDate<addDays(today,1)||input.pickupDate<campaign.startsAt||input.pickupDate>campaign.endsAt)throw new Error('Choose an available pickup date, starting tomorrow in Las Vegas.')
 return input.items.map(item=>{const product=campaign.items.find(p=>p.id===item.itemId);if(!product||item.qty>(product.maxPerOrder??999))throw new Error('An item or quantity is no longer available. Refresh the page.');return {itemId:product.id,name:product.name,qty:item.qty,price:product.price}})
}
export type PreOrder = { id:string; campaignId:string; campaignName:string; createdAt:string; name:string; phone:string; email?:string; pickupDate:string; items:{itemId:string;name:string;qty:number;price:number}[]; fulfillment:string; notes:string; status:typeof orderStatuses[number] }
