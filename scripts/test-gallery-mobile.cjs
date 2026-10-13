const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
(async () => {
 const browser = await chromium.launch({ channel: 'msedge', headless: true });
 try {
 const page = await browser.newPage({viewport:{width:390,height:844}});
 await page.addInitScript(() => {localStorage.setItem('sunville-admin-auth','true');localStorage.setItem('sunville-admin-password','test-only');});
 let uploads=0, saves=0;
 await page.route('**/api/**', async route => {
  const request=route.request(), path=new URL(request.url()).pathname;
  if(path==='/api/gallery/upload') {
   const body=request.postDataBuffer();assert.ok(body.includes(Buffer.from('image/jpeg'))); assert.ok(body.length<3*1024*1024+2000);uploads++;
   return route.fulfill({json:{url:'https://example.com/photo'+uploads+'.jpg'}});
  }
  if(path==='/api/gallery' && request.method()==='POST') saves++;
  return route.fulfill({json:path==='/api/gallery'?{images:[]}:{products:[],source:'supabase'}});
 });
 await page.goto('http://localhost:3003/admin',{waitUntil:'domcontentloaded'});
 await page.getByRole('button',{name:'Gallery',exact:true}).click();
 const png = await page.evaluate(() => { const c=document.createElement('canvas');c.width=4000;c.height=3000;return c.toDataURL('image/png').split(',')[1] });
 await page.locator('input[type=file]').setInputFiles([
 {name:'phone.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')},
 {name:'iphone.heic',mimeType:'image/heic',buffer:fs.readFileSync('.local-data/upload-test/example.heic')},
 {name:'broken.jpg',mimeType:'image/jpeg',buffer:Buffer.from('broken')}
 ]);
 await page.getByRole('status').filter({hasText:'2 of 3 photos added'}).waitFor({timeout:120000});
 assert.equal(uploads,2);assert.equal(saves,2);
 assert.ok(await page.getByText('broken.jpg:',{exact:false}).isVisible());
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 assert.ok((await page.getByRole('button',{name:'Add photos',exact:true}).boundingBox()).height>=48);
 await page.screenshot({path:'.local-data/upload-test/mobile.png',fullPage:true});
 console.log('PASS: 390px layout, PNG resizing, real HEIC conversion, automatic batch save, corrupt-photo feedback; no live uploads.');
 } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exit(1)});
