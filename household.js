(function(){
  'use strict';
  const routines={
    weekly:['Vacuum and sweep floors','Mop hard floors','Clean toilets and sinks','Clean the shower or tub','Change bed sheets','Dust surfaces','Wipe kitchen counters and appliances','Empty household trash','Do laundry'],
    monthly:['Clean inside the microwave','Wipe refrigerator shelves','Wash bath mats','Dust ceiling fans and vents','Wipe cabinet fronts','Check pantry for expired food','Clean mirrors and interior glass','Vacuum under furniture'],
    yearly:['Wash curtains or clean blinds','Deep-clean carpets and upholstery','Wash windows and screens','Declutter closets and donate items','Deep-clean the oven','Clean behind the refrigerator','Sort seasonal storage','Wash walls and baseboards']
  };
  const periods={weekly:'Weekly',monthly:'Monthly',yearly:'Yearly'};
  const el=(tag,text,cls)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(cls)node.className=cls;return node};
  const button=(text,action,cls='secondary')=>{const node=el('button',text,cls);node.type='button';node.onclick=action;return node};
  const label=(text,field)=>{const node=el('label',text);node.append(field);return node};
  const nav=()=>document.querySelector('aside nav');
  let selectedPeriod='weekly';
  function chores(){
    return state.chores??=Object.entries(routines).flatMap(([period,titles])=>titles.map((title,index)=>({id:period+'-'+index,title,period})));
  }
  function cycle(period,date=new Date()){
    if(period==='yearly')return String(date.getFullYear());
    if(period==='monthly')return localDate(date).slice(0,7);
    const monday=new Date(date.getFullYear(),date.getMonth(),date.getDate());
    monday.setDate(monday.getDate()-(monday.getDay()+6)%7);
    return localDate(monday);
  }
  function paintChores(){
    const root=el('div',undefined,'household-chores');
    const hero=el('section',undefined,'household-hero');
    hero.append(el('h2','Chores'),el('p','Check off your cleaning as you go. Each list starts fresh at the next week, month, or year.'));
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
    panel.append(el('h3',periods[selectedPeriod]+' cleaning'),progress,entry,list);
    const period=selectedPeriod;
    function draw(){
      const current=cycle(period);
      const records=chores().filter(item=>item.period===period);
      progress.textContent=records.filter(item=>item.checked===current).length+' of '+records.length+' finished '+(period==='weekly'?'this week':period==='monthly'?'this month':'this year');
      list.replaceChildren();
      for(const item of records){
        const row=el('div',undefined,'household-chore-row');
        const check=el('input');check.type='checkbox';check.checked=item.checked===current;
        check.onchange=()=>{item.checked=check.checked?cycle(period):'';save();draw();list.querySelectorAll('input')[records.indexOf(item)]?.focus()};
        const name=label(item.title,check);name.prepend(check);
        const menu=el('details');menu.append(el('summary','Options'),button('Rename',()=>{
          const next=prompt('Chore name',item.title)?.trim().slice(0,120);
          if(next){item.title=next;save();draw()}
        }),button('Remove',()=>{
          if(!confirm('Remove '+item.title+'?'))return;
          state.chores=chores().filter(record=>record.id!==item.id);save();draw();title.focus();
        }));
        row.append(name,menu);list.append(row);
      }
      if(!records.length)list.append(el('p','Add a chore to start this checklist.'));
    }
    entry.onsubmit=event=>{
      event.preventDefault();const name=title.value.trim();if(!name)return;
      chores().push({id:crypto.randomUUID(),title:name,period});title.value='';save();draw();title.focus();
    };
    hero.append(tabs);root.append(hero,panel);content.replaceChildren(root);draw();
  }
  function navigationOptions(){
    const appSettings=document.getElementById('appSettings');
    appSettings?.close();
    const dialog=el('dialog',undefined,'priss-options-dialog household-settings');
    const form=el('form');
    const fields=el('div',undefined,'household-settings-grid');
    const hidden=state.sidebarPreferences?.hidden||[];
    const renamed=state.sidebarPreferences?.groups||{};
    const inputs=[];
    for(const group of nav().querySelectorAll('.app-nav-group[data-household-group]')){
      const key=group.dataset.householdGroup;
      const block=el('fieldset');block.append(el('legend',key));
      const title=el('input');title.value=renamed[key]||key;title.maxLength=40;title.required=true;
      block.append(label('Group name',title));inputs.push([key,title]);
      if(group.classList.contains('bre-favorites')){
        const check=el('input');check.type='checkbox';check.checked=!hidden.includes('Quick links');
        const row=label('Show Quick links',check);row.className='household-toggle';row.prepend(check);block.append(row);
        inputs.push(['Quick links',check]);
      }
      for(const link of group.querySelectorAll('[data-page]')){
        const route=link.dataset.page;
        if(route==='Overview')continue;
        const check=el('input');check.type='checkbox';check.checked=!hidden.includes(route);
        const row=label(link.querySelector('.app-nav-label')?.textContent||link.textContent.trim(),check);
        row.className='household-toggle';row.prepend(check);block.append(row);inputs.push([route,check]);
      }
      fields.append(block);
    }
    const submit=el('button','Save navigation','primary');submit.type='submit';
    form.append(fields,submit,button('Cancel',()=>dialog.close()));
    dialog.append(el('h2','Sidebar & navigation'),form);
    form.onsubmit=event=>{
      event.preventDefault();
      state.sidebarPreferences={
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
      actions.append(button('Edit profile',()=>{settings.close();window.DashboardProfile.open()}));
      settings.querySelector('.app-dialog-heading')?.after(actions);
    }
    const sidebar=nav();
    sidebar.querySelector('[data-household-chores]')?.remove();
    const item=button('🧹 Chores',()=>{go('Chores');window.scrollTo(0,0)},'app-nav-link');
    item.dataset.householdChores='';item.dataset.page='Chores';
    if(page==='Chores'){item.classList.add('active');item.setAttribute('aria-current','page')}
    const projects=sidebar.querySelector('[data-page="Projects"]');
    if(projects)projects.before(item);else sidebar.append(item);
    const focus=sidebar.querySelector('[data-bre-focus]');
    if(focus)focus.dataset.page='Focus timer';
    const share=sidebar.querySelector('[data-dashboard-sharing]');
    if(share){
      share.dataset.page='Sharing';
      const keep=sidebar.querySelector('[data-page="Finances"]')?.parentElement;
      if(keep)keep.append(share);
    }
    for(const group of sidebar.querySelectorAll('.app-nav-group')){
      const heading=group.querySelector('summary');
      const key=group.dataset.householdGroup||heading.textContent;
      group.dataset.householdGroup=key;
      heading.textContent=state.sidebarPreferences?.groups?.[key]||key;
      const links=[...group.querySelectorAll('[data-page]')];
      for(const link of links)hide(link,window.DashboardNavigation.isHidden(link.dataset.page));
      hide(group,(group.classList.contains('bre-favorites')&&window.DashboardNavigation.isHidden('Quick links'))||(links.length>0&&links.every(link=>link.hidden)));
    }
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
