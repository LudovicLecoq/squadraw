'use strict';
// Search engine checks: generated pages, metadata, structured data and crawl files.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {buildAll,version,PAGES,SCRIPTS,ORIGIN}=require('../tools/pages.cjs');
const root=path.join(__dirname,'..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8').replace(/\r\n/g,'\n');
const attribute=(html,pattern)=>{const match=html.match(pattern);assert.ok(match,'Missing '+pattern);return match[1];};
const translations=(()=>{const vm=require('node:vm'),context=vm.createContext({});vm.runInContext(read('i18n.js')+'\nthis.t=TRANSLATIONS;',context);return context.t;})();
const urls={fr:ORIGIN+'/',en:ORIGIN+'/en/'};

for(const [file,html] of Object.entries(buildAll()))assert.equal(read(file),html,file+' is out of date: run node tools/pages.cjs');
for(const [code,file] of Object.entries(PAGES)){
  const html=read(file),label=file+': ';
  assert.equal(attribute(html,/<html lang="([^"]+)">/),code);
  const title=attribute(html,/<title[^>]*>([^<]+)<\/title>/),description=attribute(html,/<meta name="description"[^>]*content="([^"]+)"/);
  assert.ok(title.length>=30&&title.length<=65,label+'title should be 30-65 characters, got '+title.length);
  assert.ok(description.length>=110&&description.length<=160,label+'description should be 110-160 characters, got '+description.length);
  assert.equal(attribute(html,/<link rel="canonical"[^>]*href="([^"]+)"/),urls[code],label+'canonical');
  for(const [lang,url] of Object.entries({...urls,'x-default':urls.fr}))assert.ok(html.includes(`<link rel="alternate" hreflang="${lang}" href="${url}">`),label+'hreflang '+lang);
  assert.equal(attribute(html,/<meta property="og:url"[^>]*content="([^"]+)"/),urls[code]);
  for(const name of ['og:title','og:description','og:image','og:image:alt','og:locale'])assert.ok(new RegExp(`<meta property="${name}"[^>]*content="[^"]+"`).test(html),label+name);
  for(const name of ['twitter:card','twitter:title','twitter:description','twitter:image'])assert.ok(new RegExp(`<meta name="${name}"[^>]*content="[^"]+"`).test(html),label+name);
  assert.equal(html.match(/<h1\b/g).length,1,label+'exactly one h1');
  // Text is present in the HTML itself, so it is readable before (and without) JavaScript.
  for(const [,key,text] of html.matchAll(/data-i18n="([^"]+)"[^>]*>([^<]*)</g))assert.ok(text.trim(),label+'empty text for '+key);
  // Every data-i18n key must exist in i18n.js, otherwise the browser would show the raw key.
  for(const [,key] of html.matchAll(/data-i18n(?:-aria|-title|-placeholder|-content|-href)?="([^"]+)"/g))for(const lang of Object.keys(PAGES))assert.ok(Object.hasOwn(translations[lang],key)||Object.hasOwn(translations.fr,key),label+'unknown translation key '+key);
  const data=JSON.parse(attribute(html,/<script type="application\/ld\+json" id="structured-data">([\s\S]*?)<\/script>/));
  const types=data['@graph'].map(item=>item['@type']);assert.deepEqual(types,['WebSite','WebApplication','FAQPage']);
  const faq=data['@graph'][2].mainEntity;assert.equal(faq.length,5);
  for(const item of faq)assert.ok(html.includes('>'+item.name.replace(/&/g,'&amp;')+'</summary>'),label+'FAQ markup must match visible questions');
  const prefix=code==='fr'?'':'../';
  assert.deepEqual([...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g)].map(match=>match[1]),SCRIPTS.map(script=>prefix+script+'?v='+version(script)),label+'script paths');
  for(const [,asset] of html.matchAll(/(?:href|content)="(?:https:\/\/squadraw\.com)?\/([\w.-]+\.(?:png|svg|ico|webmanifest))"/g))assert.ok(fs.existsSync(path.join(root,asset)),label+'missing '+asset);
}
const sitemap=read('sitemap.xml');
assert.deepEqual([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match=>match[1]),Object.values(urls));
assert.match(read('robots.txt'),new RegExp('^Sitemap: '+ORIGIN+'/sitemap.xml$','m'));
const manifest=JSON.parse(read('site.webmanifest'));
for(const icon of manifest.icons)assert.ok(fs.existsSync(path.join(root,icon.src)),'missing manifest icon '+icon.src);
console.log('PASS: SEO pages up to date, titles/descriptions, canonical and hreflang, Open Graph/Twitter, structured data, static text, sitemap, robots and manifest.');
