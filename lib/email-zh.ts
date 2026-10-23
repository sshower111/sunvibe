import { budgets, eventTypes, fillings, flavors } from './cake-inquiry'
import { cakeCatalog, deliveryOptions } from './cake-catalog'

// Traditional Chinese copy that is added under the English part of every form email to the bakery.
// Labels and the site's own option text are translated; whatever the customer typed is left as written.

export const ZH = {
  name: '姓名',
  email: '電郵',
  phone: '電話',
  message: '留言',
  eventDate: '活動日期',
  eventTime: '活動時間',
  eventType: '活動類型',
  servings: '所需份數',
  size: '蛋糕尺寸',
  flavor: '口味偏好',
  filling: '餡料偏好',
  cakeMessage: '蛋糕上的字',
  budget: '預算',
  fulfillment: '自取／送貨要求',
  deliveryAddress: '送貨地址／酒店',
  notes: '備註／飲食要求',
  items: '預訂項目',
  itemsTotal: '預計商品總額',
  preorderFulfillment: '取貨方式',
  pickupDate: '取貨日期',
  preorderNotes: '備註',
  notProvided: '未提供',
  none: '無',
  notDecided: '未定',
  bakeryPickup: '店內自取',
  contactHeading: '新的聯絡表單訊息',
  cakeHeading: '訂製蛋糕查詢（需報價）',
  cakeNotConfirmed: '此訂單尚未確認。',
  preorderHeading: '節日預訂',
  preorderNote: '僅為預訂要求 — 請致電確認供應情況、送貨費用及取貨時間。',
} as const

const sizeZh = (label: string) =>
  label
    .replace(/^(\d+)-inch round$/, '$1 吋圓形')
    .replace(/^(1\/4|1\/2) Sheet$/, '$1 長方形')
    .replace(/^Full Sheet$/, '全張長方形')
    .replace(/^2-Tier/, '兩層')
    .replace(/^3-Tier/, '三層')

const options: Record<string, string> = {
  // Events
  Birthday: '生日',
  Wedding: '婚禮',
  Anniversary: '週年紀念',
  'Character / Theme': '卡通／主題',
  Other: '其他',
  // Budgets ("$100–$200" style ranges need no translation)
  'Not sure — please advise': '不確定，請建議',
  'Under $100': '$100 以下',
  '$800+': '$800 以上',
  // Flavors
  'Please recommend': '請推薦',
  Vanilla: '香草',
  Chocolate: '朱古力',
  Coffee: '咖啡',
  'Green Tea': '綠茶',
  Orange: '香橙',
  Pandan: '班蘭',
  // Fillings
  'Mixed Fresh Fruit': '雜錦鮮果',
  Strawberry: '草莓',
  Mango: '芒果',
  Taro: '芋頭',
  Custard: '吉士',
  Coconut: '椰子',
  Durian: '榴槤',
  Banana: '香蕉',
  'Something else (e.g., passion fruit)': '其他餡料（詳見備註）',
  // Pickup and delivery
  Pickup: '自取',
  'Local delivery (within 10 miles) — $30': '本地送貨（10 英里內）— $30',
  'Casino / Hotel delivery — $50': '賭場／酒店送貨 — $50',
  'Other delivery — please advise': '其他送貨方式 — 請建議',
  // Cake sizes (English labels from lib/cake-catalog.ts)
  'Not sure': '不確定',
  ...Object.fromEntries(cakeCatalog.map(cake => [cake.label, sizeZh(cake.label)])),
}

/** Chinese for one of the site's own option values; anything else (customer text, prices) is returned unchanged. */
export const zhOption = (value: string) => options[value] ?? value

/** Every option the forms offer, so tests can check none is missing a translation. */
export const translatableOptions = [
  ...eventTypes,
  ...budgets.filter(value => !/^\$\d+–\$\d+$/.test(value)),
  ...flavors,
  ...fillings,
  ...deliveryOptions,
  'Not sure',
  ...cakeCatalog.map(cake => cake.label),
]

/** HTML block placed under the English email. Row values must already be HTML-escaped. */
export function zhHtml(heading: string, rows: [label: string, html: string][], note?: string) {
  return (
    '<hr style="margin:24px 0;border:0;border-top:1px solid #ddd">' +
    `<div lang="zh-Hant"><h2>${heading}</h2>` +
    (note ? `<p>${note}</p>` : '') +
    rows.map(([label, html]) => `<p><strong>${label}：</strong>${html}</p>`).join('') +
    '</div>'
  )
}

/** Plain-text block placed under the English email. */
export function zhText(heading: string, rows: [label: string, text: string][], note?: string) {
  return ['', '— 中文 —', heading, ...(note ? [note] : []), ...rows.map(([label, text]) => `${label}：${text}`)].join(
    '\n',
  )
}
