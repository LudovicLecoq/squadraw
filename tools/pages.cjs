'use strict';
// Builds the static, crawlable pages from index.html and i18n.js:
// index.html (French, at /) and en/index.html (English, at /en/).
// Run `node tools/pages.cjs` after changing index.html or a translation.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),crypto=require('node:crypto');
const root=path.join(__dirname,'..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8').replace(/\r\n/g,'\n');
const PAGES={fr:'index.html',en:'en/index.html'};
const SCRIPTS=['i18n.js','sports.js','graphics.js','app.js'];
const ORIGIN='https://squadraw.com';

function loadTranslations(){
  const context=vm.createContext({});
  vm.runInContext(read('i18n.js')+'\nthis.translations=TRANSLATIONS;',context);
  return context.translations;
}
const escapeText=text=>text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const escapeAttribute=text=>escapeText(text).replace(/"/g,'&quot;');

function structuredData(t,code){
  const url=t['meta.url'],faq=[1,2,3,4,5].map(n=>({'@type':'Question',name:t['faq.q'+n],acceptedAnswer:{'@type':'Answer',text:t['faq.a'+n]}}));
  const data={'@context':'https://schema.org','@graph':[
    {'@type':'WebSite','@id':ORIGIN+'/#website',url:ORIGIN+'/',name:'Squadraw',inLanguage:['fr','en']},
    {'@type':'WebApplication','@id':url+'#app',name:'Squadraw',url,description:t.description,inLanguage:code,applicationCategory:'SportsApplication',operatingSystem:'Any',browserRequirements:'Requires JavaScript',isAccessibleForFree:true,image:ORIGIN+'/og-image.png',offers:{'@type':'Offer',price:'0',priceCurrency:'EUR'},featureList:[t['guide.football.title'],t['guide.rugby.title'],t['guide.kits.title'],t['guide.share.title']]},
    {'@type':'FAQPage','@id':url+'#faq',url,inLanguage:code,mainEntity:faq}
  ]};
  // "<" is escaped so no translation can close the script element.
  return JSON.stringify(data).replace(/</g,'\\u003c');
}

const version=file=>crypto.createHash('sha256').update(read(file)).digest('hex').slice(0,10);

function build(source,translations,code){
  const t=translations[code],missing=[];
  const value=key=>{if(!(key in t))missing.push(key);return t[key]??'';};
  let html=source.replace(/<html lang="[^"]*">/,`<html lang="${code}">`);
  // Leaf elements with data-i18n receive their text, as applyLanguage does in the browser.
  html=html.replace(/(<(\w+)\b[^>]*\bdata-i18n="([^"]+)"[^>]*>)[^<]*(<\/\2>)/g,(_,open,tag,key,close)=>open+escapeText(value(key))+close);
  // Translated attributes are rewritten inside each start tag that declares them.
  const attributes={'data-i18n-aria':'aria-label','data-i18n-title':'title','data-i18n-placeholder':'placeholder','data-i18n-content':'content','data-i18n-href':'href'};
  html=html.replace(/<\w+\b[^>]*\bdata-i18n-(?:aria|title|placeholder|content|href)="[^>]*>/g,tag=>{
    for(const [marker,attribute] of Object.entries(attributes)){
      const match=tag.match(new RegExp('\\s'+marker+'="([^"]+)"'));if(!match)continue;
      tag=tag.replace(new RegExp('\\s'+attribute+'="[^"]*"'),'').replace(match[0],match[0]+` ${attribute}="${escapeAttribute(value(match[1]))}"`);
    }
    return tag;
  });
  html=html.replace(/(<script type="application\/ld\+json" id="structured-data">)[\s\S]*?(<\/script>)/,(_,open,close)=>open+structuredData(t,code)+close);
  // Each script URL carries a hash of its content, so browsers and server caches never pair a new page with an old script.
  html=html.replace(/<script src="(?:\.\.\/)?([\w-]+\.js)(?:\?v=\w+)?"><\/script>/g,(_,file)=>`<script src="${code==='fr'?'':'../'}${file}?v=${version(file)}"></script>`);
  if(missing.length)throw new Error('Missing translations for '+code+': '+missing.join(', '));
  return html;
}

function buildAll(){
  const translations=loadTranslations(),source=read(PAGES.fr);
  return Object.fromEntries(Object.entries(PAGES).map(([code,file])=>[file,build(source,translations,code)]));
}

if(require.main===module){
  for(const [file,html] of Object.entries(buildAll())){fs.mkdirSync(path.dirname(path.join(root,file)),{recursive:true});fs.writeFileSync(path.join(root,file),html);console.log('Wrote '+file);}
}
module.exports={buildAll,version,PAGES,SCRIPTS,ORIGIN};
