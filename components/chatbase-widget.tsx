"use client"

import { useEffect } from 'react'

declare global {
  interface Window {
    chatbase: any
  }
}

export function ChatbaseWidget() {
  useEffect(() => {
    // Widget is loaded via script in layout.tsx
    // This component can be used for additional configuration if needed
  }, [])

  return null // Widget loads automatically from the embed script
}
