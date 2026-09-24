/* Run with PLAYWRIGHT_PATH pointing to the Playwright package and AXE_PATH to axe.min.js.
   BASE_URL may target an isolated production server. No forms are submitted. */
const assert = require('node:assert/strict')
const fs = require('node:fs')
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright')
const base = process.env.BASE_URL || 'http://127.0.0.1:3000'
const routes = ['/', '/menu', '/custom-cakes', '/gallery', '/contact']
;(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true })
  try {
    const nojs = await browser.newContext({ javaScriptEnabled: false })
    const page = await nojs.newPage()
    const titles = new Set()
    for (const route of routes) {
      const response = await page.goto(base + route + '?utm_source=seo-check', { waitUntil: 'domcontentloaded' })
      assert.equal(response.status(), 200)
      assert.ok(!(response.headers()['content-security-policy'] || '').includes('chatbase'))
      assert.ok(!(await response.text()).includes('embeddedChatbotConfig'))
      assert.equal(await page.locator('h1').count(), 1)
      assert.match(await page.locator('h1').innerText(), /Las Vegas/i)
      assert.equal(await page.locator('main').count(), 1)
      assert.equal(await page.locator('header nav').count() > 0, true)
      const canonical = await page.locator('link[rel="canonical"]').getAttribute('href')
      assert.equal(canonical.replace(/\/$/, ''), ('https://sunvillebakerylv.com' + route).replace(/\/$/, ''))
      titles.add(await page.title())
      for (const selector of ['meta[name="description"]', 'meta[property="og:title"]', 'meta[property="og:description"]', 'meta[property="og:image"]', 'meta[name="twitter:card"]']) assert.equal(await page.locator(selector).count(), 1, route + selector)
      const schemas = await page.locator('script[type="application/ld+json"]').allTextContents()
      for (const raw of schemas) assert.ok(JSON.parse(raw))
      assert.ok(schemas.some(raw => raw.includes('GeoCoordinates')))
      if (route !== '/') assert.ok(schemas.some(raw => raw.includes('BreadcrumbList')))
      if (route === '/menu') assert.ok(await page.locator('article.menu-card').count() > 0)
      if (route === '/custom-cakes') {
        const graph = schemas.map(JSON.parse).find(schema => schema['@graph'])['@graph']
        assert.equal(graph.find(schema => schema['@type'] === 'ItemList').itemListElement.length, 23)
      }
      assert.equal(await page.locator('img:not([alt])').count(), 0)
      console.log('PASS SSR, metadata, landmarks, schema:', route)
    }
    assert.equal(titles.size, 5)
    for (const route of ['/admin', '/admin/menu', '/admin/gallery', '/checkout/success']) {
      await page.goto(base + route, { waitUntil: 'domcontentloaded' })
      assert.match(await page.locator('meta[name="robots"]').getAttribute('content'), /noindex/)
    }
    const sitemap = await (await page.request.get(base + '/sitemap.xml')).text()
    for (const route of routes) assert.ok(sitemap.includes('https://sunvillebakerylv.com' + route))
    assert.ok(!sitemap.includes('/admin'))
    assert.match(await (await page.request.get(base + '/robots.txt')).text(), /Sitemap: https:\/\/sunvillebakerylv.com\/sitemap.xml/)
    const og = await page.request.get(base + '/og')
    assert.equal(og.status(), 200)
    assert.match(og.headers()['content-type'], /image\/png/)
    const ogBytes = await og.body()
    assert.equal(ogBytes.readUInt32BE(16), 1200)
    assert.equal(ogBytes.readUInt32BE(20), 630)
    assert.equal((await page.request.post(base + '/api/chatbase/identify', { data: { userId: 'removed-widget-test' } })).status(), 404)
    const results = []
    for (const width of [390, 1280]) {
      const context = await browser.newContext({ viewport: { width, height: 900 } })
      const p = await context.newPage()
      const chatbotRequests = []
      p.on('request', request => { if (/chatbase/i.test(request.url())) chatbotRequests.push(request.url()) })
      for (const route of routes) {
        await p.goto(base + route, { waitUntil: 'domcontentloaded' })
        await p.locator('h1').waitFor()
        // A working React event proves hydration completed before keyboard/axe checks.
        await p.waitForTimeout(600)
        assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), route + ' horizontal overflow')
        if (process.env.AXE_PATH) {
          await p.evaluate(fs.readFileSync(process.env.AXE_PATH, 'utf8'))
          const report = await p.evaluate(async () => await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }))
          results.push({ route, width, violations: report.violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.map(n => n.target) })) })
        }
      }
      await p.goto(base + '/menu', { waitUntil: 'domcontentloaded' })
      await p.getByRole('button', { name: 'Savory Buns', exact: true }).click()
      assert.ok(await p.locator('.menu-card').count() > 0)
      await p.locator('.menu-card button').first().click()
      assert.equal(await p.getByRole('dialog').count(), 1)
      await p.keyboard.press('Escape')
      await p.getByRole('button', { name: 'Custom Cakes', exact: true }).click()
      assert.equal(await p.locator('#custom-menu-title').count(), 1)
      await p.goto(base + '/', { waitUntil: 'domcontentloaded' })
      await p.keyboard.press('Tab')
      assert.equal(await p.locator(':focus').textContent(), 'Skip to main content')
      await p.keyboard.press('Enter')
      assert.equal(await p.locator(':focus').getAttribute('id'), 'main-content')
      assert.deepEqual(chatbotRequests, [], 'No chatbot network requests should remain')
      await context.close()
    }
    console.log(JSON.stringify(results, null, 2))
    assert.ok(results.every(result => result.violations.length === 0), 'Accessibility violations remain; see report above')
    console.log('PASS private noindex, sitemap, robots, 1200x630 OG, mobile/desktop overflow, keyboard and menu interactions')
  } finally { await browser.close() }
})().catch(error => { console.error(error); process.exitCode = 1 })
