# Sunville Bakery - Admin Panel Guide

## Accessing the Admin Panel

Navigate to: `https://yourdomain.com/admin`

**Password:** Contact your administrator for the admin password

> **Security Note:** The admin password is stored securely as a server-side environment variable and is never exposed to the client browser.

---

## Features Overview

The admin panel has three main tabs:

1. **Menu** - Manage products and pricing
2. **Gallery** - Upload and manage gallery images
3. **Settings** - Site-wide settings and maintenance mode

---

## Menu Tab - Product Management

### View Products
- Displays all products synced from Stripe
- Shows total item count at the top
- Each product shows:
  - Product image
  - Name
  - Current price
  - Category
  - Active/Inactive status

### Toggle Product Visibility
- Click the **Toggle** button to activate/deactivate products
- Inactive products won't appear on the public menu
- Status updates immediately
- Changes sync to Stripe

### Update Prices
1. Enter new price in the input field (numbers only, no $ symbol)
2. Click **Update Price** button
3. Price updates in Stripe and reflects on site immediately
4. Example: Enter `12.99` for $12.99

### Important Notes
- All changes are immediate and affect the live site
- Products must exist in Stripe first
- Deleting products must be done in Stripe dashboard
- Price changes update both Stripe and the website

---

## Gallery Tab - Image Management

### Upload Images
1. Click **Choose File** button
2. Select an image from your computer (JPG, PNG, WebP supported)
3. Click **Upload** button
4. Image appears in gallery grid immediately

### Delete Images
1. Find the image you want to delete in the grid
2. Click the **Delete** button below the image
3. Confirm deletion (image is permanently removed)
4. Image removed from both server and database

### Image Guidelines
- **Recommended size:** 1200x800px or similar aspect ratio
- **Max file size:** 10MB
- **Formats:** JPG, PNG, WebP
- **Orientation:** Landscape works best for gallery layout

---

## Settings Tab - Site Configuration

### Maintenance Mode

**What it does:**
- Displays a maintenance page to all visitors
- Shows bakery logo, message, and contact info
- Admin can still access `/admin` during maintenance
- All other pages are blocked

**How to use:**
1. Toggle the **Maintenance Mode** switch to ON
2. Site immediately enters maintenance mode
3. Visit your site to see the maintenance page
4. Admin panel remains accessible at `/admin`
5. Toggle OFF to restore normal operation

**Use cases:**
- Performing major updates
- Troubleshooting site issues
- Temporarily closing online orders
- Updating product inventory

---

## Admin Panel Tips

### Staying Logged In
- Your login persists across browser sessions
- Uses secure localStorage storage
- Click **Logout** to end session
- Password required again after logout

### Security Best Practices
1. Never share your admin password
2. Always logout when using shared computers
3. Use a strong, unique password
4. Change password periodically (update in `.env.local` and Vercel)

### Troubleshooting

**Products not loading:**
- Check Stripe API keys in environment variables
- Verify internet connection
- Check browser console for errors

**Can't upload images:**
- Check file size (max 10MB)
- Ensure file is an image (JPG, PNG, WebP)
- Verify admin password is correct

**Logged out unexpectedly:**
- Browser localStorage may have been cleared
- Simply log in again with password

**Changes not showing on live site:**
- Hard refresh browser (Ctrl+F5 or Cmd+Shift+R)
- Clear browser cache
- Changes are immediate, no deployment needed

---

## Product Management Workflow

### Adding New Products
1. Go to [Stripe Dashboard](https://dashboard.stripe.com/products)
2. Click **Add Product**
3. Enter product details (name, price, description)
4. Upload product image
5. Save product in Stripe
6. Product automatically appears in admin panel
7. Toggle ON to make visible on site

### Updating Product Information
**To update prices:**
- Use admin panel Menu tab (preferred)
- Or update in Stripe dashboard

**To update name, description, image:**
- Must be done in Stripe dashboard
- Changes reflect automatically on site

### Removing Products
1. Go to Stripe Dashboard
2. Archive the product
3. Product will no longer appear in admin panel or on site

---

## Gallery Management Workflow

### Building Your Gallery
1. Prepare high-quality images
2. Resize to ~1200px width (recommended)
3. Upload one at a time or in batches
4. Arrange by deleting/re-uploading if needed

### Seasonal Updates
1. Delete old seasonal images
2. Upload new seasonal content
3. Changes appear immediately on gallery page

---

## Environment Variables (for developers)

Required in `.env.local` and Vercel:

```bash
# Admin authentication
ADMIN_PASSWORD=sunville2024

# Stripe API
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Email notifications
RESEND_API_KEY=re_...
NOTIFICATION_EMAIL=sunvillebakerylv@gmail.com
```

**After updating environment variables in Vercel:**
1. Go to Vercel dashboard
2. Settings → Environment Variables
3. Update the variable
4. Trigger a new deployment (Settings → Deployments → Redeploy)

---

## Support

For technical issues or questions:
- Check CHANGELOG.md for recent updates
- Review error messages in browser console
- Contact your web developer
- Refer to Stripe documentation for product issues

---

**Last Updated:** October 6, 2025
**Version:** 1.0
