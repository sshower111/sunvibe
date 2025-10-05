import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import Stripe from 'stripe'
import { Resend } from 'resend'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
})

const resend = new Resend(process.env.RESEND_API_KEY!)

// This is your Stripe webhook secret
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(req: NextRequest) {
  try {
    const body = await req.text()
    const headersList = await headers()
    const signature = headersList.get('stripe-signature')

    if (!signature) {
      return NextResponse.json(
        { error: 'No signature found' },
        { status: 400 }
      )
    }

    let event: Stripe.Event

    try {
      // Verify webhook signature
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      console.error('Webhook signature verification failed:', err)
      return NextResponse.json(
        { error: 'Webhook signature verification failed' },
        { status: 400 }
      )
    }

    // Handle the checkout.session.completed event
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session

      // Get line items from the session
      const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
        expand: ['data.price.product'],
      })

      // Build order details
      const orderItems = lineItems.data.map((item) => {
        const product = item.price?.product as Stripe.Product
        return {
          name: product.name,
          quantity: item.quantity,
          price: item.price?.unit_amount ? (item.price.unit_amount / 100).toFixed(2) : '0.00',
          total: ((item.price?.unit_amount || 0) * (item.quantity || 0) / 100).toFixed(2),
        }
      })

      const pickupTime = session.metadata?.pickupTime || 'ASAP'
      const customerEmail = session.customer_details?.email || 'No email provided'
      const customerName = session.customer_details?.name || 'Customer'
      const totalAmount = ((session.amount_total || 0) / 100).toFixed(2)

      // Create HTML email content
      const emailHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #10b981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background-color: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
              .order-details { background-color: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
              .item { padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
              .item:last-child { border-bottom: none; }
              .total { font-size: 1.2em; font-weight: bold; color: #10b981; margin-top: 15px; }
              .info-row { display: flex; justify-content: space-between; padding: 8px 0; }
              .label { font-weight: bold; color: #6b7280; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🥐 New Order Received!</h1>
              </div>
              <div class="content">
                <h2>Order Details</h2>
                <div class="order-details">
                  <div class="info-row">
                    <span class="label">Customer:</span>
                    <span>${customerName}</span>
                  </div>
                  <div class="info-row">
                    <span class="label">Email:</span>
                    <span>${customerEmail}</span>
                  </div>
                  <div class="info-row">
                    <span class="label">Pickup Time:</span>
                    <span>${pickupTime}</span>
                  </div>
                  <div class="info-row">
                    <span class="label">Order ID:</span>
                    <span>${session.id}</span>
                  </div>
                </div>

                <h3>Items Ordered:</h3>
                <div class="order-details">
                  ${orderItems.map(item => `
                    <div class="item">
                      <div style="display: flex; justify-content: space-between;">
                        <span><strong>${item.name}</strong></span>
                        <span>$${item.total}</span>
                      </div>
                      <div style="color: #6b7280; font-size: 0.9em;">
                        Qty: ${item.quantity} × $${item.price}
                      </div>
                    </div>
                  `).join('')}

                  <div class="total">
                    Total: $${totalAmount} USD
                  </div>
                </div>

                <p style="color: #6b7280; font-size: 0.9em; margin-top: 20px;">
                  This order was automatically generated from your Sunville Bakery website.
                </p>
              </div>
            </div>
          </body>
        </html>
      `

      // Send email notification
      try {
        await resend.emails.send({
          from: 'Sunville Bakery <onboarding@resend.dev>',
          to: process.env.NOTIFICATION_EMAIL || 'your-email@example.com',
          subject: `New Order: $${totalAmount} - Pickup ${pickupTime}`,
          html: emailHtml,
        })

        console.log('✅ Order notification email sent successfully')
      } catch (emailError) {
        console.error('❌ Failed to send email:', emailError)
        // Don't fail the webhook if email fails
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}
