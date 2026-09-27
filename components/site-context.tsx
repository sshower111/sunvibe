"use client"
import { createContext, useContext, type ReactNode } from 'react'
// Site-wide facts decided on the server (e.g. whether festival pre-orders are open).
const SiteContext = createContext({ preorderOpen: false })
export function SiteProvider({ preorderOpen, children }: { preorderOpen: boolean; children: ReactNode }) {
  return <SiteContext.Provider value={{ preorderOpen }}>{children}</SiteContext.Provider>
}
export const useSite = () => useContext(SiteContext)
