/* Explicit operator commands; never runs during a build or web request.
 node scripts/migrate-supabase.cjs export-menu | export-content | schema | import-menu | import-content | verify-menu | verify-content
 Exports are private, gitignored. Source data is never deleted or modified. */
require('dotenv').config({path:'.env.local',quiet:true});
const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('node:assert/strict');
const postgres=require('postgres'); let sql;
const dir=path.join(process.cwd(),'.local-data','supabase-migration');
const save=(name,value)=>{fs.mkdirSync(dir,{recursive:true});const p=path.join(dir,name+'.json');if(fs.existsSync(p))throw Error('Snapshot already exists; archive it before exporting again');fs.writeFileSync(p,JSON.stringify(value,null,2));console.log('Saved '+name+' snapshot ('+(Array.isArray(value)?value.length:'content')+')')};
const load=name=>JSON.parse(fs.readFileSync(path.join(dir,name+'.json'),'utf8'));
function encode(value){const key=process.env.CAMPAIGN_STORAGE_SECRET||process.env.ADMIN_PASSWORD;if(!key)throw Error('Encryption key required');const iv=crypto.randomBytes(12),c=crypto.createCipheriv('aes-256-gcm',crypto.createHash('sha256').update(key).digest(),iv);const data=Buffer.concat([c.update(JSON.stringify(value)),c.final()]);return JSON.stringify({v:1,iv:iv.toString('base64'),tag:c.getAuthTag().toString('base64'),data:data.toString('base64')})}
async function main(){const command=process.argv[2];
 if(command==='export-menu'){
  if(!process.env.STRIPE_SECRET_KEY)throw Error('Stripe source key required');const stripe=new(require('stripe'))(process.env.STRIPE_SECRET_KEY);const rows=[];
  for await(const p of stripe.products.list({limit:100,expand:['data.default_price']})){const price=p.default_price;if(!price||typeof price==='string'||price.currency!=='usd'||price.unit_amount==null||price.type!=='one_time')throw Error('Unsupported source pricing; review before migration');rows.push({id:p.id,name:p.name,description:p.description||'',price_cents:price.unit_amount,image:p.images[0]||'/placeholder.svg',category:p.metadata.category||'Buns',active:p.active,position:rows.length})}
  if(!rows.length)throw Error('Refusing empty menu export');save('menu',rows);return;
 }
 if(command==='export-content'){
  const base=process.env.MIGRATION_SOURCE_URL||'https://sunvillebakerylv.com';if(!base.startsWith('https://'))throw Error('HTTPS source required');if(!process.env.ADMIN_PASSWORD)throw Error('Admin login required');
  async function get(route){const r=await fetch(base+route,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:process.env.ADMIN_PASSWORD,action:'list'})});if(!r.ok)throw Error('Source unavailable; do not import fallback or empty data');return r.json()}
  const campaigns=(await get('/api/admin/occasions')).campaigns,orders=(await get('/api/admin/pre-orders')).orders;
  const r=await fetch(base+'/api/gallery');const gallery=await r.json();if(!r.ok||gallery.degraded)throw Error('Gallery source unavailable; refusing fallback data');
  if(!Array.isArray(campaigns)||!Array.isArray(orders)||!Array.isArray(gallery.images))throw Error('Invalid source export');
  save('content',{campaigns,orders:orders.map(o=>({id:o.id,payload:encode(o),status:o.status,created_at:o.createdAt})),gallery:gallery.images});return;
 }
 if(!process.env.DATABASE_URL)throw Error('Connect Supabase and configure DATABASE_URL first');sql=postgres(process.env.DATABASE_URL,{prepare:false,max:1,ssl:process.env.SUPABASE_DB_CA?{ca:process.env.SUPABASE_DB_CA.replace(/\\n/g,'\n'),rejectUnauthorized:true}:'verify-full',connect_timeout:10});
 if(command==='schema'){const statements=fs.readFileSync('db/001-bakery.sql','utf8').split(';').map(x=>x.trim()).filter(Boolean);await sql.begin(tx=>Promise.all(statements.map(s=>tx.unsafe(s))));console.log('Schema installed');return}
 const scope=command?.endsWith('-menu')?'menu':command?.endsWith('-content')?'content':null;if(!scope)throw Error('Specify an export, schema, import, or verify command');const data=load(scope);
 if(command.startsWith('import-')){
  const marker=await sql`SELECT scope FROM bakery_migrations WHERE scope=${scope}`;if(marker.length)throw Error('Already migrated; verify instead of overwriting');
  const counts=scope==='menu'?await sql`SELECT count(*)::int AS n FROM bakery_menu`:await sql`SELECT (SELECT count(*) FROM bakery_campaigns)+(SELECT count(*) FROM bakery_orders)+(SELECT count(*) FROM bakery_gallery) AS n`;
  if(Number(counts[0].n)!==0)throw Error('Destination contains records; refusing overwrite. Verify an interrupted import manually.');
  const q=[];if(scope==='menu')for(const r of data)q.push(tx=>tx`INSERT INTO bakery_menu(id,name,description,price_cents,image,category,active,position) VALUES(${r.id},${r.name},${r.description},${r.price_cents},${r.image},${r.category},${r.active},${r.position})`);
  else{for(const [i,c]of data.campaigns.entries())q.push(tx=>tx`INSERT INTO bakery_campaigns(id,payload,position) VALUES(${c.id},${tx.json(c)},${i})`);for(const o of data.orders)q.push(tx=>tx`INSERT INTO bakery_orders(id,payload,status,created_at) VALUES(${o.id},${o.payload},${o.status},${o.created_at})`);for(const [i,url]of data.gallery.entries())q.push(tx=>tx`INSERT INTO bakery_gallery(url,position) VALUES(${url},${i})`)}
  if(q.length)await sql.begin(tx=>Promise.all(q.map(query=>query(tx))));
 }
 if(scope==='menu'){const rows=await sql`SELECT * FROM bakery_menu ORDER BY position,id`;assert.deepStrictEqual(Array.from(rows),data)}
 else{const campaigns=(await sql`SELECT payload FROM bakery_campaigns ORDER BY position,id`).map(r=>r.payload);assert.deepStrictEqual(campaigns,data.campaigns);const gallery=(await sql`SELECT url FROM bakery_gallery ORDER BY position,url`).map(r=>r.url);assert.deepStrictEqual(gallery,data.gallery);const orders=await sql`SELECT id,payload,status,created_at FROM bakery_orders ORDER BY id`;assert.deepStrictEqual(orders.map(o=>({...o,created_at:new Date(o.created_at).toISOString()})),[...data.orders].sort((a,b)=>a.id.localeCompare(b.id)).map(o=>({...o,created_at:new Date(o.created_at).toISOString()})))}
 if(command.startsWith('import-')||command.startsWith('finalize-'))await sql`INSERT INTO bakery_migrations(scope,record_count) VALUES(${scope},${scope==='menu'?data.length:data.campaigns.length+data.orders.length+data.gallery.length}) ON CONFLICT(scope) DO NOTHING`;
 console.log(scope+' verified against source snapshot. No source data changed.');
}
main().catch(()=>{console.error('Migration stopped. Check source access, destination readiness, and snapshot consistency. No credentials or customer records are printed.');process.exitCode=1}).finally(async()=>{if(sql)await sql.end({timeout:5})});
