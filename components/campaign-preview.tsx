"use client"
import { useEffect,useState } from 'react'
import type { Campaign } from '@/lib/campaign-model'
import { PreOrderForm } from './pre-order-form'
import { Input } from './ui/input'
import { Button } from './ui/button'
export function CampaignPreview({id,today}:{id:string;today:string}){
 const [campaign,setCampaign]=useState<Campaign|null>(null);const [password,setPassword]=useState('');const [error,setError]=useState('');const [busy,setBusy]=useState(false)
 async function load(value:string){setBusy(true);try{const response=await fetch('/api/admin/occasions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:value,action:'get',id})});const data=await response.json();if(!response.ok)throw new Error(data.error||'Campaign not found');setCampaign(data.campaign)}catch(e){setError(e instanceof Error?e.message:'Preview unavailable')}finally{setBusy(false)}}
 useEffect(()=>{const saved=localStorage.getItem('sunville-admin-password');if(saved){setPassword(saved);void load(saved)}},[id])
 if(campaign)return <PreOrderForm campaign={campaign} today={today} preview/>
 return <section className="site-container section-space"><h1 className="heading-1">Admin campaign preview</h1><form className="mt-5 max-w-md space-y-4" onSubmit={e=>{e.preventDefault();void load(password)}}><label>Admin password<Input type="password" value={password} onChange={e=>setPassword(e.target.value)} required/></label><p role="alert">{error}</p><Button disabled={busy}>Open preview</Button></form></section>
}
