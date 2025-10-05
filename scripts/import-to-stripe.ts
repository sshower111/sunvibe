import Stripe from 'stripe'
import { parse } from 'csv-parse/sync'
import * as fs from 'fs'
import * as path from 'path'
import * as https from 'https'
import * as dotenv from 'dotenv'

// Load environment variables from parent directory
const envPath = path.join(__dirname, '..', '.env.local')
dotenv.config({ path: envPath })

if (!process.env.STRIPE_SECRET_KEY) {
  console.error('❌ STRIPE_SECRET_KEY not found in .env.local')
  process.exit(1)
}

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
})

interface MenuRow {
  Category: string
  'Name (Enlgish)': string
  'Name (Chinese)': string
  Price: string
  'Image URL': string
}

// Function to fetch direct image URL from ImgBB short link
async function getDirectImageUrl(shortUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    https.get(shortUrl, (res) => {
      let data = ''
      res.on('data', (chunk) => {
        data += chunk
      })
      res.on('end', () => {
        // Extract the direct image URL from the HTML
        const match = data.match(/property="og:image"\s+content="([^"]+)"/)
        if (match && match[1]) {
          resolve(match[1])
        } else {
          reject(new Error(`Could not extract image URL from ${shortUrl}`))
        }
      })
    }).on('error', (err) => {
      reject(err)
    })
  })
}

async function importProducts() {
  console.log('🚀 Starting Stripe product import...\n')

  // Read CSV file
  const csvPath = path.join(process.cwd(), '..', 'Menu & Price - Sheet1 (2).csv')
  const csvContent = fs.readFileSync(csvPath, 'utf-8')

  // Parse CSV
  const records: MenuRow[] = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
  })

  console.log(`📋 Found ${records.length} products to import\n`)

  // Import each product
  for (const record of records) {
    const category = record.Category.trim()
    const englishName = record['Name (Enlgish)'].trim()
    const chineseName = record['Name (Chinese)'].trim()
    const price = parseFloat(record.Price)
    const shortImageUrl = record['Image URL'].trim()

    const productName = `${englishName} ${chineseName}`

    try {
      // Check if product already exists
      const existingProducts = await stripe.products.search({
        query: `name:"${productName}"`,
      })

      let directImageUrl = ''

      // Only fetch image if URL is provided
      if (shortImageUrl) {
        console.log(`🔗 Fetching image for "${productName}"...`)
        try {
          directImageUrl = await getDirectImageUrl(shortImageUrl)
          console.log(`   ✓ Image URL: ${directImageUrl}`)
        } catch (error) {
          console.log(`   ⚠️  Could not fetch image, will use placeholder`)
        }
      }

      if (existingProducts.data.length > 0) {
        // Update existing product
        console.log(`🔄 Updating "${productName}"...`)
        const product = existingProducts.data[0]

        // Update product metadata and images
        await stripe.products.update(product.id, {
          name: productName,
          description: `Freshly baked ${englishName.toLowerCase()} made daily with traditional techniques`,
          ...(directImageUrl && { images: [directImageUrl] }),
          metadata: {
            category: category,
            englishName: englishName,
            chineseName: chineseName,
          },
        })

        // Check if price needs updating
        const currentPrice = product.default_price as string
        if (currentPrice) {
          const priceObj = await stripe.prices.retrieve(currentPrice)
          const currentAmount = priceObj.unit_amount || 0
          const newAmount = Math.round(price * 100)

          if (currentAmount !== newAmount) {
            // Create new price and set as default
            const newPrice = await stripe.prices.create({
              product: product.id,
              unit_amount: newAmount,
              currency: 'usd',
            })

            await stripe.products.update(product.id, {
              default_price: newPrice.id,
            })

            // Archive old price
            await stripe.prices.update(currentPrice, { active: false })
            console.log(`   ✓ Updated price from $${(currentAmount / 100).toFixed(2)} to $${price.toFixed(2)}`)
          }
        }

        console.log(`   ✓ Updated "${productName}"\n`)
        continue
      }

      // Create product
      console.log(`📦 Creating product "${productName}"...`)
      const product = await stripe.products.create({
        name: productName,
        description: `Freshly baked ${englishName.toLowerCase()} made daily with traditional techniques`,
        ...(directImageUrl && { images: [directImageUrl] }),
        metadata: {
          category: category,
          englishName: englishName,
          chineseName: chineseName,
        },
      })

      // Create price
      const stripePrice = await stripe.prices.create({
        product: product.id,
        unit_amount: Math.round(price * 100), // Convert to cents
        currency: 'usd',
      })

      // Set as default price
      await stripe.products.update(product.id, {
        default_price: stripePrice.id,
      })

      console.log(`   ✓ Created "${productName}" - $${price.toFixed(2)}`)
      console.log(`   ✓ Product ID: ${product.id}\n`)

    } catch (error) {
      console.error(`❌ Error importing "${productName}":`, error)
    }
  }

  console.log('✅ Import complete!')
}

// Run import
importProducts().catch(console.error)
