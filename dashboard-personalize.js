(function () {
  'use strict';

  const sections = [
    ['Calendar','Calendar'], ['Daily priorities','Tasks'], ['Projects','Projects'],
    ['Quick notes','Notes'], ['Bookmarks','Bookmarks'], ['Finances','Balances'], ['Amortization','Amortization'],
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
  let settingsPage;

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
      return nodes.filter(node=>!node.matches('.bre-paper')&&!node.closest('.priss-page-tools,.priss-settings-tabs')).map(node=>{
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
    const amounts=[];
    const list=el('dl');
    for(const account of accounts) {
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
    if(accounts.length){
      const total=amounts.every(Number.isFinite)?amounts.reduce((sum,amount)=>sum+amount,0):null;
      panel.append(el('p',total===null?'Some balances are still missing':'Total available · '+money(total/100)),list);
    }
    else panel.append(el('p','Add an account in Finances to see its balance.'));
    panel.append(button('Open Finances',()=>openPage('Finances')));
    return panel;
  }
  function editHome() {
    const owner=state;
    const dialog=el('dialog',undefined,'priss-options-dialog');
    dialog.setAttribute('aria-label','Choose Home cards');
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
    dialog.append(el('h2','Choose Home cards'),list,button('Save Home',()=>{
      if(owner===state){write().homeCards=inputs.filter(([,box])=>box.checked).map(([key])=>key);save();render()}
      dialog.close();
    }),button('Cancel',()=>dialog.close()));
    dialog.addEventListener('close',()=>dialog.remove(),{once:true});
    document.body.append(dialog);
    dialog.showModal();
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
  }

  function setupSettings() {
    if(!settings||!settingsContent)return;
    settings.querySelector('h2').textContent='Settings';
    const tabs=el('div',undefined,'priss-settings-tabs');
    const sectionsPanel=el('section');
    const appearance=el('section');
    const themeDialog=document.getElementById('dashboardThemes');
    if(themeDialog) {
      const colors=el('details');
      colors.append(el('summary','More color controls'),button('Customize the current page',()=>{
        settings.close();customize();
      }));
      const controls=[...themeDialog.querySelectorAll('.dashboard-color-settings')];
      colors.append(...controls);
      const studio=themeDialog.querySelector('.dashboard-appearance');
      if(studio)appearance.append(studio);
      appearance.append(colors);
      addEventListener('dashboard:data-applied',()=>themeDialog.dispatchEvent(new Event('close')));
      settings.addEventListener('close',()=>themeDialog.dispatchEvent(new Event('close')));
    }
    const homePanel=el('section');
    homePanel.append(el('h3','Home cards'),button('Choose Home cards',()=>{settings.close();editHome()}));
    sectionsPanel.append(homePanel);
    settingsContent.before(tabs,appearance,sectionsPanel);
    const options=[['Appearance',appearance],['Home',sectionsPanel],['Account & data',settingsContent]];
    const tabButtons=options.map(([label,panel])=>button(label,()=>settingsPage(panel)));
    settingsPage=panel=>{
      options.forEach(([,section],i)=>{
        section.hidden=section!==panel;
        tabButtons[i].setAttribute('aria-pressed',String(section===panel));
      });
    };
    tabs.append(...tabButtons);
    settingsPage(appearance);
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
    if(themeDialog)window.DashboardThemes.open=()=>{settingsPage(appearance);window.DashboardMobileUI.openSettings()};
  }
  setupSettings();
  const previousRender=render;
  render=function(){
    previousRender();
    const tools=el('div',undefined,'priss-page-tools');
    tools.append(button('Customize colors',customize));
    if(page==='Overview') {
      home();
      tools.append(button('Edit Home cards',editHome));
    }
    const toolbar=page==='Finances'?content.querySelector('.cf-toolbar'):null;
    if(toolbar)toolbar.after(tools);else content.prepend(tools);
    paintColors();
  };
  addEventListener('dashboard:account-changing',()=>{
    document.querySelectorAll('.priss-options-dialog[open]').forEach(dialog=>dialog.close());
  });
  render();
})();
