# Changelog

All notable changes to the Sunville Bakery website will be documented in this file.

## [Latest] - 2025-10-06

### Fixed
- **Pickup Time Selector**: Past times are now hidden when today's date is selected
  - If it's 9:15 AM and you select today, only times from 9:30 AM onwards will show
  - Future dates still show all available times
  - Still respects Wednesday hours (8 AM - 3 PM) vs regular hours (8 AM - 8 PM)

- **Maintenance Mode on Vercel**: Updated to use environment variables instead of file system
  - To enable/disable maintenance mode on live site:
    1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
    2. Update `MAINTENANCE_MODE` to `true` or `false`
    3. Redeploy the site
  - Local development still works with `.env.local`

### Changed
- Removed product sync functionality (one-time sync already completed)
  - Removed sync button from admin panel
  - Removed sync API endpoint
  - Removed sync scripts
  - Products are now managed separately in test and live Stripe accounts

### Added
- Products synced from test to live Stripe account (51 products total)
  - All categories: Roll Cakes, Traditional Pastries & Mooncakes, Sponge Cakes, Breads, Buns
  - Both test and live accounts now have identical products

## [Previous] - 2025-10-05

### Added
- Product descriptions to menu page
- Fixed caching issues
- Pickup time in order emails
- Customer order confirmation emails
- Cart clearing after successful checkout

### Fixed
- Order email formatting
- Checkout flow

## Initial Release

### Features
- Homepage with bakery information
- Menu page with product catalog and shopping cart
- Gallery page with photo grid
- Admin panel for managing:
  - Products (show/hide, price updates)
  - Gallery images
  - Maintenance mode
- Stripe checkout integration
- Order confirmation emails via Resend
- Responsive design for mobile and desktop
