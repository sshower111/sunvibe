'use client'
import { useState, useRef, useId } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogTrigger } from './ui/dialog'
export function AdminProductCreate({password,onSaved}:{password:string;onSaved:()=>void}) {
 const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('')
 const requestId=useRef(''),id=useId()
 async function submit(e:React.FormEvent<HTMLFormElement>) {e.preventDefault();if(busy)return;setBusy(true);setError('');const form=new FormData(e.currentTarget);if(!requestId.current)requestId.current=crypto.randomUUID();try{const r=await fetch('/api/admin/products',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...Object.fromEntries(form),password,requestId:requestId.current})});const data=await r.json();if(!r.ok)throw Error(data.error||'Unable to add item');onSaved();setOpen(false);requestId.current=''}catch(e){setError(e instanceof Error?e.message:'Unable to add item')}finally{setBusy(false)}}
 return <Dialog open={open} onOpenChange={v=>{if(!busy){setOpen(v);if(v){requestId.current='';setError('')}}}}><DialogTrigger asChild><Button>Add menu item</Button></DialogTrigger><DialogContent className="max-h-[90dvh] overflow-y-auto"><DialogTitle>Add menu item</DialogTitle><DialogDescription>Add a name, price and description to your menu.</DialogDescription><form onSubmit={submit} className="space-y-4" aria-busy={busy}>
 {(['name','price','category','image'] as const).map(field=><div key={field}><label className="block mb-2" htmlFor={id+field}>{{name:'Item name',price:'Price (USD)',category:'Category',image:'Photo URL (optional)'}[field]}</label><Input id={id+field} name={field} required={field!=='image'} defaultValue={field==='category'?'Buns':field==='image'?'/placeholder.svg':''} maxLength={field==='name'?250:field==='category'?150:field==='price'?9:2048} inputMode={field==='price'?'decimal':undefined} disabled={busy}/></div>)}
 <div><label htmlFor={id+'description'} className="block mb-2">Description</label><Textarea id={id+'description'} name="description" maxLength={2000} disabled={busy}/></div>{error&&<p role="alert">{error}</p>}<Button type="submit" disabled={busy}>{busy?'Saving…':'Add item'}</Button></form></DialogContent></Dialog>
}
