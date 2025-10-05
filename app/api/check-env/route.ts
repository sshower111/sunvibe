import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    hasStripeSecret: !!process.env.STRIPE_SECRET_KEY,
    hasStripeWebhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET,
    hasResendKey: !!process.env.RESEND_API_KEY,
    hasNotificationEmail: !!process.env.NOTIFICATION_EMAIL,
    notificationEmail: process.env.NOTIFICATION_EMAIL || 'NOT SET',
  })
}
