// Source: Bakery Cake Pricing & Specs.pdf, supplied by the bakery owner.
export const priceGroups = ['Coffee / Chocolate Mousse / Custard', 'Mixed Fruit / Tiramisu', 'Chestnut / Taro / Mango', 'Durian / Coconut'] as const
export type CakeSpec = { value: string; label: string; category: 'Round' | 'Sheet' | 'Multi-tier'; servings: number; prices: readonly number[] }
export const cakeCatalog: CakeSpec[] = [
  { value: '6-inch', label: '6-inch round', category: 'Round', servings: 8, prices: [24,32,34,42] },
  { value: '8-inch', label: '8-inch round', category: 'Round', servings: 14, prices: [36,40,42,60] },
  { value: '10-inch', label: '10-inch round', category: 'Round', servings: 25, prices: [62,72,78,98] },
  { value: '12-inch', label: '12-inch round', category: 'Round', servings: 40, prices: [98,128,138,168] },
  { value: '14-inch', label: '14-inch round', category: 'Round', servings: 60, prices: [128,148,158,178] },
  { value: '16-inch', label: '16-inch round', category: 'Round', servings: 75, prices: [172,188,208,238] },
  { value: '18-inch', label: '18-inch round', category: 'Round', servings: 100, prices: [216,228,248,298] },
  { value: '20-inch', label: '20-inch round', category: 'Round', servings: 120, prices: [252,288,308,328] },
  { value: 'quarter-sheet', label: '1/4 Sheet', category: 'Sheet', servings: 24, prices: [56,72,78,90] },
  { value: 'half-sheet', label: '1/2 Sheet', category: 'Sheet', servings: 54, prices: [94,128,138,158] },
  { value: 'full-sheet', label: 'Full Sheet', category: 'Sheet', servings: 96, prices: [188,228,248,298] },
  { value: 'tier-6-10', label: '2-Tier · 6" / 10"', category: 'Multi-tier', servings: 33, prices: [168] },
  { value: 'tier-8-12', label: '2-Tier · 8" / 12"', category: 'Multi-tier', servings: 53, prices: [238] },
  { value: 'tier-12-16', label: '2-Tier · 12" / 16"', category: 'Multi-tier', servings: 104, prices: [348] },
  { value: 'tier-8-10-12', label: '3-Tier · 8" / 10" / 12"', category: 'Multi-tier', servings: 79, prices: [328] },
  { value: 'tier-10-14-16', label: '3-Tier · 10" / 14" / 16"', category: 'Multi-tier', servings: 144, prices: [478] },
]
export const deliveryOptions = ['Pickup', 'Local delivery (within 10 miles) — $30', 'Casino / Hotel delivery — $50', 'Other delivery — please advise'] as const
export const cakeLabel = (value: string) => cakeCatalog.find(cake => cake.value === value)?.label || value
