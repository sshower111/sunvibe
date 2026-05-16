import Stripe from 'stripe'

let _instance: Stripe | null = null

function getInstance(): Stripe {
  if (!_instance) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not set in environment variables')
    }
    _instance = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-12-18.acacia',
      typescript: true,
    })
  }
  return _instance
}

// Lazy proxy — Stripe is only initialized on first use inside a request handler,
// not at module load time (which would crash Next.js builds without env vars).
export const stripe = new Proxy({} as Stripe, {
  get(_, prop: string | symbol) {
    return getInstance()[prop as keyof Stripe]
  },
})
