// Source: Bakery Cake Pricing & Specs.pdf, supplied by the bakery owner.
export const priceGroups = ['Coffee / Chocolate Mousse / Custard', 'Mixed Fruit / Tiramisu', 'Chestnut / Taro / Mango', 'Durian / Coconut'] as const
export type CakeSpec = { value: string; label: string; category: 'Round' | 'Sheet' | 'Multi-tier'; party?: number; wedding?: number; prices: readonly number[] }
export const cakeCatalog: CakeSpec[] = [
  { value: '6-inch', label: '6-inch round', category: 'Round', party: 8, wedding: 12, prices: [24,32,34,42] },
  { value: '8-inch', label: '8-inch round', category: 'Round', party: 14, wedding: 24, prices: [36,40,42,60] },
  { value: '10-inch', label: '10-inch round', category: 'Round', party: 25, wedding: 38, prices: [62,72,78,98] },
  { value: '12-inch', label: '12-inch round', category: 'Round', party: 40, wedding: 56, prices: [98,128,138,168] },
  { value: '14-inch', label: '14-inch round', category: 'Round', party: 60, wedding: 78, prices: [128,148,158,178] },
  { value: '16-inch', label: '16-inch round', category: 'Round', party: 75, wedding: 100, prices: [172,188,208,238] },
  { value: '18-inch', label: '18-inch round', category: 'Round', party: 100, wedding: 128, prices: [216,228,248,298] },
  { value: '20-inch', label: '20-inch round', category: 'Round', party: 120, wedding: 150, prices: [252,288,308,328] },
  { value: 'quarter-sheet', label: '1/4 Sheet', category: 'Sheet', party: 24, prices: [56,72,78,90] },
  { value: 'half-sheet', label: '1/2 Sheet', category: 'Sheet', party: 54, prices: [94,128,138,158] },
  { value: 'full-sheet', label: 'Full Sheet', category: 'Sheet', party: 96, prices: [188,228,248,298] },
  { value: 'tier-6-10', label: '2-Tier · 6" / 10"', category: 'Multi-tier', wedding: 50, prices: [168] },
  { value: 'tier-8-12', label: '2-Tier · 8" / 12"', category: 'Multi-tier', wedding: 80, prices: [238] },
  { value: 'tier-10-12', label: '2-Tier · 10" / 12"', category: 'Multi-tier', wedding: 94, prices: [248] },
  { value: 'tier-10-14', label: '2-Tier · 10" / 14"', category: 'Multi-tier', wedding: 116, prices: [288] },
  { value: 'tier-12-14', label: '2-Tier · 12" / 14"', category: 'Multi-tier', wedding: 134, prices: [308] },
  { value: 'tier-12-16', label: '2-Tier · 12" / 16"', category: 'Multi-tier', wedding: 156, prices: [348] },
  { value: 'tier-14-16', label: '2-Tier · 14" / 16"', category: 'Multi-tier', wedding: 178, prices: [368] },
  { value: 'tier-6-10-12', label: '3-Tier · 6" / 10" / 12"', category: 'Multi-tier', wedding: 106, prices: [298] },
  { value: 'tier-8-10-12', label: '3-Tier · 8" / 10" / 12"', category: 'Multi-tier', wedding: 118, prices: [328] },
  { value: 'tier-8-12-14', label: '3-Tier · 8" / 12" / 14"', category: 'Multi-tier', wedding: 158, prices: [356] },
  { value: 'tier-8-12-16', label: '3-Tier · 8" / 12" / 16"', category: 'Multi-tier', wedding: 180, prices: [422] },
  { value: 'tier-10-14-16', label: '3-Tier · 10" / 14" / 16"', category: 'Multi-tier', wedding: 216, prices: [478] },
]
export const deliveryOptions = ['Pickup', 'Local delivery (within 10 miles) — $30', 'Casino / Hotel delivery — $50', 'Other delivery — please advise'] as const
export const cakeLabel = (value: string) => cakeCatalog.find(cake => cake.value === value)?.label || value
