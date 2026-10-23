'use strict';
const $=id=>document.getElementById(id);
const STORAGE_KEY='onze-foot-composition-v1',LANGUAGE_KEY='onze-language';
let workspace=initialWorkspace(),state=workspace.compositions.football;
let selected=null,history=[],future=[],editStart=null,drag=null,benchDrag=null,pendingSub=null,toastTimer,saveAvailable=true,storageReadable=true;
try{const saved=localStorage.getItem(STORAGE_KEY);if(saved)workspace=validateWorkspace(JSON.parse(saved));state=workspace.compositions[workspace.active];}catch(error){storageReadable=false;saveAvailable=false;}
// Each language has its own page (/ and /en/); a language chosen with the FR/EN buttons takes precedence.
const online=/^https?:$/.test(location.protocol);if(Object.hasOwn(LANGUAGES,document.documentElement.lang))language=document.documentElement.lang;
try{const savedLanguage=localStorage.getItem(LANGUAGE_KEY);if(Object.hasOwn(LANGUAGES,savedLanguage))language=savedLanguage;}catch(error){/* The site still works without browser storage. */}
function config(){return SPORTS[state.mode];}
function teamLabel(composition=state){return composition.team.trim()||t(composition.mode==='football'?'myTeam':'myRugbyTeam');}
function startingLabel(){return t(state.mode==='football'?'startingFootball':'startingRugby');}
function formationLabel(composition=state){return composition.mode==='football'?composition.formation:t(SPORTS[composition.mode].label);}
function playerLabel(p){return p.name.trim()||t('short.'+p.role);}
function namedSubstitutes(composition=state){return composition.bench.filter(p=>p.name.trim());}
function icon(name){return `<svg fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><use href="#i-${name}"/></svg>`;}
function toast(message){$('toast').textContent=message;$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),2900);}
function saveStatus(){$('save-text').textContent=t(saveAvailable?'saved':'saveFallback');$('save-status').querySelector('.save-dot').style.background=saveAvailable?'#66a575':'#d5a34f';}
function save(){workspace.active=state.mode;workspace.compositions[state.mode]=state;try{if(!storageReadable)throw new Error('Preserve unreadable save');localStorage.setItem(STORAGE_KEY,JSON.stringify(workspace));saveAvailable=true;}catch(error){saveAvailable=false;}saveStatus();}
function historyButtons(){$('undo').disabled=!history.length;$('redo').disabled=!future.length;}
function record(before){if(JSON.stringify(before)===JSON.stringify(state))return;history.push(before);if(history.length>60)history.shift();future=[];historyButtons();save();}
function finishEdit(){if(editStart){record(editStart);editStart=null;}}
function startEdit(){if(!editStart)editStart=clone(state);}
function mutate(fn){finishEdit();cancelSubstitution();const before=clone(state);fn();record(before);render();}
function undo(){finishEdit();cancelSubstitution();if(!history.length)return;future.push(clone(state));state=history.pop();render();save();toast(t('undone'));}
function redo(){finishEdit();cancelSubstitution();if(!future.length)return;history.push(clone(state));state=future.pop();render();save();toast(t('redone'));}
function switchMode(mode){
  if(mode===state.mode||!Object.hasOwn(SPORTS,mode))return;
  finishEdit();if(drag)onPointerCancel();cancelBenchDrag();cancelSubstitution();save();
  state=workspace.compositions[mode];workspace.active=mode;if(mode!=='football')workspace.lastRugby=mode;
  selected=null;history=[];future=[];editStart=null;$('bulk-names').value='';$('bulk-content').hidden=true;$('bulk-toggle').setAttribute('aria-expanded','false');
  setupMode();render();save();
}
function applyLanguage(){
  document.documentElement.lang=language;
  // A key missing from i18n.js (for example an outdated copy on the server) keeps the text already in the HTML.
  const known=key=>Object.hasOwn(TRANSLATIONS[language]??{},key)||Object.hasOwn(TRANSLATIONS.fr,key);
  document.querySelectorAll('[data-i18n]').forEach(el=>{if(known(el.dataset.i18n))el.textContent=t(el.dataset.i18n);});
  for(const [key,attribute] of [['i18nAria','aria-label'],['i18nTitle','title'],['i18nPlaceholder','placeholder'],['i18nContent','content']])document.querySelectorAll('[data-'+key.replace(/[A-Z]/g,c=>'-'+c.toLowerCase())+']').forEach(el=>{if(known(el.dataset[key]))el.setAttribute(attribute,t(el.dataset[key]));});
  for(const button of $('language-switch').children)button.setAttribute('aria-pressed',String(button.dataset.language===language));
}
function setLanguage(next){if(next===language||!Object.hasOwn(LANGUAGES,next))return;finishEdit();if(drag)onPointerCancel();cancelBenchDrag();cancelSubstitution();language=next;try{localStorage.setItem(LANGUAGE_KEY,language);}catch(error){}$('toast').classList.remove('visible');applyLanguage();setupMode();render();saveStatus();showLanguageAddress();}
function showLanguageAddress(){if(!online)return;try{const link=document.querySelector(`link[rel=alternate][hreflang=${language}]`);if(link)window.history.replaceState(window.history.state,'',new URL(link.href).pathname+location.hash);}catch(error){/* Keep the current address if it cannot be changed. */}}
function setupMode(){
  const football=state.mode==='football';document.body.dataset.sport=config().sport;
  $('rugby-formats').hidden=football;$('formations').hidden=!football;$('rugby-layout-name').hidden=football;$('keeper-control').hidden=!football;
  document.querySelectorAll('[data-sport-choice]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.sportChoice===config().sport)));
  document.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===state.mode)));
  $('formation-title').textContent=t(football?'system':'rugbyLayout');$('formation-hint').textContent=t(football?'formationHint':'rugbyLayoutHint');$('rugby-layout-name').textContent=formationLabel();
  $('player-count').textContent=t('playersCount',{count:state.players.length});$('roster-count').textContent=String(state.players.length);$('roster-title').textContent=startingLabel();$('board-kicker').textContent=startingLabel();$('bulk-hint').textContent=t('bulkHint',{count:state.players.length});
  $('pitch').dataset.sport=config().sport;$('pitch').dataset.dense=String(state.players.length>11);$('pitch-art').setAttribute('viewBox',`0 0 500 ${config().height}`);$('pitch-art').innerHTML=pitchArt();
  $('kit-options').replaceChildren();
  for(const k of PRESETS.filter(k=>football?!k.id.startsWith('rugby-'):k.id.startsWith('rugby-'))){const b=document.createElement('button');b.className='kit-option';b.dataset.kit=k.id;b.setAttribute('aria-label',t('kit.'+k.id));b.title=t('kit.'+k.id);b.innerHTML=jersey(k);b.addEventListener('click',()=>mutate(()=>{state.kit=clone(k);}));$('kit-options').append(b);}
  buildPlayers();
}
function renderPlayer(p){const el=$('player-'+p.id);el.style.left=p.x+'%';el.style.top=p.y+'%';el.setAttribute('aria-label',t('playerAction',{name:playerLabel(p),number:p.number}));el.innerHTML=`<span class="shirt">${jersey(state.kit,p.number,isKeeper(p,state))}</span><span class="player-name"></span>`;el.querySelector('.player-name').textContent=playerLabel(p);el.title=`${playerLabel(p)} · ${t('role.'+p.role)}`;}
function renderPlayers(){state.players.forEach(renderPlayer);}
function renderKit(){
  for(const [id,key] of [['body-color','body'],['sleeve-color','sleeve'],['accent-color','accent']])$(id).value=state.kit[key];$('pattern').value=state.kit.pattern;$('keeper-color').value=state.keeper;$('kit-preview').innerHTML=jersey(state.kit,'7');
  const preset=PRESETS.find(k=>k.id===state.kit.id);$('kit-name').textContent=t(preset?'kit.'+preset.id:'customKit');$('kit-note').textContent=t(preset?'kit.'+preset.id+'.note':'customKitNote');for(const b of $('kit-options').children)b.setAttribute('aria-pressed',String(b.dataset.kit===state.kit.id));$('club-emblem').innerHTML=crest();
}
function render(){
  $('team-name').value=state.team;$('team-name').placeholder=t(state.mode==='football'?'myTeam':'myRugbyTeam');$('board-team').textContent=teamLabel();$('board-formation').textContent=formationLabel();
  for(const b of $('formations').children)b.setAttribute('aria-pressed',String(b.dataset.formation===state.formation));
  state.players.forEach(p=>{$('name-'+p.id).value=p.name;$('number-'+p.id).value=p.number;$('role-'+p.id).textContent=t('short.'+p.role);$('role-'+p.id).title=t('role.'+p.role);});
  renderKit();renderPlayers();renderBench();highlight();historyButtons();
}
function highlight(){for(const p of state.players){$('player-'+p.id).classList.toggle('selected',selected===p.id);$('row-'+p.id).classList.toggle('active',selected===p.id);}}
function selectPlayer(id,focusName=false){selected=id;highlight();if(focusName){const input=$('name-'+id);input.focus({preventScroll:true});input.select();input.scrollIntoView({block:'nearest',behavior:'smooth'});}}
function renderLineupBench(){
  const players=state.bench.map((p,index)=>({p,index})).filter(({p})=>p.name.trim()),list=$('lineup-bench-list');list.replaceChildren();$('lineup-bench-total').textContent=players.length?String(players.length):'';$('lineup-bench-empty').hidden=players.length>0;
  for(const {p,index} of players){
    const keeper=isKeeper(p,state),item=document.createElement('li');item.className='lineup-substitute';item.dataset.index=String(index);item.addEventListener('pointerdown',e=>{if(!e.target.closest('button'))startBenchDrag(e,index,'lineup');});item.title=t('numberName',{number:p.number,name:p.name.trim()})+(keeper?' · '+t('goalkeeper'):'');
    const kit=document.createElement('span');kit.className='lineup-substitute-kit';kit.setAttribute('aria-hidden','true');kit.innerHTML=jersey(state.kit,p.number,keeper);
    const accessible=document.createElement('span');accessible.className='sr-only';accessible.textContent=t('numberName',{number:p.number,name:''});
    const copy=document.createElement('span');copy.className='lineup-substitute-copy';const name=document.createElement('span');name.className='lineup-substitute-name';name.textContent=p.name.trim();copy.append(name);
    if(keeper){const badge=document.createElement('span');badge.className='keeper-label';badge.textContent=t('goalkeeper');copy.append(badge);}
    const enter=document.createElement('button');enter.type='button';enter.className='lineup-enter';enter.setAttribute('aria-label',t('enterNamed',{name:p.name.trim()}));enter.title=t('enter');enter.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><path d="M4 7h15m-4-4 4 4-4 4M20 17H5m4-4-4 4 4 4"/></svg>';const label=document.createElement('span');label.className='lineup-enter-label';label.textContent=t('enter');enter.append(label);enter.addEventListener('click',()=>beginSubstitution(index));
    item.classList.toggle('pending',pendingSub===index);item.append(kit,accessible,copy,enter);list.append(item);
  }
}
function updateBenchCount(){$('bench-count').textContent=t('ready',{ready:namedSubstitutes().length,total:state.bench.length});}
function renderBench(){
  const grid=$('bench-grid');grid.replaceChildren();updateBenchCount();renderLineupBench();
  state.bench.forEach((p,i)=>{
    const n=i+1,seat=document.createElement('div');seat.className='bench-seat';seat.id='bench-seat-'+i;seat.dataset.index=String(i);
    seat.innerHTML=`<div class="bench-seat-top"><label class="sr-only" for="bench-number-${i}">${t('subNumber',{n})}</label><input type="number" inputmode="numeric" min="0" max="99" step="1" class="bench-number" id="bench-number-${i}"><button class="bench-remove" type="button" aria-label="${t('removeSub',{n})}" title="${t('removeSubTitle')}">×</button></div><button class="bench-shirt" id="bench-shirt-${i}" type="button"></button><label class="sr-only" for="bench-name-${i}">${t('subName',{n})}</label><input type="text" class="bench-name" id="bench-name-${i}" maxlength="30" placeholder="${t('subPlaceholder',{n})}" autocomplete="off" spellcheck="false">${state.mode==='football'?`<label class="sr-only" for="bench-role-${i}">${t('subRole',{n})}</label><select class="bench-role" id="bench-role-${i}"><option value="outfield">${t('outfield')}</option><option value="keeper">${t('goalkeeper')}</option></select>`:''}<button class="bench-enter" id="bench-enter-${i}" type="button"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><path d="M4 7h15m-4-4 4 4-4 4M20 17H5m4-4-4 4 4 4"/></svg>${t('enter')}</button>`;
    grid.append(seat);const name=$('bench-name-'+i),number=$('bench-number-'+i),shirt=$('bench-shirt-'+i);name.value=p.name;number.value=p.number;updateBenchPlayer(i);
    for(const input of [name,number])input.addEventListener('focus',startEdit);
    name.addEventListener('input',()=>{startEdit();state.bench[i].name=name.value;updateBenchPlayer(i);updateBenchCount();renderLineupBench();save();});name.addEventListener('blur',finishEdit);
    name.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();if(i+1<state.bench.length)$('bench-name-'+(i+1)).focus();else name.blur();}});
    number.addEventListener('input',()=>{startEdit();if(/^\d{1,2}$/.test(number.value)){state.bench[i].number=String(Number(number.value));updateBenchPlayer(i);renderLineupBench();save();}});number.addEventListener('blur',()=>{number.value=state.bench[i].number;finishEdit();});
    if(state.mode==='football'){const role=$('bench-role-'+i);role.value=p.keeper?'keeper':'outfield';role.addEventListener('change',()=>{finishEdit();cancelSubstitution();const before=clone(state);state.bench[i].keeper=role.value==='keeper';record(before);updateBenchPlayer(i);renderLineupBench();});}
    seat.querySelector('.bench-remove').addEventListener('click',()=>{mutate(()=>state.bench.splice(i,1));toast(t('subRemoved'));});$('bench-enter-'+i).addEventListener('click',()=>beginSubstitution(i));shirt.addEventListener('click',e=>{if(e.detail===0)beginSubstitution(i);});
    shirt.addEventListener('pointerdown',e=>startBenchDrag(e,i,'shirt'));seat.addEventListener('pointerdown',e=>{if(!e.target.closest('input,select,button,label'))startBenchDrag(e,i,'seat');});
  });
  if(!state.bench.length){const empty=document.createElement('p');empty.className='bench-empty';empty.textContent=t('benchEmpty');grid.append(empty);}
  if(state.bench.length<12){const add=document.createElement('button');add.className='bench-add';add.id='add-substitute';add.innerHTML=icon('plus')+t('addPlayer');add.addEventListener('click',()=>{mutate(()=>{const used=new Set([...state.players,...state.bench].map(p=>Number(p.number)));let number=state.players.length+1;while(used.has(number)&&number<99)number++;state.bench.push({name:'',number:String(number),keeper:false});});$('bench-name-'+(state.bench.length-1)).focus();});grid.append(add);}
}
function updateBenchPlayer(i){const p=state.bench[i],keeper=isKeeper(p,state);$('bench-seat-'+i).dataset.keeper=String(keeper);$('bench-shirt-'+i).innerHTML=jersey(state.kit,p.number,keeper);$('bench-shirt-'+i).setAttribute('aria-label',t('subAction',{name:p.name.trim()||t('subPlaceholder',{n:i+1}),number:p.number}));$('bench-enter-'+i).disabled=!p.name.trim();$('bench-enter-'+i).setAttribute('aria-label',t('enterNamed',{name:p.name.trim()||t('subPlaceholder',{n:i+1})}));}
function beginSubstitution(i){finishEdit();if(!state.bench[i]?.name.trim()){toast(t('nameFirst'));$('bench-name-'+i)?.focus();return;}pendingSub=i;document.querySelectorAll('.bench-seat,.lineup-substitute').forEach(el=>el.classList.toggle('pending',Number(el.dataset.index)===i));$('substitution-message').textContent=t(isKeeper(state.bench[i],state)?'chooseKeeper':'chooseStarter',{name:state.bench[i].name});$('substitution-banner').hidden=false;$('pitch').classList.add('substitution-active');$('substitution-banner').scrollIntoView({block:'nearest',behavior:'smooth'});const target=canSubstitute(state,i,selected)?selected:state.players.find(p=>canSubstitute(state,i,p.id))?.id;$('player-'+target)?.focus({preventScroll:true});}
function cancelSubstitution(){pendingSub=null;$('substitution-banner').hidden=true;$('pitch').classList.remove('substitution-active');document.querySelectorAll('.bench-seat.pending,.lineup-substitute.pending,.player.sub-target').forEach(el=>el.classList.remove('pending','sub-target'));}
function substitute(benchIndex,playerIndex){if(!state.bench[benchIndex]?.name.trim())return;if(!canSubstitute(state,benchIndex,playerIndex)){toast(t(isKeeper(state.bench[benchIndex],state)?'keeperOnly':'outfieldOnly'));return;}const incoming=state.bench[benchIndex].name;mutate(()=>{swapSubstitute(state,benchIndex,playerIndex);selected=playerIndex;});toast(t('entered',{name:incoming}));$('player-'+playerIndex).focus({preventScroll:true});}
// Bench drags: a shirt goes onto a starter or onto another seat; a seat or a card under the pitch changes the bench order.
// Touch on a card waits for a long press so the page still scrolls; the shirt (touch-action:none) drags at once.
function startBenchDrag(e,i,source){
  if(e.button!==0||drag||benchDrag)return;cancelSubstitution();const element=e.currentTarget,hold=e.pointerType!=='mouse'&&source!=='shirt';
  const d=benchDrag={index:i,source,pointer:e.pointerId,x:e.clientX,y:e.clientY,element,armed:!hold,moved:false,target:null,slot:null,ghost:null,timer:null};
  if(hold)d.timer=setTimeout(()=>{if(benchDrag!==d)return;d.armed=true;element.classList.add('drag-armed');navigator.vibrate?.(15);},300);
  else{finishEdit();try{element.setPointerCapture(e.pointerId);}catch{}e.preventDefault();}
}
function benchSlots(d){return [...$(d.source==='lineup'?'lineup-bench-list':'bench-grid').querySelectorAll(d.source==='lineup'?'.lineup-substitute':'.bench-seat')];}
function moveBenchDrag(e){
  if(!benchDrag||e.pointerId!==benchDrag.pointer)return;const d=benchDrag,distance=Math.hypot(e.clientX-d.x,e.clientY-d.y);
  if(!d.armed){if(distance>8)cancelBenchDrag();return;}
  if(!d.moved&&distance<5)return;
  if(!d.moved){d.moved=true;finishEdit();d.ghost=document.createElement('div');d.ghost.className='bench-drag-ghost';d.ghost.setAttribute('aria-hidden','true');const p=state.bench[d.index];d.ghost.innerHTML=jersey(state.kit,p.number,isKeeper(p,state));document.body.append(d.ghost);(d.source==='shirt'?$('bench-seat-'+d.index):d.element).classList.add('drag-source');}
  d.ghost.style.left=e.clientX+'px';d.ghost.style.top=e.clientY+'px';let closest=null,best=Infinity,slot=null;const pitch=$('pitch').getBoundingClientRect();
  if(d.source==='shirt'&&state.bench[d.index].name.trim()&&e.clientX>=pitch.left&&e.clientX<=pitch.right&&e.clientY>=pitch.top&&e.clientY<=pitch.bottom)state.players.forEach(p=>{if(!canSubstitute(state,d.index,p.id))return;const rect=$('player-'+p.id).getBoundingClientRect(),distance=Math.hypot(e.clientX-rect.left-rect.width/2,e.clientY-rect.top-rect.height/2);if(distance<best&&distance<65){best=distance;closest=p.id;}});
  if(closest===null){const hit=benchSlots(d).find(el=>{const r=el.getBoundingClientRect();return e.clientX>=r.left-4&&e.clientX<=r.right+4&&e.clientY>=r.top-4&&e.clientY<=r.bottom+4;});if(hit&&Number(hit.dataset.index)!==d.index)slot=Number(hit.dataset.index);}
  d.target=closest;d.slot=slot;state.players.forEach(p=>$('player-'+p.id).classList.toggle('sub-target',p.id===closest));benchSlots(d).forEach(el=>el.classList.toggle('reorder-target',Number(el.dataset.index)===slot));e.preventDefault();
}
function clearBenchDrag(){if(!benchDrag)return null;const d=benchDrag;benchDrag=null;clearTimeout(d.timer);d.ghost?.remove();try{if(d.element.hasPointerCapture(d.pointer))d.element.releasePointerCapture(d.pointer);}catch{}document.querySelectorAll('.player.sub-target,.reorder-target,.drag-source,.drag-armed').forEach(el=>el.classList.remove('sub-target','reorder-target','drag-source','drag-armed'));return d;}
function endBenchDrag(e){if(!benchDrag||e.pointerId!==benchDrag.pointer)return;const d=clearBenchDrag();if(d.moved){if(d.target!==null)substitute(d.index,d.target);else if(d.slot!==null)reorderSubstitute(d.index,d.slot);else if(d.source==='shirt'&&state.bench[d.index].name.trim())toast(t('dropOnPlayer'));}else if(d.source==='shirt'&&d.armed)beginSubstitution(d.index);}
function cancelBenchDrag(){clearBenchDrag();}
function reorderSubstitute(from,to){mutate(()=>moveSubstitute(state,from,to));}
window.addEventListener('pointermove',moveBenchDrag);window.addEventListener('pointerup',endBenchDrag);window.addEventListener('pointercancel',e=>{if(benchDrag&&e.pointerId===benchDrag.pointer)cancelBenchDrag();});
document.addEventListener('touchmove',e=>{if(benchDrag?.armed)e.preventDefault();},{passive:false});
document.addEventListener('contextmenu',e=>{if(benchDrag)e.preventDefault();});
function buildPlayers(){
  $('players').replaceChildren();$('roster-list').replaceChildren();
  state.players.forEach(p=>{
    const button=document.createElement('button');button.className='player';button.id='player-'+p.id;button.dataset.id=p.id;button.type='button';button.addEventListener('pointerdown',onPointerDown);button.addEventListener('pointermove',onPointerMove);button.addEventListener('pointerup',onPointerEnd);button.addEventListener('pointercancel',onPointerCancel);button.addEventListener('lostpointercapture',()=>{if(drag&&drag.id===p.id)onPointerCancel();});button.addEventListener('click',e=>{if(e.detail===0){if(pendingSub!==null)substitute(pendingSub,p.id);else selectPlayer(p.id,true);}});button.addEventListener('keydown',e=>{
      const delta={ArrowUp:[0,-1],ArrowDown:[0,1],ArrowLeft:[-1,0],ArrowRight:[1,0]}[e.key];if(!delta)return;e.preventDefault();selected=p.id;const step=e.shiftKey?3:1;mutate(()=>{const live=state.players[p.id];live.x=clamp(live.x+delta[0]*step,8,92);live.y=clamp(live.y+delta[1]*step,8,92);});
    });$('players').append(button);
    const row=document.createElement('div');row.className='roster-row';row.id='row-'+p.id;
    row.innerHTML=`<label class="sr-only" for="number-${p.id}">${t('playerNumber',{n:p.id+1})}</label><input class="number-input" type="number" min="0" max="99" step="1" id="number-${p.id}" inputmode="numeric"><div class="name-field"><label class="sr-only" for="name-${p.id}">${t('playerName',{n:p.id+1})}</label><input type="text" id="name-${p.id}" maxlength="30" autocomplete="off" spellcheck="false"></div><span class="position-badge" id="role-${p.id}"></span>`;$('roster-list').append(row);
    const name=$('name-'+p.id),number=$('number-'+p.id);name.placeholder=t(state.mode==='football'?(isKeeper(p,state)?'keeperPlaceholder':'playerPlaceholder'):'role.'+p.role);
    for(const input of [name,number])input.addEventListener('focus',()=>{startEdit();selectPlayer(p.id);});
    name.addEventListener('input',()=>{startEdit();state.players[p.id].name=name.value;renderPlayer(state.players[p.id]);save();});name.addEventListener('blur',finishEdit);
    name.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();if(p.id+1<state.players.length){$('name-'+(p.id+1)).focus();$('name-'+(p.id+1)).select();}else{name.blur();$('player-'+p.id).focus();}}});
    number.addEventListener('input',()=>{startEdit();if(/^\d{1,2}$/.test(number.value)){state.players[p.id].number=String(Number(number.value));renderPlayer(state.players[p.id]);save();}});number.addEventListener('blur',()=>{number.value=state.players[p.id].number;finishEdit();});
  });
}
function onPointerDown(e){if(e.button!==0||drag||benchDrag)return;finishEdit();const id=Number(e.currentTarget.dataset.id);if(pendingSub!==null){e.preventDefault();substitute(pendingSub,id);return;}selectPlayer(id);const rect=$('pitch').getBoundingClientRect();drag={id,pointer:e.pointerId,x:e.clientX,y:e.clientY,startX:state.players[id].x,startY:state.players[id].y,rect,before:clone(state),moved:false,element:e.currentTarget};e.currentTarget.setPointerCapture(e.pointerId);e.preventDefault();}
function onPointerMove(e){if(!drag||e.pointerId!==drag.pointer)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(!drag.moved&&Math.hypot(dx,dy)<4)return;drag.moved=true;drag.element.classList.add('dragging');const p=state.players[drag.id];p.x=clamp(drag.startX+dx/drag.rect.width*100,8,92);p.y=clamp(drag.startY+dy/drag.rect.height*100,8,92);drag.element.style.left=p.x+'%';drag.element.style.top=p.y+'%';e.preventDefault();}
function onPointerEnd(e){if(!drag||e.pointerId!==drag.pointer)return;const done=drag;drag=null;done.element.classList.remove('dragging');if(done.element.hasPointerCapture(e.pointerId))done.element.releasePointerCapture(e.pointerId);if(done.moved)record(done.before);else selectPlayer(done.id,true);}
function onPointerCancel(){if(!drag)return;const cancelled=drag;drag=null;cancelled.element.classList.remove('dragging');if(cancelled.element.hasPointerCapture(cancelled.pointer))cancelled.element.releasePointerCapture(cancelled.pointer);state=cancelled.before;render();}
function filename(composition=state){return (teamLabel(composition)).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9]+/g,'-').replace(/^-|-$/g,'').toLowerCase()||'team';}
function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
function fitText(ctx,text,maxWidth){let shortened=text;while(ctx.measureText(shortened).width>maxWidth&&shortened.length>1)shortened=shortened.slice(0,-1);return shortened!==text?shortened.slice(0,-1)+'…':text;}
async function exportImage(){
  finishEdit();const button=$('export-image');button.disabled=true;const snapshot=clone(state);
  try{
    const namedBench=namedSubstitutes(snapshot),dense=snapshot.players.length>11,W=900,px=54,py=154,pw=792,ph=Math.round(pw*SPORTS[snapshot.mode].height/500),bottom=py+ph,rows=Math.ceil(namedBench.length/3),H=bottom+(rows?183+rows*70:128);
    const canvas=document.createElement('canvas');canvas.width=W*2;canvas.height=H*2;const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Canvas unavailable');
    const measure=document.createElement('canvas').getContext('2d');measure.font=`600 ${dense?14:17}px Arial`;
    const playerSvg=snapshot.players.map(p=>{const x=px+p.x*pw/100,y=py+p.y*ph/100,name=fitText(measure,playerLabel(p),dense?110:145),width=Math.max(44,measure.measureText(name).width+20);return `<g transform="translate(${x} ${y})"><svg x="${dense?-38:-47}" y="${dense?-43:-54}" width="${dense?76:94}" height="${dense?69:85}" viewBox="0 0 100 90" fill="none">${jersey(snapshot.kit,p.number,isKeeper(p,snapshot)).replace(/^<svg[^>]*>|<\/svg>$/g,'')}</svg><rect x="${-width/2}" y="${dense?29:35}" width="${width}" height="${dense?25:30}" rx="5" fill="#161c21"/><text x="0" y="${dense?46:56}" text-anchor="middle" font-family="Arial,sans-serif" font-size="${dense?14:17}" font-weight="600" fill="#fff">${escapeXml(name)}</text></g>`;}).join('');
    measure.font='600 16px Arial';
    const benchSvg=rows?`<path d="M54 ${bottom+36}h792" stroke="#535c69" stroke-opacity=".5"/><text x="54" y="${bottom+69}" fill="#c6cdd7" font-family="Arial,sans-serif" font-size="16" letter-spacing="3">${escapeXml(t('substitutes').toLocaleUpperCase(language))}</text>${namedBench.map((p,i)=>{const keeper=isKeeper(p,snapshot),name=fitText(measure,p.name.trim(),173);return `<g transform="translate(${54+i%3*272} ${bottom+90+Math.floor(i/3)*70})"><rect width="248" height="56" rx="7" fill="#292f37" stroke="#454f5d"/><svg x="9" y="8" width="43" height="39" viewBox="0 0 100 90" fill="none">${jersey(snapshot.kit,p.number,keeper).replace(/^<svg[^>]*>|<\/svg>$/g,'')}</svg><text x="63" y="${keeper?25:34}" fill="#f0f2f5" font-size="16" font-family="Arial,sans-serif" font-weight="600">${escapeXml(name)}</text>${keeper?`<text x="63" y="43" fill="#ccd78b" font-size="11" font-family="Arial,sans-serif">${escapeXml(t('goalkeeper'))}</text>`:''}</g>`;}).join('')}`:'';
    measure.font='700 30px Arial';const heading=fitText(measure,teamLabel(snapshot),490),badge=snapshot.mode==='football'?snapshot.formation:t(SPORTS[snapshot.mode].label);
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="900" height="${H}" fill="#1c2025"/><path d="M0 0h900v6H0Z" fill="#ff614c"/><svg x="55" y="52" width="54" height="65" viewBox="0 0 40 48">${crest().replace(/^<svg[^>]*>|<\/svg>$/g,'')}</svg><text x="128" y="81" fill="#fff" font-family="Arial,sans-serif" font-size="30" font-weight="700">${escapeXml(heading)}</text><text x="130" y="110" fill="#aeb4bd" font-family="Arial,sans-serif" font-size="12" letter-spacing="3">${escapeXml(startingLabel().toLocaleUpperCase(language))}</text><rect x="656" y="66" width="190" height="40" rx="7" fill="#181c21" stroke="#4b535d"/><text x="751" y="92" text-anchor="middle" fill="#e2e5e9" font-family="Arial,sans-serif" font-size="16">${escapeXml(badge)}</text><svg x="${px}" y="${py}" width="${pw}" height="${ph}" viewBox="0 0 500 ${SPORTS[snapshot.mode].height}" preserveAspectRatio="none">${pitchArt(snapshot.mode)}</svg>${playerSvg}${benchSvg}<text x="55" y="${H-58}" fill="#fff" font-family="Arial,sans-serif" font-size="32" font-weight="900" font-style="italic" letter-spacing="-1.5">Squadraw<tspan fill="#ff614c">.com</tspan></text><text x="846" y="${H-62}" text-anchor="end" fill="#aeb4bd" font-family="Arial,sans-serif" font-size="14">${escapeXml(t('footerNote'))}</text></svg>`;
    const img=new Image(),url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml;charset=utf-8'}));try{await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=url;});ctx.drawImage(img,0,0,canvas.width,canvas.height);}finally{URL.revokeObjectURL(url);}
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw new Error('PNG unavailable');download(blob,`squadraw-${snapshot.mode}-${filename(snapshot)}.png`);toast(t('exportDone'));
  }catch(error){toast(t('exportError'));}finally{button.disabled=false;}
}
// Controls are wired once; the roster and kits are rebuilt only when the mode/language changes.
for(const [code,info] of Object.entries(LANGUAGES)){const button=document.createElement('button');button.dataset.language=code;button.textContent=info.label;button.lang=code;button.setAttribute('aria-label',info.name);button.addEventListener('click',()=>setLanguage(code));$('language-switch').append(button);}
document.querySelectorAll('[data-sport-choice]').forEach(b=>b.addEventListener('click',()=>switchMode(b.dataset.sportChoice==='football'?'football':workspace.lastRugby)));
document.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>switchMode(b.dataset.mode)));
for(const f of Object.keys(FORMATIONS)){const b=document.createElement('button');b.className='formation';b.dataset.formation=f;b.textContent=f;b.addEventListener('click',()=>{mutate(()=>{state.formation=f;state.players.forEach((p,i)=>{[p.x,p.y,p.role]=FORMATIONS[f][i];});});toast(t('formationSet',{formation:f}));});$('formations').append(b);}
$('cancel-substitution').addEventListener('click',cancelSubstitution);
$('team-name').addEventListener('focus',startEdit);$('team-name').addEventListener('input',()=>{startEdit();state.team=$('team-name').value;$('board-team').textContent=teamLabel();save();});$('team-name').addEventListener('blur',finishEdit);
for(const [id,key] of [['body-color','body'],['sleeve-color','sleeve'],['accent-color','accent']]){$(id).addEventListener('input',()=>{startEdit();state.kit[key]=$(id).value;state.kit.id='custom';renderKit();renderPlayers();state.bench.forEach((_,i)=>updateBenchPlayer(i));renderLineupBench();save();});$(id).addEventListener('change',finishEdit);$(id).addEventListener('blur',finishEdit);}
$('keeper-color').addEventListener('input',()=>{startEdit();state.keeper=$('keeper-color').value;renderPlayers();state.bench.forEach((_,i)=>updateBenchPlayer(i));renderLineupBench();save();});$('keeper-color').addEventListener('change',finishEdit);$('keeper-color').addEventListener('blur',finishEdit);
$('pattern').addEventListener('change',()=>mutate(()=>{state.kit.pattern=$('pattern').value;state.kit.id='custom';}));
$('reset-positions').addEventListener('click',()=>{mutate(()=>state.players.forEach((p,i)=>{[p.x,p.y,p.role]=slots(state)[i];}));toast(t('resetDone'));});
$('undo').addEventListener('click',undo);$('redo').addEventListener('click',redo);
document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(drag)onPointerCancel();cancelBenchDrag();cancelSubstitution();return;}if((e.ctrlKey||e.metaKey)&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)){if(e.key.toLowerCase()==='z'){e.preventDefault();e.shiftKey?redo():undo();}else if(e.key.toLowerCase()==='y'){e.preventDefault();redo();}}});
$('bulk-toggle').addEventListener('click',()=>{const open=$('bulk-content').hidden;$('bulk-content').hidden=!open;$('bulk-toggle').setAttribute('aria-expanded',String(open));if(open)$('bulk-names').focus();});
$('apply-names').addEventListener('click',()=>{const names=$('bulk-names').value.split(/\r?\n/).map(n=>n.trim()).filter(Boolean);if(!names.length){toast(t('oneName'));return;}if(names.length>state.players.length){toast(t('tooManyNames',{count:state.players.length}));return;}if(names.some(n=>n.length>30)){toast(t('longName'));return;}mutate(()=>names.forEach((name,i)=>{state.players[i].name=name;}));$('bulk-content').hidden=true;$('bulk-toggle').setAttribute('aria-expanded','false');$('bulk-names').value='';toast(t('namesAdded',{count:names.length}));});
$('save-file').addEventListener('click',()=>{finishEdit();download(new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),`squadraw-${state.mode}-${filename()}.json`);toast(t('fileSaved'));});
$('load-file').addEventListener('click',()=>$('file-input').click());
$('file-input').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>100000)throw new Error('File too large');const loaded=validateState(JSON.parse(await file.text()));if(loaded.mode!==state.mode)switchMode(loaded.mode);mutate(()=>{state=loaded;});setupMode();render();save();toast(t('fileLoaded'));}catch(error){toast(t('fileError'));}finally{e.target.value='';}});
$('export-image').addEventListener('click',exportImage);
window.addEventListener('pagehide',()=>{finishEdit();save();});
applyLanguage();showLanguageAddress();setupMode();render();save();if(!storageReadable)toast(t('storageError'));
