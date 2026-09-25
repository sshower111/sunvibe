import { addDays } from './occasion-dates'
const nthSunday = (year: number, month: number, n: number) => { const first = new Date(Date.UTC(year, month - 1, 1)); return year + '-' + String(month).padStart(2,'0') + '-' + String(1 + (7 - first.getUTCDay()) % 7 + (n - 1) * 7).padStart(2,'0') }
type Preset = { id: string; label: string; dates: (year: number) => { start: string; end: string } | null; leadDays: number; headline: string; message: string; language: 'zh' | 'es' | null }
const fixed = (start: string, end = start) => (year: number) => ({ start: year + '-' + start, end: year + '-' + end })
const manual = (dates: Record<number,string>) => (year: number) => dates[year] ? { start: dates[year], end: dates[year] } : null
export const OCCASION_PRESETS: Preset[] = [
 { id:'valentines', label:"Valentine's Day", dates:fixed('02-14'), leadDays:14, headline:'Something sweet for your Valentine', message:'Reserve a bakery treat for someone special.', language:null },
 { id:'lunar-new-year', label:'Lunar New Year / Tết', dates:manual({2026:'2026-02-17',2027:'2027-02-06'}), leadDays:21, headline:'Celebrate Lunar New Year with us', message:'Reserve your celebration favorites.', language:'zh' },
 { id:'mothers-us', label:"Mother's Day US", dates:y=>{const d=nthSunday(y,5,2);return {start:d,end:d}}, leadDays:14, headline:'Something sweet for Mom', message:'Celebrate Mom with a freshly baked treat.', language:null },
 { id:'mothers-mx', label:"Mother's Day Mexico", dates:fixed('05-10'), leadDays:14, headline:'Celebrate Mom on May 10', message:'Reserve a sweet gift for Mom.', language:'es' },
 { id:'fathers', label:"Father's Day", dates:y=>{const d=nthSunday(y,6,3);return {start:d,end:d}}, leadDays:14, headline:'Celebrate Dad with a bakery favorite', message:'Reserve something special for Dad.', language:null },
 { id:'graduation', label:'Graduation', dates:fixed('05-15','06-30'), leadDays:14, headline:'Sweet treats for your graduate', message:'Reserve a treat for your celebration.', language:null },
 { id:'mid-autumn', label:'Mid-Autumn Festival', dates:manual({2026:'2026-09-25',2027:'2027-09-15'}), leadDays:21, headline:'Fresh mooncakes for Mid-Autumn Festival', message:'Pineapple, red bean & lotus — baked fresh. Reserve yours.', language:'zh' },
 { id:'muertos', label:'Día de los Muertos', dates:fixed('11-01','11-02'), leadDays:14, headline:'Celebrate Día de los Muertos', message:'Reserve your seasonal bakery favorites.', language:'es' },
 { id:'christmas', label:'Christmas', dates:fixed('12-01','12-25'), leadDays:7, headline:'Freshly baked for the holidays', message:'Reserve something sweet for your holiday table.', language:null },
]
export function presetCampaign(preset: Preset, year: number, id: string) { const dates = preset.dates(year); return { id, occasion:preset.label, name:preset.label + ' ' + year, banner:{headline:preset.headline,message:preset.message,subline:'',ctaLabel:'Pre-order now'},page:{title:preset.label + ' at Sunville Bakery',intro:preset.message,heroImage:''},items:[],startsAt:dates?addDays(dates.start,-preset.leadDays):'',endsAt:dates?.end||'',orderCutoff:dates?addDays(dates.end,-1):'',published:false } }
