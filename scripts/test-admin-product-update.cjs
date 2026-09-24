// Run: node scripts/test-admin-product-update.cjs. Stripe is mocked; no real product changes.
const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict'), ts = require('typescript')
const code = ts.transpileModule(fs.readFileSync('app/api/admin/products/update/route.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText
let events, existing, failCreate, failUpdate, saved, cacheTags
function reset() { events=[]; saved=null; cacheTags=[]; failCreate=false; failUpdate=false; existing={id:'price_old',currency:'usd',type:'one_time',billing_scheme:'per_unit',unit_amount:350} }
const stripe = { products: {
  retrieve: async id => { events.push(['retrieve',id]); return {id,name:'Old bun',description:'Old description',default_price:existing} },
  update: async (id,data,options) => { events.push(['update',id,data,options]); if(failUpdate)throw Error('mock failure');saved={id,...data};return saved },
}, prices: { create: async (data,options) => { events.push(['create',data,options]);if(failCreate)throw Error('mock failure');return {id:'price_new'} } } }
const moduleObj={exports:{}}
const env={ADMIN_PASSWORD:'test-only'}
vm.runInNewContext(code,{module:moduleObj,exports:moduleObj.exports,process:{env},console,require:name=>name==='@/lib/stripe'?{stripe}:name==='next/cache'?{revalidateTag:tag=>cacheTags.push(tag)}:require(name)})
const valid={password:'test-only',productId:'prod_test',name:'Updated bun',description:'Fresh daily',price:'4.25',requestId:'11111111-1111-4111-8111-111111111111'}
const post=body=>moduleObj.exports.POST(new Request('http://example.test/api/admin/products/update',{method:'POST',body:JSON.stringify(body),headers:{'Content-Type':'application/json'}}))
;(async()=>{
 reset();assert.equal((await post({...valid,password:'wrong'})).status,401);assert.equal(events.length,0)
 env.ADMIN_PASSWORD='';assert.equal((await post(valid)).status,401);env.ADMIN_PASSWORD='test-only'
 assert.equal((await moduleObj.exports.POST(new Request('http://example.test',{method:'POST',body:'{'}))).status,400)
 for(const price of ['-1','1.001','NaN','Infinity','1e2','2 dollars','1000000','']) {reset();assert.equal((await post({...valid,price})).status,400);assert.equal(events.length,0)}
 for(const patch of [{name:'  '},{name:'x'.repeat(251)},{description:'x'.repeat(2001)},{productId:'other'},{requestId:'bad'}]) {reset();assert.equal((await post({...valid,...patch})).status,400);assert.equal(events.length,0)}
 reset();let response=await post({...valid,priceId:'price_untrusted'});assert.equal(response.status,200);assert.deepEqual(events.map(x=>x[0]),['retrieve','create','update']);assert.equal(events[1][1].unit_amount,425);assert.equal(events[2][2].default_price,'price_new');assert.equal(saved.name,valid.name);assert.equal(saved.description,valid.description);assert.deepEqual(cacheTags,['menu-products']);assert.equal((await response.json()).product.price,'4.25')
 reset();response=await post({...valid,price:'3.50',name:'  Renamed bun  ',description:'  '});assert.equal(response.status,200);assert.deepEqual(events.map(x=>x[0]),['retrieve','update']);assert.equal(saved.name,'Renamed bun');assert.equal(saved.description,'');assert.equal(saved.default_price,'price_old')
 reset();response=await post({...valid,price:'0.29'});assert.equal(response.status,200);assert.equal(events[1][1].unit_amount,29)
 reset();assert.equal((await post({...valid,price:'0'})).status,200);assert.equal(events[1][1].unit_amount,0)
 reset();existing=null;assert.equal((await post(valid)).status,200);assert.equal(saved.default_price,'price_new')
 reset();existing.currency='eur';assert.equal((await post(valid)).status,400);assert.equal(events.length,1)
 reset();existing.type='recurring';assert.equal((await post(valid)).status,400);assert.equal(events.length,1)
 reset();failCreate=true;assert.equal((await post(valid)).status,502);assert.equal(saved,null);assert.equal(cacheTags.length,0);assert.ok(!events.some(x=>x[0]==='update'))
 reset();failUpdate=true;assert.equal((await post(valid)).status,502);const firstKeys=events.filter(x=>x[0]==='create'||x[0]==='update').map(x=>x.at(-1).idempotencyKey);events=[];failUpdate=false;assert.equal((await post(valid)).status,200);assert.deepEqual(events.filter(x=>x[0]==='create'||x[0]==='update').map(x=>x.at(-1).idempotencyKey),firstKeys)
 console.log('PASS: auth, malformed input, field limits, exact cents, combined save, unchanged price reuse, empty description, missing price, unsupported pricing, provider failures, idempotency keys, cache invalidation. No real Stripe calls.')
})().catch(e=>{console.error(e);process.exitCode=1})
