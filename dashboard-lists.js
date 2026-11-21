(function () {
  'use strict';

  const definitions = {
    Collections: {
      key:'collectibles', singular:'collectible', flag:'Marked for trade',
      fields:[
        ['title','Item name','text',true], ['category','Collection or category','text'],
        ['edition','Set, edition, or format','text'], ['itemNumber','Card number, catalog ID, or barcode','text'],
        ['condition','Condition or grade','text'], ['quantity','Quantity','count',true,'1'],
        ['cost','Cost per item ($)','money'], ['value','Estimated value per item ($)','money'],
        ['acquired','Date acquired','date'], ['location','Storage location','text'], ['notes','Notes','textarea']
      ]
    },
    'Shopping List': {
      key:'shoppingList', singular:'shopping item', flag:'Purchased',
      fields:[
        ['title','Item name','text',true], ['category','Category','text'], ['store','Store','text'],
        ['quantity','Quantity','count',true,'1'], ['price','Estimated price per item ($)','money'],
        ['notes','Notes','textarea']
      ]
    },
    'Wish List': {
      key:'wishList', singular:'wish list item', flag:'Acquired',
      fields:[
        ['title','Item name','text',true], ['category','Category','text'], ['recipient','For whom','text'],
        ['priority','Priority','priority',false,'Normal'], ['price','Target price ($)','money'],
        ['url','Product link','url'], ['notes','Notes','textarea']
      ]
    }
  };
  const el = (tag,text,className) => {
    const node=document.createElement(tag);
    if(text!==undefined)node.textContent=text;
    if(className)node.className=className;
    return node;
  };
  function button(label,run,className='secondary'){
    const node=el('button',label,className);
    node.type='button';node.onclick=run;
    return node;
  }
  function items(definition) {
    return Array.isArray(state[definition.key])?state[definition.key]:[];
  }
  function href(value) {
    try{
      const url=new URL(value);
      return ['https:','http:'].includes(url.protocol)?url.href:'';
    }catch{return ''}
  }
  function amount(value) { return Math.round(Number(value)*100); }

  function editor(definition,existing,refresh) {
    const owner=state;
    const dialog=el('dialog',undefined,'priss-options-dialog inventory-dialog');
    const heading=(existing?'Edit ':'Add ')+definition.singular;
    dialog.setAttribute('aria-label',heading);
    const form=el('form',undefined,'inventory-fields');
    for(const [key,label,type,required,fallback=''] of definition.fields){
      const wrapper=el('label',label);
      const field=el(type==='textarea'?'textarea':type==='priority'?'select':'input');
      field.name=key;
      field.required=Boolean(required);
      if(type==='priority')for(const priority of ['High','Normal','Low'])field.add(new Option(priority,priority));
      else if(type==='textarea'){field.rows=3;field.maxLength=1000;wrapper.className='inventory-wide'}
      else if(type==='count'||type==='money'){
        field.type='number';field.min=type==='count'?'1':'0';field.step=type==='count'?'1':'.01';
        field.max=type==='count'?'1000000':'1000000000';
      }else{field.type=type;field.maxLength=type==='url'?1200:200}
      field.value=existing?.[key]??fallback;
      wrapper.append(field);
      form.append(wrapper);
    }
    const status=el('p',undefined,'inventory-wide');
    status.setAttribute('role','alert');
    const actions=el('div',undefined,'inventory-actions inventory-wide');
    const submit=el('button','Save','primary');
    submit.type='submit';
    actions.append(submit,button('Cancel',()=>dialog.close()));
    form.append(status,actions);
    form.onsubmit=event=>{
      event.preventDefault();
      if(state!==owner){
        dialog.close();
        return;
      }
      const data=Object.fromEntries([...new FormData(form)].map(([key,value])=>[key,value.trim()]));
      if(!data.title){status.textContent='Enter an item name.';return}
      if(data.url&&!href(data.url)){status.textContent='Enter a product link beginning with https:// or http://.';return}
      const records=items(definition);
      const updated={...existing,...data,id:existing?.id??crypto.randomUUID()};
      state[definition.key]=existing?records.map(item=>item.id===existing.id?updated:item):[...records,updated];
      save();
      dialog.close();
      refresh();
    };
    dialog.append(el('h2',heading),form);
    dialog.addEventListener('close',()=>dialog.remove(),{once:true});
    document.body.append(dialog);
    dialog.showModal();
  }

  function paint(pageName) {
    const definition=definitions[pageName];
    const panel=el('section',undefined,'card dashboard-inventory');
    const header=el('div',undefined,'cardhead');
    header.append(el('h2',pageName),button('＋ Add '+definition.singular,()=>editor(definition,null,draw),'primary'));
    const filter=el('div',undefined,'inventory-actions');
    const search=el('input');
    search.type='search';search.placeholder='Search this list';search.setAttribute('aria-label','Search '+pageName);
    const scope=el('select');
    scope.setAttribute('aria-label','Filter '+pageName);
    for(const [value,label] of [['all','All items'],['open',pageName==='Collections'?'Keeping':'Still on list'],['done',definition.flag]])scope.add(new Option(label,value));
    filter.append(search,scope);
    const total=el('p',undefined,'inventory-total');
    total.setAttribute('aria-live','polite');
    const list=el('div',undefined,'inventory-list');
    panel.append(header,filter,total,list);

    function draw(){
      const query=search.value.trim().toLowerCase();
      const records=items(definition);
      const shown=records.filter(item=>(scope.value==='all'||Boolean(item.flagged)===(scope.value==='done'))&&
        [item.title,item.category,item.edition,item.itemNumber,item.store,item.recipient,item.notes].join(' ').toLowerCase().includes(query));
      const priceKey=pageName==='Collections'?'value':'price';
      const priced=shown.filter(item=>item[priceKey]!==''&&item[priceKey]!=null);
      const sum=priced.reduce((balance,item)=>balance+amount(item[priceKey])*Number(item.quantity||1),0);
      const label={Collections:'Estimated collection value','Shopping List':'Estimated list cost','Wish List':'Total target price'}[pageName];
      total.textContent=shown.length+(shown.length===1?' item':' items')+(priced.length?' · '+label+' '+money(sum/100):'');
      list.replaceChildren();
      for(const item of shown){
        const tile=el('article',undefined,'inventory-item');
        tile.dataset.inventoryId=item.id;
        const heading=el('div',undefined,'inventory-title');
        heading.append(el('h3',item.title));
        const tags=[item.category,item.edition,item.condition,item.store,item.recipient,item.priority].filter(Boolean);
        if(tags.length)heading.append(el('p',tags.join(' · ')));
        const checkLabel=el('label',undefined,'inventory-check');
        const check=el('input');
        check.type='checkbox';check.checked=Boolean(item.flagged);
        check.onchange=()=>{item.flagged=check.checked;save();draw()};
        checkLabel.append(check,document.createTextNode(definition.flag));
        const detail=el('dl');
        const hidden=new Set(['title','category','edition','condition','store','recipient','priority','url','notes']);
        for(const [key,label,type] of definition.fields){
          if(hidden.has(key)||item[key]==null||item[key]==='')continue;
          const formatted=type==='money'?money(Number(item[key])):type==='date'?displayUSDate(item[key]):item[key];
          const row=el('div');
          row.append(el('dt',label),el('dd',formatted));detail.append(row);
        }
        const actions=el('div',undefined,'inventory-actions');
        const url=href(item.url);
        if(url){
          const link=el('a','Open product ↗');link.href=url;link.target='_blank';link.rel='noopener noreferrer';actions.append(link);
        }
        actions.append(button('Edit',()=>editor(definition,item,draw)),button('Delete',()=>{
          if(!confirm('Delete '+item.title+'?'))return;
          state[definition.key]=items(definition).filter(record=>record.id!==item.id);
          save();draw();
        }));
        tile.append(heading,checkLabel);
        if(detail.children.length)tile.append(detail);
        if(item.notes)tile.append(el('p',item.notes,'inventory-notes'));
        tile.append(actions);
        list.append(tile);
      }
      if(!shown.length)list.append(el('p',records.length?'No matching items.':'Nothing on this list yet.'));
    }
    search.oninput=draw;
    scope.onchange=draw;
    draw();
    document.getElementById('content').replaceChildren(panel);
  }

  addEventListener('dashboard:account-changing',()=>{
    document.querySelectorAll('.inventory-dialog[open]').forEach(dialog=>dialog.close());
  });
  const previous=render;
  render=function(){
    const requested=page;
    if(!Object.hasOwn(definitions,requested)){previous();return}
    page='Quick notes';
    try{previous()}finally{page=requested}
    document.body.dataset.glowPage=requested;
    for(const id of ['appPageTitle','title']){
      const title=document.getElementById(id);
      if(title)title.textContent=requested;
    }
    document.querySelectorAll('aside nav [data-page]').forEach(button=>{
      const active=button.dataset.page===requested;
      button.classList.toggle('active',active);
      if(active)button.setAttribute('aria-current','page');
      else button.removeAttribute('aria-current');
    });
    paint(requested);
  };
})();

/* Pokémon collection add-on · 2026-11-17. No external dependencies. */
(function () {
  'use strict';
  if (window.GlowPokemonCollection) return;
  window.GlowPokemonCollection = true;
  const KEY = 'pokemonCards', VERSION = 1;
  const statuses = ['Keeping', 'Considering selling', 'Listed', 'Sold'];
  const fields = [
    ['title','Pokémon / card name','text',true], ['owner','Owner','text'],
    ['edition','Set name','text'], ['itemNumber','Card number (e.g. 4/102)','text'],
    ['variant','Version / rarity','text'], ['language','Language','text'],
    ['condition','Condition','select',['Not assessed','Near mint','Lightly played','Moderately played','Heavily played','Damaged','Graded']],
    ['grader','Grading company','text'], ['grade','Grade','text'],
    ['quantity','Quantity (same version and condition)','number',true],
    ['cost','Purchase cost per card ($)','money'], ['location','Binder / page / box','text'],
    ['status','Selling status','select',statuses], ['asking','Asking price per card ($)','money'],
    ['soldPrice','Actual sale price per card ($)','money'], ['soldDate','Date sold','date'],
    ['notes','Notes','textarea']
  ];
  const $ = (tag, text, cls) => {const n=document.createElement(tag); if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
  const btn = (text, fn) => {const b=$('button',text);b.type='button';b.onclick=fn;return b;};
  const moneyP = n => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n);
  const today = () => {const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
  const scope = () => typeof dashboardActivePrefix==='string'?dashboardActivePrefix:'';
  const records = () => Array.isArray(state[KEY])?state[KEY]:[];
  const latest = c => [...(c.history||[])].sort((a,b)=>b.date.localeCompare(a.date)||b.recordedAt.localeCompare(a.recordedAt))[0];
  const validURL = raw => {try{const u=new URL(raw);return ['https:','http:'].includes(u.protocol)?u.href:'';}catch{return '';}};
  let mode='pokemon', dbPromise;
  function db() {
    if(!dbPromise)dbPromise=new Promise((resolve,reject)=>{
      const r=indexedDB.open('glow-pokemon-photos',1);
      r.onupgradeneeded=()=>r.result.createObjectStore('photos');
      r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(Error('Photo storage is unavailable. Try a regular browser window.'));
    }).catch(e=>{dbPromise=null;throw e;});
    return dbPromise;
  }
  async function photo(action,key,value) {
    const d=await db();return new Promise((resolve,reject)=>{
      const tx=d.transaction('photos',action==='get'?'readonly':'readwrite');
      const s=tx.objectStore('photos'),r=action==='get'?s.get(key):s.put(value,key);
      tx.oncomplete=()=>resolve(r.result);tx.onerror=()=>reject(tx.error||Error('Could not store photo.'));tx.onabort=()=>reject(tx.error||Error('Photo storage was interrupted.'));
    });
  }
  function commit(next,owner,account) {
    if(state!==owner||scope()!==account)throw Error('Account changed. Reopen Collections and try again.');
    const previous=state[KEY];state[KEY]=next;
    try {dashboardStorage.setItem('myday-v1',JSON.stringify(state));}
    catch(e){state[KEY]=previous;throw Error('Storage is full or unavailable. Your change was not saved. Export a backup first.');}
    save();
  }
  function dialog(title) {
    const d=$('dialog',undefined,'pk-dialog');d.setAttribute('aria-label',title);
    d.append($('h2',title));document.body.append(d);
    d.addEventListener('close',()=>d.remove(),{once:true});d.showModal();return d;
  }
  function links(c) {
    const wrap=$('div',undefined,'pk-actions');
    const query=['Pokemon',c.title,c.edition,c.itemNumber,c.variant,c.language,c.condition,c.grader,c.grade].filter(Boolean).join(' ');
    for(const [label,url] of [
      ['Search sold listings ↗','https://www.ebay.com/sch/i.html?_nkw='+encodeURIComponent(query)+'&LH_Sold=1&LH_Complete=1'],
      ['Search card prices ↗','https://www.google.com/search?q='+encodeURIComponent(query+' card value')]
    ]){const a=$('a',label);a.href=url;a.target='_blank';a.rel='noopener noreferrer';wrap.append(a);}
    return wrap;
  }
  async function imageFile(file) {
    if(file.size>20*1024*1024)throw Error('Choose a photo smaller than 20 MB.');
    if(!/^image\/(jpeg|png|webp)$/.test(file.type))throw Error('Use a JPG, PNG, or WebP photo. Export HEIC photos as JPG first.');
    const url=URL.createObjectURL(file),im=new Image();
    try {
      await new Promise((r,j)=>{im.onload=r;im.onerror=()=>j(Error('This photo could not be opened.'));im.src=url;});
      const factor=Math.min(1,1400/Math.max(im.naturalWidth,im.naturalHeight));
      const canvas=document.createElement('canvas');canvas.width=Math.round(im.naturalWidth*factor);canvas.height=Math.round(im.naturalHeight*factor);
      const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(im,0,0,canvas.width,canvas.height);
      return canvas.toDataURL('image/jpeg',0.85);
    } finally {URL.revokeObjectURL(url);}
  }
  function editor(existing,refresh,duplicate=false) {
    const owner=state,account=scope();
    const c=existing?structuredClone(existing):{quantity:1,language:'English',status:'Keeping',condition:'Not assessed',owner:window.DashboardSyncBridge?.accountDisplayName||'',history:[]};
    if(duplicate){c.id=crypto.randomUUID();c.history=[];c.status='Keeping';c.soldPrice='';c.soldDate='';}
    const d=dialog(duplicate?'Duplicate Pokémon card':existing?'Edit Pokémon card':'Add Pokémon card');
    const f=$('form',undefined,'pk-fields'),inputs={};
    for(const [key,label,type,option] of fields){
      const w=$('label',label),i=$(type==='select'?'select':type==='textarea'?'textarea':'input');
      i.name=key;
      if(type==='select')option.forEach(v=>i.add(new Option(v,v)));
      else if(type==='textarea'){i.rows=3;i.maxLength=2000;}
      else {i.type=type==='money'?'number':type;i.maxLength=250;if(type==='number'||type==='money'){i.min=type==='number'?'1':'0';i.max=type==='number'?'100000':'100000000';i.step=type==='number'?'1':'.01';}}
      if(option===true)i.required=true;
      i.value=c[key]??'';inputs[key]=i;w.append(i);f.append(w);
    }
    const photos={...c.photos},picked={};
    for(const side of ['front','back']){
      const w=$('label',side==='front'?'Front photo':'Back photo'),i=$('input');i.type='file';i.accept='image/jpeg,image/png,image/webp';
      const info=$('small',photos[side]?'Saved photo attached':'No photo');
      i.onchange=()=>{picked[side]=i.files[0];info.textContent=i.files[0]?.name|| (photos[side]?'Saved photo attached':'No photo');};
      w.append(i,info,btn('Remove '+side+' photo',()=>{delete photos[side];delete picked[side];i.value='';info.textContent='Removed (save to apply)';}));f.append(w);
    }
    f.append($('p','Photos stay on this device. Export a Pokémon backup to keep a copy or transfer them.','pk-wide'));
    const error=$('p',undefined,'pk-wide');error.setAttribute('role','alert');
    const actions=$('div',undefined,'pk-actions pk-wide'),submit=$('button','Save card');submit.type='submit';actions.append(submit,btn('Cancel',()=>d.close()));f.append(error,actions);d.append(f);
    f.onsubmit=async e=>{
      e.preventDefault();submit.disabled=true;error.textContent='';
      try {
        const updated={...c,id:c.id||crypto.randomUUID(),photos};
        for(const [key,,type] of fields){const v=inputs[key].value.trim();updated[key]=v===''?'':type==='money'||type==='number'?Number(v):v;}
        if(!updated.title)throw Error('Enter a card name.');
        for(const side of ['front','back'])if(picked[side]){
          const data=await imageFile(picked[side]);
          if(state!==owner||scope()!==account||!d.open)throw Error('The editor was closed or the account changed.');
          const id=account+'photo:'+crypto.randomUUID();await photo('put',id,data);photos[side]=id;
        }
        if(!d.open)return;
        const next=records().filter(x=>x.id!==updated.id);next.push(updated);commit(next,owner,account);d.close();refresh();
      }catch(e){error.textContent=e.message;}finally{submit.disabled=false;}
    };
  }
  function valuation(c,refresh) {
    const owner=state,account=scope(),d=dialog('Check & record value — '+c.title);
    d.append($('p','Match the exact set, number, version, language and condition. Compare completed sales. Asking prices are not confirmed sale values.'),links(c));
    const f=$('form',undefined,'pk-fields'),inputs={};
    for(const [key,label,type] of [['amount','Estimated value per card ($)','number'],['date','Date checked','date'],['source','Price source / explanation','text'],['url','Source link (optional)','url']]){
      const w=$('label',label),i=$('input');i.type=type;i.required=key!=='url';i.maxLength=1000;
      if(key==='amount'){i.min='0';i.max='100000000';i.step='.01';}if(key==='date')i.value=today();inputs[key]=i;w.append(i);f.append(w);
    }
    const err=$('p',undefined,'pk-wide');err.setAttribute('role','alert');const actions=$('div',undefined,'pk-actions pk-wide'),submit=$('button','Save dated value');submit.type='submit';actions.append(submit,btn('Close',()=>d.close()));f.append(err,actions);d.append(f);
    f.onsubmit=e=>{e.preventDefault();try{
      const source=inputs.source.value.trim(),url=inputs.url.value.trim();if(!source)throw Error('Enter the source you checked.');if(url&&!validURL(url))throw Error('Use an http:// or https:// source link.');
      const current=records().find(x=>x.id===c.id);if(!current)throw Error('This card no longer exists.');
      const entry={id:crypto.randomUUID(),amount:Number(inputs.amount.value),date:inputs.date.value,source,url,recordedAt:new Date().toISOString()};
      commit(records().map(x=>x.id===c.id?{...x,history:[...(x.history||[]),entry]}:x),owner,account);d.close();refresh();
    }catch(e){err.textContent=e.message;}};
  }
  function history(c,refresh) {
    const owner=state,account=scope(),d=dialog('Value history — '+c.title);
    const draw=()=>{
      d.querySelector('.pk-history')?.remove();const area=$('div',undefined,'pk-history');
      const current=records().find(x=>x.id===c.id);
      for(const h of [...(current?.history||[])].sort((a,b)=>b.date.localeCompare(a.date)||b.recordedAt.localeCompare(a.recordedAt))){
        const row=$('div',undefined,'pk-history-row');row.append($('strong',moneyP(h.amount)+' per card · '+h.date),$('p',h.source));
        const url=validURL(h.url);if(url){const a=$('a','View source ↗');a.href=url;a.target='_blank';a.rel='noopener noreferrer';row.append(a);}
        row.append(btn('Delete value',()=>{if(!confirm('Delete this dated value?'))return;try{commit(records().map(x=>x.id===c.id?{...x,history:x.history.filter(v=>v.id!==h.id)}:x),owner,account);draw();refresh();}catch(e){alert(e.message);}}));area.append(row);
      }
      if(!current?.history?.length)area.append($('p','No values recorded yet.'));
      d.append(area);
    };d.append(btn('Close',()=>d.close()));draw();
  }
  async function showPhoto(key,caption,account) {
    try{const data=await photo('get',key);if(scope()!==account)return;if(!data){alert('This photo is not on this device. Import the Pokémon backup from the device where it was added.');return;}
      const d=dialog(caption),im=$('img');im.src=data;im.alt=caption;im.className='pk-full-photo';d.append(im,btn('Close',()=>d.close()));
    }catch(e){alert(e.message);}
  }
  function download(data,name) {const a=$('a');const url=URL.createObjectURL(new Blob([JSON.stringify(data)],{type:'application/json'}));a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  async function exportCards(message) {
    const owner=state,account=scope(),cards=structuredClone(records()),photos={};let missing=0;
    try{
      for(const c of cards)for(const key of Object.values(c.photos||{}))if(!Object.hasOwn(photos,key)){const data=await photo('get',key);if(data)photos[key]=data;else missing++;}
      if(state!==owner||scope()!==account)throw Error('Account changed. Export again from the intended account.');
      download({format:'glow-pokemon',version:VERSION,exportedAt:new Date().toISOString(),cards,photos},'Pokemon-Backup-'+today()+'.json');
      message.textContent=missing?`Backup downloaded, but ${missing} photo references were missing on this device. Export from the original device to include them.`:'Backup downloaded with card records and all available photos.';
    }catch(e){message.textContent=e.message;}
  }
  function validateBackup(data) {
    if(data?.format!=='glow-pokemon'||data.version!==VERSION||!Array.isArray(data.cards)||data.cards.length>10000)throw Error('Choose a Pokémon backup exported by this add-on.');
    const ids=new Set();
    return data.cards.map(c=>{
      if(!c||typeof c.id!=='string'||!c.id||c.id.length>100||ids.has(c.id))throw Error('Invalid or duplicate card ID.');ids.add(c.id);
      const out={id:c.id,history:[],photos:{}};
      for(const [k,,type] of fields){const v=c[k]??'';
        if(type==='money'||type==='number'){if(v!==''&&(typeof v!=='number'||!Number.isFinite(v)||v<0||v>100000000))throw Error('Invalid numeric field.');out[k]=v;}
        else {if(typeof v!=='string'||v.length>2000)throw Error('Invalid card text.');out[k]=v;}
      }
      if(!out.title.trim()||!Number.isInteger(out.quantity)||out.quantity<1||out.quantity>100000||!statuses.includes(out.status))throw Error('Invalid card details.');
      if(!Array.isArray(c.history)||c.history.length>10000)throw Error('Invalid value history.');
      out.history=c.history.map(h=>{if(!h||typeof h.id!=='string'||typeof h.amount!=='number'||!Number.isFinite(h.amount)||h.amount<0||h.amount>100000000||!/^\d{4}-\d{2}-\d{2}$/.test(h.date)||typeof h.source!=='string'||h.source.length>2000||typeof h.recordedAt!=='string')throw Error('Invalid saved value.');return {id:h.id,amount:h.amount,date:h.date,source:h.source,url:validURL(h.url),recordedAt:h.recordedAt};});
      for(const side of ['front','back'])if(c.photos?.[side]){const k=c.photos[side];if(typeof k!=='string'||k.length>300)throw Error('Invalid photo reference.');const v=data.photos?.[k];if(v!==undefined&&(typeof v!=='string'||v.length>6000000||!/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(v)))throw Error('Invalid photo data.');out.photos[side]=k;}
      return out;
    });
  }
  async function importCards(file,message,refresh) {
    const owner=state,account=scope();
    try{
      if(file.size>150*1024*1024)throw Error('This backup is too large (maximum 150 MB).');
      const data=JSON.parse(await file.text()),cards=validateBackup(data);
      if(state!==owner||scope()!==account)throw Error('Account changed. Import again.');
      const overlaps=cards.filter(c=>records().some(x=>x.id===c.id)).length;
      if(!confirm(`Import ${cards.length} cards into this dashboard account? ${overlaps} matching card records will be updated. Other cards stay unchanged.`))return;
      let missing=0;const remap=new Map();
      for(const c of cards)for(const side of ['front','back'])if(c.photos[side]){
        const old=c.photos[side],value=data.photos?.[old];
        if(value){if(!remap.has(old)){const key=account+'photo:'+crypto.randomUUID();await photo('put',key,value);remap.set(old,key);}c.photos[side]=remap.get(old);}
        else {missing++;const previous=records().find(x=>x.id===c.id)?.photos?.[side];if(previous)c.photos[side]=previous;else delete c.photos[side];}
      }
      const imported=new Map(cards.map(c=>[c.id,c]));commit([...records().filter(c=>!imported.has(c.id)),...cards],owner,account);refresh();
      message.textContent='Imported '+cards.length+' cards.'+(missing?' Some photos were absent from the backup.':'');
    }catch(e){message.textContent='Import failed: '+e.message;}
  }
  function paint(host) {
    const account=scope(),panel=$('section',undefined,'pk-panel card');
    const heading=$('div',undefined,'pk-actions');heading.append($('h2','Pokémon collection'),btn('Add card',()=>editor(null,draw)));panel.append(heading);
    panel.append($('p','Track your cards, sale status and recorded values in USD.'));
    const notice=$('details');notice.append($('summary','Saving, photos & sharing'),$('p','Card details use this dashboard account’s existing save/sync system. Photos are saved in this browser on this device and are not cloud-synced. Export a Pokémon backup regularly; it includes available photos. Import that backup on another device or share it with someone you choose. Owner labels do not grant access to another account. Clearing site data removes local photos.'));panel.append(notice);
    const filters=$('div',undefined,'pk-actions'),search=$('input');search.type='search';search.placeholder='Search name, set, number, notes…';search.setAttribute('aria-label','Search Pokémon cards');
    const ownerFilter=$('select');ownerFilter.setAttribute('aria-label','Filter owner');ownerFilter.add(new Option('All owners',''));[...new Set(records().map(c=>c.owner).filter(Boolean))].sort().forEach(v=>ownerFilter.add(new Option(v,v)));
    const statusFilter=$('select');statusFilter.setAttribute('aria-label','Filter selling status');statusFilter.add(new Option('All statuses',''));statuses.forEach(v=>statusFilter.add(new Option(v,v)));
    const sort=$('select');sort.setAttribute('aria-label','Sort cards');[['new','Newest added'],['name','Card name'],['value','Highest value']].forEach(([v,t])=>sort.add(new Option(t,v)));
    filters.classList.add('collection-filters');filters.append(search,ownerFilter,statusFilter,sort);panel.append(filters);
    const summary=$('p',undefined,'pk-summary'),grid=$('div',undefined,'pk-grid'),message=$('p');message.setAttribute('role','status');
    const backup=$('div',undefined,'pk-actions'),file=$('input');file.type='file';file.accept='.json,application/json';file.hidden=true;
    file.onchange=()=>{if(file.files[0])importCards(file.files[0],message,draw);file.value='';};backup.append(btn('Export Pokémon backup',()=>exportCards(message)),btn('Import Pokémon backup',()=>file.click()),file);
    panel.append(summary,grid,backup,message);host.append(panel);
    function draw(){
      if(scope()!==account)return;
      const selectedOwner=ownerFilter.value;ownerFilter.replaceChildren(new Option('All owners',''));[...new Set(records().map(c=>c.owner).filter(Boolean))].sort().forEach(v=>ownerFilter.add(new Option(v,v)));ownerFilter.value=selectedOwner;
      const q=search.value.trim().toLowerCase();const shown=records().filter(c=>(!ownerFilter.value||c.owner===ownerFilter.value)&&(!statusFilter.value||c.status===statusFilter.value)&&fields.map(([k])=>c[k]).join(' ').toLowerCase().includes(q));
      if(sort.value==='name')shown.sort((a,b)=>a.title.localeCompare(b.title));else if(sort.value==='value')shown.sort((a,b)=>(latest(b)?.amount??-1)-(latest(a)?.amount??-1));else shown.reverse();
      const held=shown.filter(c=>c.status!=='Sold'),valued=held.filter(c=>latest(c));const sum=valued.reduce((n,c)=>n+Math.round(latest(c).amount*100)*c.quantity,0)/100;
      summary.textContent=`${shown.length} card records · ${shown.reduce((n,c)=>n+c.quantity,0)} cards · Unsold estimated value: ${moneyP(sum)} · ${held.length-valued.length} unsold records not valued`;
      grid.replaceChildren();
      for(const c of shown){
        const tile=$('article',undefined,'pk-tile'),photos=$('div',undefined,'pk-photos');
        for(const side of ['front','back'])if(c.photos?.[side]){
          const b=btn('Load '+side+' photo',()=>showPhoto(c.photos[side],c.title+' — '+side,account));photos.append(b);
          photo('get',c.photos[side]).then(data=>{if(!b.isConnected||scope()!==account)return;if(data){const im=$('img');im.src=data;im.alt=c.title+' — '+side;im.loading='lazy';b.replaceChildren(im);}else b.textContent=side+' photo on another device';}).catch(()=>{b.textContent='Photo unavailable';});
        }
        if(!photos.children.length)photos.append($('div','No photos yet','pk-placeholder'));
        tile.append(photos,$('h3',c.title),$('p',[c.edition,c.itemNumber,c.variant].filter(Boolean).join(' · ')),$('p',[c.owner,c.language,c.condition,c.grader,c.grade].filter(Boolean).join(' · ')),$('span',c.status,'pk-badge'));
        const h=latest(c);tile.append($('p',h?moneyP(h.amount)+' per card · Checked '+h.date:'No value recorded','pk-price'));
        tile.append($('p','Quantity: '+c.quantity+(c.location?' · '+c.location:'')));
        if(c.asking!=='')tile.append($('p','Asking: '+moneyP(c.asking)+' per card'));if(c.status==='Sold'&&c.soldPrice!=='')tile.append($('p','Sold: '+moneyP(c.soldPrice)+' per card'+(c.soldDate?' · '+c.soldDate:'')));
        if(c.notes)tile.append($('p',c.notes));
        const actions=$('div',undefined,'pk-actions');actions.append(btn('Check / record value',()=>valuation(c,draw)),btn('Value history',()=>history(c,draw)),btn('Edit',()=>editor(c,draw)),btn('Duplicate',()=>editor(c,draw,true)),btn('Delete',()=>{if(confirm('Delete '+c.title+' and its value history?')){try{commit(records().filter(x=>x.id!==c.id),state,account);draw();}catch(e){message.textContent=e.message;}}}));tile.append(actions);grid.append(tile);
      }
      if(!shown.length)grid.append($('p',records().length?'No cards match these filters.':'Add your first card to start your collection.'));
    }
    search.oninput=draw;ownerFilter.onchange=draw;statusFilter.onchange=draw;sort.onchange=draw;draw();
  }
  const css=$('style');css.textContent=`
  .pk-panel{padding:20px;border:1px solid #536180;border-radius:18px;background:#142039;color:#eef2ff}.pk-panel h2,.pk-panel h3,.pk-dialog h2{margin:0 0 10px}.pk-panel p{overflow-wrap:anywhere}.pk-actions{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:12px 0}.pk-panel button,.pk-dialog button,.pk-tabs button{border:1px solid #65749a;border-radius:10px;padding:9px 12px;background:#253552;color:#fff;cursor:pointer;min-height:40px}.pk-panel a,.pk-dialog a{color:#bceaff;text-decoration:underline}.pk-panel input,.pk-panel select,.pk-dialog input,.pk-dialog select,.pk-dialog textarea{box-sizing:border-box;max-width:100%;min-height:42px;padding:9px;border-radius:8px;border:1px solid #637394;background:#101b30;color:#fff;font:inherit}.pk-panel input[type=search]{flex:1;min-width:160px}.pk-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,285px),1fr));gap:16px;margin:20px 0}.pk-tile{background:#1b2a45;padding:16px;border:1px solid #43557a;border-radius:15px;min-width:0}.pk-photos{display:flex;gap:8px;height:180px;margin-bottom:14px}.pk-photos button{flex:1;min-width:0;padding:3px;overflow:hidden}.pk-photos img{height:100%;width:100%;object-fit:contain}.pk-placeholder{display:grid;place-items:center;width:100%;background:linear-gradient(135deg,#273853,#443352);border-radius:10px;color:#d0cce3}.pk-badge{display:inline-block;background:#3c405e;padding:5px 9px;border-radius:20px}.pk-price{color:#a8edda;font-weight:700}.pk-dialog{box-sizing:border-box;width:min(780px,94vw);max-height:88vh;overflow:auto;background:#142039;color:#eef2ff;border:1px solid #8296bd;border-radius:18px;padding:24px}.pk-dialog::backdrop{background:#050a18b8}.pk-fields{display:grid;grid-template-columns:1fr 1fr;gap:16px}.pk-fields label{display:flex;flex-direction:column;gap:7px;min-width:0}.pk-wide{grid-column:1/-1}.pk-full-photo{display:block;max-width:100%;max-height:65vh;margin:12px auto;object-fit:contain}.pk-history-row{padding:14px 0;border-bottom:1px solid #52627d}.pk-history-row button{margin-left:12px}.pk-panel details{padding:12px;background:#1d2d48;border-radius:10px}.pk-panel summary{cursor:pointer}.pk-summary{font-weight:600}.pk-tabs button[aria-pressed=true]{background:#624b83}.pk-panel :focus-visible,.pk-dialog :focus-visible,.pk-tabs :focus-visible{outline:3px solid #c1b2ff;outline-offset:3px}@media(max-width:560px){.pk-fields{grid-template-columns:1fr}.pk-dialog{padding:16px}.pk-panel{padding:12px}}`;
  document.head.append(css);
  const previous=render;
  render=function(){
    previous();if(page!=='Collections')return;
    const host=document.getElementById('content');if(!host)return;
    const tabs=$('div',undefined,'pk-actions pk-tabs');
    for(const [id,label] of [['pokemon','Pokémon cards'],['general','Other collectibles']]){const b=btn(label,()=>{mode=id;render();});b.setAttribute('aria-pressed',String(mode===id));tabs.append(b);}
    if(mode==='pokemon'){host.replaceChildren();paint(host);}
    const panel=host.firstElementChild;
    if(panel){
      panel.classList.add('collection-panel');
      panel.prepend(tabs);
      if(mode==='general'){
        const title=panel.querySelector('h2');
        if(title)title.textContent='Other collectibles';
      }
    }
  };
  addEventListener('dashboard:account-changing',()=>{document.querySelectorAll('.pk-dialog[open]').forEach(d=>d.close());});
  if(page==='Collections')render();
})();
