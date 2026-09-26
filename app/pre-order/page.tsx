import { getActiveCampaign } from '@/lib/campaigns'
import { storeDate } from '@/lib/occasion-dates'
import { Navigation } from '@/components/navigation'
import { Footer } from '@/components/footer'
import { PreOrderForm } from '@/components/pre-order-form'
import { CampaignPreview } from '@/components/campaign-preview'
import { pageMetadata } from '@/lib/seo'
export async function generateMetadata({searchParams}:{searchParams:Promise<{preview?:string}>}){const query=await searchParams;return {...pageMetadata('/pre-order'),...(query.preview?{robots:{index:false,follow:false}}:{})}}
export default async function PreOrderPage({searchParams}:{searchParams:Promise<{preview?:string}>}){const query=await searchParams;let storageUnavailable=false;const campaign=query.preview?null:await getActiveCampaign().catch(()=>{storageUnavailable=true;return null});return <div className="min-h-screen"><Navigation/><main id="main-content" tabIndex={-1} className="pt-16 md:pt-24">{query.preview?<CampaignPreview id={query.preview} today={storeDate()}/>:campaign?<PreOrderForm campaign={campaign} today={storeDate()}/>:<section className="site-container section-space"><h1 className="heading-1">Festival pre-orders</h1><p className="mt-5">{storageUnavailable?'Online reservations are temporarily unavailable — ':'No festival pre-orders right now — '}<a href="tel:+17028899887" className="inline-flex min-h-12 items-center font-semibold text-primary underline">call (702) 889-9887</a>{storageUnavailable?' for availability and reservations.':" for today's fresh bakes."}</p></section>}</main><div className={campaign?.items.length ? "pb-28 md:pb-0" : ""}><Footer/></div></div>}
