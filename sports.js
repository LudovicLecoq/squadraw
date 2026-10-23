'use strict';
// Sport definitions, starting positions and data migration stay separate from the UI.
const PRESETS=[
  {id:'gunners',body:'#e63235',sleeve:'#ffffff',accent:'#ffffff',pattern:'plain',badge:true},
  {id:'night',body:'#242b29',sleeve:'#242b29',accent:'#d7be80',pattern:'plain',badge:true},
  {id:'cream',body:'#f2e9d4',sleeve:'#f2e9d4',accent:'#8a3437',pattern:'plain',badge:true},
  {id:'blue',body:'#2866cc',sleeve:'#2866cc',accent:'#ffffff',pattern:'plain',badge:false},
  {id:'stripes',body:'#252c2c',sleeve:'#ffffff',accent:'#ffffff',pattern:'stripes',badge:false},
  {id:'rugby-blue',body:'#2359ad',sleeve:'#2359ad',accent:'#ffffff',pattern:'plain',badge:false},
  {id:'rugby-black',body:'#22272d',sleeve:'#22272d',accent:'#ffffff',pattern:'plain',badge:false},
  {id:'rugby-green',body:'#126443',sleeve:'#126443',accent:'#e2c96c',pattern:'plain',badge:false},
  {id:'rugby-red',body:'#be273b',sleeve:'#be273b',accent:'#ffffff',pattern:'plain',badge:false},
  {id:'rugby-hoops',body:'#142f51',sleeve:'#142f51',accent:'#f3f0e7',pattern:'hoops',badge:false}
];
const FORMATIONS={
  '4-3-3':[[50,89,'GB'],[15,71,'DG'],[38,75,'DC'],[62,75,'DC'],[85,71,'DD'],[50,55,'MDC'],[28,40,'MC'],[72,40,'MC'],[16,20,'AG'],[50,16,'BU'],[84,20,'AD']],
  '4-4-2':[[50,89,'GB'],[15,71,'DG'],[38,75,'DC'],[62,75,'DC'],[85,71,'DD'],[14,45,'MG'],[38,48,'MC'],[62,48,'MC'],[86,45,'MD'],[34,20,'BU'],[66,20,'BU']],
  '4-2-3-1':[[50,89,'GB'],[15,71,'DG'],[38,75,'DC'],[62,75,'DC'],[85,71,'DD'],[34,56,'MDC'],[66,56,'MDC'],[17,34,'MG'],[50,36,'MOC'],[83,34,'MD'],[50,15,'BU']],
  '3-5-2':[[50,89,'GB'],[25,73,'DC'],[50,76,'DC'],[75,73,'DC'],[12,47,'MG'],[34,53,'MC'],[50,36,'MOC'],[66,53,'MC'],[88,47,'MD'],[33,18,'BU'],[67,18,'BU']],
  '3-4-3':[[50,89,'GB'],[25,73,'DC'],[50,76,'DC'],[75,73,'DC'],[12,46,'MG'],[38,51,'MC'],[62,51,'MC'],[88,46,'MD'],[18,21,'AG'],[50,16,'BU'],[82,21,'AD']],
  '5-3-2':[[50,89,'GB'],[12,65,'DG'],[30,74,'DC'],[50,77,'DC'],[70,74,'DC'],[88,65,'DD'],[25,43,'MC'],[50,48,'MC'],[75,43,'MC'],[34,20,'BU'],[66,20,'BU']]
};
const SPORTS={
  football:{sport:'football',count:11,label:'football',bench:7,kit:'gunners',height:630,numbers:[1,3,4,5,2,6,8,10,11,9,7]},
  rugby7:{sport:'rugby',count:7,label:'rugby7',bench:5,kit:'rugby-blue',height:750,positions:[[24,22,'PG'],[50,22,'TAL'],[76,22,'PD'],[35,44,'DM'],[65,57,'DO'],[30,73,'C'],[77,82,'AIL']]},
  rugby13:{sport:'rugby',count:13,label:'rugby13',bench:6,kit:'rugby-blue',height:750,positions:[[50,84,'AR'],[88,73,'AIL'],[64,73,'C'],[36,73,'C'],[12,73,'AIL'],[66,58,'SO'],[34,58,'DM'],[26,20,'PIL'],[50,20,'TAL'],[74,20,'PIL'],[36,34,'LOCK'],[64,34,'LOCK'],[50,46,'L13']]},
  rugby15:{sport:'rugby',count:15,label:'rugby15',bench:8,kit:'rugby-blue',height:750,positions:[[26,18,'PG'],[50,18,'TAL'],[74,18,'PD'],[38,31,'LOCK'],[62,31,'LOCK'],[22,44,'FL'],[78,44,'FL'],[50,44,'N8'],[37,57,'DM'],[64,63,'DO'],[10,76,'AIL'],[36,76,'C'],[64,76,'C'],[90,76,'AIL'],[50,84,'AR']]}
};
const clone=value=>JSON.parse(JSON.stringify(value));
const escapeXml=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));
function slots(composition){return composition.mode==='football'?FORMATIONS[composition.formation]:SPORTS[composition.mode].positions;}
function initialState(mode='football'){
  const config=SPORTS[mode];
  if(!config)throw new Error('Unknown sport');
  const formation=mode==='football'?'4-3-3':'standard';
  const positions=mode==='football'?FORMATIONS[formation]:config.positions;
  return {version:3,mode,team:mode==='football'?'Arsenal FC':'',formation,kit:clone(PRESETS.find(k=>k.id===config.kit)),keeper:'#c9d966',players:positions.map(([x,y,role],id)=>({id,name:'',number:String(config.numbers?.[id]??id+1),x,y,role})),bench:Array.from({length:config.bench},(_,i)=>({name:'',number:String(config.count+i+1),keeper:false}))};
}
function validateState(data){
  const invalid=()=>{throw new Error('Invalid lineup');};
  if(!data||![1,2,3].includes(data.version))return invalid();
  const mode=data.version<3?'football':data.mode,config=Object.hasOwn(SPORTS,mode)?SPORTS[mode]:null;
  const color=x=>typeof x==='string'&&/^#[0-9a-f]{6}$/i.test(x);
  if(!config||typeof data.team!=='string'||data.team.length>45||!Array.isArray(data.players)||data.players.length!==config.count||!data.kit||![data.kit.body,data.kit.sleeve,data.kit.accent,data.keeper].every(color)||!['plain','stripes','hoops','sash'].includes(data.kit.pattern))return invalid();
  if(mode==='football'?!Object.hasOwn(FORMATIONS,data.formation):data.formation!=='standard')return invalid();
  const positions=slots({mode,formation:data.formation});
  const validIdentity=p=>p&&typeof p.name==='string'&&p.name.length<=30&&typeof p.number==='string'&&/^\d{1,2}$/.test(p.number);
  const players=data.players.map((p,i)=>{if(!validIdentity(p)||!Number.isFinite(p.x)||!Number.isFinite(p.y)||p.x<8||p.x>92||p.y<8||p.y>92)return invalid();return {id:i,name:p.name,number:p.number,x:p.x,y:p.y,role:positions[i][2]};});
  const sourceBench=data.version===1?initialState().bench:data.bench;
  if(!Array.isArray(sourceBench)||sourceBench.length>12)return invalid();
  const bench=sourceBench.map(p=>{if(!validIdentity(p)||(p.keeper!==undefined&&typeof p.keeper!=='boolean'))return invalid();return {name:p.name,number:p.number,keeper:mode==='football'&&p.keeper===true};});
  return {version:3,mode,team:data.team,formation:data.formation,kit:{id:PRESETS.some(k=>k.id===data.kit.id)?data.kit.id:'custom',body:data.kit.body,sleeve:data.kit.sleeve,accent:data.kit.accent,pattern:data.kit.pattern,badge:data.kit.badge===true},keeper:data.keeper,players,bench};
}
function initialWorkspace(){return {version:3,active:'football',lastRugby:'rugby15',compositions:Object.fromEntries(Object.keys(SPORTS).map(mode=>[mode,initialState(mode)]))};}
function validateWorkspace(data){
  const result=initialWorkspace();
  if(!data?.compositions){const composition=validateState(data);result.active=composition.mode;result.compositions[composition.mode]=composition;return result;}
  if(data.version!==3||!Object.hasOwn(SPORTS,data.active))throw new Error('Invalid workspace');
  for(const mode of Object.keys(SPORTS)){if(!data.compositions[mode])continue;const composition=validateState(data.compositions[mode]);if(composition.mode!==mode)throw new Error('Wrong sport');result.compositions[mode]=composition;}
  result.active=data.active;result.lastRugby=['rugby7','rugby13','rugby15'].includes(data.lastRugby)?data.lastRugby:'rugby15';return result;
}
function isKeeper(player,composition){return composition.mode==='football'&&(player.role==='GB'||player.keeper===true);}
function canSubstitute(composition,benchIndex,playerIndex){const sub=composition.bench[benchIndex],starter=composition.players[playerIndex];return !!sub?.name.trim()&&!!starter&&(composition.mode!=='football'||isKeeper(sub,composition)===isKeeper(starter,composition));}
function moveSubstitute(composition,from,to){const bench=composition.bench;if(!Number.isInteger(from)||!Number.isInteger(to)||from===to||!bench[from]||!bench[to])return false;bench.splice(to,0,...bench.splice(from,1));return true;}
function swapSubstitute(composition,benchIndex,playerIndex){
  if(!canSubstitute(composition,benchIndex,playerIndex))return false;
  const starter=composition.players[playerIndex],replacement=composition.bench[benchIndex];
  composition.bench[benchIndex]={name:starter.name,number:starter.number,keeper:isKeeper(starter,composition)};
  starter.name=replacement.name;starter.number=replacement.number;return true;
}
