"use client"
import { OccasionCountdown } from './occasion-countdown'
import { useRef,useState } from 'react'
import type { Campaign } from '@/lib/campaign-model'
import { ContactCaptcha,type CaptchaHandle } from './contact-captcha'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'
import { NativeSelect } from './ui/select'
import { deliveryOptions } from '@/lib/cake-catalog'
import { addDays } from '@/lib/occasion-dates'
import { preOrderSchema } from '@/lib/pre-order'
export function PreOrderForm({campaign,today,preview=false}:{campaign:Campaign;today:string;preview?:boolean}){
 const [quantities,setQuantities]=useState<Record<string,number>>({});const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [success,setSuccess]=useState('');const captcha=useRef<CaptchaHandle>(null);const requestId=useRef('');const sending=useRef(false)
 const min=addDays(today,1)>campaign.startsAt?addDays(today,1):campaign.startsAt
 const closed=today>campaign.orderCutoff||min>campaign.endsAt
 const total=campaign.items.reduce((sum,item)=>sum+Math.round(item.price*100)*(quantities[item.id]||0),0)
 async function submit(event:React.FormEvent<HTMLFormElement>){event.preventDefault();if(sending.current||preview)return;const form=new FormData(event.currentTarget);const items=campaign.items.filter(i=>quantities[i.id]>0).map(i=>({itemId:i.id,qty:quantities[i.id]}));if(!items.length){setError('Select at least one item.');return}sending.current=true;setBusy(true);setError('');requestId.current ||= crypto.randomUUID();form.set('items',JSON.stringify(items));form.set('campaignId',campaign.id);form.set('requestId',requestId.current)
 try{const checked=preOrderSchema.safeParse({...Object.fromEntries(form.entries()),items});if(!checked.success)throw new Error(checked.error.issues[0].message);const token=await captcha.current?.verify();if(!token)throw new Error('Please try verification again.');form.set('captchaToken',token);const response=await fetch('/api/pre-orders',{method:'POST',body:form});const data=await response.json();if(!response.ok)throw new Error(data.error||'Please try again.');setSuccess(data.message)}catch(e){setError(e instanceof Error?e.message:'Please try again.')}finally{sending.current=false;setBusy(false)}}
 function scrollToSection(id:string) { const target=document.getElementById(id);target?.focus({preventScroll:true});target?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'}) }
 const available=!closed&&campaign.items.length>0&&!success
 return <div className={available?'pb-28 md:pb-0':''}>
 {preview&&<p className="site-container my-4 rounded-lg border bg-secondary p-4 font-semibold">Admin preview — reservations cannot be submitted.</p>}
 <section aria-labelledby="preorder-title" className="relative isolate overflow-hidden bg-primary text-primary-foreground">
   {campaign.page.heroImage?<img src={campaign.page.heroImage} alt="" width={1600} height={900} className="absolute inset-0 -z-20 h-full w-full object-cover"/>:<div aria-hidden="true" className="absolute inset-0 -z-20 bg-gradient-to-br from-primary via-primary to-accent"/>}
   <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-r from-primary via-primary/90 to-primary/80"/>
   <div className="site-container section-space py-14 sm:py-20">
     <OccasionCountdown date={campaign.orderCutoff}/>
     <h1 id="preorder-title" className="heading-1 mt-6 max-w-3xl text-primary-foreground">{campaign.page.title}</h1>
     <p className="mt-5 max-w-xl text-base leading-relaxed sm:text-lg">{campaign.page.intro}</p>
     {available&&<Button type="button" variant="secondary" className="mt-7 w-full sm:w-auto" onClick={()=>scrollToSection('festival-items')}>Choose your favorites</Button>}
   </div>
 </section>
 <div className="site-container section-space">
   <section aria-labelledby="how-preorders-work" className="mb-10 border-b pb-8">
     <h2 id="how-preorders-work" className="heading-2">A little planning. Something special.</h2>
     <ol className="my-5 grid gap-4 sm:grid-cols-3">{['Choose your favorites','Pick a pickup date','We call to confirm'].map((step,index)=><li key={step} className="flex items-center gap-3"><span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary font-semibold text-primary">{index+1}</span><span className="font-medium">{step}</span></li>)}</ol>
     <p className="text-sm text-muted-foreground">This is a reservation request. No payment is collected here.</p>
   </section>
   {closed?<section className="rounded-2xl border bg-secondary p-6 sm:p-10"><h2 className="heading-2">Pre-orders are closed</h2><p className="my-4 max-w-xl">Please call the bakery to ask what is available for your celebration.</p><Button asChild><a href="tel:+17028899887">Call (702) 889-9887</a></Button></section>:!campaign.items.length?<section className="rounded-2xl border border-accent bg-secondary p-6 sm:p-10"><p className="text-sm font-semibold text-primary">Made for your celebration</p><h2 className="heading-2 mt-3">Let’s reserve something special.</h2><p className="my-4 max-w-xl">Our seasonal selection is being prepared. Call us to discuss your favorites and pickup plans.</p><Button asChild className="w-full sm:w-auto"><a href="tel:+17028899887">Call (702) 889-9887 to reserve</a></Button></section>:success?<section role="status" className="rounded-2xl border bg-secondary p-6 sm:p-10"><h2 className="heading-2">Thank you for your request</h2><p className="mt-4">{success}</p></section>:<form method="post" onSubmit={submit} onChange={()=>{requestId.current=''}}><fieldset disabled={busy} className="min-w-0">
     <legend className="sr-only">Festival reservation</legend>
     <section id="festival-items" tabIndex={-1} aria-labelledby="festival-items-heading" className="scroll-mt-28 rounded focus-visible:outline-2 focus-visible:outline-primary">
       <div className="mb-6"><h2 id="festival-items-heading" className="heading-2">Choose your favorites</h2><p className="mt-2 text-muted-foreground">Pick your quantities. We’ll confirm availability by phone.</p></div>
       <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{campaign.items.map(item=><article key={item.id} className="flex overflow-hidden rounded-xl border bg-card flex-col">
         {item.photo?<img src={item.photo} alt={item.name} width={600} height={450} loading="lazy" className="aspect-[4/3] w-full object-cover"/>:<div aria-hidden="true" className="flex aspect-[4/3] items-center justify-center bg-gradient-to-br from-secondary to-accent/30"><span className="font-serif text-2xl text-primary">Sunville Bakery</span></div>}
         <div className="flex flex-1 flex-col p-5"><h3 className="heading-3">{item.name}</h3>{item.nameAlt&&<p className="mt-1 text-muted-foreground">{item.nameAlt}</p>}<p className="my-4 text-xl font-semibold text-primary">$ {item.price.toFixed(2)}</p>
         <div className="mt-auto flex items-center justify-between gap-3"><span className="text-sm">Quantity</span><div className="flex items-center gap-2"><Button type="button" variant="outline" aria-label={'Remove one '+item.name} disabled={!quantities[item.id]} onClick={()=>{setQuantities(q=>({...q,[item.id]:(q[item.id]||0)-1}));requestId.current=''}}>−</Button><output aria-label={'Quantity of '+item.name} className="min-w-8 text-center font-semibold">{quantities[item.id]||0}</output><Button type="button" variant="outline" aria-label={'Add one '+item.name} disabled={(quantities[item.id]||0)>=(item.maxPerOrder??999)} onClick={()=>{setQuantities(q=>({...q,[item.id]:(q[item.id]||0)+1}));requestId.current=''}}>+</Button></div></div>{item.maxPerOrder&&<p className="mt-3 text-sm text-muted-foreground">Up to {item.maxPerOrder} per request</p>}</div>
       </article>)}</div>
     </section>
     <aside aria-label="Good to know" className="my-8 grid gap-5 rounded-xl border bg-secondary p-5 sm:grid-cols-3">
       <div><p className="font-semibold text-primary">Pickup window</p><p className="mt-1 text-sm">{min} through {campaign.endsAt}<br/>Las Vegas time</p></div><div><p className="font-semibold text-primary">Freshly baked</p><p className="mt-1 text-sm">Prepared fresh for your celebration.</p></div><div><p className="font-semibold text-primary">Questions?</p><a href="tel:+17028899887" className="inline-flex min-h-12 items-center rounded text-sm underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-primary">(702) 889-9887</a></div>
     </aside>
     <section id="festival-reservation" tabIndex={-1} aria-labelledby="reservation-heading" className="scroll-mt-28 rounded-xl border bg-card p-5 focus-visible:outline-2 focus-visible:outline-primary sm:p-8">
       <h2 id="reservation-heading" className="heading-2">Your reservation request</h2><p aria-live="polite" className="my-4 text-xl font-semibold text-primary">Estimated items total: $ {(total/100).toFixed(2)}</p><p className="mb-6 text-sm text-muted-foreground">Delivery fees and availability are confirmed by phone.</p>
       <fieldset className="min-w-0 border-t py-6"><legend className="pr-3 font-semibold text-primary">Your contact details</legend><div className="grid gap-5 sm:grid-cols-2"><label className="block text-sm font-medium">Name<Input name="name" autoComplete="name" required maxLength={100}/></label><label className="block text-sm font-medium">Phone<Input name="phone" type="tel" autoComplete="tel" required minLength={7} maxLength={30}/></label><label className="block text-sm font-medium sm:col-span-2">Email (optional)<Input name="email" type="email" autoComplete="email" maxLength={100}/></label></div></fieldset>
       <fieldset className="min-w-0 border-t py-6"><legend className="pr-3 font-semibold text-primary">Pickup & preferences</legend><div className="grid gap-5 sm:grid-cols-2"><label className="block text-sm font-medium">Pickup date<Input name="pickupDate" type="date" required min={min} max={campaign.endsAt}/></label><label className="block text-sm font-medium">Fulfillment<NativeSelect name="fulfillment" aria-label="Fulfillment">{deliveryOptions.map(v=><option key={v}>{v}</option>)}</NativeSelect></label><label className="block text-sm font-medium sm:col-span-2">Notes (optional)<Textarea name="notes" maxLength={1000}/></label></div></fieldset>
       <label className="my-5 flex min-h-12 items-start gap-3 rounded-lg bg-secondary p-4"><input type="checkbox" name="acknowledged" value="yes" required className="mt-1 h-5 w-5 shrink-0"/><span className="text-sm leading-relaxed">I understand this is a reservation request — the bakery will call to confirm availability and pickup time.</span></label>
       {!preview&&<ContactCaptcha ref={captcha} action="pre_order"/>}<p role="alert" className="my-3 text-primary">{error}</p><Button type="submit" disabled={preview||busy} className="w-full sm:w-auto">{busy?'Sending…':'Request reservation'}</Button><p className="mt-4 text-sm text-muted-foreground">Protected by Cloudflare Turnstile. <a href="/privacy" className="inline-flex min-h-11 items-center rounded underline focus-visible:outline-2 focus-visible:outline-primary">Privacy notice</a></p>
     </section>
   </fieldset></form>}
 </div>
 {available&&<div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-sm md:hidden"><div className="flex items-center justify-between gap-4"><div><p className="text-xs text-muted-foreground">Estimated items total</p><p className="text-lg font-semibold text-primary">$ {(total/100).toFixed(2)}</p></div><Button type="button" onClick={()=>scrollToSection('festival-reservation')}>Continue</Button></div></div>}
 </div>
}
