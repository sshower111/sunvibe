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

      console.log("📧 Webhook - Session metadata:", session.metadata)
      console.log("⏰ Webhook - Pickup time:", pickupTime)

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

      // Create customer confirmation email
      const customerEmailHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #10b981; color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background-color: #f9fafb; padding: 30px 20px; border-radius: 0 0 8px 8px; }
              .order-details { background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
              .item { padding: 12px 0; border-bottom: 1px solid #e5e7eb; }
              .item:last-child { border-bottom: none; }
              .total { font-size: 1.3em; font-weight: bold; color: #10b981; margin-top: 20px; padding-top: 15px; border-top: 2px solid #10b981; }
              .info-row { display: flex; justify-content: space-between; padding: 10px 0; }
              .label { font-weight: bold; color: #6b7280; }
              .success-icon { font-size: 48px; margin-bottom: 10px; }
              .next-steps { background-color: #ecfdf5; padding: 20px; border-radius: 8px; margin-top: 20px; border-left: 4px solid #10b981; }
              .next-steps h3 { margin-top: 0; color: #065f46; }
              .next-steps ol { margin: 10px 0; padding-left: 20px; }
              .next-steps li { margin: 8px 0; color: #064e3b; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="success-icon">✅</div>
                <h1 style="margin: 0;">Order Confirmed!</h1>
                <p style="margin: 10px 0 0 0; opacity: 0.9;">Thank you for your order, ${customerName}</p>
              </div>
              <div class="content">
                <p style="font-size: 1.1em; color: #065f46;">
                  Your delicious treats will be prepared fresh and ready for pickup!
                </p>

                <div class="order-details">
                  <h2 style="margin-top: 0; color: #10b981;">Order Summary</h2>
                  <div class="info-row">
                    <span class="label">Order ID:</span>
                    <span style="font-family: monospace; font-size: 0.9em;">${session.id.slice(0, 24)}...</span>
                  </div>
                  <div class="info-row">
                    <span class="label">Pickup Time:</span>
                    <span style="font-size: 1.1em; color: #10b981; font-weight: bold;">${pickupTime}</span>
                  </div>
                </div>

                <h3>Your Items:</h3>
                <div class="order-details">
                  ${orderItems.map(item => `
                    <div class="item">
                      <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span><strong>${item.name}</strong></span>
                        <span style="font-weight: bold;">$${item.total}</span>
                      </div>
                      <div style="color: #6b7280; font-size: 0.9em; margin-top: 4px;">
                        Quantity: ${item.quantity} × $${item.price} each
                      </div>
                    </div>
                  `).join('')}

                  <div class="total">
                    Total Paid: $${totalAmount} USD
                  </div>
                </div>

                <div class="next-steps">
                  <h3>What's Next?</h3>
                  <ol>
                    <li><strong>We'll start preparing your items fresh</strong></li>
                    <li><strong>Pick up your order at:</strong><br>
                        Sunville Bakery<br>
                        4053 Spring Mountain Rd<br>
                        Las Vegas, NV 89102<br>
                        During business hours</li>
                    <li><strong>Bring this confirmation</strong> or your order ID when you arrive</li>
                  </ol>
                </div>

                <p style="text-align: center; color: #6b7280; font-size: 0.9em; margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 20px;">
                  Questions? Contact us at sunvillebakerylv@gmail.com<br>
                  <a href="https://sunvillebakerylv.com" style="color: #10b981;">Visit our website</a>
                </p>
              </div>
            </div>
          </body>
        </html>
      `

      // Send admin notification email
      try {
        await resend.emails.send({
          from: 'Sunville Bakery <onboarding@resend.dev>',
          to: process.env.NOTIFICATION_EMAIL || 'your-email@example.com',
          subject: `New Order: $${totalAmount} - Pickup ${pickupTime}`,
          html: emailHtml,
        })

        console.log('✅ Admin notification email sent successfully')
      } catch (emailError) {
        console.error('❌ Failed to send admin email:', emailError)
        // Don't fail the webhook if email fails
      }

      // Send customer confirmation email
      if (customerEmail && customerEmail !== 'No email provided') {
        try {
          await resend.emails.send({
            from: 'Sunville Bakery <onboarding@resend.dev>',
            to: customerEmail,
            subject: `Order Confirmation - Sunville Bakery - Pickup ${pickupTime}`,
            html: customerEmailHtml,
          })

          console.log('✅ Customer confirmation email sent successfully to:', customerEmail)
        } catch (emailError) {
          console.error('❌ Failed to send customer email:', emailError)
          // Don't fail the webhook if email fails
        }
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
