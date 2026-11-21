(function () {
  'use strict';

  const sections = [
    ['Calendar','Calendar'], ['Daily priorities','Tasks'], ['Projects','Projects'],
    ['Quick notes','Notes'], ['Bookmarks','Bookmarks'], ['Finances','Balances'],
    ['Collections','Collections'], ['Shopping List','Shopping List'], ['Wish List','Wish List'], ['Time for You','Little Joys'], ['Habit Tracker','Habit Tracker'], ['Journal','Journal'],
    ['Games','Games'], ['Badges','Badges'], ['Bible','Scripture']
  ];
  const homeDefaults = ['Calendar','Daily priorities','Quick notes','Bookmarks','Bible','Finances'];
  const hex = value => /^#[\da-f]{6}$/i.test(value || '');
  const prefs = () => state.dashboardPersonalization || {};
  const write = () => state.dashboardPersonalization ??= {};
  const content = document.getElementById('content');
  const settings = document.getElementById('appSettings');
  const settingsContent = document.getElementById('appSettingsContent');
  let homeSettings;

  function el(tag, text, className) {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
  }
  function button(text, action, className = 'secondary') {
    const node = el('button', text, className);
    node.type = 'button';
    node.onclick = action;
    return node;
  }
  function openPage(target) {
    go(target);
    window.scrollTo(0,0);
  }
  function colorFields(label, value, fallback, changed) {
    const wrap = el('fieldset', undefined, 'priss-color-field');
    const picker = el('input');
    picker.type = 'color';
    picker.value = hex(value) ? value : fallback;
    picker.setAttribute('aria-label', label+' picker');
    const code = el('input');
    code.type = 'text';
    code.value = hex(value) ? value : '';
    code.placeholder = fallback;
    code.maxLength = 7;
    code.setAttribute('aria-label', label+' hex code');
    code.pattern = '#[0-9a-fA-F]{6}';
    picker.oninput = () => {code.value=picker.value;code.setCustomValidity('');changed(picker.value)};
    code.onchange = () => {
      const value = code.value.trim();
      code.setCustomValidity(value&&!hex(value)?'Enter a six-digit hex color, such as #ff80c0.':'');
      if (!code.reportValidity()) return;
      picker.value=value||fallback;
      changed(value);
    };
    wrap.append(el('legend',label),picker,code,button('Reset',()=>{
      picker.value=fallback;code.value='';code.setCustomValidity('');changed('');
    }));
    return wrap;
  }

  window.DashboardColorFields = colorFields;

  const containerSelector = ':is(section,article,aside,fieldset,.card,.cf-record,.glow-task-group,.glow-bookmark-tile,.glow-note-card,.joy-tile,.achievement-tile,.week-day,.glow-month-cell,.journal-editor,.journal-library,.sticky-card,details)';
  const textSelector = ':is(h1,h2,h3,h4,h5,p,li,small,strong,span,a,label,legend,summary,button,input,textarea,select,td,th,dd,dt,blockquote)';
  const applied = new Map();
  function targets() {
    const body = document.querySelector('dialog[open]:not(#appSettings):not(#dashboardThemes)');
    const roots = [content,document.getElementById('appMobileHeader'),document.querySelector('body > aside'),document.querySelector('.sticky-layer'),body].filter(Boolean);
    return roots.flatMap(root => {
      const nodes = [root,...root.querySelectorAll(containerSelector+','+textSelector)];
      const counts = new Map();
      return nodes.filter(node=>!node.closest('.list-planner,.priss-page-tools,.priss-settings-tabs')).map(node=>{
        const container = node===root||node.matches(containerSelector);
        const ownHeading = container ? node.querySelector('h1,h2,h3,h4,summary')?.textContent : node.textContent;
        const label = (node.getAttribute('aria-label')||ownHeading||node.name||node.placeholder||node.tagName).trim().replace(/\s+/g,' ').slice(0,85);
        const identity = node.dataset.homeWidget || node.dataset.inventoryId || node.dataset.bookmarkId || node.id || label.replace(/\s*[·(]\s*\d+\)?$/,'');
        const prefix = (root.id||root.className||root.tagName)+'|'+node.tagName+'|'+identity;
        const count = (counts.get(prefix)||0)+1;
        counts.set(prefix,count);
        return {node,container,label,key:prefix+'|'+count};
      });
    });
  }
  function paintColors() {
    for (const [node, previous] of applied) {
      for (const [property,value,priority] of previous) {
        if (value) node.style.setProperty(property,value,priority);
        else node.style.removeProperty(property);
      }
    }
    applied.clear();
    const colors = prefs().colors?.[page];
    if (!colors || !Object.keys(colors).length) return;
    for (const {node,key} of targets()) {
      const value = colors[key];
      if (!value) continue;
      const properties=[];
      for (const [property,color] of [['background',value.background],['color',value.text]]) {
        if (!hex(color)) continue;
        if (page === 'Finances' && node === content && property === 'background') continue;
        properties.push([property,node.style.getPropertyValue(property),node.style.getPropertyPriority(property)]);
        node.style.setProperty(property,color,'important');
      }
      if(properties.length) applied.set(node,properties);
    }
  }
  function customize() {
    const owner=state, currentPage=page;
    const items=targets();
    const dialog=el('dialog',undefined,'priss-options-dialog');
    dialog.setAttribute('aria-label','Customize this page');
    const search=el('input');
    search.type='search';
    search.placeholder='Find a container or text area';
    search.setAttribute('aria-label','Find a container or text area');
    const picker=el('select');
    picker.setAttribute('aria-label','Area to personalize');
    function fill() {
      const query=search.value.trim().toLowerCase();
      picker.replaceChildren();
      items.forEach((item,index)=>{
        const name=(item.container?'Container · ':'Text · ')+item.label;
        if(name.toLowerCase().includes(query))picker.add(new Option(name,String(index)));
      });
      if(!picker.options.length)picker.add(new Option('No matching areas',''));
      show();
    }
    search.oninput=fill;
    const fields=el('div');
    function show() {
      fields.replaceChildren();
      const item=picker.value===''?null:items[Number(picker.value)];
      if(!item)return;
      const saved=prefs().colors?.[currentPage]?.[item.key]||{};
      function update(property,value) {
        if(owner!==state)return;
        const all=write().colors??={};
        const local=all[currentPage]??={};
        const colors=local[item.key]??={};
        if(value)colors[property]=value;
        else delete colors[property];
        if(!Object.keys(colors).length)delete local[item.key];
        save();
        paintColors();
      }
      if(item.container)fields.append(colorFields('Background',saved.background,'#f6e7fd',value=>update('background',value)));
      fields.append(colorFields('Text',saved.text,'#26324b',value=>update('text',value)));
    }
    picker.onchange=show;
    dialog.append(el('h2','Customize this page'),search,picker,fields,button('Done',()=>dialog.close()));
    fill();
    dialog.addEventListener('close',()=>dialog.remove(),{once:true});
    document.body.append(dialog);
    dialog.showModal();
  }

  function widget(key,title) {
    const panel=el('section',undefined,'card priss-home-card');
    panel.dataset.homeWidget=key;
    panel.append(el('h2',title));
    return panel;
  }
  function balances() {
    const panel=widget('Finances','Available balances');
    const core=window.CashFlowCore, finance=window.FinanceTools;
    const date=localDate(new Date());
    const report=core.forecast(finance.financeSetup(state.cashFlow||core.init()),date,30);
    const accounts=[...report.accounts,...report.savings];
    for(const [title,group] of [['Checking',report.accounts],['Savings',report.savings]]) {
    if(!group.length)continue;
    const amounts=[];
    const list=el('dl');
    for(const account of group) {
      const name=account.name;
      const row=el('div');
      const checking=account.type!=='savings';
      const plan=checking?finance.paydayPlan(account,date,core.add(date,30)):null;
      const balance=checking?plan.preDeposit:account.current;
      const available=balance===null?null:Math.max(0,Math.min(balance,plan?.lowest??balance)-(account.cushion??0));
      amounts.push(available);
      row.append(el('dt',/\b(checking|savings)$/i.test(name)?name:name+(checking?' Checking':' Savings')),
        el('dd',available===null?'Set balance':money(available/100)));
      row.append(el('small',checking?'After planned activity '+(plan.hasPayday?'before payday':'over 30 days')+' and cushion':'Cleared savings above cushion'));
      list.append(row);
    }
      const total=amounts.every(Number.isFinite)?amounts.reduce((sum,amount)=>sum+amount,0):null;
      panel.append(el('h3',title),list,el('p',total===null?'Some balances are still missing':'Total '+title.toLowerCase()+' available · '+money(total/100)));
    }
    if(!accounts.length)panel.append(el('p','Add an account in Finances to see its balance.'));
    panel.append(button('Open Finances',()=>openPage('Finances')));
    return panel;
  }
  function editHome(host) {
    const owner=state;
    const list=el('div',undefined,'priss-card-picker');
    const shown=prefs().homeCards??homeDefaults;
    const inputs=sections.map(([key,label])=>{
      const box=el('input');
      box.type='checkbox';box.checked=shown.includes(key);
      const row=el('label');
      row.append(box,document.createTextNode(label));
      list.append(row);
      return [key,box];
    });
    const photos=el('div',undefined,'home-photo-settings');
    const caption=el('input');caption.placeholder='Photo caption';caption.maxLength=80;caption.setAttribute('aria-label','Photo caption');
    const upload=el('input');upload.type='file';upload.accept='image/*';upload.setAttribute('aria-label','Upload a Home photo');
    const photoStatus=el('p');photoStatus.setAttribute('role','status');
    function showPhotos(){
      photos.replaceChildren(el('h3','Photo widgets'));
      for(const photo of prefs().homePhotos||[])photos.append(button('Remove '+(photo.caption||'photo'),()=>{
        write().homePhotos=prefs().homePhotos.filter(entry=>entry.id!==photo.id);save();render();showPhotos();
      }));
      photos.append(caption,upload,photoStatus);
    }
    upload.onchange=async()=>{
      const photo=upload.files[0];if(!photo)return;
      if((prefs().homePhotos||[]).length>=4){photoStatus.textContent='Remove a photo widget before adding another. You can add up to four.';return}
      if(photo.size>20*1024*1024){photoStatus.textContent='Choose a photo under 20 MB.';return}
      upload.disabled=true;
      const image=new Image(),url=URL.createObjectURL(photo);
      try{
        image.src=url;await image.decode();
        const scale=Math.min(1,480/Math.max(image.naturalWidth,image.naturalHeight));
        const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
        const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0,canvas.width,canvas.height);
        let src=canvas.toDataURL('image/jpeg',.7);
        if(src.length>75000)src=canvas.toDataURL('image/jpeg',.45);
        if(src.length>75000)throw Error('Choose a smaller photo.');
        if(owner!==state||!host.isConnected||!settings.open||!homeSettings.open)return;
        (write().homePhotos??=[]).push({id:crypto.randomUUID(),caption:caption.value.trim(),src});save();render();caption.value='';showPhotos();
        photoStatus.textContent='Photo added to Home.';
      }catch(error){photoStatus.textContent=error.message}
      finally{URL.revokeObjectURL(url);upload.disabled=false;upload.value=''}
    };
    showPhotos();
    host.append(list,photos,button('Save Home',()=>{
      if(owner===state){write().homeCards=inputs.filter(([,box])=>box.checked).map(([key])=>key);save();render()}
      homeSettings.open=false;
    }));
  }
  function home() {
    const layout=content.querySelector('.glow-overview');
    if(!layout)return;
    const shown=prefs().homeCards??homeDefaults;
    const nativeCards={
      Calendar:layout.querySelector('.glow-calendar'),
      'Daily priorities':layout.querySelector('.glow-tasks'),
      'Quick notes':layout.querySelector('.glow-notes'),
      Bookmarks:layout.querySelector('.glow-bookmarks'),
      Bible:document.getElementById('homeBibleHero')
    };
    for(const [key,node] of Object.entries(nativeCards)) {
      if(!node)continue;
      node.dataset.homeWidget=key;
      node.hidden=!shown.includes(key);
      if(node.hidden)node.style.setProperty('display','none','important');
      else node.style.removeProperty('display');
      if(key==='Daily priorities'){
        const rows=[...node.querySelectorAll('.glow-task-row')];
        rows.slice(3).forEach(row=>row.remove());
        for(const row of rows.slice(0,3))row.querySelectorAll('button').forEach(action=>action.remove());
        if(rows.length>3)node.append(el('p',(rows.length-3)+' more due today'));
      }
      if(key==='Bible'){
        node.classList.add('priss-scripture');
        const title=node.querySelector('h1,h2');
        if(title)title.textContent='Scripture';
        layout.append(node);
      }
    }
    for(const [key,label] of sections) {
      if(Object.hasOwn(nativeCards,key)||!shown.includes(key))continue;
      const panel=key==='Finances'?balances():widget(key,label);
      if(key!=='Finances'){
        const list=key==='Projects'?state.projects.filter(item=>!item.archived):
          key==='Journal'?(state.journal||[]):null;
        if(list?.length){
          const preview=el('ul');
          list.slice(0,3).forEach(item=>preview.append(el('li',item.title||'Untitled entry')));
          panel.append(preview);
        }
        panel.append(button('Open '+label,()=>openPage(key)));
      }
      layout.append(panel);
    }
    for(const photo of prefs().homePhotos||[]){
      if(!/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(photo.src||''))continue;
      const panel=widget('photo:'+photo.id,photo.caption||'Photo');
      const image=el('img',undefined,'household-photo');image.src=photo.src;image.alt=photo.caption||'Home photo';
      panel.append(image);layout.append(panel);
    }
    const cards=[...layout.children].filter(node=>node.dataset.homeWidget&&!node.hidden);
    const order=prefs().homeOrder||[];
    cards.sort((a,b)=>{const n=node=>{const i=order.indexOf(node.dataset.homeWidget);return i<0?order.length:i};return n(a)-n(b)});
    layout.append(...cards);
    const editing=Boolean(prefs().arrangingHome);
    const saved=prefs().homePlacement;
    if(!saved&&!editing)return;
    const placement=Object.fromEntries(cards.map((card,index)=>{
      const key=card.dataset.homeWidget;
      const prior=saved?.[key];
      return [key,{column:[0,1,2].includes(prior?.column)?prior.column:index%3,gap:[0,1,2].includes(prior?.gap)?prior.gap:0}];
    }));
    function place(key,column,anchor,after=false){
      const order=cards.map(card=>card.dataset.homeWidget).filter(id=>id!==key);
      if(anchor&&anchor!==key&&order.includes(anchor)){
        order.splice(order.indexOf(anchor)+(after?1:0),0,key);
      }else order.push(key);
      placement[key].column=column;
      const options=write();
      options.homePlacement={...options.homePlacement,...placement};
      options.homeOrder=order;
      save();render();
    }
    layout.classList.add('dashboard-lanes');
    const lanes=Array.from({length:3},(_,column)=>{
      const lane=el('div',undefined,'dashboard-lane');
      lane.dataset.column=column;
      lane.setAttribute('aria-label',['Left column','Center column','Right column'][column]);
      if(editing){
        lane.append(el('strong',lane.getAttribute('aria-label'),'dashboard-lane-label'));
        lane.ondragover=event=>{if(event.dataTransfer.types.includes('application/x-dashboard-home'))event.preventDefault()};
        lane.ondrop=event=>{
          const key=event.dataTransfer.getData('application/x-dashboard-home');
          if(!Object.hasOwn(placement,key))return;
          event.preventDefault();
          const hit=event.target.closest('[data-home-widget]');
          if(hit?.dataset.homeWidget===key)return;
          const bounds=hit?.getBoundingClientRect();
          place(key,column,hit?.dataset.homeWidget,bounds&&event.clientY>bounds.top+bounds.height/2);
        };
      }
      layout.append(lane);
      return lane;
    });
    for(const card of cards){
      const key=card.dataset.homeWidget;
      const position=placement[key];
      const lane=lanes[position.column];
      card.dataset.cardGap=position.gap;
      lane.append(card);
      if(!editing)continue;
      const actions=el('div',undefined,'home-widget-actions dashboard-layout-actions');
      const grip=button('⠿ Drag',()=>{});
      grip.classList.add('home-widget-grip');
      grip.draggable=true;
      grip.ondragstart=event=>{
        event.dataTransfer.setData('application/x-dashboard-home',key);
        event.dataTransfer.effectAllowed='move';
      };
      const column=el('select');
      column.setAttribute('aria-label','Column for '+key);
      ['Left','Center','Right'].forEach((name,index)=>column.add(new Option(name,index)));
      column.value=position.column;
      column.onchange=()=>place(key,Number(column.value));
      const gap=el('select');
      gap.setAttribute('aria-label','Space above '+key);
      ['Standard gap','More space','Large gap'].forEach((name,index)=>gap.add(new Option(name,index)));
      gap.value=position.gap;
      gap.onchange=()=>{
        position.gap=Number(gap.value);
        card.dataset.cardGap=position.gap;
        const options=write();
        options.homePlacement={...options.homePlacement,...placement};
        save();
      };
      const neighbors=cards.filter(node=>placement[node.dataset.homeWidget].column===position.column);
      const index=neighbors.indexOf(card);
      const earlier=button('↑',()=>place(key,position.column,neighbors[index-1].dataset.homeWidget));
      earlier.setAttribute('aria-label','Move '+key+' up');earlier.disabled=index===0;
      const later=button('↓',()=>place(key,position.column,neighbors[index+1].dataset.homeWidget,true));
      later.setAttribute('aria-label','Move '+key+' down');later.disabled=index===neighbors.length-1;
      actions.append(grip,column,earlier,later,gap);
      card.append(actions);
    }
  }

  function setupSettings() {
    if(!settings||!settingsContent)return;
    settings.querySelector('h2').textContent='Settings';
    const choices=el('div');
    choices.id='dashboardSettingsChoices';
    settingsContent.querySelector('.fb-sync-bar').after(choices);
    function section(label,fill){
      const group=el('details',undefined,'settings-group');
      const host=el('div');
      group.append(el('summary',label),host);
      group.ontoggle=()=>{
        host.replaceChildren();
        if(group.open)fill(host);
      };
      choices.append(group);
      return group;
    }
    homeSettings=section('Home cards',editHome);
    const navigation=section('Navigation',host=>window.DashboardNavigation.options(host,()=>{navigation.open=false}));
    settings.addEventListener('close',()=>{homeSettings.open=false;navigation.open=false});
    const side=document.querySelector('aside .glow-side-settings');
    if(side){side.textContent='⚙';side.title='Settings';side.setAttribute('aria-label','Settings');side.onclick=()=>window.DashboardMobileUI.openSettings()}
    const header=document.getElementById('appSettingsButton');
    const brand=document.querySelector('body > aside .brand img');
    if(header&&brand){
      const logo=brand.cloneNode();
      logo.alt='';
      header.replaceChildren(logo);
      header.classList.add('priss-header-logo');
      header.setAttribute('aria-label','Go to Home');
      header.onclick=()=>openPage('Overview');
      brand.closest('.brand').hidden=true;
    }
  }
  setupSettings();
  const previousRender=render;
  render=function(){
    previousRender();
    const tools=el('div',undefined,'priss-page-tools');

    if(page==='Overview') {
      home();
      tools.classList.add('dashboard-home-controls');
      const arrange=button(prefs().arrangingHome?'Done arranging':'Arrange cards',()=>{
        const entering=!prefs().arrangingHome;
        const options=write();
        options.arrangingHome=entering;
        if(entering&&!options.homePlacement)options.homePlacement={};
        save();render();
        const focus=content.querySelector(entering?'.home-widget-grip':'.dashboard-arrange-toggle');
        focus?.focus();
      },'dashboard-control dashboard-arrange-toggle');
      arrange.setAttribute('aria-pressed',String(Boolean(prefs().arrangingHome)));
      tools.append(button('Edit Home cards',()=>{window.DashboardMobileUI.openSettings();homeSettings.open=true},'dashboard-control'),arrange);
    }
    const toolbar=page==='Finances'?content.querySelector('.cf-toolbar'):null;
    if(tools.childElementCount){if(toolbar)toolbar.after(tools);else content.append(tools);}
    paintColors();
  };
  addEventListener('dashboard:account-changing',()=>{
    if(settings?.open)settings.close();
    document.querySelectorAll('.priss-options-dialog[open]').forEach(dialog=>dialog.close());
  });
  render();
})();
