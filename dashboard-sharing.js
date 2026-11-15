(function () {
  'use strict';
  let firebase,db,auth;
  let source=new URLSearchParams(location.hash.slice(1)).get('shared')||'';
  let stopRefresh;
  const scopes=[
    ['calendar','Calendar only'],
    ['finance-calendar','Finances + Calendar'],
    ['all','Whole dashboard']
  ];
  const financeKeys=['cashFlow','accounts','people','incomes','sharedExpenses','transactions','transfers',
    'personTransfers','personSavings','savingsEntries','billArchives','billClearances','billOrder',
    'billPayments','financeMonthArchives','amortization'];
  const shareDoc=(owner,...path)=>firebase.doc(db,'dashboardShares',owner,...path);
  const privateDoc=owner=>firebase.doc(db,'users',owner,'dashboard','state');
  const validOwner=owner=>/^[a-zA-Z0-9_-]{1,128}$/.test(owner);
  const address=value=>value.trim().toLowerCase();
  function projection(tx,owner,data,revision){
    const finance=Object.fromEntries(financeKeys.filter(key=>Object.hasOwn(data,key)).map(key=>[key,data[key]]));
    tx.set(shareDoc(owner,'views','calendar'),{json:JSON.stringify({events:data.events}),revision});
    tx.set(shareDoc(owner,'views','finance'),{json:JSON.stringify(finance),revision});
  }
  window.DashboardSharing={
    connect(sdk,database,authentication){firebase=sdk;db=database;auth=authentication},
    async stageSync(tx,owner,data,revision){
      let config;
      try{config=await tx.get(shareDoc(owner))}
      catch(error){
        if(error.code==='permission-denied')throw Error('SHARING_RULES_MISSING');
        throw error;
      }
      if(config.exists())projection(tx,owner,data,revision);
    }
  };

  function element(tag,text){
    const el=document.createElement(tag);
    if(text!==undefined)el.textContent=text;
    return el;
  }
  function button(text,action){
    const el=element('button',text);
    el.type='button';
    el.className='secondary';
    el.onclick=action;
    return el;
  }
  function panel(title){
    const card=element('section');
    card.className='card';
    card.append(element('h2',title));
    return card;
  }
  function labeled(title,field){
    const label=element('label',title);
    label.append(field);
    return label;
  }
  function setStatus(node,message){node.textContent=message}
  function shareError(error){
    if(error.code==='permission-denied')return 'Sharing access was denied. Check the invite and whether the updated Firebase rules are published.';
    return error.message||'Sharing is temporarily unavailable. Try again when online.';
  }
  function copyText(value){
    return navigator.clipboard.writeText(value);
  }
  function inviteLink(owner){
    const url=new URL(location.href);
    url.search='';
    url.hash=new URLSearchParams({shared:owner}).toString();
    return url.href;
  }
  function organizer(account){
    const card=panel('Invite someone');
    card.append(element('p','Guests can view the sections you choose. Whole dashboard includes private entries such as your journal.'));
    const form=element('form');
    const email=element('input');email.type='email';email.required=true;email.maxLength=254;
    const scope=element('select');
    for(const [value,label] of scopes)scope.add(new Option(label,value));
    const submit=element('button','Save invitation');submit.className='primary';
    form.append(labeled('Their sign-in email',email),labeled('Sections to share',scope),submit);
    const status=element('p');status.setAttribute('role','status');
    const invites=element('div');
    const link=element('input');link.readOnly=true;link.value=inviteLink(account.uid);
    card.append(form,status,invites,labeled('Invite link',link),button('Copy invite link',async()=>{
      try{await copyText(link.value);setStatus(status,'Link copied. Send it to the person you invited.')}
      catch{link.select();setStatus(status,'Copy the selected link and send it to your guest.')}
    }));
    let loading=0;
    async function load(){
      const request=++loading;
      try{
        const list=await firebase.getDocsFromServer(firebase.collection(db,'dashboardShares',account.uid,'invites'));
        if(request!==loading||!card.isConnected)return;
        invites.replaceChildren(element('h3','People with access'));
        if(list.empty)invites.append(element('p','No invitations yet.'));
        for(const entry of list.docs){
          const row=element('div');
          row.className='bre-controls';
          row.append(element('span',entry.id+' · '+(scopes.find(([key])=>key===entry.data().scope)?.[1]||'Unknown scope')),
            button('Edit access',()=>{email.value=entry.id;scope.value=entry.data().scope;scope.focus()}),
            button('Revoke',async()=>{
              if(!confirm('Remove access for '+entry.id+'?'))return;
              try{await firebase.deleteDoc(entry.ref);setStatus(status,'Access removed.');await load()}
              catch(error){setStatus(status,shareError(error))}
            }));
          invites.append(row);
        }
      }catch(error){if(card.isConnected)setStatus(status,shareError(error))}
    }
    form.onsubmit=async event=>{
      event.preventDefault();
      const guest=address(email.value);
      if(!guest||guest.includes('/')||guest===address(account.email||'')){
        setStatus(status,'Enter someone else’s sign-in email.');return;
      }
      const mode=scope.value;
      if(mode==='all'&&!confirm('Give '+guest+' view access to your whole dashboard, including finances and journal entries?'))return;
      submit.disabled=true;
      try{
        await firebase.runTransaction(db,async tx=>{
          const saved=await tx.get(privateDoc(account.uid));
          const config=await tx.get(shareDoc(account.uid));
          if(!saved.exists())throw Error('Save an entry to your account before sharing.');
          const decoded=window.DashboardSyncCore.decode(saved.data());
          if(!config.exists())tx.set(shareDoc(account.uid),{enabled:true});
          projection(tx,account.uid,decoded.bundle.state,decoded.revision);
          tx.set(shareDoc(account.uid,'invites',guest),{scope:mode});
        });
        email.value='';
        setStatus(status,'Invitation saved. Send the invite link to '+guest+'.');
        await load();
      }catch(error){setStatus(status,shareError(error))}
      finally{submit.disabled=false}
    };
    root().append(card);
    load();
  }

  const root=()=>document.getElementById('content');
  const titles={
    events:'Calendar',priorities:'Tasks',projects:'Projects',reminders:'Reminders',bookmarks:'Bookmarks',
    notes:'Notes',journal:'Journal',journalDraft:'Journal draft',shoppingList:'Shopping List',wishList:'Wish List',collectibles:'Collections',
    habits:'Habit Tracker',cashFlow:'Finances',amortization:'Amortization',favoriteLinks:'Quick links',
    stickyNotes:'Sticky notes',glowActivities:'Little Joys',savingsEntries:'Savings history',
    people:'Budget groups',accounts:'Earlier accounts',incomes:'Earlier income',sharedExpenses:'Earlier expenses',
    transactions:'Transactions',personSavings:'Earlier savings',transfers:'Transfers',
    personTransfers:'Earlier transfers',scratch:'Quick notes scratchpad',
    ledger:'Transactions',goals:'Savings funds',groups:'Account groups',bills:'Bills',income:'Income'
  };
  function friendly(key){return titles[key]||key.replace(/([a-z])([A-Z])/g,'$1 $2').replace(/^./,s=>s.toUpperCase())}
  function recordTitle(value){
    return [value.emoji,value.title||value.name||value.label||value.date].filter(Boolean).join(' ');
  }
  function displayValue(value,key,cashFlow=false){
    if(value===null||value===''||value===undefined)return null;
    if(typeof value==='boolean')return value?'Yes':'No';
    if(typeof value==='number'&&cashFlow&&['opening','amount','target','reserved','actual','clearedAmount'].includes(key))return money(value/100);
    if(typeof value!=='object')return String(value);
    const list=element('div');
    const entries=Array.isArray(value)?value.map((item,index)=>[String(index+1),item]):Object.entries(value);
    for(const [field,item] of entries){
      if(field==='id'||field==='emoji'||item===''||item===null)continue;
      const rendered=displayValue(item,field,cashFlow);
      if(rendered===null)continue;
      const group=element('div');group.className='bre-shared-record';
      const name=Array.isArray(value)&&item&&typeof item==='object'?recordTitle(item)||'Entry '+field:friendly(field);
      if(typeof rendered==='string')group.append(element('p',name+' · '+rendered));
      else if(rendered.childElementCount){
        const detail=element('details');detail.append(element('summary',name),rendered);group.append(detail);
      }
      if(group.firstChild)list.append(group);
    }
    return list;
  }
  function showShared(host,data,mode){
    const visible=mode==='all'
      ? [...new Set(['events','cashFlow',...Object.keys(data)])]
      : mode==='calendar'?['events']:['events',...financeKeys];
    const tabs=element('select');
    const records=element('div');
    for(const key of visible)if(Object.hasOwn(data,key))tabs.add(new Option(friendly(key),key));
    const open=()=>{
      records.replaceChildren();
      const key=tabs.value;
      if(key==='events'){
        const events=[...(data.events||[])].sort((a,b)=>String(a.date).localeCompare(String(b.date)));
        for(const event of events){
          const detail=element('details');
          const when=[calendarDateRange(event),calendarTimeRange(event)||'All day'].join(' · ');
          detail.append(element('summary',recordTitle(event)+' · '+when));
          if(event.repeatYearly)detail.append(element('p','Repeats yearly'));
          const metadata=Object.fromEntries(Object.entries(event).filter(([k])=>!['title','date','endDate','time','endTime','repeatYearly','calendarColor'].includes(k)));
          const fields=displayValue(metadata);
          detail.append(fields);records.append(detail);
        }
      }else{
        const result=displayValue(data[key],key,key==='cashFlow');
        if(typeof result==='string')records.append(element('p',result));
        else if(result?.childElementCount)records.append(result);
      }
      if(!records.childElementCount)records.append(element('p','This section has no entries yet.'));
    };
    tabs.onchange=open;
    host.replaceChildren(labeled('Shared section',tabs),records);
    open();
  }
  function guest(account){
    const card=panel('Open a shared dashboard');
    const status=element('p');status.setAttribute('role','status');
    if(!account.emailVerified){
      card.append(element('p','Verify your sign-in email to open a shared dashboard.'),
        button('Send verification email',async()=>{
          try{await firebase.sendEmailVerification(account);setStatus(status,'Email sent. Open the verification link, then return here and choose Check verification.')}
          catch(error){setStatus(status,shareError(error))}
        }),button('Check verification',async()=>{
          try{await firebase.reload(account);await firebase.getIdToken(account,true);render()}
          catch(error){setStatus(status,shareError(error))}
        }),status);
      root().append(card);return;
    }
    const form=element('form');
    const url=element('input');url.type='url';url.required=true;
    url.value=validOwner(source)?inviteLink(source):'';
    const submit=element('button','Open invite');submit.className='primary';
    const preview=element('div');
    form.append(labeled('Invite link from the organizer',url),submit);
    card.append(form,status,preview);
    root().append(card);
    let lastRevision='',request=0;
    async function load(initial){
      const token=++request;
      if(initial){preview.replaceChildren();lastRevision='';setStatus(status,'Checking your access…')}
      try{
        const parsed=new URL(url.value);
        const owner=new URLSearchParams(parsed.hash.slice(1)).get('shared')||'';
        if(parsed.origin!==location.origin||parsed.pathname!==location.pathname||!validOwner(owner)||owner===account.uid)
          throw Error('Enter the dashboard invite link from the organizer.');
        const invitation=await firebase.getDocFromServer(shareDoc(owner,'invites',address(account.email||'')));
        if(!invitation.exists())throw Error('There is no active invitation for '+account.email+'.');
        const mode=invitation.data().scope;
        if(!scopes.some(([key])=>key===mode))throw Error('This invitation has an invalid access setting.');
        const snapshots=await Promise.all(mode==='all'?[firebase.getDocFromServer(privateDoc(owner))]
          : ['calendar',...(mode==='finance-calendar'?['finance']:[])].map(section=>firebase.getDocFromServer(shareDoc(owner,'views',section))));
        if(!snapshots.every(snapshot=>snapshot.exists()))throw Error('The organizer’s shared dashboard is still unavailable.');
        if(token!==request||!card.isConnected||auth.currentUser?.uid!==account.uid)return;
        source=owner;
        const revision=[owner,mode,...snapshots.map(snapshot=>snapshot.data().revision)].join(':');
        if(revision!==lastRevision){
          const data=mode==='all'?window.DashboardSyncCore.decode(snapshots[0].data()).bundle.state
            :Object.assign({},...snapshots.map(snapshot=>JSON.parse(snapshot.data().json)));
          showShared(preview,data,mode);
          lastRevision=revision;
        }
        setStatus(status,scopes.find(([key])=>key===mode)[1]+' · View only');
      }catch(error){
        if(token!==request||!card.isConnected)return;
        preview.replaceChildren();lastRevision='';
        setStatus(status,shareError(error));
      }
    }
    function open(){
      clearInterval(stopRefresh);
      load(true);
      stopRefresh=setInterval(()=>{if(card.isConnected&&!document.hidden)load(false)},20000);
    }
    form.onsubmit=event=>{event.preventDefault();open()};
    if(url.value)open();
  }

  const previous=render;
  render=function(){
    const custom=page==='Sharing';
    clearInterval(stopRefresh);
    if(custom)page='Quick notes';
    try{previous()}finally{if(custom)page='Sharing'}
    const nav=document.querySelector('aside nav');
    nav.querySelector('[data-dashboard-sharing]')?.remove();
    const link=button('👥 Sharing',()=>go('Sharing'));
    link.className='app-nav-link'+(custom?' active':'');
    link.dataset.dashboardSharing='';
    nav.append(link);
    if(!custom)return;
    for(const id of ['title','appPageTitle','mobileCurrentPage']){
      const title=document.getElementById(id);
      if(title)title.textContent='Sharing';
    }
    document.querySelectorAll('[data-page="Quick notes"]').forEach(note=>{
      note.classList.remove('active');note.removeAttribute('aria-current');
    });
    link.setAttribute('aria-current','page');
    root().replaceChildren();
    const account=auth?.currentUser;
    if(!account){root().append(panel('Sign in to share or open an invite'));return}
    if(source){guest(account);organizer(account)}
    else{organizer(account);guest(account)}
  };
  addEventListener('dashboard:account-changing',()=>{
    clearInterval(stopRefresh);
    if(page==='Sharing')root().replaceChildren();
  });
  addEventListener('hashchange',()=>{
    source=new URLSearchParams(location.hash.slice(1)).get('shared')||'';
    if(validOwner(source))go('Sharing');
  });
  if(validOwner(source))go('Sharing');else render();
})();
