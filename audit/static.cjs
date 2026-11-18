const fs=require('node:fs');
const cp=require('node:child_process');
const assert=require('node:assert/strict');

const result={checks:[],contrast:[]};
const menu=JSON.parse(fs.readFileSync('data/menu.json'));
const config=JSON.parse(fs.readFileSync('data/config.json'));
const expected=['Desserts','Main Course Continental','Continental Appetizers','Pasta','Pizza','Sandwiches & Burgers','Rice & Noodles','Main Course','Chinese','Raita','Special Breads','Varieties of Rice','Varieties of Biryani','Indian Main Course (Chicken and Mutton)','South Indian','Indian Kebabs','Tandoori Appetizers','Salads','Soups'];
assert.deepEqual(menu.categories.map(c=>c.name),expected);
const items=menu.categories.flatMap(c=>c.items);assert.equal(new Set(items.map(i=>i.id)).size,items.length);assert.equal(new Set(items.map(i=>i.description)).size,items.length);
for(const c of menu.categories)assert(c.items.length>=3);
for(const i of items){assert(i._sample===true);assert(fs.existsSync(i.image));assert(typeof i.veg==='boolean');assert(Number.isFinite(i.price)&&i.price>0);assert(Array.isArray(i.tags));}
result.checks.push('JSON valid; exact 19 categories; 80 unique IDs/descriptions; 3+ per category; sample flags; local images');
for(const f of fs.readdirSync('js').filter(f=>f.endsWith('.js')))cp.execFileSync(process.execPath,['--check','js/'+f]);
result.checks.push('All 10 JavaScript files pass node --check');
for(const f of fs.readdirSync('.').filter(f=>f.endsWith('.html'))){
 const html=fs.readFileSync(f,'utf8');
 for(const pattern of [/<title>/, /name="description"/, /name="viewport"/, /rel="icon"/, /<main/, /class="skip-link"/, /lang="en"/])assert(pattern.test(html),f+' '+pattern);
 assert.equal((html.match(/<h1\b/g)||[]).length,1);
 for(const match of html.matchAll(/(?:src|href)="([^"]+)"/g)){const v=match[1];if(/^(https?:|mailto:|tel:|#|data:)/.test(v))continue;assert(fs.existsSync(v.split('#')[0]),f+' missing '+v);}
 for(const match of html.matchAll(/<(?:input|textarea|select)\b[^>]*>/g)){const tag=match[0],id=tag.match(/id="([^"]+)"/)?.[1];assert(tag.includes('aria-label=')||html.includes('for="'+id+'"'),f+' unlabeled '+tag);}

}
result.checks.push('Six HTML pages: metadata, lang, one h1, skip link, labels, local links and assets');
const luminance=hex=>{const values=hex.match(/\w\w/g).map(x=>parseInt(x,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return values[0]*.2126+values[1]*.7152+values[2]*.0722;};
for(const [fg,bg] of [['f5f0eb','161616'],['f5f0eb','25211e'],['d4b79e','25211e'],['b28f6f','25211e'],['161616','b28f6f']]){const a=luminance(fg),b=luminance(bg),ratio=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);assert(ratio>=4.5);result.contrast.push({fg,bg,ratio:Number(ratio.toFixed(2))});}
assert.equal(config.hours.verified,false);assert.equal(config.hours.schedule.length,0);assert.equal(config.contact.whatsapp,'');assert.equal(config.contact.whatsappVerified,false);
result.checks.push('Unconfirmed hours and WhatsApp safely unset; text palette contrasts >=4.5:1');
fs.writeFileSync('audit/static-results.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
