const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const path=require('node:path');
require('./seo.cjs');
const read=relative=>fs.readFileSync(path.join(__dirname,'..',relative),'utf8').replace(/\r\n/g,'\n');
const modelCode=read('sports.js');
const context=vm.createContext({});
vm.runInContext(modelCode+'\nthis.api={SPORTS,PRESETS,initialState,initialWorkspace,validateState,validateWorkspace,isKeeper,canSubstitute,swapSubstitute};',context);
const m=context.api;
for(const fixture of ['football-v1.json','football-v2.json']){
  const old=JSON.parse(read('tests/fixtures/'+fixture));old.players[3].name='Gardé & conservé';old.players[3].x=41.25;old.team='Équipe sauvegardée';
  if(old.bench)old.bench[2]={name:'Remplaçant conservé',number:'27'};
  const workspace=m.validateWorkspace(old),upgraded=workspace.compositions.football;
  assert.equal(upgraded.version,3);assert.equal(JSON.stringify(upgraded.players),JSON.stringify(old.players));assert.equal(upgraded.team,old.team);assert.equal(upgraded.keeper,old.keeper);
  assert.equal(upgraded.bench.length,7);assert.equal(upgraded.bench[0].keeper,false);if(old.bench)assert.equal(upgraded.bench[2].name,old.bench[2].name);
}
const workspace=m.initialWorkspace();
for(const [mode,config] of Object.entries(m.SPORTS)){
  const state=workspace.compositions[mode];state.players[0].name=mode+' captain';state.bench[0].name='Bench '+mode;
  assert.equal(state.players.length,config.count);assert.equal(new Set(state.players.map(p=>p.id)).size,config.count);
  assert.equal(state.players.filter(p=>m.isKeeper(p,state)).length,mode==='football'?1:0);
  assert.equal(JSON.stringify(m.validateState(JSON.parse(JSON.stringify(state)))),JSON.stringify(state));
  assert.throws(()=>m.validateState({...state,players:state.players.slice(1)}));
  assert.throws(()=>m.validateState({...state,bench:Array.from({length:13},()=>({name:'Bad',number:'1'}))}));
  assert.throws(()=>m.validateState({...state,bench:[{name:'Too big',number:'100'}]}));
  assert.throws(()=>m.validateState({...state,players:state.players.map((p,i)=>i? p:{...p,x:101})}));
  assert.equal(m.validateState({...state,bench:[]}).bench.length,0);
  const target=mode==='football'?1:0;const outgoing=state.players[target].name,position=state.players[target].x;
  assert.equal(m.swapSubstitute(state,0,target),true);assert.equal(state.players[target].name,'Bench '+mode);assert.equal(state.bench[0].name,outgoing);assert.equal(state.players[target].x,position);
}
workspace.active='rugby13';workspace.lastRugby='rugby13';assert.equal(JSON.stringify(m.validateWorkspace(JSON.parse(JSON.stringify(workspace)))),JSON.stringify(workspace));
assert.notEqual(workspace.compositions.rugby7.players[0].name,workspace.compositions.rugby15.players[0].name);
const football=m.initialState();football.players[0].name='Raya';football.bench[0]={name:'Neto',number:'32',keeper:true};
assert.equal(m.canSubstitute(football,0,1),false);assert.equal(m.canSubstitute(football,0,0),true);assert.equal(m.swapSubstitute(football,0,0),true);assert.equal(football.players[0].name,'Neto');assert.equal(football.bench[0].name,'Raya');assert.equal(football.bench[0].keeper,true);
assert.equal(m.validateState(JSON.parse(JSON.stringify(football))).bench[0].keeper,true);
vm.runInContext(read('i18n.js')+'\nthis.translations=TRANSLATIONS;this.languages=LANGUAGES;',context);
const keys=Object.keys(context.translations.fr).sort();
for(const code of Object.keys(context.languages)){assert.deepEqual(Object.keys(context.translations[code]).sort(),keys);for(const config of Object.values(m.SPORTS))for(const row of config.positions??[])for(const prefix of ['role.','short.'])assert.ok(context.translations[code][prefix+row[2]]);}
const graphics=read('graphics.js'),oldJersey=read('tests/fixtures/jersey-baseline.txt');
const jersey=text=>text.slice(text.indexOf('    function jersey('),text.indexOf('    function crest('));assert.equal(jersey(graphics),oldJersey);
for(const file of ['i18n.js','sports.js','graphics.js','app.js'])new vm.Script(read(file));
const html=read('index.html');
const scripts=[...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"[^>]*><\/script>/g)];
assert.deepEqual(scripts.map(match=>match[1]),['i18n.js','sports.js','graphics.js','app.js'],'The four local scripts must load in dependency order.');
for(const [,file] of scripts)assert.ok(fs.existsSync(path.join(__dirname,'..',file)),'Missing companion script: '+file);
const markup=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
const ids=[...markup.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(ids.length,new Set(ids).size);
console.log('PASS: v1/v2 save migration, four independent lineups, count/position validation, goalkeeper swaps and JSON round-trips, translation parity, unchanged jerseys, local script references, syntax and unique HTML IDs.');
