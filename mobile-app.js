/* Mobile presentation only. The existing records, financial functions and sync driver remain authoritative. */
(function(){
 const mobile=matchMedia('(max-width:750px)'),main=document.querySelector('main'),sidebar=document.querySelector('body>aside');
 const $=id=>document.getElementById(id),expansion=new Map();
 const header=document.createElement('header');header.id='appMobileHeader';header.innerHTML='<button type="button" class="app-home-logo" aria-label="Home"><img alt="My Dashboard"></button><div class="app-header-copy"><strong id="appPageTitle">Home</strong><span id="appSyncIndicator" aria-label="Sync status">Connecting…</span></div><button type="button" id="appSettingsButton" aria-label="Account and settings">⚙</button>';
 header.querySelector('img').src=sidebar.querySelector('.brand img').src;document.body.prepend(header);
 const settings=document.createElement('dialog');settings.id='appSettings';settings.innerHTML='<div class="app-dialog-heading"><h2>Account & settings</h2><button type="button" class="secondary" id="appSettingsClose">Close</button></div><div id="appSettingsContent"></div>';
 document.body.append(settings);$('appSettingsClose').onclick=()=>settings.close();header.querySelector('.app-home-logo').onclick=()=>navigate('Overview');$('appSettingsButton').onclick=openSettings;
 const error=document.createElement('section');error.id='appSyncError';error.hidden=true;error.setAttribute('role','alert');error.innerHTML='<p></p><button type="button" class="secondary">Resolve sync</button>';error.querySelector('button').onclick=openSettings;main.prepend(error);
 const syncBar=document.querySelector('.fb-sync-bar'),footer=document.querySelector('main>.footer'),syncAnchor=document.createComment('desktop sync panel'),backupAnchor=document.createComment('desktop backup controls');syncBar.before(syncAnchor);footer.before(backupAnchor);
 function openSettings(){if(!settings.open)settings.showModal()}
 function navigate(name){go(name);window.scrollTo(0,0)}
 function refreshStatus(){
  const text=$('fbSyncStatus')?.textContent||'Local-only mode';
  const bad=/fail|unavailable|conflict|permission|blocked|could not|missing|unable|another device changed|unsynced edits and newer|sign.in could not/i.test(text);
  const syncing=/saving|connecting|syncing|waiting|starting/i.test(text),local=/local.only|sign in to sync/i.test(text);
  const label=bad?'Needs attention':local?'On this device':syncing?'Syncing…':'Synced';
  if($('appSyncIndicator').textContent!==label)$('appSyncIndicator').textContent=label;
  $('appSyncIndicator').dataset.error=String(bad);$('appSyncIndicator').title=text;
  error.hidden=!bad;if(error.querySelector('p').textContent!==text)error.querySelector('p').textContent=text;
 }
 new MutationObserver(refreshStatus).observe($('fbSyncStatus'),{childList:true,subtree:true,characterData:true});
 function setupShell(){
  document.body.classList.toggle('app-mobile',mobile.matches);document.body.classList.toggle('app-mobile-home',mobile.matches&&page==='Overview');document.body.classList.toggle('app-mobile-calendar',mobile.matches&&page==='Calendar');document.body.classList.toggle('app-mobile-finance',mobile.matches&&page==='Finances');
  if(mobile.matches){$('appSettingsContent').append(syncBar,footer)}else{syncAnchor.after(syncBar);backupAnchor.after(footer);if(settings.open)settings.close()}
  $('appPageTitle').textContent=({Overview:'Home','Quick notes':'Notes','Daily priorities':'Tasks'})[page]||page;
  const bottom=$('phoneBottomNavigation');bottom.replaceChildren();
  [['Overview','Home','⌂'],['Calendar','Calendar','▦'],['Quick notes','Notes','✎'],['Daily priorities','Tasks','✓'],['Finances','Finances','$']].forEach(([target,label,icon])=>{
   const b=document.createElement('button');b.type='button';b.innerHTML='<span aria-hidden="true">'+icon+'</span>'+label;if(page===target)b.setAttribute('aria-current','page');b.onclick=()=>navigate(target);bottom.append(b);
  });
  refreshStatus();
 }
 function simpleDialog(id,title){$(id)?.remove();const d=document.createElement('dialog');d.id=id;d.className='app-action-dialog';d.innerHTML='<div class="app-dialog-heading"><h2>'+esc(title)+'</h2><button type="button" class="secondary">Close</button></div><div class="app-dialog-content"></div>';d.querySelector('button').onclick=()=>d.close();d.addEventListener('close',()=>d.remove(),{once:true});document.body.append(d);return d}
 function actionButton(text,fn){const b=document.createElement('button');b.type='button';b.className='secondary';b.textContent=text;b.onclick=fn;return b}
 function choiceDialog(title,choices){const d=simpleDialog('appFinanceAction',title);for(const [label,fn] of choices)d.lastElementChild.append(actionButton(label,()=>{d.close();fn()}));d.showModal()}
 function finance(){
  const summary=content.querySelector('.finance-account-summary');if(!summary)return;
  const selectors=summary.querySelector('.person-budget-selectors'),totals=summary.querySelector('.simple-budget-totals');
  const optionNodes=[...summary.querySelectorAll('button')].filter(b=>/archiveFinanceMonth|personModal|personOpening/.test(b.getAttribute('onclick')||''));
  const options=document.createElement('details');options.className='app-finance-options';options.innerHTML='<summary>Finance options</summary><div></div>';
  for(const b of optionNodes)options.lastElementChild.append(b);
  const help=document.createElement('details');help.className='app-finance-help';help.innerHTML='<summary>How this works</summary><div></div>';
  for(const p of [...summary.querySelectorAll('p')])help.lastElementChild.append(p);
  summary.querySelector('.finance-month-archive-actions')?.remove();
  for(const b of [...summary.querySelectorAll('button')])if(/personTransferModal/.test(b.getAttribute('onclick')||''))b.remove();
  const figures=[...totals.children];figures[2]?.classList.add('app-money-left');if(figures[2])totals.prepend(figures[2]);
  const actions=document.createElement('div');actions.className='app-finance-actions';
  const add=actionButton('＋ Add',()=>choiceDialog('Add to finances',[['Bill',()=>expenseModal()],['Income',()=>incomeModal()],['Savings',()=>savingsEntryModal('deposit')],['Transfer',()=>personTransferModal()]]));add.className='primary';actions.append(add,options);
  summary.append(selectors,totals,actions,help);
  const amounts=personBudgetEntries(financePerson,budgetMonth),saving=savingsLedgerTotals(financePerson,budgetMonth),transfers=personTransferTotals(financePerson,budgetMonth);
  const sections=[...content.querySelectorAll('.finance-collapsible')];
  const ordered=['Bills & expenses','Income','Savings','Transfers','Finance archive'];
  for(const name of ordered){const section=sections.find(s=>s.querySelector('summary h2')?.textContent===name);if(!section)continue;
   const summaryHeading=section.querySelector(':scope>summary');const badge=document.createElement('span');badge.className='app-section-total';
   badge.textContent=name==='Bills & expenses'?money(amounts.expenses/100):name==='Income'?money(amounts.income/100):name==='Savings'?money(saving.balance/100):name==='Transfers'?'In '+money(transfers.received/100)+' · Out '+money(transfers.sent/100):financeArchiveMonths(financePerson).length+' months';
   if(name==='Finance archive')summaryHeading.querySelector('h2').textContent='Archive';summaryHeading.append(badge);
   const key=dashboardActivePrefix+name;section.open=expansion.has(key)?expansion.get(key):name==='Bills & expenses';
   section.addEventListener('toggle',()=>{if(section.isConnected)expansion.set(key,section.open)});
   const body=section.querySelector('.finance-collapsible-body');
   const longHelp=[...body.querySelectorAll(':scope>p.muted')];if(longHelp.length){const box=document.createElement('details');box.className='app-finance-help';box.innerHTML='<summary>How this works</summary>';longHelp.forEach(p=>box.append(p));body.append(box)}
   // The unified Add control replaces only add buttons; withdrawal/edit/restore actions stay intact.
   body.querySelectorAll('.cardhead button').forEach(b=>{if(/add (income|bill|savings|transfer)/i.test(b.textContent))b.remove()});
   content.append(section);
  }
  // Preserve all live handlers while presenting each original table row as a labelled card.
  content.querySelectorAll('.table-scroll table').forEach(table=>{const headings=[...table.querySelectorAll('thead th')].map(h=>h.textContent.trim());table.querySelectorAll('tbody tr').forEach(row=>[...row.children].forEach((cell,i)=>{cell.dataset.columnLabel=headings[i]||'';if(/amount|balance/i.test(headings[i]||''))cell.classList.add('app-currency')}))});
 }
 function eventDetails(id){
  const event=state.events.find(e=>e.id===id);if(!event)return;
  const d=simpleDialog('appEventDetails',event.title);const body=d.lastElementChild;
  const dates=document.createElement('p');dates.textContent=calendarDateRange(event);body.append(dates);
  const time=document.createElement('p');time.textContent=calendarTimeRange(event)||'All day';body.append(time);
  const repeat=document.createElement('p');repeat.textContent=event.repeatYearly?'Repeats yearly from the saved start date.':'Does not repeat.';body.append(repeat);
  for(const [key,value] of Object.entries(event))if(!['id','title','date','endDate','time','endTime','repeatYearly'].includes(key)&&typeof value==='string'&&value){const field=document.createElement('p');field.textContent=key+': '+value;body.append(field)}
  body.append(actionButton('Edit entry',()=>{d.close();editEntry('events',id)}),actionButton('Delete',()=>{if(confirm('Delete this calendar entry and its repeating occurrences?')){d.close();remove('events',id)}}));d.showModal();
 }
 function allEvents(){
  const d=simpleDialog('appAllEvents','All calendar entries');const body=d.lastElementChild;
  const label=document.createElement('label');label.textContent='Find any entry, including past and yearly events';const search=document.createElement('input');search.type='search';search.placeholder='Title or MM/DD/YYYY';label.append(search);const list=document.createElement('div');list.className='app-event-list';body.append(label,list);
  function fill(){list.replaceChildren();const q=search.value.toLowerCase();const events=[...state.events].sort((a,b)=>a.date.localeCompare(b.date)).filter(e=>(e.title+' '+calendarDateRange(e)+' '+calendarTimeRange(e)+(e.repeatYearly?' yearly':'')).toLowerCase().includes(q));for(const e of events){const b=eventButton(e);b.onclick=()=>{d.close();eventDetails(e.id)};list.append(b)}if(!events.length){const p=document.createElement('p');p.textContent='No entries found.';list.append(p)}}search.oninput=fill;fill();d.showModal();
 }
 function eventButton(event){const b=document.createElement('button');b.type='button';b.className='app-event';const title=document.createElement('strong');title.textContent=event.title;const detail=document.createElement('span');detail.textContent=calendarDateRange(event)+' · '+(calendarTimeRange(event)||'All day')+(event.repeatYearly?' · Yearly':'');b.append(title,detail);b.onclick=()=>eventDetails(event.id);return b}
 function calendar(){
  const card=document.createElement('section');card.className='card app-calendar';card.innerHTML=cal();
  const toolbar=document.createElement('div');toolbar.className='app-calendar-actions';toolbar.append(actionButton('＋ Add entry',()=>openAdd('events')),actionButton('All entries',allEvents));card.prepend(toolbar);
  const events=document.createElement('section');events.className='card app-day-events';const h=document.createElement('h2');h.textContent='Events · '+displayUSDate(selected);events.append(h);
  const entries=state.events.filter(e=>eventOnDate(e,selected));entries.forEach(e=>events.append(eventButton(e)));if(!entries.length){const p=document.createElement('p');p.textContent='No events on this day.';events.append(p)}
  card.querySelectorAll('.week-event').forEach(el=>{const edit=el.querySelector('button[onclick]');const id=edit?.getAttribute('onclick')?.match(/editEntry\('events','([^']+)'/);if(!id)return;el.tabIndex=0;el.setAttribute('role','button');el.setAttribute('aria-label','Event details: '+el.querySelector('b')?.textContent);el.onclick=()=>eventDetails(id[1]);el.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();eventDetails(id[1])}};edit.remove()});
  content.replaceChildren(card,events);
 }
 function enhance(){setupShell();if(!mobile.matches)return;if(page==='Finances')finance();if(page==='Calendar')calendar()}
 function sizeForKeyboard(){document.documentElement.style.setProperty('--app-viewport-height',(window.visualViewport?.height||window.innerHeight)+'px')}
 sizeForKeyboard();window.visualViewport?.addEventListener('resize',sizeForKeyboard);window.addEventListener('resize',sizeForKeyboard);
 const previousRender=render;render=function(){previousRender();enhance()};
 mobile.addEventListener('change',()=>render());
 // Keep focused fields above the keyboard without fixing the height of their form.
 document.addEventListener('focusin',e=>{if(mobile.matches&&e.target.matches('input,textarea,select'))setTimeout(()=>{if(e.target.isConnected)e.target.scrollIntoView({block:'nearest',inline:'nearest'})},250)});
 enhance();window.DashboardMobileUI={refresh:enhance,openSettings,eventDetails,allEvents};
})();
