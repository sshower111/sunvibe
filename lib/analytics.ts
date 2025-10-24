import { track } from '@vercel/analytics'

/**
 * Track custom events in Vercel Analytics
 */

export const trackEvent = {
  // Cart events
  addToCart: (productName: string, price: number, quantity: number) => {
    track('Add to Cart', { productName, price, quantity })
  },

  removeFromCart: (productName: string) => {
    track('Remove from Cart', { productName })
  },

  // Checkout events
  checkoutStarted: (itemCount: number, totalAmount: number) => {
    track('Checkout Started', { itemCount, totalAmount })
  },

  checkoutCompleted: (orderId: string, totalAmount: number, itemCount: number) => {
    track('Checkout Completed', { orderId, totalAmount, itemCount })
  },

  // User preferences
  pickupTimeSelected: (type: 'ASAP' | 'Later', date?: string, time?: string) => {
    track('Pickup Time Selected', { type, date, time })
  },

  // Navigation & engagement
  phoneNumberClicked: (source: 'header' | 'footer' | 'contact') => {
    track('Phone Number Clicked', { source })
  },

  categoryFilterUsed: (category: string) => {
    track('Category Filter Used', { category })
  },

  // Form interactions
  contactFormSubmitted: () => {
    track('Contact Form Submitted')
  },

  // Menu interactions
  menuViewed: () => {
    track('Menu Viewed')
  },

  productViewed: (productName: string, price: number) => {
    track('Product Viewed', { productName, price })
  },
}
