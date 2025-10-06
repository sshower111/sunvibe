# Changelog

All notable changes to the Sunville Bakery website will be documented in this file.

## [Unreleased]

## [2025-10-06] - Admin Panel & Pickup Time Validation

### Added

#### Admin Panel (`/admin`)
- **Product Management Tab**
  - View all products from Stripe with item count display
  - Toggle product visibility (active/inactive)
  - Update product prices in real-time
  - Products sync automatically with Stripe API
  - Shows product images, names, prices, and categories

- **Gallery Management Tab**
  - Upload new gallery images
  - Delete existing gallery images
  - Preview all gallery images in grid layout

- **Settings Tab**
  - Maintenance mode toggle
  - Enable/disable site-wide maintenance
  - Admin can still access admin panel during maintenance

- **Authentication**
  - Persistent login using localStorage
  - Logout button to clear session
  - Password verification via secure API endpoint
  - Server-side password storage (not exposed to client)

#### Maintenance Mode
- Site-wide maintenance mode toggle from admin panel
- Custom maintenance page with bakery branding
- Displays store hours and contact information during maintenance
- Admin routes (`/admin`) bypass maintenance check
- Maintenance state stored in `maintenance.json` file

#### Pickup Time Validation
- Custom modal dialog for validation errors (replaces browser alerts)
- Enforces pickup time selection before checkout
- Validates complete date and time when "Later" is selected
- Prevents checkout with incomplete pickup information
- Clear error messages directing users to Menu page

#### UI Components
- `PickupTimeAlert` component - Custom styled modal matching site design
  - Clock icon in accent color
  - Centered layout with branded styling
  - "Got it" button for dismissal

- `MaintenanceCheck` component - Wraps entire app
  - Shows maintenance page when enabled
  - Bypasses check for admin routes
  - Displays loading state during check

### Changed

#### Security Improvements
- **CRITICAL:** Changed `NEXT_PUBLIC_ADMIN_PASSWORD` to `ADMIN_PASSWORD`
  - Admin password now server-side only (not exposed to client)
  - Updated all admin API routes to use secure environment variable
  - Affects: `/api/admin/*`, `/api/gallery/*`

#### Pickup Time Flow
- Removed pickup time selector from cart sheet
- Centralized pickup time selection on Menu page only
- Changed default pickupTime from "ASAP" to empty string
- Added localStorage cleanup for invalid pickup time values
- Improved validation to check for "(time not selected)" placeholder

#### API Routes
- `/api/admin/verify` - New endpoint for password verification
- `/api/admin/maintenance` - GET/POST for maintenance mode state
- `/api/admin/products/list` - List all products with authentication
- `/api/admin/products/toggle` - Toggle product active status
- `/api/admin/products/price` - Update product prices
- `/api/gallery/upload` - Upload gallery images with auth
- All admin routes now use server-side `ADMIN_PASSWORD`

### Fixed
- Users can no longer checkout without selecting pickup time
- Validation now properly checks for complete date and time
- Admin panel products now load correctly with persistent auth
- Admin password security vulnerability resolved
- Cart validation now uses custom modal instead of browser alerts

### Technical Details

#### Environment Variables Required
```
ADMIN_PASSWORD=your_admin_password
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
RESEND_API_KEY=re_your_resend_api_key
NOTIFICATION_EMAIL=your_email@example.com
```

#### File Structure Changes
```
app/
  admin/
    page.tsx              # Main admin panel (new)
    menu/page.tsx         # Alternative menu editor (new)
    gallery/page.tsx      # Updated with delete functionality
  api/
    admin/
      verify/route.ts     # Password verification (new)
      maintenance/route.ts # Maintenance mode API (new)
      products/
        list/route.ts     # List products (new)
        toggle/route.ts   # Toggle visibility (new)
        price/route.ts    # Update prices (new)
        route.ts          # Product operations (new)
    gallery/
      upload/route.ts     # Image upload with auth (new)
      route.ts           # Updated with auth

components/
  maintenance-check.tsx   # Maintenance wrapper (new)
  pickup-time-alert.tsx   # Custom alert modal (new)
  cart-sheet.tsx          # Updated with validation

contexts/
  cart-context.tsx        # Updated pickup time handling

maintenance.json          # Maintenance mode state (new)
```

#### localStorage Keys Used
- `sunville-admin-auth` - Boolean string for admin authentication
- `sunville-admin-password` - Encrypted admin password
- `sunville-cart` - Shopping cart items array
- `sunville-pickup-time` - Selected pickup time string

### Deployment Notes

**IMPORTANT:** After deploying to Vercel, you MUST manually add the `ADMIN_PASSWORD` environment variable in Vercel dashboard:

1. Go to Vercel Dashboard → Your Project
2. Settings → Environment Variables
3. Add: `ADMIN_PASSWORD` = `your_admin_password`
4. Apply to: Production, Preview, Development
5. Redeploy the application

### Migration Guide

If upgrading from a previous version:

1. Add `ADMIN_PASSWORD` to your `.env.local` file
2. Remove `NEXT_PUBLIC_ADMIN_PASSWORD` if present
3. Clear browser localStorage to remove old pickup time values:
   ```javascript
   localStorage.removeItem("sunville-pickup-time")
   ```
4. Test admin login at `/admin`
5. Test checkout flow with pickup time validation

### Breaking Changes
- Admin password environment variable name changed
- Pickup time must now be selected on Menu page before checkout
- Browser alerts replaced with custom modal (no functional breaking change)

---

## [2025-09-28] - Previous Updates
- Product descriptions added to menu page
- Caching fixes
- Order email improvements
- Customer confirmation emails
- Cart clearing after checkout
