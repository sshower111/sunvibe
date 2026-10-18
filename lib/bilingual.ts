// Menu names are written "English 中文" (for example "Pineapple Bun 菠蘿包").
// splitName separates the two so the Chinese can be shown large, like a bakery shelf label.
const HAN = /[㐀-䶿一-鿿豈-﫿]/

export function splitName(name: string): { en: string; zh: string } {
  const index = name.search(HAN)
  if (index < 0) return { en: name.trim(), zh: '' }
  const en = name.slice(0, index).trim()
  const zh = name.slice(index).trim()
  // A name that starts in Chinese keeps it as the main name.
  return en ? { en, zh } : { en: zh, zh: '' }
}
