// Keep legitimate short and non-English questions valid; reject empty/numeric/link-only spam.
export function hasMeaningfulMessage(value: string) {
 const withoutLinks = value.replace(/https?:\/\/\S+|www\.\S+/gi, '')
 return (withoutLinks.match(/\p{L}/gu) || []).length >= 2
}
