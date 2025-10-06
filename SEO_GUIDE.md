# SEO Guide for Sunville Bakery

## ✅ SEO Improvements Implemented

### 1. Meta Tags & Descriptions
- **Title Tags**: Optimized with keywords "Asian Bakery Las Vegas", "Roll Cakes", "Buns"
- **Meta Descriptions**: Clear, compelling descriptions under 160 characters
- **Keywords**: Targeted local and product keywords
- **Open Graph Tags**: For social media sharing (Facebook, LinkedIn)
- **Twitter Cards**: For Twitter sharing with images

### 2. Structured Data (Schema.org)
Added JSON-LD structured data for:
- Business Type: Bakery
- Location: Las Vegas, NV
- Opening Hours: Different hours for Wednesday
- Menu Link
- Payment Methods
- Price Range

This helps Google show:
- Rich snippets in search results
- Business hours in Google Search
- Location information
- Menu link

### 3. Sitemap & Robots.txt
- **sitemap.xml**: Auto-generated at `/sitemap.xml`
- **robots.txt**: Auto-generated at `/robots.txt`
- Tells search engines which pages to index
- Blocks admin and API routes from indexing

### 4. Page-Specific SEO
Each page has optimized:
- **Homepage**: Main landing page with bakery info
- **Menu**: Product catalog with shopping
- **Gallery**: Photo gallery

## 📋 Next Steps for Better SEO

### Required: Add to Vercel
Add this environment variable in Vercel Dashboard:
```
NEXT_PUBLIC_SITE_URL=https://your-actual-domain.com
```

### Highly Recommended

#### 1. Submit to Search Engines
- **Google Search Console**: https://search.google.com/search-console
  - Submit sitemap: `https://your-site.com/sitemap.xml`
  - Verify ownership
  - Monitor search performance

- **Bing Webmaster Tools**: https://www.bing.com/webmasters
  - Submit sitemap
  - Verify ownership

#### 2. Set Up Google My Business
- Create/claim your business listing
- Add photos
- Add hours
- Add menu link to your website
- Respond to reviews

#### 3. Get Verification Codes
After signing up for search console, add codes to `app/layout.tsx`:
```typescript
verification: {
  google: 'your-google-verification-code',
  bing: 'your-bing-verification-code',
}
```

#### 4. Add Your Business Details
Update in `app/layout.tsx`:
- Real phone number (replace `+1-702-XXX-XXXX`)
- Full address if you want it public
- Real business hours if different

### Optional but Helpful

#### 1. Create a Blog
Add `/blog` with content like:
- "5 Best Asian Pastries to Try"
- "What Makes Japanese Roll Cake Special"
- "History of Mooncakes"

This helps with SEO and customer engagement.

#### 2. Get Backlinks
- List on Yelp, Google Maps
- Partner with local food bloggers
- Get featured in local news/magazines

#### 3. Social Media
- Share your products on Instagram/Facebook
- Link back to your website
- Use location tags

#### 4. Customer Reviews
- Encourage customers to leave reviews
- Respond to all reviews (good and bad)
- Add reviews to your website

## 📊 Monitoring SEO Performance

### Google Search Console
Check these metrics weekly:
- Click-through rate (CTR)
- Average position in search
- Top queries bringing traffic
- Pages with most impressions

### Google Analytics (Optional)
Add Google Analytics to track:
- Visitor sources
- Popular pages
- Conversion rates
- Bounce rates

## 🎯 Target Keywords

Your site is optimized for:
- "Asian bakery Las Vegas"
- "Japanese roll cake Las Vegas"
- "Chinese buns Las Vegas"
- "Fresh pastries Las Vegas"
- "Bakery near me" (local searches)
- "Mooncakes Las Vegas"
- "Asian baked goods"

## 🔍 Local SEO Tips

1. **Consistent NAP** (Name, Address, Phone)
   - Make sure it's identical across all platforms
   - Google, Yelp, Facebook, website

2. **Location Pages**
   - Mention "Las Vegas" naturally in content
   - Add neighborhood names if relevant

3. **Local Content**
   - Blog about local events
   - Mention Vegas in social posts

## ✅ Current SEO Score

Your site now has:
- ✅ Mobile-friendly design
- ✅ Fast loading (Next.js optimization)
- ✅ HTTPS (via Vercel)
- ✅ Structured data
- ✅ Proper meta tags
- ✅ Sitemap
- ✅ Open Graph tags
- ✅ Semantic HTML
- ✅ Alt tags for images (add more on gallery)

## 🚨 Important Notes

1. **NEXT_PUBLIC_SITE_URL**: Must be set in Vercel for production
2. **Phone Number**: Update with real number in layout.tsx
3. **Address**: Add full address if you want local SEO boost
4. **Verification Codes**: Add after setting up Search Console

## 📈 Expected Results

With proper implementation:
- **1-2 weeks**: Site indexed by Google
- **1-2 months**: Start appearing in local searches
- **3-6 months**: Rank higher for target keywords
- **Ongoing**: Consistent content and reviews improve ranking

## Need Help?

Common SEO tasks to do regularly:
1. Update menu with new products (keeps site fresh)
2. Add new photos to gallery
3. Respond to customer reviews
4. Share on social media
5. Monitor Search Console for errors
