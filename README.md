# Sunville Bakery Website

A modern, full-featured bakery website built with Next.js, featuring online ordering through Stripe, admin panel for product management, and maintenance mode.

![Next.js](https://img.shields.io/badge/Next.js-15.2.4-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![Stripe](https://img.shields.io/badge/Stripe-Integrated-purple)

## 🌟 Features

### Customer-Facing Features
- 🍰 **Product Catalog** - Browse bakery items with images and descriptions
- 🛒 **Shopping Cart** - Add items, adjust quantities, view totals
- 💳 **Stripe Checkout** - Secure payment processing
- 📅 **Pickup Time Selection** - Choose ASAP or schedule for later
- 📧 **Order Confirmations** - Automated email receipts
- 🖼️ **Gallery** - Showcase bakery photos
- 📱 **Responsive Design** - Mobile-friendly interface
- 🎨 **Modern UI** - Clean design with Tailwind CSS

### Admin Panel Features
- 🔐 **Secure Authentication** - Password-protected admin access
- 📦 **Product Management** - Toggle visibility and update prices
- 🖼️ **Gallery Management** - Upload and delete images
- 🔧 **Maintenance Mode** - Enable site-wide maintenance with admin bypass
- 💾 **Persistent Login** - Stay logged in across sessions
- 📊 **Product Count** - View total number of items

### Technical Features
- ⚡ **Server-Side Rendering** - Fast page loads with Next.js 15
- 🔒 **Secure Environment Variables** - Server-side API key storage
- 📱 **Progressive Web App** - Installable on mobile devices
- 🎯 **TypeScript** - Type-safe development
- 🪝 **Stripe Webhooks** - Real-time order processing
- 📧 **Email Integration** - Order notifications via Resend

---

## 📋 Table of Contents

- [Quick Start](#-quick-start)
- [Documentation](#-documentation)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Environment Variables](#-environment-variables)
- [Development](#-development)
- [Deployment](#-deployment)
- [Features Guide](#-features-guide)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18.x or higher
- npm or yarn
- Stripe account
- Resend account (for emails)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/sshower111/sunvibe.git
   cd sunville-bakery-redesign
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create environment file:**
   ```bash
   cp .env.example .env.local
   ```

4. **Add your environment variables:**
   ```bash
   # Edit .env.local with your API keys
   ADMIN_PASSWORD=your_admin_password
   STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
   STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
   RESEND_API_KEY=re_your_resend_api_key
   NOTIFICATION_EMAIL=your_email@example.com
   ```

5. **Run development server:**
   ```bash
   npm run dev
   ```

6. **Open in browser:**
   ```
   http://localhost:3000
   ```

---

## 📚 Documentation

Comprehensive documentation available in the `/docs` folder:

- **[Admin Guide](docs/ADMIN_GUIDE.md)** - How to use the admin panel
- **[Deployment Guide](docs/DEPLOYMENT.md)** - Deploy to Vercel with custom domain
- **[Changelog](CHANGELOG.md)** - Version history and updates

---

## 🛠 Tech Stack

### Frontend
- **Next.js 15.2.4** - React framework with App Router
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS framework
- **Radix UI** - Headless UI components
- **Lucide Icons** - Beautiful icon set

### Backend
- **Next.js API Routes** - Serverless API endpoints
- **Stripe API** - Payment processing and product management
- **Resend API** - Email notifications

### Deployment
- **Vercel** - Hosting and continuous deployment
- **GitHub** - Version control and CI/CD

---

## 📁 Project Structure

```
sunville-bakery-redesign/
├── app/
│   ├── admin/              # Admin panel pages
│   │   ├── page.tsx        # Main admin dashboard
│   │   ├── gallery/        # Gallery management
│   │   └── menu/           # Menu editor
│   ├── api/                # API routes
│   │   ├── admin/          # Admin endpoints
│   │   ├── checkout/       # Stripe checkout
│   │   ├── products/       # Product data
│   │   ├── gallery/        # Image management
│   │   └── webhook/        # Stripe webhooks
│   ├── menu/               # Menu page
│   ├── gallery/            # Gallery page
│   ├── contact/            # Contact page
│   ├── about/              # About page
│   └── layout.tsx          # Root layout
├── components/
│   ├── ui/                 # Reusable UI components
│   ├── navigation.tsx      # Site navigation
│   ├── footer.tsx          # Site footer
│   ├── cart-sheet.tsx      # Shopping cart
│   ├── maintenance-check.tsx # Maintenance mode wrapper
│   └── pickup-time-alert.tsx # Custom alert modal
├── contexts/
│   └── cart-context.tsx    # Global cart state
├── lib/
│   └── utils.ts            # Utility functions
├── public/
│   ├── gallery/            # Gallery images
│   ├── sitelogo.png        # Site logo
│   └── ...                 # Static assets
├── docs/                   # Documentation
├── .env.local              # Environment variables (not in git)
├── maintenance.json        # Maintenance mode state
└── package.json            # Dependencies
```

---

## 🔐 Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `ADMIN_PASSWORD` | Admin panel password | `sunville2024` |
| `STRIPE_SECRET_KEY` | Stripe API secret key | `sk_test_...` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key | `pk_test_...` |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret | `whsec_...` |
| `RESEND_API_KEY` | Resend email API key | `re_...` |
| `NOTIFICATION_EMAIL` | Email for order notifications | `your@email.com` |

### Local Development

Create `.env.local` in project root:

```bash
ADMIN_PASSWORD=your_admin_password
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
RESEND_API_KEY=re_your_resend_api_key
NOTIFICATION_EMAIL=your_email@example.com
```

### Production (Vercel)

Add variables in Vercel Dashboard → Settings → Environment Variables

> See [Deployment Guide](docs/DEPLOYMENT.md) for detailed instructions.

---

## 💻 Development

### Available Scripts

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run TypeScript type checking
npm run type-check

# Lint code
npm run lint
```

### Development Workflow

1. **Create a new branch:**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make changes and test locally:**
   ```bash
   npm run dev
   ```

3. **Commit changes:**
   ```bash
   git add .
   git commit -m "Description of changes"
   ```

4. **Push to GitHub:**
   ```bash
   git push origin feature/your-feature-name
   ```

5. **Create pull request** on GitHub

6. **Merge to main** after review

7. **Automatic deployment** to Vercel

---

## 🚀 Deployment

### Deploy to Vercel

1. **Push code to GitHub**
2. **Import project** in Vercel dashboard
3. **Add environment variables** in Vercel settings
4. **Deploy** (automatic on push to main)

### Custom Domain

1. Add domain in Vercel → Settings → Domains
2. Update DNS records with your registrar
3. Wait for SSL certificate provisioning

> See [Deployment Guide](docs/DEPLOYMENT.md) for complete instructions.

---

## 📖 Features Guide

### Admin Panel (`/admin`)

**Login:**
- Navigate to `https://yourdomain.com/admin`
- Enter password: `sunville2024`
- Click Login

**Manage Products:**
- View all products from Stripe
- Toggle product visibility (active/inactive)
- Update prices in real-time
- Changes reflect immediately on site

**Manage Gallery:**
- Upload new images (JPG, PNG, WebP)
- Delete existing images
- Images appear in gallery page

**Maintenance Mode:**
- Toggle maintenance mode ON/OFF
- Shows maintenance page to visitors
- Admin can still access `/admin`

> See [Admin Guide](docs/ADMIN_GUIDE.md) for detailed instructions.

### Customer Flow

1. **Browse Menu** - View products on menu page
2. **Select Pickup Time** - Choose ASAP or schedule later
3. **Add to Cart** - Click + button on products
4. **Review Cart** - Open cart sheet, adjust quantities
5. **Checkout** - Proceed to Stripe checkout
6. **Payment** - Enter payment details on Stripe
7. **Confirmation** - Receive email confirmation

### Pickup Time Validation

- Users must select pickup time before checkout
- "ASAP" available only when store is open
- "Later" requires both date and time selection
- Custom modal alerts for validation errors

---

## 🧪 Testing

### Test Stripe Integration

Use Stripe test cards:
- **Success:** `4242 4242 4242 4242`
- **Decline:** `4000 0000 0000 0002`
- **3D Secure:** `4000 0025 0000 3155`

Any future expiry date and any 3-digit CVC works.

### Test Email Notifications

1. Complete test order
2. Check `NOTIFICATION_EMAIL` inbox
3. Verify order details in email

### Test Admin Panel

1. Login at `/admin`
2. Toggle product visibility
3. Update product price
4. Upload/delete gallery image
5. Enable/disable maintenance mode

---

## 🔧 Troubleshooting

### Common Issues

**Products not showing:**
- Check Stripe API keys
- Verify products are active in Stripe
- Check browser console for errors

**Admin panel won't load:**
- Verify `ADMIN_PASSWORD` is set
- Check environment variables in Vercel
- Clear browser localStorage

**Checkout not working:**
- Check Stripe publishable key
- Verify pickup time is selected
- Check browser console for errors

**Images not uploading:**
- Check file size (max 10MB)
- Verify file format (JPG, PNG, WebP)
- Check admin password authentication

> See [Deployment Guide](docs/DEPLOYMENT.md) for more troubleshooting.

---

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

### Code Style

- Use TypeScript for type safety
- Follow existing code formatting
- Add comments for complex logic
- Update documentation for new features

---

## 📄 License

This project is proprietary software for Sunville Bakery.

---

## 📞 Contact

**Sunville Bakery**
- Address: 4053 Spring Mountain Rd, Las Vegas, NV 89102
- Phone: 702-889-8897
- Email: sunvillebakerylv@gmail.com

**Technical Support**
- GitHub Issues: [Create an issue](https://github.com/sshower111/sunvibe/issues)
- Repository: https://github.com/sshower111/sunvibe.git

---

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org)
- Payments by [Stripe](https://stripe.com)
- Hosted on [Vercel](https://vercel.com)
- Emails by [Resend](https://resend.com)
- UI components by [Radix UI](https://radix-ui.com)
- Icons by [Lucide](https://lucide.dev)

---

**Last Updated:** October 6, 2025
**Version:** 1.0.0

🤖 Generated with [Claude Code](https://claude.com/claude-code)
