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
      const orderId = `SB-${session.id.slice(-8).toUpperCase()}`

      console.log("📧 Webhook - Session metadata:", session.metadata)
      console.log("⏰ Webhook - Pickup time:", pickupTime)

      // Create simple order notification email for bakery
      const emailHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
              .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 12px; overflow: hidden; }
              .header { background: linear-gradient(135deg, #d97706 0%, #ea580c 100%); color: white; padding: 30px 20px; text-align: center; }
              .content { padding: 30px 20px; }
              .order-id { background: #fef3c7; color: #92400e; padding: 8px 16px; border-radius: 6px; font-weight: 600; display: inline-block; margin: 10px 0; }
              .info { margin: 20px 0; }
              .info-row { padding: 10px 0; border-bottom: 1px solid #f3f4f6; }
              .label { color: #6b7280; font-size: 14px; }
              .value { color: #1f2937; font-weight: 600; margin-top: 4px; }
              .items { background: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0; }
              .item { padding: 12px 0; border-bottom: 1px solid #e5e7eb; }
              .item:last-child { border: none; }
              .total { background: #fef3c7; padding: 15px; border-radius: 8px; margin-top: 15px; text-align: center; font-size: 20px; font-weight: bold; color: #92400e; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin: 0;">🥐 New Order!</h1>
              </div>
              <div class="content">
                <div class="order-id">Order ${orderId}</div>

                <div class="info">
                  <div class="info-row">
                    <div class="label">Customer</div>
                    <div class="value">${customerName}</div>
                  </div>
                  <div class="info-row">
                    <div class="label">Email</div>
                    <div class="value">${customerEmail}</div>
                  </div>
                  <div class="info-row">
                    <div class="label">Pickup Time</div>
                    <div class="value">${pickupTime}</div>
                  </div>
                </div>

                <div class="items">
                  ${orderItems.map(item => `
                    <div class="item">
                      <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                          <strong>${item.name}</strong><br>
                          <span style="color: #6b7280; font-size: 14px;">Qty: ${item.quantity} × $${item.price}</span>
                        </div>
                        <strong>$${item.total}</strong>
                      </div>
                    </div>
                  `).join('')}
                </div>

                <div class="total">Total: $${totalAmount}</div>
              </div>
            </div>
          </body>
        </html>
      `

      // Create customer confirmation email with same modern design
      const customerEmailHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
              .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 12px; overflow: hidden; }
              .header { background: linear-gradient(135deg, #d97706 0%, #ea580c 100%); color: white; padding: 40px 20px; text-align: center; }
              .content { padding: 30px 20px; }
              .order-id { background: #fef3c7; color: #92400e; padding: 8px 16px; border-radius: 6px; font-weight: 600; display: inline-block; margin: 10px 0; }
              .pickup-time { background: #fed7aa; color: #9a3412; padding: 12px; border-radius: 8px; text-align: center; font-size: 18px; font-weight: 700; margin: 20px 0; }
              .items { background: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0; }
              .item { padding: 12px 0; border-bottom: 1px solid #e5e7eb; }
              .item:last-child { border: none; }
              .total { background: #fef3c7; padding: 15px; border-radius: 8px; margin-top: 15px; text-align: center; font-size: 20px; font-weight: bold; color: #92400e; }
              .next-steps { background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; }
              .next-steps h3 { margin-top: 0; color: #92400e; }
              .location { background: white; padding: 15px; border-radius: 6px; margin-top: 10px; border-left: 3px solid #d97706; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div style="font-size: 48px; margin-bottom: 10px;">✅</div>
                <h1 style="margin: 0;">Order Confirmed!</h1>
                <p style="margin: 10px 0 0 0; opacity: 0.9;">Thank you, ${customerName}!</p>
              </div>
              <div class="content">
                <div class="order-id">Order ${orderId}</div>

                <div class="pickup-time">
                  🕐 Pickup: ${pickupTime}
                </div>

                <div class="items">
                  ${orderItems.map(item => `
                    <div class="item">
                      <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                          <strong>${item.name}</strong><br>
                          <span style="color: #6b7280; font-size: 14px;">Qty: ${item.quantity} × $${item.price}</span>
                        </div>
                        <strong>$${item.total}</strong>
                      </div>
                    </div>
                  `).join('')}
                </div>

                <div class="total">Total: $${totalAmount}</div>

                <div class="next-steps">
                  <h3>📍 Pickup Location</h3>
                  <div class="location">
                    <strong>Sunville Bakery</strong><br>
                    4053 Spring Mountain Rd<br>
                    Las Vegas, NV 89102<br>
                    <br>
                    <strong>Hours:</strong><br>
                    Mon-Tue, Thu-Sun: 8:00 AM - 8:00 PM<br>
                    Wednesday: 8:00 AM - 3:00 PM
                  </div>
                </div>

                <p style="text-align: center; color: #6b7280; font-size: 14px; margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 20px;">
                  Questions? Call 702-889-8897 or email sunvillebakerylv@gmail.com
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
