/**
 * Automated Test Order Script
 * Creates and completes a test order automatically using Stripe Payment Intents
 */

import Stripe from 'stripe'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
})

async function automatedTestOrder() {
  try {
    console.log('🤖 Starting automated test order...\n')

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

    // Step 2: Calculate order details
    const lineItems = products.data.map((product) => {
      const price = product.default_price as Stripe.Price
      const quantity = Math.floor(Math.random() * 3) + 1
      console.log(`  - ${product.name}: ${quantity}x $${(price.unit_amount! / 100).toFixed(2)}`)

      return {
        price: price.id,
        quantity: quantity,
      }
    })

    const totalAmount = lineItems.reduce((sum, item) => {
      const product = products.data.find(p => {
        const price = p.default_price as Stripe.Price
        return price.id === item.price
      })
      const price = product?.default_price as Stripe.Price
      return sum + (price.unit_amount! * item.quantity)
    }, 0)

    console.log(`\n💰 Total: $${(totalAmount / 100).toFixed(2)}\n`)

    // Step 3: Set pickup time
    console.log('📅 Setting pickup time...')
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const pickupDate = tomorrow.toISOString().split('T')[0]
    const pickupTime = `${pickupDate} at 2:00 PM`
    console.log(`  Pickup: ${pickupTime}\n`)

    // Step 4: Create a customer
    console.log('👤 Creating test customer...')
    const customer = await stripe.customers.create({
      email: 'sunvillebakerylv@gmail.com',
      name: 'Test Customer',
      description: 'Automated test order',
    })
    console.log(`✅ Customer created: ${customer.id}\n`)

    // Step 5: Create Payment Intent directly
    console.log('💳 Creating payment intent...')
    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalAmount,
      currency: 'usd',
      customer: customer.id,
      payment_method_types: ['card'],
      metadata: {
        productName: 'Test Order',
        pickupTime: pickupTime,
      },
      description: `Test order - Pickup: ${pickupTime}`,
    })

    // Step 6: Confirm payment with test card
    console.log('✅ Payment intent created')
    console.log('🔐 Confirming payment with test card...')

    const confirmedPayment = await stripe.paymentIntents.confirm(paymentIntent.id, {
      payment_method: 'pm_card_visa', // Stripe test payment method
    })

    if (confirmedPayment.status === 'succeeded') {
      console.log('✅ Payment succeeded!\n')

      // Step 7: Manually trigger webhook behavior (simulate what would happen)
      console.log('📧 Simulating webhook email notifications...')
      console.log('   In production, the webhook would:')
      console.log('   1. Send admin notification email')
      console.log('   2. Send customer confirmation email')
      console.log('   3. Both would show pickup time:', pickupTime)

      // Get the product details for email simulation
      const orderItems = await Promise.all(
        lineItems.map(async (item) => {
          const product = products.data.find(p => {
            const price = p.default_price as Stripe.Price
            return price.id === item.price
          })
          const price = product?.default_price as Stripe.Price
          return {
            name: product?.name || 'Unknown',
            quantity: item.quantity,
            price: (price.unit_amount! / 100).toFixed(2),
            total: ((price.unit_amount! * item.quantity) / 100).toFixed(2),
          }
        })
      )

      console.log('\n📋 Order Summary:')
      console.log('─────────────────────────────────────')
      console.log(`Customer: Test Customer`)
      console.log(`Email: sunvillebakerylv@gmail.com`)
      console.log(`Pickup: ${pickupTime}`)
      console.log(`Payment ID: ${confirmedPayment.id}`)
      console.log('\nItems:')
      orderItems.forEach(item => {
        console.log(`  ${item.name}`)
        console.log(`    ${item.quantity}x $${item.price} = $${item.total}`)
      })
      console.log(`\nTotal: $${(totalAmount / 100).toFixed(2)} USD`)
      console.log('─────────────────────────────────────\n')

      console.log('✅ Test order completed successfully!')
      console.log('\n⚠️  Note: Since this bypasses Stripe Checkout, webhook emails')
      console.log('   will NOT be sent. To test emails, use the regular test-order.ts')
      console.log('   script and complete checkout manually.\n')

    } else {
      console.error('❌ Payment failed:', confirmedPayment.status)
      process.exit(1)
    }

  } catch (error) {
    console.error('❌ Error creating automated test order:', error)
    process.exit(1)
  }
}

// Run the test
automatedTestOrder()
