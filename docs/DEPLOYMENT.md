# Deployment Guide - Sunville Bakery

## Prerequisites

- GitHub account with repository access
- Vercel account connected to GitHub
- Stripe account with API keys
- Resend account for email notifications

---

## Environment Variables Setup

### 1. Local Development (`.env.local`)

Create a `.env.local` file in the root directory:

```bash
# Admin Panel
ADMIN_PASSWORD=your_admin_password

# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Email Configuration (Resend)
RESEND_API_KEY=re_your_resend_api_key
NOTIFICATION_EMAIL=your_email@example.com
```

> **Important:** Never commit `.env.local` to git. It's in `.gitignore` by default.

### 2. Vercel Production Environment

Add these environment variables in Vercel Dashboard:

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Navigate to **Settings** → **Environment Variables**
4. Add each variable one by one:

| Variable Name | Value | Environments |
|--------------|-------|--------------|
| `ADMIN_PASSWORD` | `your_admin_password` | Production, Preview, Development |
| `STRIPE_SECRET_KEY` | `sk_test_...` (or `sk_live_...` for production) | Production, Preview, Development |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_test_...` (or `pk_live_...` for production) | Production, Preview, Development |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` | Production, Preview, Development |
| `RESEND_API_KEY` | `re_...` | Production, Preview, Development |
| `NOTIFICATION_EMAIL` | `your_email@example.com` | Production, Preview, Development |

5. Click **Save** after adding each variable
6. **Redeploy** the site after adding all variables

---

## Deployment Steps

### Initial Deployment

1. **Push code to GitHub:**
   ```bash
   git add .
   git commit -m "Your commit message"
   git push origin main
   ```

2. **Connect to Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Click **Add New Project**
   - Import your GitHub repository
   - Select **Next.js** framework preset
   - Click **Deploy**

3. **Add Environment Variables** (see section above)

4. **Redeploy** after adding environment variables

### Updating the Site

After making code changes:

1. **Commit and push:**
   ```bash
   git add .
   git commit -m "Description of changes"
   git push origin main
   ```

2. **Automatic deployment:**
   - Vercel automatically deploys when you push to `main` branch
   - Check deployment status in Vercel Dashboard
   - Deployment usually takes 1-2 minutes

3. **Manual deployment (if needed):**
   - Go to Vercel Dashboard → Your Project
   - Click **Deployments** tab
   - Find latest deployment
   - Click **⋯** → **Redeploy**

---

## Stripe Webhook Setup

For order notifications to work in production:

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/webhooks)
2. Click **Add endpoint**
3. Enter your webhook URL:
   ```
   https://your-domain.vercel.app/api/webhook
   ```
4. Select events to listen for:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
5. Click **Add endpoint**
6. Copy the **Signing secret** (starts with `whsec_`)
7. Add it to Vercel environment variables as `STRIPE_WEBHOOK_SECRET`
8. Redeploy the site

---

## Custom Domain Setup

### Adding a Custom Domain

1. Go to Vercel Dashboard → Your Project
2. Click **Settings** → **Domains**
3. Enter your domain name (e.g., `sunvillebakery.com`)
4. Click **Add**

### DNS Configuration

If your domain is registered elsewhere:

1. Go to your domain registrar (GoDaddy, Namecheap, etc.)
2. Update DNS settings:
   - **A Record:** Point to Vercel's IP: `76.76.21.21`
   - **CNAME Record:** `www` → `cname.vercel-dns.com`
3. Wait for DNS propagation (up to 48 hours, usually faster)
4. Vercel automatically provisions SSL certificate

---

## Post-Deployment Checklist

After deploying, verify these features:

- [ ] Homepage loads correctly
- [ ] Menu page displays products from Stripe
- [ ] Cart functionality works
- [ ] Checkout redirects to Stripe
- [ ] Gallery images load
- [ ] Contact page form works
- [ ] Admin panel accessible at `/admin`
- [ ] Admin login works with password
- [ ] Product toggle/price update works in admin
- [ ] Gallery upload/delete works in admin
- [ ] Maintenance mode toggle works
- [ ] Email notifications arrive for orders

---

## Troubleshooting Deployment Issues

### Build Fails

**Error:** `Module not found` or `Cannot find module`
```bash
# Solution: Install missing dependencies locally
npm install
git add package.json package-lock.json
git commit -m "Update dependencies"
git push
```

### Environment Variables Not Working

**Symptoms:** Admin panel won't load, Stripe products missing, emails not sending

**Solution:**
1. Verify all environment variables are set in Vercel
2. Check for typos in variable names
3. Ensure variables are applied to correct environments
4. Redeploy after adding/updating variables

### Stripe Products Not Showing

**Possible causes:**
- Wrong Stripe API keys (test vs. live)
- Stripe API key not set in Vercel
- Products not marked as "Active" in Stripe
- Network/CORS issues

**Solution:**
1. Check Stripe Dashboard → API Keys
2. Verify correct keys in Vercel environment variables
3. Ensure products are active in Stripe
4. Check browser console for errors

### Webhook Not Triggering

**Symptoms:** Orders go through but no email notifications

**Solution:**
1. Verify webhook endpoint in Stripe Dashboard
2. Check webhook signing secret matches `STRIPE_WEBHOOK_SECRET`
3. Test webhook in Stripe Dashboard → Webhooks → Test
4. Check Vercel function logs for errors

### Images Not Loading

**Solution:**
1. Check image paths are correct
2. Verify images are in `public/` directory
3. Check Next.js Image component usage
4. Clear browser cache

---

## Monitoring & Logs

### Vercel Logs

1. Go to Vercel Dashboard → Your Project
2. Click **Deployments**
3. Click on specific deployment
4. View **Build Logs** and **Function Logs**

### Error Tracking

Check these logs for issues:
- **Build Logs:** Compilation errors
- **Function Logs:** API route errors
- **Real-time Logs:** Runtime errors

### Performance Monitoring

Vercel provides built-in analytics:
- Go to **Analytics** tab
- View page load times
- Monitor Core Web Vitals
- Check function execution times

---

## Rollback Procedure

If a deployment breaks the site:

1. Go to Vercel Dashboard → **Deployments**
2. Find the last working deployment
3. Click **⋯** → **Promote to Production**
4. Confirm promotion
5. Site rolls back to previous version immediately

---

## Backup & Recovery

### Database Backup
- Product data is stored in Stripe (automatically backed up)
- Gallery images stored in `public/gallery/` (commit to git)
- No separate database backup needed

### Code Backup
- Code automatically backed up in GitHub
- All commits are preserved
- Can revert to any previous commit

### Environment Variables Backup
- Keep a secure copy of `.env.local` file locally
- Document all Vercel environment variables
- Store in password manager or secure location

---

## Security Best Practices

1. **Never commit sensitive data:**
   - API keys
   - Passwords
   - Secret keys

2. **Use environment variables:**
   - All secrets in `.env.local` and Vercel
   - Never hardcode in source code

3. **Rotate credentials periodically:**
   - Change admin password every 3-6 months
   - Regenerate API keys if compromised

4. **Monitor access:**
   - Check Vercel deployment logs
   - Review Stripe webhook logs
   - Monitor for suspicious admin activity

5. **Use test mode in development:**
   - Always use Stripe test keys locally
   - Switch to live keys only in production

---

## Contact & Support

**Technical Issues:**
- Check [Next.js Documentation](https://nextjs.org/docs)
- Check [Vercel Documentation](https://vercel.com/docs)
- Check [Stripe Documentation](https://stripe.com/docs)

**Repository:**
- GitHub: https://github.com/sshower111/sunvibe.git

**Services:**
- Vercel: https://vercel.com
- Stripe: https://stripe.com
- Resend: https://resend.com

---

**Last Updated:** October 6, 2025
**Next.js Version:** 15.2.4
**Node Version:** 18.x or higher
