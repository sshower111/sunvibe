"use client"
import { useEffect,useState } from 'react'
import type { Campaign } from '@/lib/campaign-model'
import { PreOrderForm } from './pre-order-form'
import { Input } from './ui/input'
import { Button } from './ui/button'
// Uses the admin session cookie. The password form only appears when not signed in.
export function CampaignPreview({id,today}:{id:string;today:string}){
 const [campaign,setCampaign]=useState<Campaign|null>(null);const [password,setPassword]=useState('');const [error,setError]=useState('');const [busy,setBusy]=useState(true);const [needsSignIn,setNeedsSignIn]=useState(false)
 async function load(){setBusy(true);try{const response=await fetch('/api/admin/occasions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'get',id})});const data=await response.json().catch(()=>({}));if(response.status===401){setNeedsSignIn(true);return}if(!response.ok)throw new Error(data.error||'Campaign not found');setNeedsSignIn(false);setCampaign(data.campaign)}catch(e){setError(e instanceof Error?e.message:'Preview unavailable')}finally{setBusy(false)}}
 async function signIn(){setBusy(true);setError('');try{const r=await fetch('/api/admin/verify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password})});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'Incorrect password.');setPassword('');await load()}catch(e){setError(e instanceof Error?e.message:'Sign in failed')}finally{setBusy(false)}}
 useEffect(()=>{void load()},[id])
 if(campaign)return <PreOrderForm campaign={campaign} today={today} preview/>
 return <section className="site-container section-space"><h1 className="heading-1">Admin campaign preview</h1>{busy&&!needsSignIn?<p className="mt-5" role="status">Loading preview…</p>:needsSignIn?<form className="mt-5 max-w-md space-y-4" onSubmit={e=>{e.preventDefault();void signIn()}}><label className="block space-y-2"><span>Admin password</span><Input type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} required/></label><p role="alert">{error}</p><Button disabled={busy}>Sign in and preview</Button></form>:<p role="alert" className="mt-5">{error}</p>}</section>
}
