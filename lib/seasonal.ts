import type { Campaign } from './campaign-model'
export type SeasonalBannerConfig = { id:string; headline:string; message:string; subline?:string; ctaLabel:string; ctaHref:string; startsAt:string; endsAt:string; productId?:string }
export function campaignBanner(campaign:Campaign|null):SeasonalBannerConfig|null { return campaign ? {id:campaign.id,...campaign.banner,ctaHref:'/pre-order',startsAt:campaign.startsAt,endsAt:campaign.endsAt} : null }
