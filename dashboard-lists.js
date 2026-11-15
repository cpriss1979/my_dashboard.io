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
        ['title','Item name','text',true], ['emoji','Emoji sticker','text'], ['category','Category','text'], ['store','Store','text'],
        ['quantity','Quantity','count',true,'1'], ['price','Estimated price per item ($)','money'],
        ['notes','Notes','textarea']
      ]
    },
    'Wish List': {
      key:'wishList', singular:'wish list item', flag:'Acquired',
      fields:[
        ['title','Item name','text',true], ['emoji','Emoji sticker','text'], ['category','Category','text'], ['recipient','For whom','text'],
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
      if(key==='emoji')field.maxLength=24;
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
    const paper=pageName!=='Collections';
    const panel=el('section',undefined,'card dashboard-inventory'+(paper?' bre-paper':''));
    const style=state.listPaper?.[definition.key]||{};
    if(paper)panel.style.setProperty('--paper-color',/^#[a-f0-9]{6}$/i.test(style.color)?style.color:'#ffe4f1');
    const header=el('div',undefined,'cardhead');
    header.append(el('h2',(paper&&style.emoji?style.emoji+' ':'')+pageName),button('＋ Add '+definition.singular,()=>editor(definition,null,draw),'primary'));
    const filter=el('div',undefined,'inventory-actions');
    const search=el('input');
    search.type='search';search.placeholder='Search this list';search.setAttribute('aria-label','Search '+pageName);
    const scope=el('select');
    scope.setAttribute('aria-label','Filter '+pageName);
    for(const [value,label] of [['all','All items'],['open',pageName==='Collections'?'Keeping':'Still on list'],['done',definition.flag]])scope.add(new Option(label,value));
    filter.append(search);
    if(!paper)filter.append(scope);
    if(paper){
      const color=el('input');color.type='color';color.value=panel.style.getPropertyValue('--paper-color');
      const sticker=el('input');sticker.placeholder='🌸';sticker.maxLength=24;sticker.value=style.emoji||'';
      const colorLabel=el('label','Paper color');colorLabel.append(color);
      const stickerLabel=el('label','List emoji');stickerLabel.append(sticker);
      const commit=()=>{
        (state.listPaper??={})[definition.key]={color:color.value,emoji:sticker.value.trim()};
        panel.style.setProperty('--paper-color',color.value);
        header.querySelector('h2').textContent=[sticker.value.trim(),pageName].filter(Boolean).join(' ');
        save();
      };
      color.oninput=()=>panel.style.setProperty('--paper-color',color.value);
      color.onchange=commit;
      sticker.onchange=commit;
      filter.append(colorLabel,stickerLabel);
    }
    const total=el('p',undefined,'inventory-total');
    total.setAttribute('aria-live','polite');
    const list=el('div',undefined,'inventory-list');
    const archive=el('details',undefined,'bre-list-archive');
    const summary=el('summary');
    const archivedList=el('div',undefined,'inventory-list');
    archive.append(summary,archivedList);
    panel.append(header,filter,total,list);
    if(paper)panel.append(archive);

    function draw(){
      const query=search.value.trim().toLowerCase();
      const records=items(definition);
      const shown=records.filter(item=>(scope.value==='all'||Boolean(item.flagged)===(scope.value==='done'))&&
        [item.title,item.category,item.edition,item.itemNumber,item.store,item.recipient,item.notes].join(' ').toLowerCase().includes(query));
      const priceKey=pageName==='Collections'?'value':'price';
      const active=paper?shown.filter(item=>!item.flagged):shown;
      const priced=active.filter(item=>item[priceKey]!==''&&item[priceKey]!=null);
      const sum=priced.reduce((balance,item)=>balance+amount(item[priceKey])*Number(item.quantity||1),0);
      const label={Collections:'Estimated collection value','Shopping List':'Estimated list cost','Wish List':'Total target price'}[pageName];
      total.textContent=active.length+(active.length===1?' item':' items')+(priced.length?' · '+label+' '+money(sum/100):'');
      list.replaceChildren();
      archivedList.replaceChildren();
      summary.textContent=definition.flag+' archive ('+shown.filter(item=>item.flagged).length+')';
      for(const item of shown){
        const tile=el('article',undefined,'inventory-item');
        tile.dataset.inventoryId=item.id;
        const heading=el('div',undefined,'inventory-title');
        heading.append(el('h3',[item.emoji,item.title].filter(Boolean).join(' ')));
        const tags=[item.category,item.edition,item.condition,item.store,item.recipient,item.priority].filter(Boolean);
        if(tags.length)heading.append(el('p',tags.join(' · ')));
        const checkLabel=el('label',undefined,'inventory-check');
        const check=el('input');
        check.type='checkbox';check.checked=Boolean(item.flagged);
        check.onchange=()=>{
          item.flagged=check.checked;save();draw();
          if(paper)summary.focus();
        };
        checkLabel.append(check,document.createTextNode(definition.flag));
        const detail=el('dl');
        const hidden=new Set(['title','category','edition','condition','store','recipient','priority','url','notes','emoji']);
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
        if(paper&&item.flagged){
          actions.prepend(button('Restore',()=>{item.flagged=false;save();draw();summary.focus()}));
          tile.append(heading);
        }else if(paper)tile.append(checkLabel,heading);
        else tile.append(heading,checkLabel);
        if(detail.children.length)tile.append(detail);
        if(item.notes)tile.append(el('p',item.notes,'inventory-notes'));
        tile.append(actions);
        (paper&&item.flagged?archivedList:list).append(tile);
      }
      if(!active.length)list.append(el('p',query?'No matching active items.':'Nothing on this list yet.'));
      if(!archivedList.children.length)archivedList.append(el('p','No archived items.'));
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
