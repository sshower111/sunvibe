"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"

export interface CartItem {
  id: string
  name: string
  price: string
  priceId: string
  image: string
  quantity: number
}

interface CartContextType {
  items: CartItem[]
  addItem: (item: Omit<CartItem, "quantity">) => void
  removeItem: (id: string) => void
  updateQuantity: (id: string, quantity: number) => void
  clearCart: () => void
  totalItems: number
  totalPrice: number
  pickupTime: string
  setPickupTime: (time: string) => void
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [pickupTime, setPickupTime] = useState<string>("")
  const [isInitialized, setIsInitialized] = useState(false)

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem("sunville-cart")
    if (savedCart) {
      try {
        setItems(JSON.parse(savedCart))
      } catch (error) {
        console.error("Failed to load cart:", error)
      }
    }
    const savedPickupTime = localStorage.getItem("sunville-pickup-time")
    // Only load saved pickup time if it's valid (not empty and not just "ASAP" placeholder)
    if (savedPickupTime && savedPickupTime !== "ASAP") {
      setPickupTime(savedPickupTime)
    } else {
      // Clear invalid old values
      localStorage.removeItem("sunville-pickup-time")
    }
    setIsInitialized(true)
  }, [])

  // Save cart to localStorage whenever it changes (but only after initialization)
  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem("sunville-cart", JSON.stringify(items))
    }
  }, [items, isInitialized])

  // Save pickup time to localStorage whenever it changes (but only after initialization)
  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem("sunville-pickup-time", pickupTime)
    }
  }, [pickupTime, isInitialized])

  const addItem = (item: Omit<CartItem, "quantity">) => {
    setItems((currentItems) => {
      const existingItem = currentItems.find((i) => i.id === item.id)
      if (existingItem) {
        return currentItems.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        )
      }
      return [...currentItems, { ...item, quantity: 1 }]
    })
  }

  const removeItem = (id: string) => {
    setItems((currentItems) => currentItems.filter((item) => item.id !== id))
  }

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(id)
      return
    }
    setItems((currentItems) =>
      currentItems.map((item) => (item.id === id ? { ...item, quantity } : item))
    )
  }

  const clearCart = () => {
    setItems([])
  }

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)
  const totalPrice = items.reduce(
    (sum, item) => sum + parseFloat(item.price) * item.quantity,
    0
  )

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        totalItems,
        totalPrice,
        pickupTime,
        setPickupTime,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider")
  }
  return context
}
