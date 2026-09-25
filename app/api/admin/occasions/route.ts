import { NextRequest,NextResponse } from 'next/server'
import { campaignSchema, listCampaigns, saveCampaign, deleteCampaign, getCampaign } from '@/lib/campaigns'
import { isOccasionAdmin } from '@/lib/occasion-admin'
export async function POST(req:NextRequest) {
 let body;try{body=await req.json()}catch{return NextResponse.json({error:'Invalid request'},{status:400})}
 if(!isOccasionAdmin(body?.password))return NextResponse.json({error:'Unauthorized'},{status:401})
 try{
 if(body.action==='list')return NextResponse.json({campaigns:await listCampaigns()},{headers:{'Cache-Control':'no-store'}})
 if(body.action==='get'){const campaign=await getCampaign(body.id);return NextResponse.json({campaign},{status:campaign?200:404,headers:{'Cache-Control':'no-store'}})}
 if(body.action==='save'){const parsed=campaignSchema.safeParse(body.campaign);if(!parsed.success)return NextResponse.json({error:parsed.error.issues[0].message},{status:400});return NextResponse.json({campaign:await saveCampaign(parsed.data)})}
 if(body.action==='delete'&&typeof body.id==='string'){await deleteCampaign(body.id);return NextResponse.json({success:true})}
 return NextResponse.json({error:'Invalid action'},{status:400})
 }catch{return NextResponse.json({error:'Could not access campaigns. Please retry.'},{status:503})}
}
