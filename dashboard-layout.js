(() => {
  'use strict';
  const byId = id => document.getElementById(id);
  const body = document.body;
  const sidebar = document.querySelector('body > aside');
  const content = byId('content');
  const regions = ['Header', 'Sidebar', 'Background', 'Containers', 'Text'];
  const themes = {
    dolphin: ['Dolphin Cove', '#124965', '#103c52', '#c7ebee', '#f2fbfa', '#173646'],
    barbie: ['Barbie Dreamhouse', '#ac195e', '#641342', '#ffe2f1', '#fff8fc', '#4d183a'],
    santa: ['Santa Wrapping Paper', '#78242d', '#184838', '#cee2cf', '#fff8ed', '#382927'],
    snowman: ['Snowman Village', '#304f75', '#223b60', '#d9e9fa', '#f8fbff', '#233957'],
    nutcracker: ['Nutcracker Ballet', '#772746', '#283b55', '#f6dfdb', '#fff9f0', '#422c3b'],
    gingerbread: ['Gingerbread Bakery', '#724032', '#51312e', '#f5dfbe', '#fff8ee', '#482d29'],
    evergreen: ['Christmas Tree Farm', '#2b5648', '#173a33', '#dae8db', '#fffcf3', '#243c31'],
    confetti: ['Birthday Confetti', '#5a4588', '#403360', '#eee2fa', '#fffbff', '#382747']
  };
  const designs = {
    dolphin: '<path fill="#2384a3" d="M5 24Q14 6 30 13L36 11 33 16 39 16Q39 19 31 20Q24 25 18 24L13 29 14 22Q10 21 8 25L4 28 6 23 2 22Z"/><circle cx="30" cy="16" r="1" fill="#123748"/>',
    barbie: '<path fill="#e65394" d="M6 13 9 23H27L31 12 23 17 19 9 14 17Z"/><path fill="#ff9ac4" d="M28 26q-6-7-9-2-2 4 9 10 10-9 6-12-3-2-6 4"/>',
    santa: '<path fill="#b71d38" d="M8 19q4-17 15-13l7 9-6-2 3 6Z"/><circle cx="31" cy="16" r="3" fill="white"/><circle cx="18" cy="23" r="9" fill="#f3bb94"/><path fill="white" d="M7 17h22v4H7zm1 8q5 2 9 0 5 3 11-1-1 11-11 12-8-3-9-11"/><path stroke="#49332f" d="M13 23h2m5 0h2"/>',
    snowman: '<g fill="#fff" stroke="#85a9bc"><circle cx="20" cy="27" r="9"/><circle cx="20" cy="15" r="7"/></g><path fill="#344c69" d="M12 10h16v3H12zm4-6h9v7h-9z"/><path fill="#b64750" d="M13 20h14v3H13zm9 1 5 1 2 8-4-1z"/><path fill="#ee9240" d="m20 15 7 2-7 1z"/>',
    nutcracker: '<path fill="#aa2637" d="M13 4h14v9H13zm-2 18h18v11H11z"/><path fill="#e9c781" d="M12 11h16v3H12zm-1 13h18v2H11z"/><path fill="#f5c5a1" d="M14 14h12v9H14z"/><path fill="#29374a" d="M14 32h5v6h-5zm7 0h5v6h-5zm-6-14 5-2 5 2-5 1z"/><path stroke="#fff" d="M17 21h6"/>',
    gingerbread: '<path fill="#b8784c" stroke="#fff4df" stroke-width="1.5" d="M16 15a7 7 0 1 1 9 0l7 1q5 3 1 6l-7-1 4 10q1 5-4 5l-6-8-5 8q-5 1-5-4l4-11-6 1q-6-2-2-6z"/><path stroke="white" fill="none" d="M17 10q3 4 6 0"/><circle cx="20" cy="20" r="1.7" fill="#c23d46"/>',
    evergreen: '<path fill="#46775a" d="m20 3 8 11h-4l9 10h-5l7 7H5l8-7H8l8-10h-4Z"/><path fill="#997052" d="M17 31h6v5h-6Z"/><circle cx="19" cy="16" r="2" fill="#d18b56"/>',
    confetti: '<g stroke-width="3" fill="none"><path stroke="#ed638e" d="m5 6 3 5m18 15 4 3"/><path stroke="#7982db" d="m30 6-3 4M8 27l-3 4"/><path stroke="#dca646" d="m16 16 4 3"/><path stroke="#62ac99" d="m16 32 2 3"/></g>'
  };
  const node = (tag, text) => {
    const element = document.createElement(tag);
    if (text !== undefined) element.textContent = text;
    return element;
  };
  function button(label, action) {
    const b = node('button', label);
    b.type = 'button';
    b.onclick = action;
    return b;
  }
  function iconButton(label, path, action) {
    const b = button('', action);
    b.title = label;
    b.setAttribute('aria-label', label);
    b.innerHTML = '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="'+path+'"/></svg>';
    b.className = 'layout-icon';
    return b;
  }
  function modal(title) {
    const d = node('dialog');
    d.className = 'layout-dialog';
    d.setAttribute('aria-label',title);
    const head = node('header');
    head.append(node('h2',title),button('Close',()=>d.close()));
    d.append(head);
    body.append(d);
    d.addEventListener('close',()=>d.remove(),{once:true});
    return d;
  }
  let closed;
  try { closed=JSON.parse(localStorage.getItem('dashboard-rail-closed')) } catch {}
  if(typeof closed!=='boolean')closed=matchMedia('(max-width:750px)').matches;
  const toggle=iconButton('Collapse sidebar','M3 4h18v16H3zM9 4v16',()=>{
    closed=!closed;
    try {localStorage.setItem('dashboard-rail-closed',JSON.stringify(closed))} catch {}
    setRail();
  });
  toggle.id='railToggle';
  sidebar.prepend(toggle);
  function setRail(){
    body.classList.toggle('rail-closed',closed);
    toggle.title=closed?'Expand sidebar':'Collapse sidebar';
    toggle.setAttribute('aria-label',toggle.title);
    toggle.setAttribute('aria-expanded',String(!closed));
  }
  setRail();
  function chooseSection(label,list){
    const links=[...list.children].filter(item=>!item.hidden);
    if(links.length===1){links[0].click();return}
    const d=modal(label);
    for(const item of links){
      const choice=button(item.title||item.textContent.trim(),()=>{d.close();item.click()});
      d.append(choice);
    }
    d.showModal();
  }

  function tile(layers){
    const parts=layers.filter(id=>Object.hasOwn(designs,id));
    if(!parts.length)return 'none';
    const width=parts.length*70;
    const ribbon=parts.includes('santa')?'<path d="M-15 15 15-15M0 66 66 0m-15 81 35-35" stroke="#35644c" stroke-width="5" opacity=".45"/><path d="m0 60 60-60" stroke="#a82d40" stroke-width="3"/>':'';
    const art=ribbon+parts.map((id,i)=>'<g transform="translate('+(i*70+4)+' 3) scale(.57)">'+designs[id]+'</g><g transform="translate('+(i*70+36)+' 32) scale(.47)">'+designs[id]+'</g>').join('');
    const svg='<svg xmlns="http://www.w3.org/2000/svg" width="'+width+'" height="66" viewBox="0 0 '+width+' 66"><g opacity=".55">'+art+'</g></svg>';
    return 'url("data:image/svg+xml,'+encodeURIComponent(svg)+'")';
  }
  const selectors={
    Header:'body.glow-redesign #appMobileHeader',
    Sidebar:'body.glow-redesign > aside',
    Background:'body.glow-redesign > main',
    Containers:'body.glow-redesign main #content :is(.card,.cf-card,.cf-account,.cf-record,.cf-metric,.dashboard-feature > section,.joy-tile,.achievement-tile,article)',
    Text:'body.glow-redesign main #content :is(h1,h2,h3,h4,p,summary,label,li,small,strong,td,th,legend,blockquote,dt,dd,span):not(button *)'
  };
  const sheet=node('style');
  document.head.append(sheet);
  const swatches=node('style');
  swatches.textContent=Object.entries(themes).map(([id,[,head,side,back,panel,ink]])=>
    '[data-dashboard-theme="'+id+'"]{--theme-sidebar:'+side+';--theme-sidebar-end:'+side+';--theme-active-start:'+head+';--theme-active-end:'+head+';--theme-header:'+head+';--theme-background:'+back+';--theme-page-panel:'+panel+';--theme-finance-panel:'+panel+';--theme-panel-text:'+ink+'}'+
    '.theme-preview-option[data-dashboard-theme="'+id+'"] .theme-preview-sample{background-image:'+tile([id])+'}'
  ).join('\n');
  document.head.append(swatches);
  function regionStyle(area,draft){
    const theme=themes[body.dataset.dashboardTheme];
    const fallback=theme?.[regions.indexOf(area)+1];
    const color=draft?.color||fallback;
    const layers=draft?.designs??(area==='Background'&&theme?[body.dataset.dashboardTheme]:[]);
    const valid=/^#[0-9a-f]{6}$/i.test(color||'');
    if(area==='Text')return valid?'color:'+color+'!important;':'';
    if(!valid&&!layers.length&&!draft)return '';
    return (valid?'background-color:'+color+'!important;':'')+'background-image:'+tile(layers)+'!important;background-repeat:repeat!important;';
  }
  function applyPage(){
    const current=state.dashboardPersonalization?.regions?.[page]||{};
    sheet.textContent=regions.map(area=>selectors[area].replace('body.glow-redesign','body.glow-redesign:is(body,#dashboardLayout):is(body,#pageAppearance)')+'{'+regionStyle(area,current[area])+'}').join('\n');
  }
  const palette=iconButton('Customize this page','M12 3a9 9 0 1 0 0 18c3 0 3-2 2-4-.7-1.7 1-2.5 3-2.5 3 0 5-1.5 4-5C20 5 16 3 12 3zM7 10h2m2-4h2m3 3h2',openPalette);
  palette.id='pagePalette';
  body.append(palette);
  function openPalette(){
    const route=page,owner=state;
    const d=modal('Customize '+(page==='Overview'?'Home':page));
    const draft=structuredClone(state.dashboardPersonalization?.regions?.[route]||{});
    const preview=node('div');preview.className='layout-preview';
    const fields=node('fieldset');
    let active='Background';
    function draw(){
      preview.replaceChildren();
      for(const area of regions){
        const b=button(area,()=>{active=area;draw()});
        b.dataset.region=area;
        const actual=document.querySelector(selectors[area]);
        if(actual){
          const appearance=getComputedStyle(actual);
          if(area==='Text')b.style.color=appearance.color;
          else {b.style.background=appearance.background;b.style.color=appearance.color}
        }
        b.style.cssText+=regionStyle(area,draft[area]);
        b.setAttribute('aria-pressed',String(active===area));
        preview.append(b);
      }
      fields.replaceChildren(node('legend',active==='Text'?'Text color':active));
      const label=node('label','Color ');
      const color=node('input');color.type='color';
      const actual=document.querySelector(selectors[active]);
      const rgb=actual&&getComputedStyle(actual)[active==='Text'?'color':'backgroundColor'].match(/\d+/g);
      const base=rgb?'#'+rgb.slice(0,3).map(n=>Number(n).toString(16).padStart(2,'0')).join(''):'#ffffff';
      color.value=draft[active]?.color||themes[body.dataset.dashboardTheme]?.[regions.indexOf(active)+1]||base;
      color.oninput=()=>{(draft[active]??={}).color=color.value;preview.querySelector('[data-region="'+active+'"]').style.cssText=regionStyle(active,draft[active])};
      label.append(color);fields.append(label);
      if(active!=='Text'){
        const group=node('div');group.className='design-choices';
        const selected=draft[active]?.designs??(active==='Background'&&themes[body.dataset.dashboardTheme]?[body.dataset.dashboardTheme]:[]);
        for(const [id,[name]] of Object.entries(themes)){
          const option=node('label',name),check=node('input');check.type='checkbox';check.checked=selected.includes(id);
          check.onchange=()=>{(draft[active]??={}).designs=check.checked?[...selected,id]:selected.filter(x=>x!==id);draw()};
          option.prepend(check);group.append(option);
        }
        fields.append(group);
      }
      fields.append(button('Use theme for this area',()=>{delete draft[active];draw()}));
    }
    d.append(preview,fields,button('Save page appearance',()=>{
      if(state!==owner||page!==route){d.close();return}
      state.dashboardPersonalization??={};
      (state.dashboardPersonalization.regions??={})[route]=draft;
      save();applyPage();d.close();
    }));
    draw();d.showModal();
  }
  window.DashboardLayout={chooseSection,openPalette};
  new MutationObserver(applyPage).observe(body,{attributes:true,attributeFilter:['data-dashboard-theme','data-midnight-glitter']});
  const sections=['Accounts','Income','Bills','Activity','Forecast'];
  function calendarRows(from,to){
    const rows=[];
    for(let day=from;day<=to;day=CashFlowCore.add(day,1)){
      const events=[...holidaysOnDate(day),...calendarEventsOn(day)];
      events.sort((a,b)=>(a.time||'').localeCompare(b.time||''));
      for(const event of events)rows.push([day,calendarTimeRange(event)||'All day',event.title||event.name||'',event.notes||'']);
    }
    return rows;
  }
  function printDocument(title,range,tables){
    byId('dashboardPrintFrame')?.remove();
    const frame=node('iframe');frame.id='dashboardPrintFrame';frame.title='Printable report';
    body.append(frame);
    const doc=frame.contentDocument;
    doc.title=title;
    const style=node('style');
    style.textContent='@page{margin:15mm}body{font:11pt/1.4 system-ui;color:#18202a}h1{font-size:19pt}h2{font-size:14pt;break-after:avoid}table{border-collapse:collapse;width:100%}th,td{text-align:left;vertical-align:top;padding:5pt;border-bottom:1px solid #ccc;overflow-wrap:anywhere}th{font-size:10pt}tr{break-inside:avoid}thead{display:table-header-group}';
    doc.head.append(style);
    doc.body.append(node('h1',title),node('p',range));
    for(const {label,headers,rows} of tables){
      doc.body.append(node('h2',label));
      if(!rows.length){doc.body.append(node('p','No entries in this date range.'));continue}
      const table=node('table'),head=table.createTHead().insertRow(),tbody=table.createTBody();
      for(const label of headers)head.append(node('th',label));
      for(const values of rows){
        const tr=tbody.insertRow();
        headers.forEach((_,i)=>tr.insertCell().textContent=i===0?displayUSDate(values[0]):values[i]??'');
      }
      doc.body.append(table);
    }
    frame.contentWindow.focus();frame.contentWindow.print();
  }
  function openPrint(){
    const finance=page==='Finances',report=finance?window.dashboardFinancePrint:null;
    const options=report?.options();
    const label=finance?'Finances · '+options.scope:'Calendar';
    const d=modal('Print '+label),form=node('form');
    const period=finance?options.month:localDate(month).slice(0,7);
    function dateInput(title,value){
      const wrap=node('label',title),input=node('input');input.type='date';input.required=true;input.value=value;
      input.min='1900-01-01';input.max='2199-12-31';wrap.append(input);form.append(wrap);return input;
    }
    const from=dateInput('From',period+'-01'),to=dateInput('Through',FinanceTools.monthEnd(period));
    const choices=new Map();
    if(finance){
      const fields=node('fieldset');fields.append(node('legend','Pages to print'));
      for(const name of sections){
        const label=node('label',name),input=node('input');input.type='checkbox';
        input.checked=name===(sections.includes(options.section)?options.section:'Accounts');
        choices.set(name,input);label.prepend(input);fields.append(label);
      }
      form.append(fields);
    }
    const error=node('p');error.setAttribute('role','alert');
    const print=node('button','Print');print.type='submit';form.append(error,print);
    form.onsubmit=event=>{
      event.preventDefault();
      if(to.value<from.value){error.textContent='Choose an end date on or after the start date.';return}
      const selected=[...choices].filter(([,box])=>box.checked).map(([name])=>name);
      if(finance&&!selected.length){error.textContent='Choose at least one page to print.';return}
      const tables=finance?selected.map(name=>({
        label:name,headers:name==='Accounts'?['As of','Account','Balance type','Amount']:
          name==='Forecast'?['Date','Account','Activity','Change / opening','Projected balance']:['Date','Account','Item','Amount','Status'],
        rows:report.rows(name,from.value,to.value)
      })):[{label:'Events',headers:['Date','Time','Event','Notes'],rows:calendarRows(from.value,to.value)}];
      const range=displayUSDate(from.value)+' – '+displayUSDate(to.value);
      d.close();printDocument(label,range,tables);
    };
    d.append(form);d.showModal();
  }
  const print=iconButton('Print report','M6 8V3h12v5M6 17H3V9h18v8h-3M6 14h12v7H6zM17 11h2',openPrint);
  print.id='reportPrint';
  const expanded=new Set();
  function badges(){
    if(page!=='Badges')return;
    for(const card of content.querySelectorAll('.achievement-collection')){
      if(card.firstElementChild?.matches('.badge-disclosure'))continue;
      const heading=card.querySelector('h2,h3');
      if(!heading)continue;
      const details=node('details');details.className='badge-disclosure';
      const summary=node('summary',heading.textContent);heading.remove();
      const old=card.querySelector(':scope > details');
      if(old){old.querySelector('summary')?.remove();old.replaceWith(...old.childNodes)}
      details.append(summary,...card.childNodes);card.append(details);
      details.open=expanded.has(card.id);
      details.ontoggle=()=>{if(details.isConnected){if(details.open)expanded.add(card.id);else expanded.delete(card.id)}};
    }
  }
  function refresh(){
    applyPage();
    print.remove();
    if(page==='Calendar'||page==='Finances'){
      print.title=page==='Calendar'?'Print calendar list':'Print finance report';
      print.setAttribute('aria-label',print.title);
      const host=page==='Finances'?content.querySelector('.cf-toolbar')||content.firstElementChild:content;
      host?.prepend(print);
    }
    badges();
  }
  new MutationObserver(badges).observe(content,{childList:true,subtree:true});
  addEventListener('dashboard:account-changing',()=>{
    expanded.clear();document.querySelectorAll('.layout-dialog').forEach(d=>d.close());byId('dashboardPrintFrame')?.remove();
  });
  const prior=render;
  render=function(){prior();refresh()};
  refresh();
})();
