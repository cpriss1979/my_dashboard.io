(function () {
  'use strict';

  const definitions = {
    Collections: {
      key:'collectibles', singular:'collectible', flag:'Marked for trade',
      fields:[
        ['title','Item name','text',true], ['category','Collection or category','text'],
        ['edition','Set, edition, or format','text'], ['cover','Cover image URL','url'], ['itemNumber','Card number, catalog ID, or barcode','text'],
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
    if(definition.key!=='collectibles')dialog.classList.add('list-item-editor',definition.key);
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
      if((data.url&&!href(data.url))||(data.cover&&!href(data.cover))){status.textContent='Enter a link beginning with https:// or http://.';return}
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

  function paintCollections() {
    const definition=definitions.Collections;
    const panel=el('section',undefined,'card dashboard-inventory household-collection');
    const header=el('div',undefined,'cardhead');
    header.append(el('h2','Collections'),button('＋ Add collectible',()=>editor(definition,null,draw),'primary'));
    const filters=el('div',undefined,'inventory-actions');
    const search=el('input');
    search.type='search';search.placeholder='Search this list';search.setAttribute('aria-label','Search collections');
    const scope=el('select');
    scope.setAttribute('aria-label','Filter collections');
    for(const [value,label] of [['all','All items'],['open','Keeping'],['done',definition.flag]])scope.add(new Option(label,value));
    const group=el('select');group.setAttribute('aria-label','Filter by collection');
    const view=el('select');view.setAttribute('aria-label','Collection view');
    view.add(new Option('Gallery','gallery'));view.add(new Option('Compact list','list'));
    view.value=state.collectionView==='list'?'list':'gallery';
    view.onchange=()=>{state.collectionView=view.value;save();draw()};
    filters.append(search,group,scope,view);
    const total=el('p',undefined,'inventory-total');
    total.setAttribute('aria-live','polite');
    const list=el('div',undefined,'inventory-list');
    panel.append(header,filters,total,list);
    function draw(){
      const records=items(definition);
      const selected=group.value;
      group.replaceChildren(new Option('All collections',''),...[...new Set(records.map(item=>item.category?.trim()||'Uncategorized'))].sort().map(name=>new Option(name,name)));
      if([...group.options].some(option=>option.value===selected))group.value=selected;
      list.dataset.view=view.value;
      const query=search.value.trim().toLowerCase();
      const shown=records.filter(item=>(!group.value||(item.category?.trim()||'Uncategorized')===group.value)&&(scope.value==='all'||Boolean(item.flagged)===(scope.value==='done'))&&
        [item.title,item.category,item.edition,item.itemNumber,item.notes].join(' ').toLowerCase().includes(query));
      const priced=shown.filter(item=>item.value!==''&&item.value!=null);
      const sum=priced.reduce((balance,item)=>balance+amount(item.value)*Number(item.quantity||1),0);
      total.textContent=shown.length+(shown.length===1?' item':' items')+(priced.length?' · Estimated collection value '+money(sum/100):'');
      list.replaceChildren();
      for(const item of shown){
        const tile=el('article',undefined,'inventory-item');
        tile.dataset.inventoryId=item.id;
        if(view.value==='gallery'){
          const cover=el('div',item.category?.toLowerCase().includes('movie')?'🎬':item.category?.toLowerCase().includes('card')?'🃏':'✦','collection-cover');
          cover.setAttribute('aria-hidden','true');
          if(href(item.cover)){
            const picture=el('img');picture.loading='lazy';picture.referrerPolicy='no-referrer';picture.alt='';picture.src=href(item.cover);
            picture.onerror=()=>picture.remove();cover.append(picture);
          }
          tile.append(cover);
        }
        const heading=el('div',undefined,'inventory-title');
        heading.append(el('h3',item.title));
        const tags=[item.category,item.edition,item.condition].filter(Boolean);
        if(tags.length)heading.append(el('p',tags.join(' · ')));
        const checkLabel=el('label',undefined,'inventory-check');
        const check=el('input');
        check.type='checkbox';check.checked=Boolean(item.flagged);
        check.onchange=()=>{item.flagged=check.checked;save();draw()};
        checkLabel.append(check,document.createTextNode(definition.flag));
        const detail=el('dl');
        const hidden=new Set(['title','category','edition','condition','cover','notes']);
        for(const [key,label,type] of definition.fields){
          if(hidden.has(key)||item[key]==null||item[key]==='')continue;
          const formatted=type==='money'?money(Number(item[key])):type==='date'?displayUSDate(item[key]):item[key];
          const row=el('div');
          row.append(el('dt',label),el('dd',formatted));detail.append(row);
        }
        const actions=el('div',undefined,'inventory-actions');
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
    scope.onchange=draw;group.onchange=draw;
    draw();
    document.getElementById('content').replaceChildren(panel);
  }

  const paperHex=value=>/^#[0-9a-f]{6}$/i.test(value||'');

  function paintPlanner(pageName){
    const definition=definitions[pageName];
    const wish=definition.key==='wishList';
    const icon=wish?'🎁':'🛍️';
    const defaultPaper=wish?'#f1e7ff':'#e1f5e9';
    const style=state.listPaper?.[definition.key]||{};
    const panel=el('section',undefined,'list-planner'+(wish?' list-planner-wish':''));
    panel.setAttribute('aria-label',pageName);
    const hero=el('header',undefined,'list-hero');
    const decoration=el('span',style.emoji||icon,'list-seal');
    decoration.setAttribute('aria-hidden','true');
    const heroText=el('div');
    heroText.append(el('h2',pageName),el('p',wish?'Keep gift ideas, links, and little things you’d love.':'Add what you need, then check it off as you shop.'));
    hero.append(decoration,heroText);
    const layout=el('div',undefined,'list-layout');
    const paper=el('section',undefined,'list-sheet');
    const rail=el('div',undefined,'list-rail');
    const heading=el('div',undefined,'list-sheet-heading');
    const count=el('span',undefined,'list-count');count.setAttribute('aria-live','polite');
    heading.append(el('h3',wish?'Saved wishes':'To buy'),count);

    const quick=el('form',undefined,'list-quick');
    const name=el('input');name.type='text';name.required=true;name.maxLength=200;
    name.placeholder=wish?'Add a wish…':'Add a shopping item…';
    name.setAttribute('aria-label',wish?'Wish name':'Item name');
    const add=el('button','＋ Add','list-primary');add.type='submit';
    quick.append(name,add);
    const tools=el('div',undefined,'list-tools');
    const search=el('input');search.type='search';search.placeholder='Find an item…';
    search.setAttribute('aria-label','Search '+pageName);
    tools.append(search,button('Add with details',()=>editor(definition,null,draw),'list-text'));
    const active=el('div',undefined,wish?'list-wishes':'list-checklist');

    const summary=el('section',undefined,'list-summary');
    const amountNode=el('strong');
    const amountHelp=el('p');
    summary.append(el('h3',wish?'Target total':'Estimated total'),amountNode,amountHelp);
    const archived=el('details',undefined,'list-side-panel list-archive');
    const archiveTitle=el('summary');
    const archiveList=el('div',undefined,'list-archive-content');
    archived.append(archiveTitle,archiveList);

    const personalize=el('details',undefined,'list-side-panel');
    const settings=el('div',undefined,'list-style-options');
    const color=el('input');color.type='color';color.value=paperHex(style.color)?style.color:defaultPaper;
    const sticker=el('input');sticker.placeholder=icon;sticker.maxLength=24;sticker.value=style.emoji||'';
    const colorLabel=el('label','Paper color');colorLabel.append(color);
    const stickerLabel=el('label','List emoji');stickerLabel.append(sticker);
    function paintStyle(){
      panel.style.setProperty('--list-paper',color.value);
      decoration.textContent=sticker.value.trim()||icon;
    }
    function commitStyle(){
      (state.listPaper??={})[definition.key]={color:color.value,emoji:sticker.value.trim()};
      paintStyle();save();
    }
    const swatches=el('div',undefined,'list-swatches');
    for(const [label,hex] of [['Mint','#e1f5e9'],['Lavender','#f1e7ff'],['Rose','#ffe4ed'],['Butter','#fff0cf'],['Sky','#e0efff']]){
      const swatch=button('',()=>{color.value=hex;commitStyle()},'list-swatch');
      swatch.title=label;swatch.setAttribute('aria-label',label);swatch.style.backgroundColor=hex;
      swatches.append(swatch);
    }
    color.oninput=paintStyle;color.onchange=commitStyle;sticker.onchange=commitStyle;
    settings.append(colorLabel,swatches,stickerLabel,button('Reset style',()=>{
      color.value=defaultPaper;sticker.value='';commitStyle();
    },'list-text'));
    personalize.append(el('summary','Paper & emoji'),settings);
    const status=el('p',undefined,'list-feedback');status.setAttribute('role','status');
    paper.append(heading,quick,tools,active,status);
    rail.append(summary,archived,personalize);
    layout.append(paper,rail);
    panel.append(hero,layout);

    const owner=state;
    function removeItem(item){
      if(!confirm('Delete '+item.title+'?'))return;
      state[definition.key]=items(definition).filter(record=>record.id!==item.id);
      save();draw();(item.flagged?archiveTitle:name).focus({preventScroll:true});
      status.textContent=item.title+' deleted.';
    }
    function recordCard(item){
      const tile=el('article',undefined,'list-record');
      tile.dataset.inventoryId=item.id;
      const details=el('div',undefined,'list-record-details');
      const title=el('h4',[item.emoji,item.title].filter(Boolean).join(' '));
      const tags=[item.category,wish?(item.recipient?'For '+item.recipient:''):item.store,
        !wish&&Number(item.quantity)>1?'Qty '+item.quantity:''].filter(Boolean);
      details.append(title);
      if(tags.length)details.append(el('p',tags.join(' · '),'list-record-meta'));
      if(item.notes)details.append(el('p',item.notes,'inventory-notes'));
      const priced=item.price!==''&&item.price!=null&&Number.isFinite(Number(item.price));
      const controls=el('div',undefined,'list-record-controls');
      const edit=button('Edit',()=>editor(definition,item,draw),'list-text');
      edit.setAttribute('aria-label','Edit '+item.title);
      controls.append(edit);
      const remove=button('Delete',()=>removeItem(item),'list-text list-delete');
      remove.setAttribute('aria-label','Delete '+item.title);
      controls.append(remove);
      const url=href(item.url);
      if(url){
        const product=el('a','View ↗','list-text');
        product.href=url;product.target='_blank';product.rel='noopener noreferrer';
        product.setAttribute('aria-label','View '+item.title+' product link');
        controls.append(product);
      }
      if(wish){
        const info=el('div',undefined,'list-wish-meta');
        if(item.priority&&item.priority!=='Normal')info.append(el('span',item.priority+' priority','list-priority'));
        if(priced)info.append(el('strong',money(Number(item.price)),'list-price'));
        if(info.childElementCount)details.append(info);
      }else if(priced)controls.prepend(el('strong',money(amount(item.price)*Number(item.quantity||1)/100),'list-price'));
      const check=el('input');check.type='checkbox';
      check.setAttribute('aria-label',(wish?'Mark acquired: ':'Mark purchased: ')+item.title);
      check.onchange=()=>{
        item.flagged=true;save();draw();
        const next=active.querySelector('input[type=checkbox]')||name;
        next.focus({preventScroll:true});
        status.textContent=item.title+' moved to the '+definition.flag.toLowerCase()+' archive.';
      };
      if(wish){
        const label=el('label','Acquired','list-wish-check');
        label.prepend(check);
        tile.append(details,controls,label);
      }else {
        const side=el('div',undefined,'list-record-controls');
        const price=controls.querySelector('.list-price');if(price)side.append(price);
        const menu=el('details',undefined,'shopping-item-menu');
        const toggle=el('summary','•••');toggle.setAttribute('aria-label','Options for '+item.title);
        menu.append(toggle,controls);side.append(menu);
        tile.append(check,details,side);
      }
      return tile;
    }
    function draw(){
      const records=items(definition);
      const current=records.filter(item=>!item.flagged);
      const completed=records.filter(item=>item.flagged);
      const query=search.value.trim().toLowerCase();
      const matches=item=>[item.title,item.emoji,item.category,item.store,item.recipient,item.notes]
        .join(' ').toLowerCase().includes(query);
      const shown=current.filter(matches);
      const priced=current.filter(item=>item.price!==''&&item.price!=null&&Number.isFinite(Number(item.price)));
      const total=priced.reduce((sum,item)=>sum+amount(item.price)*(wish?1:Number(item.quantity||1)),0);
      count.textContent=query?shown.length+' of '+current.length:current.length+' '+(current.length===1?'item':'items');
      amountNode.textContent=priced.length?money(total/100):'—';
      amountHelp.textContent=priced.length?priced.length+' of '+current.length+' items priced':'Add a price to an item to see a total.';
      search.hidden=!records.length;
      active.replaceChildren(...shown.map(recordCard));
      if(!shown.length){
        const empty=el('div',undefined,'list-empty');
        const emptyMark=el('span',wish?'♡':'✓','list-empty-mark');emptyMark.setAttribute('aria-hidden','true');
        empty.append(emptyMark,el('h4',query?'No matching items':wish?'Room for a little wish':completed.length?'All checked off':'Your list is ready'),
          el('p',query?'Try a different search.':wish?'Add a gift idea or something you’d like to buy.':'Add your first item above to get started.'));
        active.append(empty);
      }
      archiveTitle.textContent=definition.flag+' archive ('+completed.length+')';
      archiveList.replaceChildren();
      const archivedMatches=completed.filter(matches);
      for(const item of archivedMatches){
        const row=el('div',undefined,'list-archived-record');
        row.append(el('strong',[item.emoji,item.title].filter(Boolean).join(' ')));
        const actions=el('div',undefined,'list-record-controls');
        actions.append(button('Restore',()=>{
          item.flagged=false;save();draw();archiveTitle.focus();
          status.textContent=item.title+' restored.';
        },'list-text'),button('Delete',()=>removeItem(item),'list-text list-delete'));
        row.append(actions);archiveList.append(row);
      }
      if(!archivedMatches.length)archiveList.append(el('p',query&&completed.length?'No archived matches.':'No archived items yet.'));
    }
    quick.onsubmit=event=>{
      event.preventDefault();
      if(state!==owner||!name.value.trim())return;
      const item={id:crypto.randomUUID(),title:name.value.trim(),...(wish?{priority:'Normal'}:{quantity:'1'})};
      state[definition.key]=[...items(definition),item];
      name.value='';search.value='';save();draw();name.focus();
      status.textContent=item.title+' added.';
    };
    search.oninput=draw;
    paintStyle();draw();
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
    if(requested==='Collections')paintCollections();else paintPlanner(requested);
  };
})();
