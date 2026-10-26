/* Four working additions. Modules are imported only after the user opens an activity. */
(function(){
 const entries=[{id:'water-sort',name:'Water Sort',category:'play',symbol:'◒',description:'Pour colors · Undo & hints'},{id:'memory-match',name:'Memory Match',category:'play',symbol:'✦',description:'Find pairs · Untimed option'},{id:'ripple-pond',name:'Ripple Pond',category:'relax',symbol:'◎',description:'Gentle ripples & floating petals'},{id:'glow-sand',name:'Glow Sand',category:'relax',symbol:'≋',description:'Draw & rake pastel sand'}];
 let active=null,generation=0;
 function button(text,fn,cls='secondary'){const b=document.createElement('button');b.type='button';b.className=cls;b.textContent=text;b.onclick=fn;return b}
 function stop(){if(active){active.dispose?.();active=null}generation++}
 function saved(id){const value=state.glowActivities?.[id];return value?JSON.parse(JSON.stringify(value)):null}
 async function open(id){
  const entry=entries.find(e=>e.id===id);if(!entry||page!=='Games')return;
  stop();cancelAnimationFrame(gameFrame);clearTimeout(gameTimer);const token=generation,owner=state,scope=dashboardActivePrefix;
  content.querySelectorAll(':scope>.glow-game-library,:scope>.games-card').forEach(e=>e.hidden=true);document.getElementById('glowActivity')?.remove();
  const panel=document.createElement('section');panel.className='card glow-activity';panel.id='glowActivity';panel.dataset.activity=id;panel.dataset.category=entry.category;
  const header=document.createElement('div');header.className='activity-heading';const title=document.createElement('h2');title.textContent=entry.name;header.append(button('← Game library',()=>render()),title);panel.append(header);const body=document.createElement('div');body.className='activity-body';const loading=document.createElement('p');loading.textContent='Opening '+entry.name+'…';body.append(loading);panel.append(body);content.append(panel);
  active={id,dispose:null};
  try{
   const module=await import('./activities/'+id+'.mjs');
   if(token!==generation||page!=='Games'||state!==owner||dashboardActivePrefix!==scope||!panel.isConnected)return;
   body.replaceChildren();const context={initial:saved(id),reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches,persist(data){if(token!==generation||state!==owner||dashboardActivePrefix!==scope)return false;if(!state.glowActivities||typeof state.glowActivities!=='object')state.glowActivities={};state.glowActivities[id]=JSON.parse(JSON.stringify(data));save();return true}};
   active.dispose=module.mount(body,context);
  }catch(error){if(token!==generation)return;body.replaceChildren();const message=document.createElement('p');message.setAttribute('role','alert');message.textContent='This activity could not load. Make sure the activities folder was uploaded, then try again.';body.append(message,button('Try again',()=>open(id)),button('Back to library',()=>render()));console.error('Activity load failed',id,error)}
 }
 function decorate(){
  if(page!=='Games')return;const library=content.querySelector('.glow-game-library');if(!library||library.dataset.categories==='ready')return;library.dataset.categories='ready';
  const oldGrid=library.querySelector('.glow-game-grid'),play=document.createElement('section'),relax=document.createElement('section');play.id='glowPlayPuzzles';relax.id='glowRelaxUnwind';play.className=relax.className='activity-category';play.setAttribute('role','tabpanel');relax.setAttribute('role','tabpanel');
  const playTitle=document.createElement('h3');playTitle.textContent='Play & Puzzles';play.append(playTitle);const newPlay=document.createElement('div');newPlay.className='glow-game-grid';play.append(newPlay);
  const classic=document.createElement('h3');classic.textContent='Your existing games';play.append(classic,oldGrid);
  const relaxTitle=document.createElement('h3');relaxTitle.textContent='Relax & Unwind';const intro=document.createElement('p');intro.className='activity-message';intro.textContent='Explore at your own pace. No countdowns or scores. Sound starts off.';relax.append(relaxTitle,intro);const newRelax=document.createElement('div');newRelax.className='glow-game-grid';relax.append(newRelax);
  entries.forEach(entry=>{const b=button('',()=>open(entry.id),'glow-game-tile');b.dataset.activity=entry.id;const symbol=document.createElement('span');symbol.setAttribute('aria-hidden','true');symbol.textContent=entry.symbol;const name=document.createElement('strong');name.textContent=entry.name;const description=document.createElement('small');description.textContent=entry.description;b.append(symbol,name,description);(entry.category==='play'?newPlay:newRelax).append(b)});
  const tabs=document.createElement('div');tabs.className='activity-category-tabs';tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','Game categories');
  const playButton=button('Play & Puzzles',()=>choose('play',true)),relaxButton=button('Relax & Unwind',()=>choose('relax',true));playButton.id='glowPlayTab';relaxButton.id='glowRelaxTab';playButton.setAttribute('role','tab');relaxButton.setAttribute('role','tab');playButton.setAttribute('aria-controls',play.id);relaxButton.setAttribute('aria-controls',relax.id);play.setAttribute('aria-labelledby',playButton.id);relax.setAttribute('aria-labelledby',relaxButton.id);tabs.append(playButton,relaxButton);
  function choose(category,persist=false){const relaxing=category==='relax';play.hidden=relaxing;relax.hidden=!relaxing;playButton.setAttribute('aria-selected',String(!relaxing));relaxButton.setAttribute('aria-selected',String(relaxing));playButton.tabIndex=relaxing?-1:0;relaxButton.tabIndex=relaxing?0:-1;if(persist){state.glowActivities??={};state.glowActivities._settings={...(state.glowActivities._settings||{}),category};save()}}
  tabs.onkeydown=e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();const target=e.key==='Home'?playButton:e.key==='End'?relaxButton:document.activeElement===playButton?relaxButton:playButton;target.click();target.focus()}};
  library.append(tabs,play,relax);choose(state.glowActivities?._settings?.category||'play');
 }
 const before=render;render=function(){stop();before();decorate()};
 // Unmount when navigation/account changes replace the scene; no animation or audio survives it.
 addEventListener('pagehide',stop);decorate();
 window.GlowActivities={open,stop,get active(){return active?.id||null}};
})();
