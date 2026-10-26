'use client'

import { createContext, useCallback, useContext, useState } from 'react'

/** Answers from the size finder that fill in the cake inquiry form. */
export type CakePlan = {
  eventType: string
  servings: string
  size: string
  flavor: string
  filling: string
  fulfillment: string
}
type Applied = CakePlan & { id: number }
const PlanContext = createContext<{ plan: Applied | null; apply: (plan: CakePlan) => void } | null>(null)

/** Shares the finder's result with the inquiry form on /custom-cakes. */
export function CakePlanProvider({ children }: { children: React.ReactNode }) {
  const [plan, setPlan] = useState<Applied | null>(null)
  const apply = useCallback((next: CakePlan) => setPlan(current => ({ ...next, id: (current?.id ?? 0) + 1 })), [])
  return <PlanContext.Provider value={{ plan, apply }}>{children}</PlanContext.Provider>
}
export const useCakePlan = () => useContext(PlanContext)
