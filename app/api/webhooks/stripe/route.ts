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
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                line-height: 1.6;
                color: #1f2937;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                padding: 40px 20px;
              }
              .email-wrapper { max-width: 600px; margin: 0 auto; }
              .email-container {
                background: white;
                border-radius: 16px;
                overflow: hidden;
                box-shadow: 0 20px 60px rgba(0,0,0,0.3);
              }
              .header {
                background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                color: white;
                padding: 50px 30px;
                text-align: center;
                position: relative;
              }
              .header::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: url('data:image/svg+xml,<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="pattern" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse"><circle cx="20" cy="20" r="1" fill="rgba(255,255,255,0.1)"/></pattern></defs><rect fill="url(%23pattern)" width="100" height="100"/></svg>');
                opacity: 0.5;
              }
              .logo { position: relative; z-index: 1; margin-bottom: 20px; }
              .success-icon {
                width: 80px;
                height: 80px;
                background: rgba(255,255,255,0.2);
                border-radius: 50%;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                font-size: 50px;
                margin-bottom: 15px;
                backdrop-filter: blur(10px);
              }
              .header h1 {
                font-size: 32px;
                font-weight: 700;
                margin-bottom: 8px;
                position: relative;
                z-index: 1;
              }
              .header p {
                font-size: 18px;
                opacity: 0.95;
                position: relative;
                z-index: 1;
              }
              .content { padding: 40px 30px; }
              .welcome-text {
                font-size: 18px;
                color: #065f46;
                text-align: center;
                margin-bottom: 30px;
                font-weight: 500;
              }
              .card {
                background: #f9fafb;
                border: 1px solid #e5e7eb;
                border-radius: 12px;
                padding: 24px;
                margin: 20px 0;
              }
              .card h2 {
                color: #10b981;
                font-size: 20px;
                margin-bottom: 20px;
                display: flex;
                align-items: center;
                gap: 10px;
              }
              .card h2::before {
                content: '📋';
                font-size: 24px;
              }
              .info-row {
                display: flex;
                justify-content: space-between;
                padding: 12px 0;
                border-bottom: 1px solid #e5e7eb;
              }
              .info-row:last-child { border-bottom: none; }
              .label {
                font-weight: 600;
                color: #6b7280;
                font-size: 14px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
              }
              .value {
                font-weight: 600;
                color: #1f2937;
                text-align: right;
              }
              .pickup-time {
                background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                color: white !important;
                padding: 8px 16px;
                border-radius: 8px;
                font-size: 16px;
              }
              .items-card h3 {
                color: #1f2937;
                font-size: 18px;
                margin-bottom: 16px;
                display: flex;
                align-items: center;
                gap: 10px;
              }
              .items-card h3::before {
                content: '🛍️';
                font-size: 22px;
              }
              .item {
                padding: 16px 0;
                border-bottom: 1px solid #e5e7eb;
              }
              .item:last-child { border-bottom: none; }
              .item-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 6px;
              }
              .item-name {
                font-weight: 600;
                color: #1f2937;
                font-size: 16px;
              }
              .item-total {
                font-weight: 700;
                color: #10b981;
                font-size: 18px;
              }
              .item-details {
                color: #6b7280;
                font-size: 14px;
              }
              .total-section {
                margin-top: 24px;
                padding-top: 24px;
                border-top: 2px solid #10b981;
                display: flex;
                justify-content: space-between;
                align-items: center;
              }
              .total-label {
                font-size: 20px;
                font-weight: 700;
                color: #1f2937;
              }
              .total-amount {
                font-size: 28px;
                font-weight: 800;
                color: #10b981;
              }
              .next-steps {
                background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
                padding: 24px;
                border-radius: 12px;
                margin-top: 24px;
                border-left: 4px solid #10b981;
              }
              .next-steps h3 {
                color: #065f46;
                font-size: 18px;
                margin-bottom: 16px;
                display: flex;
                align-items: center;
                gap: 10px;
              }
              .next-steps h3::before {
                content: '📍';
                font-size: 22px;
              }
              .next-steps ol {
                margin-left: 20px;
                color: #064e3b;
              }
              .next-steps li {
                margin: 12px 0;
                line-height: 1.8;
                font-size: 15px;
              }
              .next-steps strong { color: #065f46; }
              .cta-button {
                display: inline-block;
                background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                color: white;
                padding: 16px 32px;
                border-radius: 8px;
                text-decoration: none;
                font-weight: 600;
                margin: 24px auto;
                text-align: center;
                box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
                transition: transform 0.2s;
              }
              .cta-button:hover { transform: translateY(-2px); }
              .footer {
                text-align: center;
                padding: 32px 30px;
                background: #f9fafb;
                border-top: 1px solid #e5e7eb;
              }
              .footer p {
                color: #6b7280;
                font-size: 14px;
                margin: 8px 0;
              }
              .footer a {
                color: #10b981;
                text-decoration: none;
                font-weight: 600;
              }
              .social-links {
                margin-top: 20px;
              }
              .social-links a {
                display: inline-block;
                margin: 0 8px;
                color: #6b7280;
                font-size: 12px;
              }
              @media only screen and (max-width: 600px) {
                body { padding: 20px 10px; }
                .header { padding: 40px 20px; }
                .content { padding: 30px 20px; }
                .header h1 { font-size: 26px; }
                .info-row { flex-direction: column; gap: 4px; }
                .value { text-align: left; }
              }
            </style>
          </head>
          <body>
            <div class="email-wrapper">
              <div class="email-container">
                <div class="header">
                  <div class="success-icon">✅</div>
                  <h1>Order Confirmed!</h1>
                  <p>Thank you for your order, ${customerName}</p>
                </div>

                <div class="content">
                  <p class="welcome-text">
                    🥐 Your delicious treats will be prepared fresh and ready for pickup!
                  </p>

                  <div class="card">
                    <h2>Order Summary</h2>
                    <div class="info-row">
                      <span class="label">Order ID</span>
                      <span class="value" style="font-family: monospace; font-size: 12px;">${session.id.slice(0, 24)}...</span>
                    </div>
                    <div class="info-row">
                      <span class="label">Pickup Time</span>
                      <span class="value pickup-time">${pickupTime}</span>
                    </div>
                    <div class="info-row">
                      <span class="label">Customer</span>
                      <span class="value">${customerEmail}</span>
                    </div>
                  </div>

                  <div class="card items-card">
                    <h3>Your Items</h3>
                    ${orderItems.map(item => `
                      <div class="item">
                        <div class="item-header">
                          <span class="item-name">${item.name}</span>
                          <span class="item-total">$${item.total}</span>
                        </div>
                        <div class="item-details">
                          ${item.quantity} × $${item.price} each
                        </div>
                      </div>
                    `).join('')}

                    <div class="total-section">
                      <span class="total-label">Total Paid</span>
                      <span class="total-amount">$${totalAmount}</span>
                    </div>
                  </div>

                  <div class="next-steps">
                    <h3>Pickup Information</h3>
                    <ol>
                      <li><strong>We'll prepare your items fresh</strong> - Your order will be ready at your selected pickup time</li>
                      <li><strong>Visit our bakery:</strong><br>
                          📍 Sunville Bakery<br>
                          4029 Spring Mountain Rd #10<br>
                          Las Vegas, NV 89102<br>
                          📞 (702) 889-8897
                      </li>
                      <li><strong>Bring this confirmation</strong> - Show this email or your order ID when you arrive</li>
                    </ol>
                  </div>

                  <center>
                    <a href="https://sunvillebakerylv.com/menu" class="cta-button">
                      Order More Treats
                    </a>
                  </center>
                </div>

                <div class="footer">
                  <p><strong>Questions?</strong> Contact us at <a href="mailto:sunvillebakerylv@gmail.com">sunvillebakerylv@gmail.com</a></p>
                  <p style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
                    <a href="https://sunvillebakerylv.com">Visit Our Website</a>
                  </p>
                  <p style="color: #9ca3af; font-size: 12px; margin-top: 16px;">
                    © ${new Date().getFullYear()} Sunville Bakery. All rights reserved.<br>
                    Authentic Asian Breads & Pastries since 2002
                  </p>
                </div>
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
