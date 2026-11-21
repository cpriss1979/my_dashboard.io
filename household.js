(function(){
  'use strict';
  const routines={
    daily:['Make the beds','Wash or load the dishes','Wipe kitchen counters and table','Sweep up kitchen crumbs','Put stray items back where they belong','Put dirty clothes in the hamper','Check the trash and empty it if full','Do a quick living room tidy'],
    weekly:['Vacuum and sweep floors','Mop hard floors','Clean toilets and sinks','Clean the shower or tub','Change bed sheets','Dust surfaces','Wipe kitchen counters and appliances','Empty household trash','Do laundry'],
    monthly:['Clean inside the microwave','Wipe refrigerator shelves','Wash bath mats','Dust ceiling fans and vents','Wipe cabinet fronts','Check pantry for expired food','Clean mirrors and interior glass','Vacuum under furniture'],
    yearly:['Wash curtains or clean blinds','Deep-clean carpets and upholstery','Wash windows and screens','Declutter closets and donate items','Deep-clean the oven','Clean behind the refrigerator','Sort seasonal storage','Wash walls and baseboards']
  };
  const periods={daily:'Daily',weekly:'Weekly',monthly:'Monthly',yearly:'Yearly'};
  const el=(tag,text,cls)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(cls)node.className=cls;return node};
  const button=(text,action,cls='secondary')=>{const node=el('button',text,cls);node.type='button';node.onclick=action;return node};
  const label=(text,field)=>{const node=el('label',text);node.append(field);return node};
  const nav=()=>document.querySelector('aside nav');
  let selectedPeriod='daily';
  let refreshChores;
  function chores(){
    const presets=(period,titles)=>titles.map((title,index)=>({id:period+'-'+index,title,period}));
    if(!Array.isArray(state.chores)){
      state.chores=Object.entries(routines).flatMap(([period,titles])=>presets(period,titles));
      state.dailyChoresInitialized=true;
    }else if(!state.dailyChoresInitialized){
      if(!state.chores.some(item=>item.period==='daily'))state.chores.push(...presets('daily',routines.daily));
      state.dailyChoresInitialized=true;
    }
    return state.chores;
  }
  function cycle(period,date=new Date()){
    if(period==='daily')return localDate(date);
    if(period==='yearly')return String(date.getFullYear());
    if(period==='monthly')return localDate(date).slice(0,7);
    const monday=new Date(date.getFullYear(),date.getMonth(),date.getDate());
    monday.setDate(monday.getDate()-(monday.getDay()+6)%7);
    return localDate(monday);
  }
  function paintChores(){
    const root=el('div',undefined,'household-chores');
    const hero=el('section',undefined,'household-hero');
    hero.append(el('h2','Chores'),el('p','Check off your cleaning as you go. Each list starts fresh at the next day, week, month, or year.'));
    const tabs=el('div',undefined,'household-actions');
    for(const [period,text] of Object.entries(periods)){
      const tab=button(text,()=>{selectedPeriod=period;paintChores();document.querySelector('.household-actions [aria-pressed=true]')?.focus()});
      tab.setAttribute('aria-pressed',String(selectedPeriod===period));tabs.append(tab);
    }
    const panel=el('section',undefined,'card household-checklist');
    const entry=el('form',undefined,'household-actions');
    const title=el('input');title.required=true;title.maxLength=120;title.placeholder='Add a chore…';title.setAttribute('aria-label','Chore name');
    const add=el('button','＋ Add chore','primary');add.type='submit';
    entry.append(title,add);
    const progress=el('p');progress.setAttribute('aria-live','polite');
    const list=el('div');
    const archive=el('details',undefined,'chores-archive');
    const archiveTitle=el('summary');
    const archiveItems=el('div');
    const deleteArchived=button('Delete all archived',()=>{
      if(!confirm('Permanently delete all archived chores in this view?'))return;
      state.chores=chores().filter(item=>item.period!==period||!item.archived);
      save();draw();
    });
    archive.append(archiveTitle,deleteArchived,archiveItems);
    const clear=button('Clear completed',()=>{
      const current=cycle(period);
      for(const item of chores()){
        if(item.period!==period||item.archived||item.checked!==current)continue;
        item.checked='';
      }
      save();draw();
    });
    panel.append(el('h3',selectedPeriod==='daily'?'Daily house upkeep':periods[selectedPeriod]+' cleaning'),progress,entry,clear,list,archive);
    const period=selectedPeriod;
    let displayedCycle;
    function draw(){
      const current=cycle(period);
      displayedCycle=current;
      const records=chores().filter(item=>item.period===period&&!item.archived);
      clear.disabled=!records.some(item=>item.checked===current);
      progress.textContent=records.filter(item=>item.checked===current).length+' of '+records.length+' finished '+({daily:'today',weekly:'this week',monthly:'this month',yearly:'this year'}[period]);
      list.replaceChildren();
      for(const item of records){
        const row=el('div',undefined,'household-chore-row');
        const check=el('input');check.type='checkbox';check.checked=item.checked===current;
        check.onchange=()=>{item.checked=check.checked?cycle(period):'';save();draw();list.querySelectorAll('input')[records.indexOf(item)]?.focus()};
        const name=label(item.title,check);name.prepend(check);
        const menu=el('details');menu.append(el('summary','Options'),button('Rename',()=>{
          const next=prompt('Chore name',item.title)?.trim().slice(0,120);
          if(next){item.title=next;save();draw()}
        }),button('Archive',()=>{
          item.archived=true;save();draw();title.focus();
        }));
        row.append(name,menu);list.append(row);
      }
      const archived=chores().filter(item=>item.period===period&&item.archived);
      archiveTitle.textContent='Archive ('+archived.length+')';
      deleteArchived.hidden=!archived.length;
      archiveItems.replaceChildren();
      for(const item of archived){
        const row=el('div',undefined,'household-chore-row');
        row.append(el('span',item.title),button('Restore',()=>{delete item.archived;item.checked='';save();draw()}),
          button('Delete',()=>{if(!confirm('Permanently delete '+item.title+'?'))return;state.chores=chores().filter(record=>record.id!==item.id);save();draw()}));
        archiveItems.append(row);
      }
      if(!archived.length)archiveItems.append(el('p','No archived chores.'));
      if(!records.length)list.append(el('p','Add a chore to start this checklist.'));
    }
    entry.onsubmit=event=>{
      event.preventDefault();const name=title.value.trim();if(!name)return;
      chores().push({id:crypto.randomUUID(),title:name,period});title.value='';save();draw();title.focus();
    };
    hero.append(tabs);root.append(hero,panel);content.replaceChildren(root);draw();
    refreshChores=()=>{if(root.isConnected&&displayedCycle!==cycle(period))draw()};
  }
  setInterval(()=>refreshChores?.(),30000);
  addEventListener('focus',()=>refreshChores?.());
  function navigationOptions(){
    const appSettings=document.getElementById('appSettings');
    appSettings?.close();
    const dialog=el('dialog',undefined,'priss-options-dialog household-settings');
    const form=el('form');
    const fields=el('div',undefined,'household-settings-grid');
    const owner=state;
    const hidden=state.sidebarPreferences?.hidden||[];
    const renamed=state.sidebarPreferences?.groups||{};
    const inputs=[];
    for(const group of nav().querySelectorAll('.app-nav-group[data-household-group],[data-direct-route]')){
      const direct=group.hasAttribute('data-direct-route');
      const key=direct?group.dataset.page:group.dataset.householdGroup;
      const block=el('fieldset');block.append(el('legend',key));
      if(!direct){
        const title=el('input');title.value=renamed[key]||window.DashboardSidebar.groupLabel(key);title.maxLength=40;title.required=true;
        block.append(label('Group name',title));inputs.push([key,title]);
      }
      if(key==='Links'){
        const check=el('input');check.type='checkbox';check.checked=!hidden.includes('Quick links');
        const row=label('Show Quick links',check);row.className='household-toggle';row.prepend(check);block.append(row);
        inputs.push(['Quick links',check]);
      }
      for(const link of direct?[group]:group.querySelectorAll('[data-page]')){
        const route=link.dataset.page;
        if(route==='Overview')continue;
        const check=el('input');check.type='checkbox';check.checked=!hidden.includes(route);
        const row=label(link.querySelector('.app-nav-label')?.textContent||link.textContent.trim(),check);
        row.className='household-toggle';row.prepend(check);block.append(row);inputs.push([route,check]);
      }
      fields.append(block);
    }
    const pinned=el('fieldset');
    pinned.append(el('legend','Pin up to three pages below Home'));
    const pins=[];
    for(const [key,name] of window.DashboardSidebar.groups.flatMap(([,links])=>links)){
      const check=el('input');check.type='checkbox';check.checked=(state.sidebarPreferences?.pins||[]).includes(key);
      const row=label(name,check);row.prepend(check);row.className='household-toggle';pinned.append(row);
      pins.push([key,check]);
    }
    const status=el('p');status.setAttribute('role','alert');
    const submit=el('button','Save navigation','primary');submit.type='submit';
    form.append(fields,pinned,status,submit,button('Cancel',()=>dialog.close()));
    dialog.append(el('h2','Sidebar & navigation'),form);
    form.onsubmit=event=>{
      event.preventDefault();
      if(state!==owner){dialog.close();return}
      const selected=pins.filter(([,field])=>field.checked).map(([key])=>key);
      if(selected.length>3){status.textContent='Choose up to three pages to pin.';return}
      state.sidebarPreferences={
        ...state.sidebarPreferences,
        pins:selected,
        hidden:inputs.filter(([,field])=>field.type==='checkbox'&&!field.checked).map(([key])=>key),
        groups:Object.fromEntries(inputs.filter(([,field])=>field.type==='text').map(([key,field])=>[key,field.value.trim()||key]))
      };
      save();dialog.close();render();
    };
    document.body.append(dialog);dialog.onclose=()=>dialog.remove();dialog.showModal();
  }
  window.DashboardNavigation={options:navigationOptions,isHidden:key=>(state.sidebarPreferences?.hidden||[]).includes(key)};
  function hide(node,hidden){
    node.hidden=hidden;
    if(hidden)node.style.setProperty('display','none','important');
    else if(node.style.getPropertyValue('display')==='none')node.style.removeProperty('display');
  }
  function updateNav(){
    const settings=document.getElementById('appSettings');
    if(settings&&!settings.querySelector('.nav-customize')){
      const actions=el('div',undefined,'household-actions nav-customize');
      actions.append(button('Sharing',()=>{settings.close();go('Sharing')}));
      settings.querySelector('#appSettingsContent')?.prepend(actions);
    }
    window.DashboardSidebar.organize();
    for(const link of document.querySelectorAll('[data-mobile-route]'))hide(link,window.DashboardNavigation.isHidden(link.dataset.mobileRoute));
  }
  const beforeFields=fieldsFor;
  fieldsFor=function(){
    beforeFields();
    if(kind.value!=='projects')return;
    const category=el('input');category.name='category';category.maxLength=60;category.placeholder='Crafts, Work, Home…';category.setAttribute('list','household-project-categories');
    const suggestions=el('datalist');suggestions.id='household-project-categories';
    for(const name of new Set(['Crafts','Work','Home',...state.projects.map(item=>item.category).filter(Boolean)]))suggestions.append(new Option(name));
    fields.append(label('Project category',category),suggestions);
  };
  kind.onchange=fieldsFor;
  const before=render;
  render=function(){
    const isChores=page==='Chores';
    if(isChores)page='Quick notes';
    try{before()}finally{if(isChores)page='Chores'}
    if(isChores){
      document.body.dataset.glowPage='Chores';
      for(const id of ['title','appPageTitle','mobileCurrentPage']){const heading=document.getElementById(id);if(heading)heading.textContent='Chores'}
      document.querySelectorAll('aside nav .active').forEach(link=>{link.classList.remove('active');link.removeAttribute('aria-current')});
      paintChores();
    }
    updateNav();
  };
  addEventListener('dashboard:account-changing',()=>document.querySelector('.household-settings[open]')?.close());
  render();
})();
