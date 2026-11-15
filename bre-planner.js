(function () {
  'use strict';
  const quadrants = [
    ['do', 'Do', 'Urgent and important'],
    ['schedule', 'Schedule', 'Important · can wait'],
    ['delegate', 'Delegate', 'Urgent · can hand off'],
    ['delete', 'Delete', 'Drop low-value tasks']
  ];
  function node(tag, text, className) {
    const element = document.createElement(tag);
    if (text !== undefined) element.textContent = text;
    if (className) element.className = className;
    return element;
  }
  function button(text, action, className = 'secondary') {
    const element = node('button', text, className);
    element.type = 'button';
    element.onclick = action;
    return element;
  }
  function picker(label, name, value = '') {
    const wrap = node('label', label);
    const field = node('input');
    field.name = name;
    field.value = value;
    field.maxLength = 24;
    field.placeholder = '🌸';
    wrap.append(field);
    return wrap;
  }

  const previousFields = fieldsFor;
  fieldsFor = function () {
    previousFields();
    if (kind.value === 'events') fields.append(picker('Emoji sticker', 'emoji'));
    if (kind.value !== 'priorities') return;
    const label = node('label', 'Priority board');
    const select = node('select');
    select.name = 'quadrant';
    select.add(new Option('Do (default)', ''));
    for (const [key, title, description] of quadrants) select.add(new Option(title+' · '+description,key));
    label.append(select);
    fields.append(label);
  };
  kind.onchange = fieldsFor;

  let showCompleted=false;
  function board() {
    const owner=state;
    const panel=node('section',undefined,'bre-board');
    const heading=node('div',undefined,'bre-board-heading');
    heading.append(node('h2','Priority board'),button('Focus timer',()=>go('Focus timer')));
    const completed=node('input');completed.type='checkbox';completed.checked=showCompleted;
    const completedLabel=node('label','Show completed');
    completedLabel.prepend(completed);
    completed.onchange=()=>{showCompleted=completed.checked;draw();completed.focus()};
    heading.append(completedLabel);
    const grid=node('div',undefined,'bre-board-grid');
    const feedback=node('p',undefined,'bre-board-feedback');feedback.setAttribute('role','status');
    const titleFields=new Map();
    function draw(){
      const drafts=new Map([...titleFields].map(([key,field])=>[key,field.value]));
      grid.replaceChildren();
      titleFields.clear();
      grid.append(node('span',undefined,'bre-axis-corner'),node('span','Urgent','bre-axis-top'),node('span','Not urgent','bre-axis-top'));
      quadrants.forEach(([key,name,description],i)=>{
        if(i===0||i===2)grid.append(node('span',i===0?'Important':'Not important','bre-axis-side'));
        const quadrant=node('section',undefined,'bre-quadrant');
        quadrant.dataset.quadrant=key;
        const title=node('h3',name);title.id='bre-matrix-'+key;
        quadrant.setAttribute('aria-labelledby',title.id);
        quadrant.append(title,node('p',description,'bre-quadrant-description'));
        const rows=node('div',undefined,'bre-quadrant-items');
        const effectiveQuadrant=task=>quadrants.some(([id])=>id===task.quadrant)?task.quadrant:'do';
        for(const task of state.priorities.filter(item=>(showCompleted||!item.done)&&effectiveQuadrant(item)===key)){
          const row=node('article',undefined,'bre-task');
          const check=node('input');check.type='checkbox';check.checked=Boolean(task.done);
          check.setAttribute('aria-label','Complete '+task.title);
          check.onchange=()=>{task.done=check.checked;save();draw();titleFields.get(key)?.focus();feedback.textContent=task.done?'Task completed.':'Task reopened.'};
          const label=button(task.title,()=>editEntry('priorities',task.id),'bre-task-title');
          if(task.done)label.classList.add('bre-task-done');
          const menu=node('details',undefined,'bre-task-menu');
          const summary=node('summary','⋯');summary.setAttribute('aria-label','Options for '+task.title);
          const move=node('select');move.setAttribute('aria-label','Move '+task.title+' to');
          for(const [target,name] of quadrants)move.add(new Option(name,target));
          move.value=key;
          move.onchange=()=>{task.quadrant=move.value;save();draw();titleFields.get(task.quadrant)?.focus();feedback.textContent='Task moved.'};
          menu.append(summary,move,button('Delete task',()=>{
            if(!confirm('Delete '+task.title+'?'))return;
            state.priorities=state.priorities.filter(item=>item.id!==task.id);
            save();draw();titleFields.get(key)?.focus();feedback.textContent='Task deleted.';
          }));
          row.append(check,label,menu);rows.append(row);
        }
        const form=node('form',undefined,'bre-quadrant-add');
        const input=node('input');input.placeholder='Add a task…';input.required=true;input.maxLength=200;
        input.setAttribute('aria-label','Task for '+name);
        input.value=drafts.get(key)||'';
        titleFields.set(key,input);
        const add=node('button','＋','bre-quadrant-submit');add.type='submit';add.setAttribute('aria-label','Add task to '+name);
        form.append(input,add);
        form.onsubmit=event=>{
          event.preventDefault();
          const value=input.value.trim();
          if(state!==owner||!value)return;
          state.priorities.push({id:crypto.randomUUID(),title:value,date:localDate(new Date()),quadrant:key});
          input.value='';save();draw();titleFields.get(key)?.focus();feedback.textContent='Task added to '+name+'.';
        };
        quadrant.append(rows,form);grid.append(quadrant);
      });
    }
    panel.append(heading,grid,feedback);
    content.replaceChildren(panel);
    draw();
  }

  const durations = {focus:25, short:5, long:15};
  function timerData() {
    return state.pomodoro ??= {mode:'focus',minutes:{...durations},remaining:25*60000,end:0,sessions:0};
  }
  function timerPanel() {
    const data = timerData();
    const panel = node('section', undefined, 'card bre-timer');
    const modes = node('div', undefined, 'bre-controls');
    for (const [mode,label] of [['focus','Focus'],['short','Short break'],['long','Long break']]) {
      const control = button(label, () => {
        data.mode=mode;
        data.end=0;
        data.remaining=data.minutes[mode]*60000;
        save();render();
      });
      control.setAttribute('aria-pressed',String(data.mode===mode));
      modes.append(control);
    }
    const clock = node('output', '', 'bre-clock');
    clock.id='bre-clock';
    clock.setAttribute('aria-live','off');
    const task = node('select');
    task.setAttribute('aria-label','Task to focus on');
    task.add(new Option('Pick a task (optional)',''));
    for(const entry of state.priorities.filter(entry=>!entry.done))task.add(new Option(entry.title,entry.id));
    task.value=data.task||'';
    task.onchange=()=>{data.task=task.value;save()};
    const controls=node('div',undefined,'bre-controls');
    const finished=data.remaining===0&&!data.end;
    controls.append(button(data.end?'Pause':finished?'Start again':data.remaining===data.minutes[data.mode]*60000?'Start':'Resume',()=>{
      if(data.end){
        if(data.end<=Date.now()){tick();return}
        data.remaining=data.end-Date.now();data.end=0;
      }else{
        data.remaining ||= data.minutes[data.mode]*60000;
        data.end=Date.now()+data.remaining;
      }
      save();render();
    },'primary'),button('Reset',()=>{
      data.end=0;data.remaining=data.minutes[data.mode]*60000;save();render();
    }));
    if(finished)controls.append(button(data.mode==='focus'?'Start break':'Start focus',()=>{
      data.mode=data.mode==='focus'?(data.sessions%4===0?'long':'short'):'focus';
      data.remaining=data.minutes[data.mode]*60000;
      data.end=Date.now()+data.remaining;
      save();render();
    }));
    const options=node('details');
    options.append(node('summary','Timer settings'));
    for(const [key,label] of [['focus','Focus minutes'],['short','Short break minutes'],['long','Long break minutes']]){
      const wrap=node('label',label);
      const field=node('input');field.type='number';field.min='1';field.max='180';field.value=data.minutes[key];
      field.onchange=()=>{
        if(!field.checkValidity()||!field.value){field.value=data.minutes[key];return}
        data.minutes[key]=Number(field.value);
        if(!data.end&&data.mode===key)data.remaining=data.minutes[key]*60000;
        save();tick();
      };
      wrap.append(field);options.append(wrap);
    }
    panel.append(node('h2','🍅 Pomodoro timer'),modes,clock,task,controls,node('p',data.sessions+' focus sessions completed'),options);
    content.append(panel);
  }
  function tick(){
    if(document.body.classList.contains('fb-account-locked'))return;
    const data=state.pomodoro;
    if(!data)return;
    if(data.end&&data.end<=Date.now()){
      data.end=0;data.remaining=0;
      if(data.mode==='focus')data.sessions++;
      save();
      const message=data.mode==='focus'?'Focus session finished. Time for a break.':'Break finished.';
      if(page==='Focus timer')render();
      notify(message);
    }
    const clock=document.getElementById('bre-clock');
    if(!clock)return;
    const seconds=Math.ceil(Math.max(0,data.end?data.end-Date.now():data.remaining)/1000);
    clock.textContent=String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0');
  }
  setInterval(tick,250);

  function quickLinkRows(){
    const rows=[];
    for(const pin of state.favoriteLinks||[]){
      const url=website(pin.url);
      if(!url)continue;
      const link=node('a',pin.label,'app-nav-link sidebar-quick-link');
      window.DashboardNavIcon?.(link,pin.label,'link');
      link.href=url;link.target='_blank';link.rel='noopener noreferrer';
      rows.push(link);
    }
    const manage=button('Manage quick links',manageLinks,'app-nav-link');
    window.DashboardNavIcon?.(manage,'Manage quick links','link');
    rows.push(manage);
    return rows;
  }
  function website(value){
    try{
      const url=new URL(value);
      return ['https:','http:'].includes(url.protocol)?url.href:'';
    }catch{return ''}
  }
  function manageLinks() {
    const dialog=node('dialog',undefined,'priss-options-dialog bre-dialog');
    dialog.setAttribute('aria-label','Quick links');
    const owner=state;
    const form=node('form');
    const label=node('input');label.name='label';label.required=true;label.maxLength=60;
    const url=node('input');url.name='url';url.type='url';url.required=true;url.placeholder='https://www.youtube.com';
    const nameWrap=node('label','Label');nameWrap.append(label);
    const urlWrap=node('label','Website URL');urlWrap.append(url);
    const emoji=picker('Icon emoji','emoji');
    const submit=node('button','Pin link','primary');
    const entries=node('div');
    const status=node('p');status.setAttribute('role','status');
    let editing='';
    const redraw=()=>{
      entries.replaceChildren();
      for(const pin of state.favoriteLinks||[]){
        const row=node('div',undefined,'bre-controls');
        const link=node('a',[pin.emoji,pin.label].filter(Boolean).join(' '));
        const safe=website(pin.url);
        if(safe){link.href=safe;link.target='_blank';link.rel='noopener noreferrer'}
        row.append(link,button('Edit',()=>{
          editing=pin.id;
          label.value=pin.label;
          url.value=pin.url;
          form.elements.emoji.value=pin.emoji||'';
          submit.textContent='Save link';
          label.focus();
        }),button('Remove',()=>{
          state.favoriteLinks=state.favoriteLinks.filter(entry=>entry.id!==pin.id);
          if(editing===pin.id){editing='';form.reset();submit.textContent='Pin link'}
          save();render();redraw();
        }));
        entries.append(row);
      }
    };
    form.append(nameWrap,urlWrap,emoji,submit);
    form.onsubmit=event=>{
      event.preventDefault();
      const address=website(url.value);
      if(state!==owner)return;
      if(!label.value.trim()||!address){status.textContent='Enter a label and an HTTP or HTTPS link.';return}
      const pin={id:editing||crypto.randomUUID(),label:label.value.trim(),url:address,emoji:form.elements.emoji.value.trim()};
      const links=state.favoriteLinks||[];
      state.favoriteLinks=editing?links.map(entry=>entry.id===editing?pin:entry):[...links,pin];
      editing='';form.reset();submit.textContent='Pin link';
      save();render();redraw();status.textContent='Link saved.';
    };
    dialog.append(node('h2','Quick links'),entries,form,status,button('Close',()=>dialog.close()));
    redraw();
    const controller=new AbortController();
    addEventListener('dashboard:account-changing',()=>dialog.close(),{signal:controller.signal});
    dialog.onclose=()=>{controller.abort();dialog.remove()};
    document.body.append(dialog);dialog.showModal();
  }

  addEventListener('dashboard:account-changing',()=>{showCompleted=false});
  window.DashboardQuickLinks={open:manageLinks,rows:quickLinkRows};
  const priorRender=render;
  render=function(){
    const custom=page==='Focus timer';
    // Run the normal navigation and theme updates for the timer route.
    if(custom)page='Quick notes';
    try{priorRender()}finally{if(custom)page='Focus timer'}
    if(custom){
      for(const id of ['title','appPageTitle','mobileCurrentPage']){
        const heading=document.getElementById(id);
        if(heading)heading.textContent='Focus timer';
      }
      document.querySelectorAll('[data-page="Quick notes"]').forEach(link=>{
        link.classList.remove('active');link.removeAttribute('aria-current');
      });
      content.replaceChildren();timerPanel();tick();
    }
    if(page==='Daily priorities')board();
  };
  render();
})();
