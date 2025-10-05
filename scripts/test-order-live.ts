/**
 * Live Website Test Order Script
 * Creates a test checkout session for the production website
 */

import Stripe from 'stripe'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
})

async function testLiveOrder() {
  try {
    console.log('🌐 Creating test order for LIVE WEBSITE...\n')

    // Step 1: Get first 3 products from Stripe
    console.log('📦 Fetching products from Stripe...')
    const products = await stripe.products.list({
      active: true,
      expand: ['data.default_price'],
      limit: 3,
    })

    if (products.data.length === 0) {
      console.error('❌ No products found in Stripe')
      process.exit(1)
    }

    console.log(`✅ Found ${products.data.length} products\n`)

    // Step 2: Create line items for test order
    const lineItems = products.data.map((product) => {
      const price = product.default_price as Stripe.Price
      console.log(`  - ${product.name}: $${(price.unit_amount! / 100).toFixed(2)}`)

      return {
        price: price.id,
        quantity: Math.floor(Math.random() * 3) + 1, // Random quantity 1-3
      }
    })

    // Step 3: Set pickup time
    console.log('\n📅 Setting pickup time...')
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const pickupDate = tomorrow.toISOString().split('T')[0]
    const pickupTime = `${pickupDate} at 2:00 PM`
    console.log(`  Pickup: ${pickupTime}\n`)

    // Step 4: Create checkout session for LIVE WEBSITE
    console.log('💳 Creating Stripe checkout session for sunvillebakerylv.com...')
    const session = await stripe.checkout.sessions.create({
      line_items: lineItems,
      mode: 'payment',
      success_url: 'https://sunvillebakerylv.com/checkout/success?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'https://sunvillebakerylv.com/menu',
      metadata: {
        productName: 'Live Test Order',
        pickupTime: pickupTime,
      },
      customer_email: 'sunvillebakerylv@gmail.com', // Pre-fill test email
    })

    console.log('✅ Checkout session created!\n')
    console.log('📋 Session Details:')
    console.log(`  Session ID: ${session.id}`)
    console.log(`  Amount: $${((session.amount_total || 0) / 100).toFixed(2)}`)
    console.log(`  Pickup Time: ${session.metadata?.pickupTime}`)
    console.log(`  Customer Email: ${session.customer_email || 'Not set'}\n`)

    console.log('🔗 LIVE Test Checkout URL:')
    console.log(`  ${session.url}\n`)

    console.log('📝 Instructions:')
    console.log('  1. Open the URL above in your browser')
    console.log('  2. Use Stripe test card: 4242 4242 4242 4242')
    console.log('  3. Use any future expiry date (e.g., 12/34)')
    console.log('  4. Use any 3-digit CVC (e.g., 123)')
    console.log('  5. Use any ZIP code (e.g., 12345)')
    console.log('  6. Complete the checkout\n')

    console.log('🌐 This will test the PRODUCTION webhook at:')
    console.log('  https://sunvillebakerylv.com/api/webhooks/stripe\n')

    console.log('✉️  You should receive:')
    console.log('  - Admin notification email with order details')
    console.log('  - Customer confirmation email at sunvillebakerylv@gmail.com')
    console.log('  - Both emails should show pickup time: ' + pickupTime + '\n')

    console.log('⚠️  Important: Make sure your Stripe webhook is configured to:')
    console.log('  1. Point to: https://sunvillebakerylv.com/api/webhooks/stripe')
    console.log('  2. Listen for: checkout.session.completed')
    console.log('  3. STRIPE_WEBHOOK_SECRET is set in Vercel environment variables\n')

  } catch (error) {
    console.error('❌ Error creating test order:', error)
    process.exit(1)
  }
}

// Run the test
testLiveOrder()
