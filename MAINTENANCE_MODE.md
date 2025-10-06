# Maintenance Mode Guide

## Overview

Maintenance mode allows you to temporarily disable ordering on your website while keeping the site visible. Customers will see a maintenance message and won't be able to place orders.

## How It Works

The website checks the `MAINTENANCE_MODE` environment variable:
- `MAINTENANCE_MODE=true` → Site is in maintenance mode (ordering disabled)
- `MAINTENANCE_MODE=false` → Site is normal (ordering enabled)

## Local Development

To enable maintenance mode on your local development server:

1. Open `.env.local`
2. Set `MAINTENANCE_MODE="true"`
3. Restart your dev server

To disable:
1. Set `MAINTENANCE_MODE="false"`
2. Restart your dev server

## Production (Vercel)

### Enabling Maintenance Mode

1. Go to [Vercel Dashboard](https://vercel.com)
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Find `MAINTENANCE_MODE`
5. Click **Edit**
6. Change value to `true`
7. Save
8. **Redeploy** your site:
   - Go to **Deployments** tab
   - Click the three dots on the latest deployment
   - Click **Redeploy**

### Disabling Maintenance Mode

Follow the same steps but set the value to `false`.

## What Happens in Maintenance Mode

When maintenance mode is enabled:
- ✅ Customers can browse the website
- ✅ Customers can view the menu and products
- ✅ Customers can view the gallery
- ❌ Customers **cannot** add items to cart
- ❌ Customers **cannot** checkout
- ⚠️ A maintenance message is displayed

## Admin Panel Note

The admin panel will show instructions for enabling/disabling maintenance mode on Vercel. Since Vercel uses serverless functions, the admin panel cannot directly modify environment variables - you must do it through the Vercel dashboard.

## Testing

To test maintenance mode:
1. Enable maintenance mode (see instructions above)
2. Visit your website
3. Try to add items to cart - it should be disabled
4. Check that the maintenance message appears
5. Disable maintenance mode
6. Verify ordering works again
