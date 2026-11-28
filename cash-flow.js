(function(){
'use strict';
const C=window.CashFlowCore,T=window.FinanceTools,frequencies={once:'One time',weekly:'Weekly',biweekly:'Every two weeks',monthly:'Monthly',bimonthly:'Every two months',quarterly:'Quarterly',annually:'Annually'},tabs=['Overview','Income','Bills','Savings','Forecast'];
const widgetSavings=new URLSearchParams(location.search).get('widget')==='money-tracker';
let tab=widgetSavings?'Savings':'Overview',horizon=0,m=null,filters={frequency:''},billMonth='',calendarDay='',baseline=null,baselineOwner=null,backupOwner=null,undoing=false,historyLimit=24;const folded=new Map();let backupText='',backupProblem='';
const today=()=>localDate(new Date()), dollars=n=>n===null||n===undefined?'Not set':money(n/100), name=accountName, uid=()=>crypto.randomUUID();
const minDate='1900-01-01',maxDate='2199-12-31';
function e(tag,text,cls){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;if(tag==='button')n.className=(n.className+' cf-control').trim();return n}
function viewOwner(account){
 if(!account)return '';
 if(m.groups.some(group=>group.id===account.ownerId))return account.ownerId;
 const name=account.name.trim().replace(/(?:\s*[-–—]\s*|\s+)(?:checking|savings)$/i,'').replace(/[’']s$/i,'').trim().toLowerCase();
 const candidates=m.groups.filter(group=>group.name.trim().toLowerCase()===name);
 return candidates.length===1?candidates[0].id:'';
}
function ownerOptions(){
 const accounts=activeAccounts();
 const groups=m.groups.filter(group=>accounts.some(account=>viewOwner(account)===group.id));
 return [['','All accounts'],
  ...groups.map(group=>['group:'+group.id,group.name+'’s accounts']),
  ...(accounts.some(account=>!viewOwner(account))?[['unassigned','Unassigned accounts']]:[]),
  ...accounts.map(account=>[accountView(account),accountLabel(account)])];
}
function accountView(account){return account?'account:'+account.id:''}
function accountLabel(account){
 const type=account.type==='savings'?'Savings':'Checking';
 const label=account.name.trim().replace(/(?:\s*[-–—]\s*|\s+)(?:checking|savings)$/i,'');
 const base=label;
 return base.toLowerCase()===type.toLowerCase()?type:base+' '+type;
}
function scopedChecking(){
 const checking=activeAccounts().filter(a=>a.type==='checking'&&matchesOwner(a.id));
 return checking.length===1?checking[0].id:'';
}
const preferenceKey = () => (typeof dashboardActivePrefix==='string'?dashboardActivePrefix:'')+'finance-planner-owner';
const ownerPreferences = new Map();
function selectedOwner(){
 const key=preferenceKey();
 try{
  const saved=ownerPreferences.has(key)?ownerPreferences.get(key):localStorage.getItem(key);
  const legacy=activeAccounts().find(account=>accountView(account)===saved);
  const view=m.groups.some(group=>group.id===saved)?'group:'+saved:
   legacy?accountView(legacy):saved;
  return ownerOptions().some(([id])=>id===view)?view:'';
 }catch{return ''}
}
function selectOwner(id){
 const key=preferenceKey();
 ownerPreferences.set(key,id);
 try{localStorage.setItem(key,id)}catch{}
}
function matchesOwner(id){
 const owner=selectedOwner();
 const account=m.accounts.find(a=>a.id===id);
 return !owner||(owner.startsWith('account:')?id===owner.slice(8):owner.startsWith('group:')?viewOwner(account)===owner.slice(6):Boolean(account)&&!viewOwner(account));
}
function matchesTransaction(item){
 return item.kind==='transfer'?matchesOwner(item.from)||matchesOwner(item.to):matchesOwner(item.account);
}
let billView='All bills', billSearch='', showAllAttention=false;
const historyFilters={from:'',to:'',search:'',type:'',status:''};
function searchField(label,value,apply){
 const control=input('search','search',value,false);
 control.onchange=()=>{apply(control.value.trim().toLowerCase());render()};
 control.onkeydown=event=>{if(event.key==='Enter'){event.preventDefault();control.blur()}};
 return field(label,control);
}
function compactList(title,items,open=true){
 const section=group(title,items,open);
 section.classList.add('cf-compact-list');
 return section;
}
function compactRow(title,amount,lines,actions,key,details=[]){
 const item=tile(title,amount,lines,[],key);
 if(actions.length){
  const menu=e('details',undefined,'cf-manage');
  menu.append(e('summary','Manage'),row(...actions));
  item.append(menu);
 }
 if(details.length){
  const extra=e('details',undefined,'cf-row-details');
  extra.append(e('summary','Details'),...details.filter(Boolean).map(text=>e('p',text)));
  item.append(extra);
 }
 return item;
}
function needsBill(item){
 if(item.status==='pending')return true;
 if(item.status!=='planned')return false;
 const deadline=item.due||item.preferred||item.date;
 return !item.due||deadline<=C.add(today(),3)||
  ((item.estimatedAmount||item.certainty==='estimated')&&deadline<=C.add(today(),7));
}
let financeTrigger;
function b(label,fn,cls='secondary'){
 const n=e('button',label,cls);
 if(/^Delete(?: |$)/.test(label))n.className+=' cf-destructive';
 n.type='button';
 n.onclick=event=>{
  const previous=financeTrigger;
  financeTrigger=n;
  try{return fn(event)}finally{financeTrigger=previous}
 };
 return n;
}
function placeFinanceEditor(editor,host){
 const content=document.getElementById('content');
 const existing=content.querySelector('.cf-inline-form');
 const trigger=financeTrigger;
 if(trigger&&existing?.contains(trigger)){
  existing.replaceWith(editor);
  return;
 }
 existing?.remove();
 if(host){
  host.prepend(editor);
  return;
 }
 if(trigger&&content.contains(trigger)){
  const anchor=trigger.closest('.cf-actions,.cf-payday-line')||trigger;
  anchor.after(editor);
  return;
 }
 const toolbar=content.querySelector('.cf-toolbar');
 if(toolbar)toolbar.after(editor);else content.prepend(editor);
}
function redrawFinanceInPlace(){
 const x=window.scrollX,y=window.scrollY;
 render();
 if(window.scrollX!==x||window.scrollY!==y)window.scrollTo({left:x,top:y,behavior:'instant'});
}
function card(title){const p=e('section',undefined,'card cf-card');p.append(e('h2',title));return p}
function row(...nodes){const d=e('div',undefined,'cf-actions');d.append(...nodes);return d}
function field(label,node){const l=e('label',label);l.append(node);return l}
function input(key,type,value='',required=true){const n=e('input');n.name=key;n.type=type;n.value=value??'';n.required=required;if(type==='date'){n.min=minDate;n.max=maxDate}if(type==='text')n.maxLength=180;return n}
function number(key,value='',min=0,required=true){const n=input(key,'number',value,required);n.step='0.01';n.min=min;n.max=1e9;return n}
function select(key,choices,value){const n=e('select');n.name=key;for(const [v,label] of choices)n.add(new Option(label,v));n.value=value;return n}
function accountOwner(account){return account?.ownerId||''}
function accountName(id){const account=m.accounts.find(a=>a.id===id);return account?accountLabel(account):'Unassigned account'}
function accountAccent(account){
 return /^#[0-9a-f]{6}$/i.test(account?.accent||'')?account.accent:
  '#a287cf';
}
const activeAccounts = () => m.accounts.filter(a=>!a.deleted);
const acct=(value,blank=false)=>select('account',[...(blank?[['','Choose an account']]:[]),...activeAccounts().filter(a=>a.type!=='savings').map(a=>[a.id,name(a.id)])],value);
function check(key,value){const n=input(key,'checkbox','',false);n.checked=!!value;return n}
function note(key,value=''){const n=e('textarea');n.name=key;n.value=value;n.rows=3;n.maxLength=2000;return n}
function cents(v){return Math.round(Number(v)*100)}
function snapshot(){const {audit=[],...data}=m;return {...T.copy(data),hiddenHistory:Object.fromEntries(audit.filter(entry=>entry.deleted).map(entry=>[entry.id,true]))}}
function safetyBackup(){if(backupOwner===state)return;try{const key=(typeof dashboardActivePrefix==='string'?dashboardActivePrefix:'')+'finance-before-pastel-v1';const saved=localStorage.getItem(key);if(saved)JSON.parse(saved);const text=saved||JSON.stringify(state,null,2);if(!saved)localStorage.setItem(key,text);backupText=text;backupOwner=state;backupProblem=''}catch(err){throw Error('The safety backup could not be stored. Use Export dashboard backup, free device storage, then try again. No change has been saved.')}}
function commit(label='Finance update'){if(baselineOwner!==state)throw Error('Account changed. Reopen Finances.');const delta=T.changes(baseline,snapshot());if(delta.length&&!undoing){m.audit??=[];m.audit.push({id:uid(),at:new Date().toISOString(),label,changes:delta})}state.cashFlow=m;save();redrawFinanceInPlace()}
function safeAction(label,fn){safetyBackup();fn();commit(label)}
function group(title,items,open=true){const d=e('details',undefined,'cf-group'),key=tab+'|'+title;d.open=folded.has(key)?folded.get(key):open;d.append(e('summary',title+' · '+items.length));d.addEventListener('toggle',()=>folded.set(key,d.open));const grid=e('div',undefined,'cf-record-grid');items.forEach(n=>grid.append(n));if(!items.length)grid.append(e('p','Nothing here.'));d.append(grid);return d}
function tint(n,key){const account=m.accounts.find(a=>a.id===key);if(account){n.dataset.cfOwner=accountOwner(account);if(account.accent)n.style?.setProperty('--cf-account-accent',accountAccent(account));}let h=0;for(const ch of String(key))h=(h*31+ch.charCodeAt(0))>>>0;n.dataset.pastel=String(h%5);return n}
function tile(title,amount,lines,actions=[],key=title){const n=record(title,'',...actions);n.children[0].append(e('strong',dollars(amount),'cf-amount'));for(const text of lines.filter(Boolean))n.children[0].append(e('p',text));return tint(n,key)}
function statusLabel(x){return x.status==='cleared'?'Cleared':x.status==='pending'?'Pending':'Planned'}
function dateLabel(d){return d?d.slice(5,7)+'/'+d.slice(8,10)+'/'+d.slice(0,4):'Unknown'}
function form(title,fields,submit,host,afterSave){const owner=state,model=m,d=e('section',undefined,'cf-dialog cf-inline-form'),f=e('form'),error=e('p',undefined,'cf-error');error.setAttribute('role','alert');const grid=e('div',undefined,'cf-fields');grid.append(...fields);const s=e('button','Save','primary');s.type='submit';let submitted=false;f.append(grid,error,row(s,b('Cancel',()=>d.close())));d.append(e('h2',title),f);d.addEventListener('close',()=>d.remove(),{once:true});d.close=()=>d.remove();placeFinanceEditor(d,host);
 const first=f.querySelector('input:not([type="checkbox"]):not([type="hidden"]),select,textarea');
 first?.focus({preventScroll:true});
 f.onsubmit=ev=>{ev.preventDefault();if(submitted)return;if(owner!==state||model!==m){error.textContent='The dashboard changed. Close this form and reopen it.';return}try{safetyBackup();submit(f.elements);submitted=true;s.disabled=true;d.close();commit(title);afterSave?.()}catch(err){error.textContent=err.message}};return f}
function value(f,key){return f[key].value.trim()}
function ensureChecking(id){if(!activeAccounts().some(a=>a.id===id&&a.type!=='savings'))throw Error('Choose a checking account for bills and income rules.');}
function reqName(f){const v=value(f,'name');if(!v)throw Error('Enter a name.');return v}
function accountForm(a,kind='checking',suggested='',afterSave){form(a?'Edit account':'Add bank account',[
 field('Account name',input('name','text',a?.name||suggested)),field('Account group (optional)',select('owner',[['','No group'],...m.groups.map(g=>[g.id,g.name])],a?.ownerId??(selectedOwner().startsWith('group:')?selectedOwner().slice(6):''))),field('New group name (optional)',input('group','text','',false)),field('Account accent',input('accent','color',accountAccent(a))),field('Account type',select('type',[['checking','Checking'],['savings','Savings']],a?.type||kind)),field('Cleared starting balance ($)',number('opening',a?.opening==null?'':a.opening/100,-1e9)),field('Balance as of (end of day)',input('asOf','date',a?.asOf||today())),field('Minimum balance cushion ($)',number('cushion',(a?.cushion||0)/100))
 ],f=>{if(value(f,'asOf')>today())throw Error('Use today or a past date.');if(a&&f.type.value==='savings'&&[...m.bills,...m.income].some(r=>!r.deleted&&!r.archived&&r.account===a.id))throw Error('Reassign or archive active income/bill rules before changing this account to Savings.');const accountName=reqName(f),groupName=value(f,'group');
 let ownerId=f.owner.value;
 if(groupName){
  let group=m.groups.find(g=>g.name.toLowerCase()===groupName.toLowerCase());
  if(!group){group={id:uid(),name:groupName};m.groups.push(group)}
  ownerId=group.id;
 }
 const next={id:a?.id||uid(),type:f.type.value,ownerId,accent:f.accent.value,name:accountName,opening:cents(f.opening.value),asOf:value(f,'asOf'),cushion:cents(f.cushion.value)};next.balanceVersion=a&&a.opening===next.opening&&a.asOf===next.asOf?a.balanceVersion||C.balanceKey(a):uid();if(a)Object.assign(a,next);else m.accounts.push(next)},null,afterSave)}
function incomeForm(r,frequency='monthly',accountId=''){
 if(!activeAccounts().some(a=>a.type==='checking')){
  accountForm(null,'checking','',()=>incomeForm(r,frequency));
  return;
 }
 const pattern=C.weekdayRule(r?.rule)||{ordinal:4,weekday:3,offset:-5};
 const cadence=select('frequency',Object.entries(frequencies),r?.frequency||frequency);
 const rule=select('rule',[['fixed','Same day number'],['last','Last calendar day'],['weekday','Weekday pattern']],C.weekdayRule(r?.rule)?'weekday':r?.rule||'fixed');
 const ordinal=select('ordinal',[['1','First'],['2','Second'],['3','Third'],['4','Fourth'],['0','Last']],String(pattern.ordinal));
 const weekday=select('weekday',['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map((name,index)=>[String(index),name]),String(pattern.weekday));
 const offset=select('offset',Array.from({length:13},(_,index)=>{
  const days=index-6;
  return [String(days),days===0?'On that weekday':Math.abs(days)+' day'+(Math.abs(days)===1?'':'s')+(days<0?' before':' after')];
 }),String(pattern.offset));
 const ruleField=field('Monthly calendar rule',rule);
 const details=[field('Week of the month',ordinal),field('Anchor weekday',weekday),field('Payday offset',offset)];
 const preview=e('p');
 preview.setAttribute('aria-live','polite');
 const start=input('start','date',r?.start||today());
 const getRule=()=>rule.value==='weekday'?'weekday:'+ordinal.value+':'+weekday.value+':'+offset.value:rule.value;
 function updateFields(){
  const monthly=cadence.value==='monthly';
  ruleField.hidden=!monthly;
  for(const detail of details)detail.hidden=!monthly||rule.value!=='weekday';
  preview.hidden=!monthly||!start.value;
  if(!preview.hidden){
   const dates=C.occurrences({start:start.value,frequency:'monthly',rule:getRule()},C.add(start.value,125)).slice(0,3);
   preview.textContent='Next dates · '+dates.map(dateLabel).join(' · ');
  }
 }
 for(const control of [cadence,rule,ordinal,weekday,offset,start])control.onchange=updateFields;
 form(r?'Edit income rule':frequency==='once'?'Add expected deposit':'Add income rule',[
  field('Name',input('name','text',r?.name)),field('Account',acct(r?.account||accountId||scopedChecking(),true)),
  field('Deposit amount ($)',number('amount',r?r.amount/100:'',.01)),field('First eligible date',start),
  field('Frequency',cadence),ruleField,...details,preview
 ],f=>{
  ensureChecking(f.account.value);
  let schedule=cadence.value==='monthly'?getRule():'fixed';
  if(r?.rule==='rick'&&schedule==='weekday:4:3:-5')schedule='rick';
  updateRule(m.income,r,{name:reqName(f),account:f.account.value,amount:cents(f.amount.value),
   frequency:cadence.value,rule:schedule,start:start.value});
 });
 updateFields();
}
function updateRule(list,r,next){
 if(!r){list.push({id:uid(),...next});return}
 // Keep recorded occurrences linked to their original rule. Schedule changes replace only future generation.
 const changed=['start','frequency','rule'].some(k=>r[k]!==next[k]);
 const saved=Object.values(m.overrides).filter(o=>o.ruleId===r.id);
 if(changed&&saved.length){
  if(r.frequency==='once'&&next.frequency==='once')throw Error('Edit the saved occurrence to move this one-time transaction.');
  if(!next.start||next.start<today())throw Error('This rule has saved occurrences. Use today or a future date to start its replacement.');
  if(saved.some(o=>o.scheduled>=next.start))throw Error('Start the replacement after the last saved occurrence. Edit existing occurrences individually.');
  const replacement={...r,...next,id:uid(),stop:null,archived:!!r.archived,deleted:false};
  r.stop=next.start;list.push(replacement);
 }else Object.assign(r,next)
}
function billForm(r){
 const certainty=r?.certainty||'unknown',start=r?.start||'',preferred=start?C.add(start,r.offset||0):'';
 const a=acct(r?.account||scopedChecking(),true);
 form(r?'Edit bill rule':'Set up bill rule',[
 field('Bill name',input('name','text',r?.name)),field('Responsible account',a),field('Amount ($)',number('amount',r?r.amount/100:'',.01)),field('Frequency',select('frequency',Object.entries(frequencies),r?.frequency||'monthly')),field('Due-date confidence',select('certainty',[['verified','Verified'],['estimated','Estimated'],['unknown','Unknown']],certainty)),field('Actual / estimated first due date',input('due','date',certainty==='unknown'?'':start,false)),field('First preferred payment / planning date',input('preferred','date',preferred,false)),field('Amount is an estimate',check('estimatedAmount',r?.estimatedAmount)),field('Autopay',check('autopay',r?.autopay)),field('Notes',note('notes',r?.notes))
 ],f=>{
 if(f.account.value)ensureChecking(f.account.value);
 const due=f.due.value,preferredDate=f.preferred.value;
 const confidence=due?(f.certainty.value==='estimated'?'estimated':'verified'):'unknown';
 const anchor=due||preferredDate,offset=due&&preferredDate?C.day(preferredDate)-C.day(due):0;
 if(Math.abs(offset)>366)throw Error('Preferred payment date must be within one year of the due date.');
 const next={name:reqName(f),account:f.account.value,amount:cents(f.amount.value),frequency:f.frequency.value,start:anchor,offset,certainty:confidence,autopay:f.autopay.checked,estimatedAmount:f.estimatedAmount.checked,notes:value(f,'notes')};
 updateRule(m.bills,r,next)
 })
}
function transferToSavings(checkingId){
 const checking=activeAccounts().find(account=>account.id===checkingId);
 const savings=activeAccounts().filter(account=>account.type==='savings');
 if(!savings.length){
  const existingIds=new Set(activeAccounts().map(account=>account.id));
  accountForm(null,'savings','',()=>{
   const added=activeAccounts().find(account=>!existingIds.has(account.id)&&account.type==='savings');
   if(added)transferForm(null,{from:checkingId,to:added.id},true);
  });
  return;
 }
 const paired=savingsForChecking(checking,savings);
 transferForm(null,{from:checkingId,to:paired.length===1?paired[0].id:''},true);
}
function transferForm(r,preset,savingsOnly=false){const t=r||preset||{},id=r?.id||uid(),choices=activeAccounts().map(a=>[a.id,name(a.id)]);const fromChoices=savingsOnly?choices.filter(([id])=>id===t.from):choices;
 const toChoices=savingsOnly?[['','Choose a savings account'],...activeAccounts().filter(a=>a.type==='savings').map(a=>[a.id,name(a.id)])]:choices;
 const defaultTo=savingsOnly?t.to:t.to||choices.find(x=>x[0]!==(t.from||choices[0]?.[0]))?.[0];
 const f=form('Transfer money',[
 field('FROM',select('from',fromChoices,t.from||choices[0]?.[0])),field('TO',select('to',toChoices,defaultTo)),field('Amount ($)',number('amount',t.amount?t.amount/100:'',.01)),field('Date',input('date','date',t.date||today())),field('Status',select('status',[['completed','Completed'],['pending','Pending'],['planned','Planned']],t.status||'completed')),field('Description',input('name','text',t.name||'Money moved')),e('p','Records one movement between accounts. It does not send a bank transfer.','cf-wide')
 ],fields=>{if(!fields.from.value||!fields.to.value||fields.from.value===fields.to.value)throw Error('Choose different FROM and TO accounts.');if(fields.status.value==='completed'&&fields.date.value>today())throw Error('Use today or earlier for a completed move.');const ids=[fields.from.value,fields.to.value];if(fields.status.value==='completed'&&ids.some(id=>m.accounts.find(a=>a.id===id).asOf>fields.date.value))throw Error('Choose a transfer date on or after both starting balances.');if(fields.status.value==='completed'&&ids.some(id=>m.accounts.find(a=>a.id===id).opening===null))throw Error('Set both starting balances before recording a completed move.');const from=m.accounts.find(a=>a.id===fields.from.value);if(fields.status.value==='completed'&&from.type==='savings'){const available=C.forecast(m,today(),30).savings.find(a=>a.id===from.id).current;const oldDebit=r?.status==='completed'&&r.from===from.id&&(r.date>from.asOf||r.date===from.asOf&&r.afterBalances?.[from.id]===C.balanceKey(from))?r.amount:0;if(available+oldDebit<cents(fields.amount.value))throw Error('Savings does not have enough cleared money for this move.');}const next={id,name:reqName(fields),from:fields.from.value,to:fields.to.value,amount:cents(fields.amount.value),date:fields.date.value,status:fields.status.value,afterBalances:r&&r.status==='completed'&&r.date===fields.date.value&&r.from===fields.from.value&&r.to===fields.to.value?r.afterBalances:balanceTags(ids)};const index=m.transfers.findIndex(x=>x.id===id);if(index<0)m.transfers.push(next);else Object.assign(m.transfers[index],next)});f.querySelector('button[type=submit]').textContent='Save transfer';
 const route=e('p',undefined,'cf-transfer-route');
 route.setAttribute('aria-live','polite');
 const updateRoute=()=>{route.textContent=name(f.elements.from.value)+' → '+(f.elements.to.value?name(f.elements.to.value):'Choose a savings account')};
 f.elements.from.addEventListener('change',()=>{
  if(f.elements.from.value===f.elements.to.value)f.elements.to.value=choices.find(([id])=>id!==f.elements.from.value)?.[0]||'';
  updateRoute();
 });
 f.elements.to.addEventListener('change',updateRoute);
 f.prepend(route);
 updateRoute()}
function occurrenceForm(o,host){
 const bill=o.kind==='bill';
 const rule=bill?m.bills.find(item=>item.id===o.ruleId&&!item.deleted&&!item.archived&&item.frequency!=='once'):null;
 const fields=[
 field('Name',input('name','text',o.name)),field('Amount ($)',number('amount',o.amount/100,.01)),field('Account',acct(o.account,bill)),...(bill?[field('Due date',input('due','date',o.due,false)),field('Due-date confidence',select('certainty',[['verified','Verified'],['estimated','Estimated'],['unknown','Unknown']],o.certainty||'unknown'))]:[]),
 field(bill?'Preferred payment date':'Deposit date',input('preferred','date',o.preferred||o.date,!bill)),field(bill?'Recorded / cleared date':'Posting date',input('posted','date',o.posted||'',false)),...(bill?[field('Actual payment date',input('paymentDate','date',o.paymentDate||o.posted||'',false))]:[]),...(bill?[field('Amount is an estimate',check('estimatedAmount',o.estimatedAmount)),field('Paid / sent',check('paid',o.paid||o.status==='pending')),field('Cleared at bank',check('cleared',o.cleared||o.status==='cleared'))]:[field('Deposit status',select('status',[['planned','Planned'],['pending','Pending'],['cleared','Cleared']],o.status))]),
 ...(!bill?[separateDepositField()]:[]),field('Notes',note('notes',o.notes||'')),
 ...(rule?[field('Apply date, amount, or account change to',select('scope',[['one','This bill only'],['future','This and future bills']],'one'))]:[])];
 form(bill?'Edit bill':'Edit deposit',fields,f=>{
 const status=bill?(f.cleared.checked?'cleared':f.paid.checked?'pending':'planned'):f.status.value;
 if(!bill||f.account.value||status!=='planned')ensureChecking(f.account.value);
 if(status!=='planned'&&(!f.posted.value||f.posted.value>today()))throw Error('Enter the actual payment or posting date (today or earlier).');
 const next={...o,name:reqName(f),account:f.account.value,amount:cents(f.amount.value),preferred:f.preferred.value,posted:f.posted.value,date:status==='planned'?(f.preferred.value||f.due?.value||''):f.posted.value,due:bill?f.due.value||null:null,certainty:bill?(f.due.value?(f.certainty.value==='estimated'?'estimated':'verified'):'unknown'):null,paid:bill&&(f.paid.checked||status==='cleared'),cleared:bill&&f.cleared.checked,status,estimatedAmount:bill&&f.estimatedAmount.checked,
  afterBalances:status==='cleared'&&(o.status!=='cleared'||o.account!==f.account.value||o.date!==f.posted.value)?balanceTags([f.account.value]):o.afterBalances,notes:value(f,'notes')};
 if(bill&&status!=='planned'){
  const paidOn=f.paymentDate.value||f.posted.value;
  if(paidOn>f.posted.value)throw Error('Payment date must be on or before the recorded or cleared date.');
  next.paymentDate=paidOn;
 }
 if(!bill)checkDuplicateDeposit(next,f.separateDeposit.checked);
 if(rule&&f.scope.value==='future'&&(next.due!==o.due||next.account!==o.account||next.amount!==o.amount)){
  T.splitBillRule(m,C,rule,o,next,uid());
 }else m.overrides[o.id]=next;
 },host)
}
function removeRule(r){safeAction('Delete rule',()=>{r.deleted=true;r.archived=true})}
function toggleArchive(rule){
 safeAction(rule.archived?'Restore rule':'Archive rule',()=>{
  rule.archived=!rule.archived;
  if(m.bills.includes(rule)){
   if(rule.archived)rule.archivedOn=today();
   else delete rule.archivedOn;
  }
 });
}
function badge(s){const n=e('span',s,'cf-status');n.dataset.status=s;return n}
function record(title,description,...actions){const n=e('article',undefined,'cf-record');const copy=e('div');copy.append(e('h3',title),e('p',description));n.append(copy,row(...actions));return tint(n,title)}
function balanceTags(ids){return Object.fromEntries(ids.map(id=>{const a=m.accounts.find(a=>a.id===id);return [id,C.balanceKey(a)]}))}
function moneyActions(account){return row(b('Record income',()=>moneyForm('in',null,account),'primary'),b('Record expense',()=>moneyForm('out',null,account)),b('Record transfer',()=>transferForm(null,account?{from:account}:null)))}
function moneyForm(direction,existing,chosen){const id=existing?.id||uid(),account=existing?.account||chosen||scopedChecking()||(activeAccounts().length===1?activeAccounts()[0].id:'');
 const scheduled=existing?[]:C.events(m,C.add(today(),90)).filter(o=>o.kind===(direction==='in'?'income':'bill')&&o.status!=='cleared');
 const pick=select('source',[['','New transaction'],...scheduled.map(o=>[o.id,o.name+' · '+o.date+' · '+dollars(o.amount)])],'');
 const f=form(direction==='in'?'Record a deposit':'Record a purchase',[
 field('Account',select('account',activeAccounts().map(a=>[a.id,name(a.id)]),account)),field('Amount ($)',number('amount',existing?existing.amount/100:'',.01)),
 ...(!existing?[field('Apply to a scheduled '+(direction==='in'?'deposit':'bill')+' (optional)',pick)]:[]),field('Description',input('name','text',existing?.name||(direction==='in'?'Money added':'Money subtracted'))),field('Date',input('date','date',existing?.date||today())),...(direction==='in'?[separateDepositField()]:[]),field('Notes',note('notes',existing?.notes||''))
 ],fields=>{
  if(fields.date.value>today())throw Error('Use today or an earlier date for money already recorded. Plan future items under Income or Bills.');
  const a=activeAccounts().find(a=>a.id===fields.account.value);if(!a)throw Error('Choose an active account first.');if(a.opening===null)throw Error('Set this account’s starting balance first.');
  const amount=cents(fields.amount.value),src=fields.source?.value;
  if(src){const item=C.events(m,C.add(today(),90)).find(o=>o.id===src);if(!item||item.status==='cleared')throw Error('That item was already recorded. Reopen the form.');if(item.account!==a.id)throw Error('The account must match the scheduled item.');if(direction==='in')checkDuplicateDeposit({...item,date:fields.date.value,posted:fields.date.value,amount,status:'cleared'},fields.separateDeposit.checked);m.overrides[src]={...item,amount,name:reqName(fields),date:fields.date.value,posted:fields.date.value,...(direction==='out'?{paymentDate:fields.date.value}:{}),preferred:item.preferred||item.date,status:'cleared',paid:direction==='out',cleared:true,notes:value(fields,'notes'),afterBalances:balanceTags([a.id])};return}
  const next={id,direction,account:a.id,amount,name:reqName(fields),date:fields.date.value,notes:value(fields,'notes'),afterBalances:existing&&existing.account===a.id&&existing.date===fields.date.value?existing.afterBalances:balanceTags([a.id])};
  m.ledger??=[];const i=m.ledger.findIndex(x=>x.id===id);if(i<0)m.ledger.push(next);else m.ledger[i]={...m.ledger[i],...next}
 });if(!existing)pick.onchange=()=>{const item=scheduled.find(x=>x.id===pick.value);if(item){f.elements.account.value=item.account;f.elements.amount.value=item.amount/100;f.elements.name.value=item.name;f.elements.notes.value=item.notes||''}};
}
function plannedPurchaseForm(existing){
 const end=C.add(today(),366);
 const deposits=C.events(m,end).filter(item=>item.kind==='income'&&
  activeAccounts().some(account=>account.id===item.account&&account.type==='checking')&&
  (item.id===existing?.afterDepositId||item.status!=='cleared'&&(item.expectedDate||item.date)>=today()));
 if(!deposits.length){
  const panel=e('section',undefined,'cf-dialog cf-inline-form');
  panel.append(e('h2','Plan a purchase'),e('p','Add an expected deposit to choose when the purchase should happen.'),
   row(b('Add expected deposit',()=>incomeForm(null,'once'),'primary'),b('Cancel',()=>panel.remove())));
  placeFinanceEditor(panel);return;
 }
 const days=input('delay','number',existing?.daysAfterDeposit||0);
 days.min=0;days.max=365;days.step=1;
 form(existing?'Edit planned purchase':'Plan a purchase',[
  field('Purchase name',input('name','text',existing?.name)),
  field('Expected deposit',select('deposit',[['','Choose a deposit'],...deposits.map(item=>[
   item.id,item.name+' · '+dateLabel(item.expectedDate||item.date)+' · '+name(item.account)
  ])],existing?.afterDepositId||'')),
  field('Amount ($)',number('amount',existing?existing.amount/100:'',.01)),
  field('Days after deposit (0 = same day)',days),field('Notes',note('notes',existing?.notes))
 ],f=>{
  const deposit=deposits.find(item=>item.id===f.deposit.value);
  if(!deposit)throw Error('Choose an expected deposit.');
  const delay=Number(f.delay.value);
  if(!Number.isInteger(delay)||delay<0||delay>365)throw Error('Enter 0 to 365 whole days.');
  const entry={id:existing?.id||uid(),account:deposit.account,direction:'out',amount:cents(f.amount.value),
   name:reqName(f),afterDepositId:deposit.id,daysAfterDeposit:delay,notes:value(f,'notes')};
  m.ledger??=[];
  if(existing)Object.assign(existing,entry);else m.ledger.push(entry);
 },host,()=>{tab='Activity';render()});
}
function plannedPurchases(root){
 const purchases=(m.ledger||[]).filter(item=>item.afterDepositId&&!item.deleted&&matchesOwner(item.account));
 if(!purchases.length)return;
 const dates=new Map(C.events(m,C.add(today(),366)).filter(item=>item.afterDepositId).map(item=>[item.id,item.date]));
 const panel=card('Planned purchases');
 panel.append(compactList('After a deposit',purchases.map(item=>compactRow(item.name,item.amount,
  [dates.has(item.id)?dateLabel(dates.get(item.id)):'Linked deposit unavailable',name(item.account),'Planned'],
  [b('Edit',()=>plannedPurchaseForm(item)),b('Delete',()=>safeAction('Delete planned purchase',()=>{item.deleted=true}),'link')],item.account,[item.notes]))));
 root.append(panel);
}
function editEvent(o){if(o.reconciliationId){alert('To reverse a reconciliation adjustment, use Reverse change in Activity.');return}if(o.kind==='transfer')transferForm(m.transfers.find(t=>t.id===o.id));else if(['money-in','money-out'].includes(o.kind)){const entry=m.ledger.find(t=>t.id===o.id);if(entry?.afterDepositId)plannedPurchaseForm(entry);else moneyForm(o.direction,entry);}else occurrenceForm(o)}
function historyDate(item){return item.kind==='bill'?(item.paymentDate||item.posted||item.date):item.date}
function transactionTouchesAccount(item,id){
 return item.kind==='transfer'?item.from===id||item.to===id:item.account===id;
}
function historyEnd(){
 return [C.add(today(),90),...m.transfers.filter(t=>!t.deleted).map(t=>t.date)].sort().at(-1);
}
function newestFirst(a,b){
 return historyDate(b).localeCompare(historyDate(a))||a.id.localeCompare(b.id);
}
function savingsActivity(account,events){
 const rows=events.filter(item=>transactionTouchesAccount(item,account.id));
 const details=e('details',undefined,'cf-group');
 const key='Savings activity|'+account.id;
 details.open=folded.get(key)||false;
 details.addEventListener('toggle',()=>folded.set(key,details.open));
 details.append(e('summary','Savings activity · '+rows.length));
 if(!rows.length)details.append(e('p','No activity for this account yet.'));
 for(const item of rows.slice(0,historyLimit)){
  const route=item.kind==='transfer'?name(item.from)+' → '+name(item.to):name(item.account);
  details.append(tile(item.name,item.amount,[dateLabel(historyDate(item)),route,item.notes],
   [badge(item.status),b('Edit',()=>editEvent(item)),b('Delete',()=>deleteEvent(item),'link')],account.id));
 }
 if(rows.length>historyLimit)details.append(b('Show more transactions',()=>{
  historyLimit+=24;
  render();
  const current=document.getElementById(details.id);
  if(current){current.open=true;current.querySelector('summary')?.focus()}
 }));
 details.id='cf-savings-activity-'+account.id;
 return details;
}
function history(root){
 plannedPurchases(root);
 const p=card('Transactions'),ids=new Set(m.accounts.map(a=>a.id));
 {
  const controls=row(searchField('Search transactions',historyFilters.search,v=>{historyFilters.search=v;historyLimit=24}));
  for(const key of ['from','to']){
   const date=input(key,'date',historyFilters[key],false);
   date.onchange=()=>{historyFilters[key]=date.value;historyLimit=24;render()};
   controls.append(field(key==='from'?'From date':'To date',date));
  }
  for(const [key,label,options] of [
   ['type','Transaction type',[['','All types'],['bill','Bill payments'],['deposit','Deposits'],['transfer','Transfers'],['money-out','Purchases']]],
   ['status','Status',[['','All statuses'],['planned','Planned'],['pending','Pending'],['cleared','Cleared']]]
  ]){
   const control=select(key,options,historyFilters[key]);
   control.onchange=()=>{historyFilters[key]=control.value;historyLimit=24;render()};
   controls.append(field(label,control));
  }
  p.append(controls);
 }
 const visible=item=>matchesTransaction(item)&&
  (!historyFilters.from||historyDate(item)>=historyFilters.from)&&(!historyFilters.to||historyDate(item)<=historyFilters.to)&&
  (!historyFilters.type||(historyFilters.type==='deposit'?['income','money-in'].includes(item.kind):item.kind===historyFilters.type))&&(!historyFilters.status||item.status===historyFilters.status)&&
  [item.name,item.notes,name(item.account),name(item.from),name(item.to)].join(' ').toLowerCase().includes(historyFilters.search);
 const rows=C.events(m,historyEnd()).filter(visible).filter(o=>(o.status!=='planned'||o.kind==='transfer')&&(o.kind==='transfer'?(ids.has(o.from)||ids.has(o.to)):ids.has(o.account))).sort(newestFirst);
 const selection=financeSelection();
 p.append(e('p',rows.length+' transactions · newest first'),selection.top);p.append(compactList('Transactions & planned moves',rows.slice(0,historyLimit).map(o=>selection.attach(compactRow(o.name,['bill','money-out'].includes(o.kind)?-o.amount:o.kind==='transfer'&&selectedOwner().startsWith('account:')&&selectedOwner()==='account:'+o.from?-o.amount:o.amount,[dateLabel(historyDate(o)),o.kind==='transfer'?name(o.from)+' → '+name(o.to):name(o.account),statusLabel(o)], [badge(statusLabel(o)),b('Edit',()=>editEvent(o)),...(o.kind==='bill'&&o.status==='pending'?[b('Mark cleared',()=>payment(o,true))]:[]),b('Delete',()=>deleteEvent(o),'link')],o.account||o.from,[o.notes]),o)),true));if(rows.length>historyLimit)p.append(b('Show more transactions',()=>{historyLimit+=24;render()}));p.append(selection.bar);root.append(p);
 {const audit=e('details',undefined,'cf-card');audit.id='cfAudit';audit.append(e('summary','Change history')); audit.append(e('p','Saved changes cover all accounts. Reverse change returns the affected records to their earlier values. If the same record was edited later, use Edit to make a correction.'));const entries=[...(m.audit||[])].filter(entry=>!entry.deleted).reverse();audit.append(group('Saved changes',entries.map(x=>{const n=record(x.label,new Date(x.at).toLocaleString(),badge(x.recovered?'Restored':x.undone?'Undone':'Saved'),...(!x.undone?[b('Reverse change',()=>{if(confirm('Reverse '+x.label+'?'))undoChange(x)})]:[]),b('Delete history entry',()=>{
  if(confirm('Remove this saved change from the undo history? Its transactions and balances will stay as they are.'))safeAction('Delete history entry',()=>{x.deleted=true});
 },'link'));const details=e('details');details.append(e('summary','Original / new values'));for(const op of x.changes)details.append(e('p',op.key+' · '+(op.after?.name||op.before?.name||op.id)+'\nBefore: '+JSON.stringify(op.before)+'\nAfter: '+JSON.stringify(op.after)));for(const op of x.changes){
 const current=savedRecord(op);
 if(current&&!current.deleted&&!current.skipped&&!current.reconciliationId&&['accounts','groups','income','bills','overrides','transfers','ledger','goals','budgetName','reconciliations'].includes(op.key))
  details.append(b('Edit '+(current.name||op.key),()=>editSavedRecord(op,current)));
 }n.append(details);return n}),false));root.append(audit)}
}
function savings(root){
 const report=C.forecast(m,today(),horizon),p=card('Savings');
 const selected=report.savings.filter(account=>matchesOwner(account.id));
 const configured=selected.every(account=>account.configured);
 p.append(e('strong','Total Savings · '+(configured?dollars(selected.reduce((total,account)=>total+account.current,0)):'Set starting balances'),'cf-savings-balance'),
  e('p','Separate from everyday spending and bill coverage. Move money into checking when needed.'));
 const grid=e('div',undefined,'cf-payday-grid cf-savings-grid');
 const events=C.events(m,historyEnd()).filter(item=>item.status!=='planned'||item.kind==='transfer').sort(newestFirst);
 for(const account of selected){
  const accountCard=savingsBalanceCard(account);
  accountCard.append(savingsActivity(account,events));
  grid.append(accountCard);
 }
 p.append(grid,b('Create savings account',()=>accountForm(null,'savings')));root.append(p);
 if(!selectedOwner()&&state.savingsEntries?.length){
  const remaining=state.savingsEntries.filter(entry=>!m.overrides['legacy-savings|'+entry.id]?.skipped)
   .sort((a,b)=>(b.date||'').localeCompare(a.date||''));
  const old=e('details',undefined,'cf-old-savings');
  old.append(e('summary','Earlier savings records · '+remaining.length),e('p','Preserved separately; not replayed into current balances.'));
  for(const x of remaining){
   old.append(record(dateLabel(x.date)+' · '+x.kind,(state.people?.find(p=>p.id===x.person)?.name||'')+' · '+money(Number(x.amount))+(x.note?' · '+x.note:''),
    b('Delete',()=>safeAction('Delete earlier savings entry',()=>{m.overrides['legacy-savings|'+x.id]={id:'legacy-savings|'+x.id,skipped:true,legacyId:x.id}}),'link')));
  }
  root.append(old);
 }
 root.append(recoveryControls());
}
function savingsDisclosure(label,key){
 const details=e('details',undefined,'cf-savings-disclosure');
 const viewKey=tab+'|'+selectedOwner()+'|'+key;
 details.open=folded.get(viewKey)||false;
 details.append(e('summary',label));
 details.addEventListener('toggle',()=>{if(details.isConnected)folded.set(viewKey,details.open)});
 return details;
}
function accountFunds(account,source,editable){
 const records=(source.goals||[]).filter(g=>!g.deleted&&g.account===account.id);
 const goals=savingsDisclosure('Savings funds','funds|'+account.id);
 if(editable)goals.append(b('＋ Add fund',()=>goalForm(null,account.id),'primary'));
 const fundList=e('div',undefined,'bre-fund-grid');
 const funds=records.filter(g=>!g.archived);
 for(const g of funds){
  const allocated=g.reserved||0;
  const n=e('article',undefined,'bre-fund');
  n.style.setProperty('--paper-color',/^#[a-f0-9]{6}$/i.test(g.color)?g.color:'#ffe9f2');
  n.append(e('h3',[g.emoji,g.name].filter(Boolean).join(' ')),
   e('strong',dollars(allocated)+' set aside · '+dollars(g.target)+' goal'));
  const progress=e('progress');progress.max=g.target;progress.value=Math.min(g.target,allocated);
  progress.setAttribute('aria-label',g.name+' savings progress');
  n.append(progress);
  if(editable)n.append(row(b('＋ Add',()=>fundAmount(g,false)),b('Release',()=>fundAmount(g,true)),b('Edit',()=>goalForm(g))));
  fundList.append(n);
 }
 if(!funds.length)fundList.append(e('p','No active funds in this account.'));
 goals.append(fundList);
 const archive=e('details');const archived=records.filter(g=>g.archived);
 archive.append(e('summary','Archived funds ('+archived.length+')'));
 for(const g of archived)if(!editable)archive.append(e('p',g.name));else archive.append(row(e('span',g.name),b('Edit or restore',()=>goalForm(g)),
  b('Delete',()=>{if(confirm('Delete '+g.name+'?'))safeAction('Delete savings fund',()=>{g.deleted=true})},'link')));
 if(archived.length)goals.append(archive);
 return goals;
}
function reservedFor(account,except,source=m){
 return (source.goals||[]).filter(g=>!g.archived&&!g.deleted&&g.account===account&&g.id!==except)
  .reduce((total,g)=>total+(g.reserved||0),0);
}
function assertFundBalance(account,amount,except){
 const balance=C.forecast(m,today(),0).savings.find(a=>a.id===account);
 if(!balance?.configured)throw Error('Set a starting balance for this savings account first.');
 const available=Math.max(0,balance.current-reservedFor(account,except));
 if(amount>available)throw Error('This account has '+dollars(available)+' available for this fund.');
}
function fundAmount(goal,release){
 form(release?'Release from '+goal.name:'Set aside for '+goal.name,[field('Amount ($)',number('amount','',.01))],f=>{
  const amount=cents(f.amount.value),prior=goal.reserved||0;
  if(!Number.isSafeInteger(amount)||amount<=0)throw Error('Enter a positive amount.');
  if(release&&amount>prior)throw Error('This fund only has '+dollars(prior)+' set aside.');
  if(!release)assertFundBalance(goal.account,prior+amount,goal.id);
  goal.reserved=prior+(release?-amount:amount);
 });
}
function goalForm(g,accountId){
 const choices=activeAccounts().filter(a=>a.type==='savings').map(a=>[a.id,name(a.id)]);
 if(!choices.length){alert('Create a savings account first.');return}
 form(g?'Edit savings fund':'Add savings fund',[
  field('Fund name',input('name','text',g?.name)),
  field('Savings account',select('account',choices,g?.account||accountId||choices[0][0])),
  field('Target ($)',number('target',g?g.target/100:'',.01)),
  field('Starting amount set aside ($)',number('reserved',(g?.reserved||0)/100)),
  field('Card color',input('color','color',g?.color||'#ffe9f2')),
  field('Emoji sticker',input('emoji','text',g?.emoji||'',false)),
  field('Archive fund and release its money',check('archived',g?.archived))
 ],f=>{
  const archived=f.archived.checked;
  const next={id:g?.id||uid(),name:reqName(f),account:f.account.value,target:cents(f.target.value),
   reserved:archived?0:cents(f.reserved.value),color:f.color.value,emoji:f.emoji.value.trim().slice(0,24),archived};
  if(next.target<=0)throw Error('Enter a positive target.');
  if(!Number.isSafeInteger(next.reserved)||next.reserved<0)throw Error('Enter a valid amount to set aside.');
  if(next.reserved&&(next.account!==g?.account||next.reserved>(g?.reserved||0)))assertFundBalance(next.account,next.reserved,next.id);
  m.goals??=[];
  if(g)Object.assign(g,next);else m.goals.push(next);
 });
}

function budgetNameForm() {
 const owner=state,originalName=m.budgetName;
 const dialog=e('dialog',undefined,'cf-dialog');
 const title=e('h2','Rename budget');
 title.id='cf-budget-name-title';
 dialog.setAttribute('aria-labelledby',title.id);
 const editor=e('form');
 const budgetName=input('budgetName','text',originalName||'My budget');
 budgetName.autofocus=true;
 const error=e('p',undefined,'cf-error');
 error.setAttribute('role','alert');
 const submit=e('button','Save name','primary');
 submit.type='submit';
 editor.append(field('Budget name',budgetName),error,row(submit,b('Cancel',()=>dialog.close())));
 editor.onsubmit=event=>{
  event.preventDefault();
  const nextName=budgetName.value.trim();
  if(!nextName){error.textContent='Enter a budget name.';return}
  if(owner!==state||m.budgetName!==originalName){
   error.textContent='The budget changed while you were editing. Close this window and reopen Rename budget.';
   return;
  }
  try{
   safetyBackup();
   m.budgetName=nextName;
   commit('Budget name');
   dialog.close();
  }catch(err){
   error.textContent=err.message;
  }
 };
 dialog.append(title,editor);
 dialog.addEventListener('close',()=>dialog.remove(),{once:true});
 document.body.append(dialog);
 dialog.showModal();
 budgetName.select();
}
function banner(){
 const p=card('Finances');p.classList.add('cf-toolbar','cf-simple-toolbar');
 const chooser=select('accountView',ownerOptions(),selectedOwner());
 chooser.onchange=()=>{selectOwner(chooser.value);historyLimit=24;render()};
 p.append(field('Viewing accounts',chooser));
 const nav=e('nav',undefined,'cf-simple-tabs');nav.setAttribute('aria-label','Finance views');
 for(const [key,label] of [['Overview','Summary'],['Activity','Transactions'],['Forecast','Upcoming'],['Savings','Savings goals']]){
  const button=b(label,()=>{tab=key;render()});
  button.setAttribute('aria-current',tab===key||(key==='Forecast'&&['Bills','Income'].includes(tab))?'page':'false');nav.append(button);
 }
 p.append(nav);
 const chosen=activeAccounts().filter(a=>matchesOwner(a.id));
 p.append(moneyActions(chosen.length===1?chosen[0].id:null));
 const settings=e('details',undefined,'cf-settings');settings.append(e('summary','Settings & tools'),row(
  b('Add account',()=>accountForm()),b('Rename budget',budgetNameForm),b('Export dashboard backup',()=>backup()),
  b('Change history',()=>{tab='Activity';render();document.getElementById('cfAudit')?.scrollIntoView({block:'start'})}),
  b('Archive',()=>{tab='Archive';render()}),b('Loan tools',()=>go('Amortization'))));
 p.append(settings);return p;
}
function visiblePlans(report){
 return report.accounts.filter(account=>matchesOwner(account.id)).map(account=>({
  account,plan:T.paydayPlan(account,today(),C.add(today(),30))
 }));
}
function changeDepositDate(deposit){
 const original=C.events(m,C.add(today(),366)).find(item=>item.id===deposit.id);
 if(!original)return;
 form('Change expected deposit date',[
  e('p',name(original.account)+' · '+original.name+' · '+dollars(original.amount)),
  field('Expected date',input('expectedDate','date',deposit.date))
 ],fields=>{
  const date=fields.expectedDate.value;
  if(!date||date<today())throw Error('Choose today or a future date.');
  if(original.status==='planned')m.overrides[original.id]={...original,date,preferred:date};
  else m.overrides[original.id]={...original,expectedDate:date};
 });
}
const paydayTimings=[['unknown','Timing unknown'],['before','Before deposit'],['after','After deposit']];
function paydayBreakdown(account,plan){
 const section=e('section',undefined,'cf-payday-breakdown');
 if(!plan.hasPayday){
  section.append(e('p','No payday scheduled. This estimate covers the next 30 days.','cf-payday-note'));
  return section;
 }
 section.append(e('h4','On payday · '+dateLabel(plan.cutoff)));
 const schedule=m.income.find(rule=>rule.id===account.nextDeposit.ruleId&&!rule.deleted&&!rule.archived&&!rule.stop);
 const controls=row(b('Change this deposit date',()=>changeDepositDate(account.nextDeposit)));
 if(schedule&&schedule.frequency!=='once')controls.append(b('Edit recurring payday',()=>incomeForm(schedule)));
 const originalBills=new Map([
  ...C.events(m,plan.cutoff,{byDue:true}),...C.events(m,plan.cutoff)
 ].filter(item=>item.kind==='bill').map(item=>[item.id,item]));
 const entries=e('div',undefined,'cf-payday-entries');
 for(const item of plan.onDay){
  const line=e('div',undefined,'cf-payday-line');
  const label=item.kind==='income'?'Expected deposit · '+item.name:item.kind==='transfer'?item.name+' · '+name(item.from)+' → '+name(item.to):item.name;
  line.append(e('span',label),e('strong',dollars(item.delta)));
  const original=originalBills.get(item.id);
  if(item.kind==='bill'&&original){
   const timing=select('paydayTiming',paydayTimings,item.paydayTiming||'unknown');
   const error=e('small',undefined,'cf-shortfall');
   error.setAttribute('role','alert');
   timing.onchange=()=>{
    try{safeAction('Bill timing',()=>{m.overrides[item.id]={...original,paydayTiming:timing.value}})}
    catch(err){timing.value=item.paydayTiming||'unknown';error.textContent=err.message}
   };
   timing.setAttribute('aria-label','Posting order for '+item.name);
   line.append(timing,error);
  }
  entries.append(line);
 }
 section.append(entries);
 if(plan.preDeposit<0&&plan.bills.some(item=>item.paydayTiming==='before')&&plan.preDeposit<plan.available){
  section.append(e('p','Short '+dollars(-plan.preDeposit)+' before the deposit, based on bills marked Before deposit.','cf-shortfall'));
 }
 if(plan.conditionalShortfall&&plan.unknown.some(item=>item.delta<0)){
  section.append(e('p','May be short '+dollars(plan.conditionalShortfall)+' if bills come out first.','cf-payday-note'));
 }
 const after=e('div',undefined,'cf-payday-estimate');
 after.append(e('span','Estimated after payday activity'),e('strong',dollars(plan.after),plan.after<0?'cf-shortfall':''));
 section.append(after,controls);
 return section;
}
function beforePaydayEstimate(plan){
 const estimate=e('div',undefined,'cf-payday-estimate');
 estimate.append(e('span',plan.hasPayday?'Estimated left before payday':'Estimated left in 30 days'),
  e('strong',dollars(plan.available),plan.available<0?'cf-shortfall':''));
 if(plan.firstShort)estimate.append(e('p','First projected shortfall '+dateLabel(plan.firstShort)+' · '+dollars(-plan.firstShortBalance),'cf-shortfall'));
 return estimate;
}
function clearedBreakdown(account){
 const panel=e('details',undefined,'cf-overview-breakdown');
 panel.append(e('summary','Why this balance?'));
 if(account.current==null){panel.append(e('p','Set a starting balance to see the calculation.'));return panel}
 let balance=account.opening;
 panel.append(e('p','Starting balance on '+dateLabel(account.asOf)+' · '+dollars(balance)+(balance<0?' · Already below zero':'')));
 const entries=[...(account.clearedEntries||[])].sort((a,b)=>a.date.localeCompare(b.date));
 for(const entry of entries){
  const previous=balance;
  balance+=entry.delta;
  const crossed=previous>=0&&balance<0;
  panel.append(e('p',dateLabel(entry.date)+' · '+entry.name+' · '+(entry.delta>0?'+'+dollars(entry.delta):dollars(entry.delta))+' → '+dollars(balance)
   +(crossed?' · Balance went below zero':''),crossed?'cf-shortfall':''));
 }
 if(!entries.length)panel.append(e('p','No cleared activity counted after the starting balance.'));
 panel.append(e('strong','Cleared balance · '+dollars(account.current)));
 return panel;
}
function savingsBalanceCard(account,summaryOnly=false,source=m,editable=true){
 const assigned=reservedFor(account.id,undefined,source);
 const unassigned=account.current==null?null:Math.max(0,account.current-assigned);
 const transferable=unassigned==null?null:Math.min(unassigned,Math.max(0,account.current-(account.cushion||0)));
 const item=savingsDisclosure(account.name+' · '+(unassigned==null?'No recorded balance':dollars(unassigned)+' available after designating'),'savings|'+account.id);
 item.open=true;
 if(account.current!=null&&assigned>account.current)item.append(e('p','Goals exceed savings by '+dollars(assigned-account.current)+'. Assigning money to a goal does not deposit money into this account.','cf-shortfall'));
 item.append(balanceFooter('Cleared balance',account.current),balanceFooter('Set aside for goals',assigned));
 if(!summaryOnly)item.append(accountFunds(account,source,editable));
 item.append(balanceFooter('Unassigned savings',unassigned),balanceFooter('Free to transfer',transferable));
 const details=e('details',undefined,'cf-overview-breakdown');
 details.append(e('summary','How these amounts are calculated'),balanceFooter('Cleared savings',account.current));
 for(const fund of (source.goals||[]).filter(g=>g.account===account.id&&!g.deleted&&!g.archived&&g.reserved>0)){
  details.append(balanceFooter('Set aside for '+fund.name,fund.reserved));
 }
 details.append(balanceFooter('Total set aside',assigned),balanceFooter('Account cushion',account.cushion||0),
  e('p','You can designate any unassigned savings. Free to transfer is the amount you can move while keeping every fund covered and the account at or above its cushion.'));
 if(account.current!=null&&assigned>account.current)details.append(e('p','Funds exceed cleared savings by '+dollars(assigned-account.current)+'.','cf-shortfall'));
 item.append(details);
 if(!editable)return item;
 if(summaryOnly){
  const options=e('details');options.append(e('summary','Account options'),accountControls(account));
  item.append(row(b('Transactions',()=>{selectOwner(accountView(account));tab='Activity';render()}),b('Savings goals',()=>{selectOwner(accountView(account));tab='Savings';render()})),options);
  return item;
 }
 const math=e('div',undefined,'cf-payday-math');
 for(const [label,amount] of [['Cleared savings',account.current],['Pending change',account.pending],['Projected savings',account.projected]]){
  const line=e('div',undefined,'cf-payday-line');
  line.append(e('span',label),e('strong',dollars(amount)));
  math.append(line);
 }
 item.append(math,moneyActions(account.id),b('Edit account',()=>accountForm(m.accounts.find(entry=>entry.id===account.id))));
 return item;
}
function accountPairLabel(account){
 const original=m.accounts.find(a=>a.id===account.id)||account;
 return original.name.normalize('NFKC').toLowerCase().trim()
  .replace(/(?:[\s\-–—]+)(?:checking|savings)\s*(?:account)?$/i,'')
  .replace(/[’']s$/i,'').replace(/[^\p{L}\p{N}]/gu,'');
}
function overviewOwnerKey(account){
 const original=m.accounts.find(a=>a.id===account.id)||account;
 const owner=viewOwner(original);
 return owner?'group:'+owner:'name:'+accountPairLabel(original);
}
function pairedChecking(saving,checkingAccounts){
 const label=accountPairLabel(saving);
 const exact=checkingAccounts.filter(a=>accountPairLabel(a)===label);
 if(label&&exact.length===1)return exact[0];
 // Legacy account names may omit the possessive apostrophe (e.g. Crystals).
 const base=x=>accountPairLabel(x).replace(/s$/,'');
 const legacy=checkingAccounts.filter(a=>base(a)===base(saving));
 if(base(saving)&&legacy.length===1)return legacy[0];
 const key=overviewOwnerKey(saving);
 const grouped=checkingAccounts.filter(a=>overviewOwnerKey(a)===key);
 return grouped.length===1?grouped[0]:null;
}
function savingsForChecking(checking,savings){
 const candidates=activeAccounts().filter(a=>a.type==='checking');
 return savings.filter(a=>pairedChecking(a,candidates)?.id===checking.id);
}
function latestCushionChange(audit,account){
 for(let i=audit.length-1;i>=0;i--){
  const entry=audit[i];
  if(entry.undone)continue;
  const change=entry.changes?.find(op=>op.key==='accounts'&&op.id===account.id);
  if(!change?.hadBefore||!change.hadAfter)continue;
  const before=change.before?.cushion??0;
  const after=change.after?.cushion??0;
  if(before===after)continue;
  return after===(account.cushion??0)&&before>after?{before,after,at:entry.at}:null;
 }
 return null;
}
function cushionOverview(account,plan){
 const note=e('div',undefined,'cf-cushion-overview');
 const target=account.cushion??0;
 const change=latestCushionChange(m.audit||[],account);
 if(!target&&!change)return null;
 note.append(e('strong',target?'Cushion target · '+dollars(target):'Cushion target · Off'));
 if(change)note.append(e('small','Cushion reduced from '+dollars(change.before)+' to '+dollars(change.after)));
 if(target&&Number.isFinite(plan.lowest)&&Number.isFinite(plan.preDeposit)){
  const remaining=Math.max(0,Math.min(target,plan.lowest,plan.preDeposit));
  if(remaining<target){
   note.dataset.low='true';
   note.append(e('small','Projected cushion remaining · '+dollars(remaining)+' ('+dollars(target-remaining)+' below target)'));
  }
 }
 return note;
}
function balanceFooter(label,amount){
 const footer=e('div',undefined,'cf-payday-line cf-balance-footer');
 footer.append(e('span',label),e('strong',dollars(amount)));
 return footer;
}
function overview(root,report){
 if(!activeAccounts().length){
  const setup=card('Set up your finances');
  setup.append(e('p','Add an account to see balances and forecasts. You can start with a bill and assign its paying account later.'),
   row(b('Add your first account',()=>accountForm(null),'primary'),
    b('Add income',()=>incomeForm(null,'once')),b('Add a bill',()=>addBill())));
  root.append(setup);
  if(!m.bills.length&&!Object.keys(m.overrides).length)return;
 }
 const p=card('Account balances'),grid=e('div',undefined,'cf-payday-grid');
 const plans=visiblePlans(report);
 const savings=report.savings.filter(account=>matchesOwner(account.id));
 grid.classList.add('cf-stacked-accounts');
 const checkingColumns=new Map();
 const deposits=C.events(m,today()).filter(x=>depositDue(x,today()));
 for(const {account,plan} of plans){
  const item=e('article',undefined,'cf-payday-focus');
  const entries=[...plan.before,...plan.bills.filter(x=>x.paydayTiming==='before')];
  const bills=entries.filter(x=>x.kind==='bill').reduce((sum,x)=>sum+x.delta,0);
  const other=entries.filter(x=>x.kind!=='bill').reduce((sum,x)=>sum+x.delta,0);
  item.append(e('h3',name(account.id)));
  for(const deposit of deposits.filter(x=>x.account===account.id&&(x.expectedDate||x.date)>=account.asOf)){
   item.append(b('Confirm deposit · '+deposit.name+' · '+dateLabel(deposit.expectedDate||deposit.date)+' · '+dollars(deposit.amount),
    ()=>confirmDeposit(deposit),'primary'));
  }
   const pending=account.future.filter(x=>x.status==='pending'&&x.delta<0);
   const pendingTotal=pending.reduce((sum,x)=>sum+x.delta,0);
   const afterPending=account.current===null?null:account.current+pendingTotal;
   const remaining=entries.filter(x=>!pending.some(y=>y.id===x.id));
   const periodPending=entries.filter(x=>pending.some(y=>y.id===x.id)).reduce((sum,x)=>sum+x.delta,0);
   const summaryLine=(label,amount,items)=>{
    const d=e('details',undefined,'cf-summary-line');const title=e('summary');title.append(e('span',label),e('strong',dollars(amount)));d.append(title);
    if(items.length)for(const x of items)d.append(balanceFooter(dateLabel(x.date)+' · '+x.name,x.delta));
    else d.append(e('p','No activity included.'));
    return d;
   };
   item.append(summaryLine('Cleared balance',account.current,[{name:'Starting balance',date:account.asOf,delta:account.opening},...account.clearedEntries]),
    summaryLine('Pending payments',pendingTotal,pending),
    balanceFooter('After pending payments',afterPending),
    summaryLine('Upcoming commitments',remaining.filter(x=>x.delta<0).reduce((sum,x)=>sum+x.delta,0),remaining.filter(x=>x.delta<0)));
   if(remaining.some(x=>x.delta>0))item.append(summaryLine('Expected money in before payday',remaining.filter(x=>x.delta>0).reduce((sum,x)=>sum+x.delta,0),remaining.filter(x=>x.delta>0)));
   if(pendingTotal!==periodPending)item.append(e('p','The estimate below includes pending payments scheduled within this period.'));
   item.append(balanceFooter(plan.hasPayday?'Estimated left before next payday':'Estimated left in 30 days',plan.preDeposit));
   item.append(e('p',plan.hasPayday?'Next payday: '+dateLabel(plan.cutoff)+' · '+dollars(account.nextDeposit.amount):'No payday scheduled. Showing the next 30 days.'));
   if(account.cushion)item.append(balanceFooter('After keeping your cushion',plan.preDeposit===null?null:plan.preDeposit-account.cushion));
   const options=e('details');options.append(e('summary','Account options'),accountControls(account));
   item.append(row(b('Transactions',()=>{selectOwner(accountView(account));tab='Activity';render()}),b('Upcoming',()=>{selectOwner(accountView(account));tab='Forecast';render()})),options);
   const column=e('div',undefined,'cf-account-column');column.append(item);
  checkingColumns.set(account.id,column);
  grid.append(column);
 }
 for(const saving of savings){
  const checking=pairedChecking(saving,plans.map(p=>p.account));
  let column=checking&&checkingColumns.get(checking.id);
  if(!column){column=e('div',undefined,'cf-account-column');grid.append(column);}
  column.append(savingsBalanceCard(saving,true));
 }
 if(!plans.length&&!savings.length&&activeAccounts().length)p.append(e('p','No checking accounts in this view.'));
 const actions=row(b('Add account',()=>accountForm()));
 if(activeAccounts().length>1)actions.prepend(b('Transfer money',()=>transferForm(null,{from:scopedChecking()}),'primary'));
 p.append(actions,grid);
 p.classList.add('cf-payday-overview');
 root.append(p);

}

function deleteAccount(id){
 const account=activeAccounts().find(a=>a.id===id);
 if(!account)return;
 const linked=[...m.bills,...m.income].filter(r=>!r.deleted&&!r.archived&&r.account===id);
 const message='Delete '+account.name+'?'+(linked.length?' This will also archive '+linked.length+' linked active bill/income records so they no longer recur.':'')+' Historical records will be retained. No other account will be deleted.';
 if(!window.confirm(message))return;
 safeAction('Delete account and archive linked schedules',()=>{
  for(const r of linked)r.archived=true;
  account.deleted=true;
 });
}
function accountControls(account){
 const panel=e('div',undefined,'cf-overview-controls');
 const details=e('details');
 details.append(e('summary','Account details'),
  e('p','Starting balance '+dollars(account.opening)+' · '+dateLabel(account.asOf)),
  e('p','Pending '+dollars(account.pending)+' · Cushion '+dollars(account.cushion)),
  row(b('Edit account',()=>accountForm(m.accounts.find(a=>a.id===account.id))),
      b('Delete account',()=>deleteAccount(account.id),'link')));
 const history=(m.reconciliations||[]).filter(r=>!r.deleted&&r.account===account.id).reverse();
 if(history.length){
  const log=e('details');
  log.append(e('summary','Reconciliation history · '+history.length));
  for(const r of history)log.append(row(e('p',dateLabel(r.date)+' · Bank '+dollars(r.bank)+' · '+
   (r.applied?'Applied adjustment '+dollars(r.difference):r.difference?'Comparison only · difference '+dollars(r.difference):'Matched')+(r.notes?' · '+r.notes:'')),b('Delete reconciliation',()=>safeAction('Delete reconciliation',()=>removeReconciliation(r.id)),'link')));
  details.append(log);
 }
 const actions=row(b('Reconcile',()=>reconcileForm(account.id)));
 if(activeAccounts().length>1)actions.prepend(b('Transfer',()=>transferForm(null,{from:account.id})));
 panel.append(actions,details);
 return panel;
}
function checkDuplicateDeposit(item,separate){
 if(item.kind!=='income'||item.status!=='cleared'||!item.ruleId)return;
 const duplicate=C.events(m,item.date).find(other=>other.id!==item.id&&other.kind==='income'&&
  other.status==='cleared'&&other.ruleId===item.ruleId&&other.account===item.account&&
  other.amount===item.amount&&(other.posted||other.date)===(item.posted||item.date));
 if(duplicate&&!separate)throw Error('This income schedule already has a cleared deposit of '+dollars(item.amount)+' on '+dateLabel(item.posted||item.date)+'. Check the existing deposit. If the bank received two separate deposits, select “Additional separate bank deposit”.');
}
function separateDepositField(){
 return field('Additional separate bank deposit',check('separateDeposit',false));
}
function depositDue(item,day){
 return item.kind==='income'&&item.status!=='cleared'&&(item.expectedDate||item.date)<=day;
}
function confirmDeposit(item){
 const account=m.accounts.find(a=>a.id===item.account);
 const matches=(m.ledger||[]).filter(x=>!x.deleted&&!x.reconciliationId&&!x.afterDepositId&&
  x.account===item.account&&x.direction==='in'&&x.amount===item.amount&&x.date<=today());
 const options=[...(matches.length?[['','Choose how to record this deposit']]:[]),['new','Add this posted deposit'],...matches.map(x=>[x.id,'Use recorded deposit · '+dateLabel(x.date)+' · '+x.name])];
 const source=select('source',options,matches.length?'':'new');
 source.required=true;
 const date=input('posted','date',item.expectedDate||item.date);
 date.max=today();
 const amount=number('amount',item.amount/100,.01);
 source.onchange=()=>{
  const match=matches.find(x=>x.id===source.value);
  date.value=match?.date||item.expectedDate||item.date;
  amount.value=(match?.amount??item.amount)/100;
  date.readOnly=amount.readOnly=!!match;
 };
 form('Confirm '+item.name+' · '+name(item.account),[
  field('Deposit record',source),field('Bank posting date',date),field('Posted amount ($)',amount),separateDepositField(),
  e('p','If this paycheck is already in Activity, use its recorded deposit.','cf-wide'),
  field('Already included in the starting balance on '+dateLabel(account.asOf),check('included',false))
 ],f=>{
  const current=C.events(m,today()).find(x=>x.id===item.id&&x.account===item.account);
  if(!current||current.status==='cleared')throw Error('This deposit has changed. Reopen Income.');
  const match=matches.find(x=>x.id===source.value);
  if(!match&&source.value!=='new')throw Error('Choose a deposit record.');
  const posted=match?.date||date.value;
  if(!posted||posted>today())throw Error('Enter the bank posting date through today.');
  if(f.included.checked&&posted>account.asOf)throw Error('This deposit came after the starting balance date.');
  checkDuplicateDeposit({...current,date:posted,posted,amount:match?.amount??cents(amount.value),status:'cleared'},f.separateDeposit.checked);
  const tags=match?match.afterBalances:f.included.checked?{}:balanceTags([item.account]);
  m.overrides[item.id]={...current,preferred:current.preferred||current.date,date:posted,posted,
   amount:match?.amount??cents(amount.value),status:'cleared',cleared:true,afterBalances:tags,
   notes:match?.notes||current.notes||'',...(match?{linkedTransactionId:match.id}:{})};
  if(match)match.deleted=true;
 });
}
function income(root){
 const p=card('Income');
 p.append(row(b('Add expected deposit',()=>incomeForm(null,'once'),'primary'),b('Set up income rule',()=>incomeForm())));
 const deposits=C.events(m,C.add(today(),90)).filter(x=>x.kind==='income'&&matchesOwner(x.account));
 const depositRow=x=>compactRow(x.name,x.amount,[dateLabel(x.date),name(x.account),x.status],[
  ...(depositDue(x,today())?[b('Confirm deposit',()=>confirmDeposit(x),'primary')]:[]),b('Edit deposit',()=>occurrenceForm(x)),b('Delete',()=>deleteEvent(x),'link')
 ],x.account,[x.notes]);
 const due=deposits.filter(x=>depositDue(x,today())).sort((a,b)=>b.date.localeCompare(a.date));
 if(due.length)p.append(compactList('Deposits awaiting confirmation',due.map(depositRow)));
 const upcoming=deposits.filter(x=>x.status!=='cleared'&&!depositDue(x,today()));
 p.append(compactList('Upcoming deposits',upcoming.sort((a,b)=>a.date.localeCompare(b.date)).map(depositRow)));
 const rules=m.income.filter(x=>!x.deleted&&(x.frequency!=='once'||x.archived)&&matchesOwner(x.account));
 p.append(compactList('Recurring income rules',rules.map(r=>compactRow(
  r.name,r.amount,[name(r.account),frequencies[r.frequency],r.archived?'Archived':'Active'],
  [...(r.stop?[]:[b('Edit rule',()=>incomeForm(r))]),b(r.archived?'Restore':'Archive',()=>toggleArchive(r)),b('Delete',()=>removeRule(r),'link')],
  r.account,[r.rule==='rick'?'Friday before fourth Wednesday':r.rule==='last'?'Last calendar day':'']
 ))));
 p.append(compactList('Deposit history',deposits.filter(x=>x.status==='cleared').sort((a,b)=>b.date.localeCompare(a.date)).map(depositRow),false));
 root.append(p);
}
function dueLabel(x){return x.due?(x.certainty==='estimated'?'Estimated ':'')+dateLabel(x.due):'Unknown'}
function billCard(item){
 const status=item.status==='cleared'?'paid':item.status==='pending'?'pending':
  !item.due?'needs-date':item.due<today()?'overdue':item.due<=C.add(today(),30)?'due-soon':'upcoming';
 const labels={paid:'Cleared',pending:'Pending','needs-date':'Needs date',overdue:'Overdue',
  'due-soon':item.due===today()?'Due today':'Due soon',upcoming:'Upcoming'};
 const article=e('article',undefined,'cf-bill-row');
 article.dataset.billStatus=status;
 const owner=accountOwner(m.accounts.find(a=>a.id===item.account));
 const cells=e('div',undefined,'cf-bill-cells');
 const date=e('span',item.due?dateLabel(item.due):'Needs date','cf-bill-date');
 const title=e('button',item.name,'cf-bill-name');title.type='button';title.setAttribute('aria-expanded','false');
 const account=e('span',item.account?name(item.account):'Choose account','cf-account-label');
 if(owner)account.dataset.cfOwner=owner;
 const savedAccount=m.accounts.find(a=>a.id===item.account);
 if(savedAccount?.accent)account.style?.setProperty('--cf-account-accent',accountAccent(savedAccount));
 const amount=e('strong',dollars(item.amount),'cf-bill-amount');
 const indicator=e('div',undefined,'cf-bill-indicator');
 indicator.append(badge(labels[status]));
 const clearance=e('div',undefined,'cf-clearance');
 if(item.status!=='cleared')clearance.append(b(item.status==='pending'?'Mark cleared':'Record payment',()=>payment(item,item.status==='pending')));
 cells.append(date,title,account,amount,indicator,clearance);
 const details=e('details',undefined,'cf-bill-details');
 const summary=e('summary','Details');summary.hidden=true;
 details.append(summary,e('p','Preferred payment '+dateLabel(item.preferred||item.date)),
  ...(item.paymentDate?[e('p','Payment sent '+dateLabel(item.paymentDate))]:[]),
  ...(item.posted?[e('p','Posted '+dateLabel(item.posted))]:[]),
  ...(item.estimatedAmount?[e('p','Estimated amount')]:[]),
  ...(item.notes?[e('p',item.notes)]:[]));
 title.onclick=()=>{details.open=!details.open};
 details.ontoggle=()=>title.setAttribute('aria-expanded',String(details.open));
 const editHost=e('div');
 const edit=()=>{details.open=true;occurrenceForm(item,editHost)};
 const detailActions=row(b('Edit',edit),b('Delete',()=>deleteEvent(item),'link'));
 if(item.status==='planned')detailActions.append(b('Record pending payment',()=>payment(item,false)),b('Skip this one',()=>safeAction('Skip bill occurrence',()=>{m.overrides[item.id]={...item,skipped:true}}),'link'));
 if(item.status==='cleared'){
  const undo=input('undoClearance','checkbox','',false);undo.checked=true;
  const label=e('label',undefined,'cf-undo-clearance');label.append(undo,e('span','Cleared at bank (uncheck to reverse)'));
  undo.onchange=()=>{if(undo.checked)return;if(!confirm('Reverse clearance for '+item.name+'?')){undo.checked=true;return;}
   safeAction('Reverse bill clearance',()=>{
    const prior=item.clearancePrevious;
    const status=prior?.status==='planned'?'planned':'pending';
    const next={...item,status,paid:status==='pending',cleared:false,posted:status==='pending'?(prior?.posted||item.paymentDate||item.posted):'',date:status==='pending'?(prior?.date||item.paymentDate||item.date):(item.preferred||item.due||item.date)};
    if(status==='planned'){delete next.paymentDate;delete next.afterBalances;const linked=(m.ledger||[]).find(x=>x.id===item.linkedTransactionId&&x.linkedBillId===item.id);if(linked){linked.deleted=false;delete linked.linkedBillId;}delete next.linkedTransactionId;}
    else next.paymentDate=prior?.paymentDate||item.paymentDate||item.posted;
    delete next.clearancePrevious;
    m.overrides[item.id]=next;
   });
  };details.append(label);
 }
 details.append(detailActions,editHost);
 article.append(cells,details);
 return article;
}
function payment(bill,clearing){
 const date=input('paymentDate','date',clearing?today():bill.paymentDate||today());
 const status=select('paymentStatus',[['cleared','Paid · cleared'],['pending','Pending bank clearance']],clearing?'cleared':'pending');
 const choices=(m.ledger||[]).filter(x=>!x.deleted&&!x.afterDepositId&&!x.reconciliationId&&x.direction==='out'&&x.account===bill.account&&x.amount===bill.amount&&x.date<=today());
 const existing=select('ledgerId',[['','Record this payment'],...choices.map(x=>[x.id,dateLabel(x.date)+' · '+x.name+' · '+dollars(x.amount)])],'');
 const f=form(clearing?'Mark bill Cleared':'Mark bill Paid',[
  e('p',bill.name+' · '+dollars(bill.amount)+' · '+name(bill.account),'cf-payment-preview'),
  field(clearing?'Bank clearance date':'Payment date',date),
  ...(!clearing?[field('Payment status',status)]:[]),field('Use matching transaction',existing)
 ],fields=>{
  const actual=fields.paymentDate.value;
  const paidOn=clearing&&bill.status==='pending'?historyDate(bill):actual;
  if(!actual||actual>today()||actual<paidOn)throw Error('Enter a valid date from payment through today.');
  T.billPayment(m,C,bill,{date:actual,paymentDate:paidOn,status:clearing?'cleared':fields.paymentStatus.value,ledgerId:fields.ledgerId?.value});
  if(clearing)m.overrides[bill.id].clearancePrevious={status:bill.status,date:bill.date,posted:bill.posted,paymentDate:bill.paymentDate};
 });
 existing.onchange=()=>{
  const matching=choices.find(x=>x.id===existing.value);
  if(matching){date.value=matching.date;status.value='cleared'}
 };
 f.querySelector('button[type=submit]').textContent=clearing?'Save clearance':'Save payment';
}
function removeReconciliation(id){
 const comparison=m.reconciliations?.find(r=>r.id===id);
 if(comparison)comparison.deleted=true;
 for(const entry of m.ledger||[])if(entry.reconciliationId===id)entry.deleted=true;
}
function removeEvent(item){
 if(item.reconciliationId){removeReconciliation(item.reconciliationId);return}
 if(item.kind==='transfer'||item.kind==='money-in'||item.kind==='money-out'){
  const records=item.kind==='transfer'?m.transfers:m.ledger;
  const entry=records?.find(r=>r.id===item.id);
  if(entry)entry.deleted=true;
 }else{
  m.overrides[item.id]={...item,deleted:true};
 }
}
function deleteEvent(item){
 safeAction('Delete '+item.name,()=>removeEvent(item));
}
function addBill(){
 const panel=e('section',undefined,'cf-dialog cf-inline-form');
 panel.append(e('h2','Add bill'),row(
  b('One-time',oneTimeBill,'primary'),
  b('Repeating',()=>billForm()),
  b('Cancel',()=>panel.remove())
 ));
 placeFinanceEditor(panel);
 panel.querySelector('button')?.focus({preventScroll:true});
}
function oneTimeBill(){
 const id=uid();
 form('Add one-time bill',[
  field('Bill name',input('name','text','')),field('Paying account',acct(scopedChecking(),true)),
  field('Amount ($)',number('amount','',.01)),field('Due date',input('due','date','',false)),
  field('Preferred payment date',input('preferred','date','',false)),
  field('Amount is an estimate',check('estimatedAmount',false)),field('Notes',note('notes'))
 ],f=>{
  if(f.account.value)ensureChecking(f.account.value);
  const due=f.due.value||null, preferred=f.preferred.value||due||'';
  m.overrides[id]={id,kind:'bill',standalone:true,name:reqName(f),account:f.account.value,
   amount:cents(f.amount.value),date:preferred,preferred,scheduled:due||preferred,due,
   certainty:due?'verified':'unknown',estimatedAmount:f.estimatedAmount.checked,notes:value(f,'notes'),
   status:'planned',paid:false,cleared:false};
 });
}
const monthName=(value,withYear=false)=>new Intl.DateTimeFormat('en-US',{month:'long',...(withYear?{year:'numeric'}:{}),timeZone:'UTC'}).format(new Date(value+'-01T00:00:00Z'));
function changeMonth(value){
 if(/^\d{4}-(0[1-9]|1[0-2])$/.test(value)&&value>='1900-01'&&value<='2199-12'){
  billMonth=value;calendarDay='';redrawFinanceInPlace();
 }
}
function monthPicker(){
 const picker=e('details',undefined,'cf-month-picker');
 picker.append(e('summary',monthName(billMonth,true)));
 const panel=e('div',undefined,'cf-month-picker-panel');
 let year=Number(billMonth.slice(0,4));
 const label=e('strong',String(year));
 const months=e('div',undefined,'cf-month-picker-grid');
 function paint(){label.textContent=String(year);months.replaceChildren();for(let i=1;i<=12;i++){const key=year+'-'+String(i).padStart(2,'0');const n=b(monthName(key).slice(0,3),()=>changeMonth(key),'cf-clean-link');n.setAttribute('aria-pressed',String(key===billMonth));months.append(n);}}
 panel.append(row(b('‹',()=>{year=Math.max(1900,year-1);paint()},'cf-clean-link'),label,b('›',()=>{year=Math.min(2199,year+1);paint()},'cf-clean-link')),months);picker.append(panel);paint();return picker;
}
function billsForMonth(){
 return C.events(m,T.monthEnd(billMonth),{byDue:true}).filter(item=>item.kind==='bill'&&matchesOwner(item.account));
}
function overviewMonth(root){
 const panel=card('Monthly bills');panel.classList.add('cf-clean-monthly');
 const totals=T.billTotals(T.billMonthRows(billsForMonth(),billMonth));
 const grid=e('div',undefined,'cf-month-totals');
 for(const [label,amount] of [['Total scheduled',totals.total],['Paid',totals.cleared],['Payment pending',totals.pending],['Still to pay',totals.planned]]){
  const metric=e('div');
  metric.append(e('span',label),e('strong',dollars(amount)));
  grid.append(metric);
 }
 panel.append(row(monthPicker(),b('This month',()=>changeMonth(today().slice(0,7))),b('View '+monthName(billMonth)+' bills',()=>{tab='Bills';billView='All bills';billSearch='';filters.frequency='';render()})),grid);
 root.append(panel);
}
function financeSelection(noun='transaction'){
 const items=new Map(), entries=new Map();
 const bar=row();
 bar.classList.add('cf-delete-bar');
 function fill(selected){
  items.clear();
  for(const [key,entry] of entries){
   if(selected)items.set(key,entry);
   for(const box of entry.boxes)box.checked=selected;
  }
  refresh();
 }
 const all=b('Select all',()=>fill(true));
 const clear=b('Clear selection',()=>fill(false));
 function erase(){
  const count=items.size;
  if(!count)return;
  safeAction('Delete '+count+' '+(count===1?noun:noun==='bill entry'?'bill entries':'transactions'),()=>{
   for(const {item,schedule} of items.values()){
    if(schedule){item.deleted=true;item.archived=true}
    else removeEvent(item);
   }
  });
 }
 const remove=b('Delete selected',erase);
 const footerDelete=b('Delete selected',erase);
 const top=row(all,remove,clear);
 bar.append(footerDelete,b('Clear selection',()=>fill(false)));
 function refresh(){
  bar.hidden=items.size===0;
  remove.disabled=clear.disabled=!items.size;
  all.disabled=items.size===entries.size;
  remove.textContent=footerDelete.textContent='Delete selected ('+items.size+')';
 }
 refresh();
 function attach(article,item,schedule=false){
  const key=(schedule?'rule':item.kind)+'|'+item.id;
  const label=e('label',undefined,'cf-delete-check');
  const box=input(noun==='bill entry'?'selectBill':'selectTransaction','checkbox','',false);
  const description='Select '+item.name+(schedule?' (undated schedule)':' · '+dateLabel(item.due||item.date))+' for deletion';
  box.setAttribute('aria-label',description);
  label.title=description;
  if(!entries.has(key))entries.set(key,{item,schedule,boxes:[]});
  const entry=entries.get(key);
  entry.boxes.push(box);
  all.disabled=false;
  box.onchange=()=>{
   if(box.checked)items.set(key,entry);else items.delete(key);
   for(const copy of entry.boxes)copy.checked=box.checked;
   refresh();
  };
  label.append(box);
  article.classList.add('cf-selectable-bill');
  article.append(label);
  return article;
 }
 return {bar,top,attach};
}
// Reconstruct the saved records first, then let the normal cleared-balance
// calculation apply the transaction dates and opening-balance rules.
function balanceModelOn(model,cutoff){
 const {audit=[],...records}=model;
 const changes=[];
 const add=(at,ops,applied)=>{
  if(at&&localDate(new Date(at))>cutoff)changes.push({at,ops,applied});
 };
 for(const entry of audit){
  const transitions=entry.balanceTransitions||[];
  const originallyApplied=transitions.length?transitions[0].wasApplied:!entry.undone;
  if(originallyApplied)add(entry.at,entry.changes,true);
  for(const transition of transitions)add(transition.at,entry.changes,!transition.wasApplied);
 }
 if(!changes.length)return model;
 const result=T.copy(records);
 changes.sort((a,b)=>a.at.localeCompare(b.at));
 for(const {ops,applied} of changes.reverse()){
  for(const op of ops||[]){
   const present=applied?op.hadBefore:op.hadAfter;
   const value=applied?op.before:op.after;
   if(op.key==='overrides'){
    if(present)result.overrides[op.id]=T.copy(value);
    else delete result.overrides[op.id];
   }else if(Array.isArray(result[op.key])){
    const list=result[op.key],index=list.findIndex(item=>item.id===op.id);
    if(index>=0)list.splice(index,1);
    if(present)list.push(T.copy(value));
   }
  }
 }
 return result;
}
function noteBalanceTransition(entry,wasApplied){
 (entry.balanceTransitions??=[]).push({at:new Date().toISOString(),wasApplied});
}
function billsBalanceDate(month,day,now){
 const end=day||T.monthEnd(month);
 return end<now?end:now;
}
function bills(root){
 const selection=financeSelection('bill entry');
 const selectableBill=item=>billCard(item);
 const p=card('Bills & expenses');p.classList.add('cf-clean-bills');
 const now=today(),cutoff=billsBalanceDate(billMonth,calendarDay,now);
 const historical=cutoff<now;
 const source=historical?balanceModelOn(m,cutoff):m;
 const end=T.monthEnd(billMonth);
 const report=C.forecast(source,cutoff,Math.max(0,C.day(end)-C.day(cutoff)));
 const balances=report.accounts.filter(account=>matchesOwner(account.id));
 const checking=balances.length&&balances.every(a=>Number.isInteger(a.current))
  ? balances.reduce((sum,a)=>sum+a.current,0):null;
 const previous=C.add(billMonth+'-01',-1).slice(0,7), next=C.add(T.monthEnd(billMonth),1).slice(0,7);
 const monthNav=row(b('‹ '+monthName(previous),()=>changeMonth(previous)),e('h3',monthName(billMonth,true),'cf-month-title'),b(monthName(next)+' ›',()=>changeMonth(next)));
 monthNav.classList.add('cf-month-nav');
 p.append(monthNav,row(monthPicker(),b('This month',()=>changeMonth(today().slice(0,7))),b('Add bill',addBill,'primary'),b('Recurring schedules',event=>{
  const schedules=document.getElementById('cfRecurringSchedules');
  if(!schedules)return;
  const toolbar=event.currentTarget.closest('.cf-actions');
  if(toolbar&&toolbar.nextElementSibling!==schedules)toolbar.after(schedules);
  schedules.open=!schedules.open;
  event.currentTarget.setAttribute('aria-expanded',String(schedules.open));
 })));
 const all=billsForMonth();
 const monthly=T.billMonthRows(all,billMonth), totals=T.billTotals(monthly);
 const ownerLabel=ownerOptions().find(([id])=>id===selectedOwner())?.[1]||'All accounts';
 const totalGrid=e('div',undefined,'cf-month-totals');
 totalGrid.style.gridTemplateColumns='repeat(auto-fit,minmax(min(100%,135px),1fr))';
 const left=checking===null?null:balances.reduce((sum,account)=>sum+account.projected,0);
 for(const [label,amount] of [['Total due this month',totals.total],['Paid',totals.cleared],['Payment pending',totals.pending],
  ['Still to pay',totals.planned],['Available checking',checking],['Estimated month-end',left]]){
  const tile=e('div');
  if(label==='Available checking'){
   const details=e('details'),summary=e('summary');
   summary.append(e('span',label),e('strong',dollars(amount)));
   summary.style.display='grid';
   details.append(summary,e('p','Cleared through '+dateLabel(cutoff)));
   for(const account of balances){
    const balance=savingsDisclosure(account.name+' · '+dollars(account.current),'checking|'+account.id);
    if(account.current!=null)balance.append(clearedBreakdown(account));
    if(!historical)balance.append(b('Transfer to savings',()=>transferToSavings(account.id)));
    details.append(balance);
   }
   tile.append(details);
  }else{
   tile.append(e('span',label),e('strong',dollars(amount)));
   if(label==='Estimated month-end')tile.title='Projected through '+dateLabel(end)+'. Carries the cleared balance forward, adds deposits on their expected dates, and subtracts open bills and planned activity once.';
  }
  totalGrid.append(tile);
 }
 p.append(e('p',monthName(billMonth,true)+' · '+ownerLabel,'cf-totals-scope'),totalGrid);
 const explanation=e('details');explanation.append(e('summary','How this estimate works'),e('p','The recorded balance includes cleared activity through today. The month-end estimate carries that balance forward and includes expected deposits, open bills, purchases and transfers by their dates. Overdue expected deposits require confirmation before they contribute to the estimate. Future deposits add money only on their expected dates. Open activity with a past date is reserved now; paid activity counts once.'));p.append(explanation);
 const views=row(...['All bills','Unpaid','Pending','Paid'].map(label=>{
  const button=b(label,()=>{billView=label;render()});
  button.setAttribute('aria-pressed',String(billView===label));return button;
 }));
 views.classList.add('cf-bill-views');p.append(views);
 const advanced=e('details');
 advanced.open=!!(billSearch||filters.frequency);
 const frequency=select('frequency',[['','All frequencies'],...Object.entries(frequencies)],filters.frequency);
 frequency.onchange=()=>{filters.frequency=frequency.value;render()};
 advanced.append(e('summary','Advanced filters'),row(searchField('Search bills',billSearch,value=>{billSearch=value}),field('Frequency',frequency)));
 p.append(advanced);
 const statusFor={Unpaid:'planned',Pending:'pending',Paid:'cleared'};
 const earlier=billMonth===today().slice(0,7)?all.filter(x=>x.status==='planned'&&x.due&&x.due<billMonth+'-01'):[];
 const matchesFilters=x=>(!statusFor[billView]||x.status===statusFor[billView])&&
  [x.name,x.notes,name(x.account)].join(' ').toLowerCase().includes(billSearch)&&
  (!filters.frequency||(m.bills.find(r=>r.id===x.ruleId)?.frequency||x.frequency||'once')===filters.frequency);
 const rows=[...earlier,...monthly].filter(matchesFilters);
 if(rows.length){
  const sections=new Map(['Late bills','Due soon','Upcoming','Payment pending','Paid'].map(label=>[label,[]]));
  const now=today(),soon=C.add(now,30);
  for(const item of rows.sort(T.compareBillDue)){
   const label=item.status==='cleared'?'Paid':item.status==='pending'?'Payment pending':
    item.due<now?'Late bills':item.due<=soon?'Due soon':'Upcoming';
   sections.get(label).push(selectableBill(item));
  }
  for(const [label,items] of sections)if(items.length)p.append(compactList(label,items,label!=='Paid'||billView==='Paid'));
 }
 else p.append(e('p','No '+(billView==='All bills'?'bills':billView.toLowerCase()+' bills')+' for '+ownerLabel+' in '+monthName(billMonth)+'.','cf-bill-empty'),
  b('Clear filters',()=>{billView='All bills';billSearch='';filters.frequency='';render()}));
 root.append(p);
 const undated=all.filter(x=>matchesFilters(x)&&!x.due&&((x.scheduled||x.preferred||x.date).slice(0,7)||today().slice(0,7))===billMonth);
 const unscheduledRules=billMonth===today().slice(0,7)?m.bills.filter(rule=>!rule.deleted&&!rule.archived&&!rule.start&&matchesOwner(rule.account)&&matchesFilters({...rule,status:'planned'})):[];
 if(undated.length||unscheduledRules.length){
  const unknown=card('Bills with no due date');
  const rows=undated.sort(T.compareBillDue).map(selectableBill);
  for(const rule of unscheduledRules){
   rows.push(selection.attach(compactRow(rule.name,rule.amount,['Undated schedule',rule.account?name(rule.account):'Choose account'],
    [b('Edit schedule',()=>billForm(rule))],rule.account),rule,true));
  }
  unknown.append(compactList('Needs confirmation',rows));
  root.append(unknown);
 }
 const schedule=card('Bill schedule');
 billCalendar(schedule,monthly.filter(matchesFilters),selectableBill);
 const actions=e('div',undefined,'cf-actions');
 actions.append(b('Set up recurring bill',()=>billForm(),'primary'));const ordered=m.bills.filter(r=>!r.deleted&&!r.archived&&matchesOwner(r.account)).sort((a,b)=>(C.billDate(a,today())||'9999').localeCompare(C.billDate(b,today())||'9999')||a.name.localeCompare(b.name));const schedules=compactList('Manage recurring schedules',ordered.map(r=>compactRow(r.name,r.amount,[(r.account?name(r.account):'Choose account')+' · '+frequencies[r.frequency],'Next due '+(C.billDate(r,today())?dateLabel(C.billDate(r,today())):'Needs date'),r.autopay?'Autopay':'Manual pay',r.archived?'Archived':'',r.stop?'Replaced from '+dateLabel(r.stop):'',r.notes],[...(r.stop?[]:[b('Edit rule',()=>billForm(r))]),b(r.archived?'Restore':'Archive',()=>toggleArchive(r)),b('Delete',()=>removeRule(r),'link')],r.account)),false);schedules.id='cfRecurringSchedules';schedule.append(schedules,actions);root.append(schedule,selection.bar)}
function billCalendar(root,rows,selectableBill){const details=e('details',undefined,'cf-group');details.open=!!calendarDay;details.append(e('summary','Due dates · '+billMonth));const grid=e('div',undefined,'cf-bill-calendar');for(const label of ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'])grid.append(e('span',label,'cf-day-label'));const first=new Date(billMonth+'-01T00:00:00Z').getUTCDay();for(let i=0;i<first;i++)grid.append(e('span'));for(let day=1;day<=Number(T.monthEnd(billMonth).slice(-2));day++){const date=billMonth+'-'+String(day).padStart(2,'0'),items=rows.filter(x=>x.due===date);const n=b(String(day),()=>{calendarDay=date;render()},'cf-calendar-date');n.setAttribute('aria-label',dateLabel(date)+' · '+items.length+' bills');n.setAttribute('aria-pressed',String(calendarDay===date));if(items.length)n.append(e('small',items.length+' bills'));if(date===today())n.dataset.today='true';grid.append(n)}details.append(grid);if(calendarDay){const dayItems=rows.filter(x=>x.due===calendarDay);details.append(compactList(dateLabel(calendarDay),dayItems.map(selectableBill)))}root.append(details)}

function forecastPeriod(start,end,opening,entries,heading,sources,account,prior=[]){
 const panel=e('article',undefined,'cf-payday-focus cf-payday-estimate');
 const signed=amount=>amount>0?'+'+dollars(amount):dollars(amount);
 const line=(label,amount,change=true)=>{
  const item=e('div',undefined,'cf-payday-line');
  item.append(e('span',label),e('strong',change?signed(amount):dollars(amount)));
  return item;
 };
 const deposits=entries.filter(item=>item.kind==='income');
 const bills=entries.filter(item=>item.kind==='bill');
 const other=entries.filter(item=>item.kind!=='income'&&item.kind!=='bill');
 const total=items=>items.reduce((sum,item)=>sum+item.delta,0);
 const afterBills=opening===null?null:opening+total(deposits)+total(bills);
 const closing=afterBills===null?null:afterBills+total(other);
 const range=start===end?dateLabel(end):dateLabel(start)+'–'+dateLabel(end);
 function breakdown(label,amount,content,change=false){
  const details=e('details',undefined,'cf-payday-other');
  const summary=e('summary');
  summary.append(document.createTextNode(label+' '));
  if(amount!==undefined)summary.append(e('strong',change?signed(amount):dollars(amount)));
  details.append(summary,...content);
  return details;
 }
 function activityRows(items){
  return items.map(item=>{
   const movement=item.kind==='transfer'?' · '+name(item.from)+' → '+name(item.to):'';
   const note=item.unavailable?' · counts when cleared':item.status==='pending'?' · pending':'';
   return line(dateLabel(item.date)+' · '+item.name+movement+note,item.delta);
  });
 }
 const openingLabel=heading.startsWith('From your ')?'Projected balance carried in':'Cleared balance at start';
 function openingRows(){
  if(opening===null)return [e('p','Set a starting balance for '+name(account.id)+' to calculate this amount.')];
  return [line('Starting balance for '+name(account.id)+' on '+dateLabel(account.asOf),account.opening,false),
   ...activityRows(account.clearedEntries),line('Cleared balance today',account.current,false),
   ...activityRows(prior),line(openingLabel,opening,false)];
 }
 const components=()=>[line(openingLabel,opening,false),line('Add expected deposits',total(deposits)),
  line('Subtract planned and pending bills',total(bills)),line('Left after bills',afterBills,false)];
 const headline=breakdown('Estimated balance after all activity',closing,[...components(),line('Other activity',total(other)),line('Estimated balance',closing,false)]);
 headline.querySelector('strong').className=closing<0?'cf-payday-amount cf-shortfall':'cf-payday-amount';
 panel.append(e('h4',heading),e('p',range),headline);
 const math=e('div',undefined,'cf-payday-math');
 function category(label,items,empty){
  return breakdown(label,total(items),items.length?[...activityRows(items),line('Total',total(items))]:[e('p',empty)],true);
 }
 math.append(breakdown(openingLabel,opening,openingRows()),
  category('Expected deposits',deposits,'No deposits are expected in this period.'),
  category('Planned and pending bills',bills,'No planned or pending bills in this period.'),
  category('Other forecast activity',other,'No other activity in this period.'),
  breakdown('Projected balance with all activity',closing,[...components(),line('Other forecast activity',total(other)),
   line('Projected balance',closing,false)]));

 const firstShort=opening<0?null:entries.find(item=>item.balance<0);
 if(firstShort){
  panel.append(breakdown(dollars(-firstShort.balance)+' short on '+dateLabel(firstShort.date)+' after '+firstShort.name,undefined,[line(openingLabel,opening,false),...activityRows(entries.slice(0,entries.indexOf(firstShort)+1)),line('Balance after this item',firstShort.balance,false)]));
 }else if(opening<0){
  panel.append(breakdown('Starts '+dollars(-opening)+' short',undefined,openingRows()));
 }

 // The core puts unknown-timing bills after deposits for its running balance.
 // Check whether those bills would cause a shortfall if they posted first.
 let beforeDay=opening;
 for(let i=0;i<entries.length&&beforeDay!==null;){
  const date=entries[i].date;
  const day=[];
  while(i<entries.length&&entries[i].date===date)day.push(entries[i++]);
  const unknownBills=day.filter(item=>item.kind==='bill'&&item.paydayTiming!=='before'&&item.paydayTiming!=='after');
  const knownFirst=day.filter(item=>item.kind==='bill'&&item.paydayTiming==='before');
  const beforeUnknown=beforeDay+total(knownFirst);
  const possible=beforeUnknown+total(unknownBills);
  if(day.some(item=>item.kind==='income')&&beforeUnknown>=0&&possible<0){
   panel.append(breakdown('May be '+dollars(-possible)+' short on '+dateLabel(date)+' if bills post before the deposit.',undefined,[
    line('Available before these bills',beforeDay,false),...activityRows(knownFirst),...activityRows(unknownBills),
    line('Balance if these bills clear first',possible,false),e('p','This estimate assumes the following deposits arrive afterward.'),
    ...activityRows(day.filter(item=>item.kind==='income'))]));
  }
  beforeDay=day.at(-1).balance;
 }

 const details=e('details',undefined,'cf-payday-other');details.open=true;
 details.append(e('summary','Scheduled activity · '+entries.length));
 if(!entries.length)details.append(e('p','No forecast activity in this period.'));
 for(const item of entries){
  const pending=item.status==='pending'?' · pending':'';
  const type=item.kind==='bill'?'Bill':item.kind==='income'?'Deposit':item.kind==='transfer'?'Transfer':'Purchase';
  const movement=item.kind==='transfer'?name(item.from)+' → '+name(item.to):'';
  const label=item.unavailable?'Excluded until the transfer clears':'Balance after '+dollars(item.balance);
  const entry=e('div',undefined,'cf-payday-math');
  const dateNote=item.originalDate<start?' · scheduled '+dateLabel(item.originalDate):'';
  entry.append(line(item.name,item.delta),e('small',dateLabel(item.date)+dateNote+' · '+type+pending+(movement?' · '+movement:'')),e('small',label));
  const source=sources.get(item.id);
  if(source)entry.append(row(b('Edit '+item.name,()=>editEvent(source)),b('Delete',()=>deleteEvent(source),'link')));
  details.append(entry);
 }
 panel.append(details);
 return panel;
}

function timeline(root,report){
 const p=card('Upcoming');p.append(row(b('Manage bills & recurring expenses',()=>{tab='Bills';render()}),b('Manage income & recurring deposits',()=>{tab='Income';render()}),b('Plan a purchase',()=>plannedPurchaseForm())));
 const options=row(...[[0,'By payday'],[30,'Next 30 days'],[60,'Next 60 days'],[90,'Next 90 days']].map(([days,label])=>{
  const button=b(label,()=>{horizon=days;render()});
  button.setAttribute('aria-pressed',String(horizon===days));return button;
 }));
 options.classList.add('cf-bill-views');p.append(options);
 const start=today();
 const accounts=report.accounts.filter(account=>matchesOwner(account.id));
 const sources=new Map(C.events(m,report.end).map(item=>[item.id,item]));
 if(!accounts.length)p.append(e('p','No checking accounts in this view.'),b('Add checking account',()=>accountForm(null),'primary'));
 for(const account of accounts){
  const section=e('section',undefined,'cf-payday-focus');
  section.append(e('h3',name(account.id)));
  const entries=account.future;
  const deposits=entries.filter(item=>item.kind==='income'&&(item.expectedDate||item.originalDate||item.date)>=start);
  const first=deposits[0];
  const following=deposits.find(item=>first&&item.date>first.date);
  if(horizon||!first){
   const end=C.add(start,horizon||30);
   if(!horizon)section.append(e('p','No upcoming deposit entered. Showing the next 30 days.'));
   section.append(forecastPeriod(start,end,account.current,entries.filter(item=>item.date<=end),'Selected range',sources,account));
  }else{
   const depositIndex=entries.indexOf(first);
   const before=entries.slice(0,depositIndex);
   if(first.date>start||before.length){
    const end=before.at(-1)?.date===first.date?first.date:C.add(first.date,-1);
    section.append(forecastPeriod(start,end,account.current,before,'Before your next deposit',sources,account));
   }
   const end=following?C.add(following.date,-1):C.add(first.date,30);
   const nextIndex=following?entries.indexOf(following):entries.length;
   const period=entries.slice(depositIndex,nextIndex).filter(item=>item.date<=end||
    (following&&item.date===following.date));
   const last=period.at(-1);
   const periodEnd=last&&last.date>end?last.date:end;
   const boundedEnd=periodEnd>report.end?report.end:periodEnd;
   section.append(forecastPeriod(first.date,boundedEnd,before.length?before.at(-1).balance:account.current,period,'From your '+dateLabel(first.date)+' payday',sources,account,before));
   if(!following)section.append(e('p','No later deposit found in the forecast. The payday estimate covers up to 30 days.'));
   if(last&&last.date>end)section.append(e('p','Includes bills marked to post before your '+dateLabel(following.date)+' deposit.'));
  }
  if(first){
   const paydayAccount={...account,nextDeposit:first,future:entries.map(item=>item.kind==='bill'?{...item,due:null}:item)};
   const plan=T.paydayPlan(paydayAccount,start,C.add(start,30));
   const details=e('details',undefined,'cf-payday-other');
   details.append(e('summary','Next deposit and same-day timing'),paydayBreakdown(paydayAccount,plan));
   section.append(details);
  }
  p.append(section);
 }
 root.append(p);
}
function archiveMonth(rule){
 const date=rule.archivedOn||rule.start||'';
 const month=date.slice(0,7);
 return /^\d{4}-(0[1-9]|1[0-2])$/.test(month)?month:'';
}
function archive(root){
 const panel=card('Archive');
 const rules=m.bills.filter(rule=>rule.archived&&!rule.deleted&&matchesOwner(rule.account));
 panel.append(e('p','Archived bill schedules · '+rules.length));
 if(!rules.length){panel.append(e('p','No archived bill schedules.'));root.append(panel);return}
 const months=new Map();
 for(const rule of rules){
  const month=archiveMonth(rule);
  if(!months.has(month))months.set(month,[]);
  months.get(month).push(rule);
 }
 for(const [month,items] of [...months].sort(([a],[b])=>b.localeCompare(a))){
  const cards=items.map(rule=>{
   const item=compactRow(rule.name,rule.amount,[name(rule.account),frequencies[rule.frequency],rule.archivedOn?'Archived '+dateLabel(rule.archivedOn):'Archived'],
    [b('Restore',()=>toggleArchive(rule)),b('Delete schedule',()=>{
     if(confirm('Delete the archived schedule for '+rule.name+'? Recorded payments will stay in your history. You can undo this on this page.'))removeRule(rule);
    },'link')],rule.account);
   item.classList.add('cf-archived-row');
   return item;
  });
  panel.append(compactList(month?monthName(month,true):'Undated schedules',cards,false));
 }
 root.append(panel);
}
function showSafetyCopy(){if(backupOwner!==state||!backupText){alert('No safety copy is available yet. Export a dashboard backup first.');return}const d=e('dialog',undefined,'cf-dialog'),area=note('backup',backupText),message=e('p');area.readOnly=true;d.append(e('h2','Pre-update safety copy'),e('p','Save this JSON file to use with the existing dashboard Restore backup control. Restoring replaces the dashboard data; export your current copy first.'),area,row(b('Download',()=>{const url=URL.createObjectURL(new Blob([backupText],{type:'application/json'})),a=e('a');a.href=url;a.download='dashboard-before-pastel-'+today()+'.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}),b('Copy',async()=>{try{await navigator.clipboard.writeText(backupText);message.textContent='Copied.'}catch{area.focus();area.select();message.textContent='Selected. Use your device’s Copy command.'}}),b('Select all',()=>{area.focus();area.select()}),b('Close',()=>d.close())),message);document.body.append(d);d.addEventListener('close',()=>d.remove(),{once:true});d.showModal()}
function savedRecord(op){
 if(op.key==='budgetName')return m.budgetName;
 if(op.key==='overrides')return m.overrides?.[op.id];
 return Array.isArray(m[op.key])?m[op.key].find(record=>record.id===op.id):null;
}
function editSavedRecord(op,record){
 switch(op.key){
 case 'accounts':return accountForm(record);
 case 'groups':return form('Edit account group',[field('Group name',input('name','text',record.name))],fields=>{record.name=reqName(fields)});
 case 'income':return incomeForm(record);
 case 'bills':return billForm(record);
 case 'overrides':return occurrenceForm(record);
 case 'transfers':return transferForm(record);
 case 'ledger':return record.afterDepositId?plannedPurchaseForm(record):moneyForm(record.direction,record);
 case 'goals':return goalForm(record);
 case 'budgetName':return budgetNameForm();
 case 'reconciliations':return form('Edit reconciliation notes',[
  e('p',dateLabel(record.date)+' · Bank balance '+dollars(record.bank)),field('Notes',note('notes',record.notes))
 ],fields=>{
  record.notes=value(fields,'notes');
  for(const entry of m.ledger||[])if(entry.reconciliationId===record.id)entry.notes=record.notes;
 });
 }
}
function recoveryAction(entry){
 if(entry.undone&&!entry.changes.some(op=>op.key==='hiddenHistory')){
  const changes=entry.changes.map(op=>({...op,before:op.after,after:op.before,hadBefore:op.hadAfter,hadAfter:op.hadBefore}));
  return {changes,label:'Undone change · '+entry.label};
 }
 if(!entry.undone&&/^(Delete |Skip bill occurrence)/i.test(entry.label))return {changes:entry.changes,label:entry.label};
 return null;
}
function recoveryControls(){
 const bar=e('div',undefined,'cf-actions cf-undo-bar');
 const entries=[...(m.audit||[])].reverse();
 const recoveries=[];
 for(const entry of entries){
  if(!entry.changes?.length)continue;
  const recovery=recoveryAction(entry);
  if(recovery&&!entry.recovered){
   const title=recovery.label+' · '+entry.changes.map(op=>op.after?.name||op.before?.name).filter(Boolean).join(', ');
   recoveries.push({entry,recovery,title:title.replace(/ · $/,'')+' · '+new Date(entry.at).toLocaleString()});
  }
 }
 function picker(label,items,action,empty){
  const choices=items.map((item,i)=>[String(i),item.title]);
  const control=select(label,choices.length?choices:[['',empty]],choices.length?'0':'');
  control.setAttribute('aria-label',label);
  const button=b(label,()=>action(items[Number(control.value)]));
  control.disabled=button.disabled=!items.length;
  return row(control,button);
 }

 const removed=e('details');
 removed.append(e('summary','Recently removed'),picker('Restore',recoveries,({entry,recovery})=>{
  try{
   safetyBackup();
   T.undo(m,{changes:recovery.changes});
   noteBalanceTransition(entry,!entry.undone);
   if(entry.undone)delete entry.undone;else entry.undone=true;
   entry.recovered=true;
   undoing=true;
   commit('Restored '+entry.label);
  }catch(error){alert(error.message.includes('changed later')?'A later change affects this item. Restore was stopped to protect your newer entries.':error.message)}
  finally{undoing=false}
 },'No removed changes to restore'));
 bar.append(removed);
 return bar;
}
function undoChange(entry){try{safetyBackup();T.undo(m,entry);noteBalanceTransition(entry,true);delete entry.recovered;undoing=true;commit('Undid '+entry.label);}catch(err){alert(err.message)}finally{undoing=false}}
function attention(root,report){
 const p=card('Needs Attention');
 const events=C.events(m,C.add(today(),90)).filter(matchesTransaction).filter(item=>item.status==='pending'||item.kind==='bill'&&needsBill(item));
 const sorted=[...new Map(events.map(item=>[item.id,item])).values()].sort((a,b)=>(a.due||a.date).localeCompare(b.due||b.date));
 const items=sorted.map(item=>compactRow(item.name,item.amount,[
  item.kind==='transfer'?name(item.from)+' → '+name(item.to):name(item.account),
  dateLabel(item.due||item.date),item.status==='pending'?'Awaiting clearance':!item.due?'Confirm due date':item.due<today()?'Overdue':item.estimatedAmount||item.certainty==='estimated'?'Verify estimate':'Due soon'
 ],[],item.account||item.from));
 items.forEach((row,index)=>row.append(b('Review / Edit',()=>editEvent(sorted[index])),b('Delete',()=>deleteEvent(sorted[index]),'link')));
 for(const account of report.accounts.filter(a=>a.firstShort)){
  const shortage=compactRow('Projected shortage',-account.min,[name(account.id),dateLabel(account.firstShort)],[],account.id);
  shortage.append(b('View forecast',()=>{
   selectOwner(accountView(account));
   tab='Forecast';render();
  }));
  items.unshift(shortage);
 }
 p.append(compactList('Review these items',showAllAttention?items:items.slice(0,4)));
 if(items.length>4)p.append(b(showAllAttention?'Show fewer':'View all '+items.length,()=>{showAllAttention=!showAllAttention;render()}));
 root.append(p);
}
function reconcileForm(id){
 const account=activeAccounts().find(a=>a.id===id);
 const date=input('date','date',today());
 date.min=account.asOf||minDate;
 date.max=today();
 const bank=number('bank','',-1e9);
 const preview=e('p',undefined,'cf-wide');
 preview.setAttribute('aria-live','polite');
 function balance(){
  if(account.opening===null||!date.validity.valid||!date.value)return null;
  const report=C.forecast(m,date.value,0);
  return [...report.accounts,...report.savings].find(a=>a.id===id)?.current;
 }
 const f=form('Reconcile '+name(id),[
  field('Statement date',date),field('Bank cleared balance ($)',bank),
  e('p','Enter the posted balance from your bank. Pending payments are tracked separately.','cf-wide'),
  preview,field('Notes',note('notes'))
 ],fields=>{
  const recorded=balance();
  if(!Number.isInteger(recorded))throw Error('Set a starting balance and choose a date from that day through today.');
  const target=cents(bank.value),difference=target-recorded,notes=value(fields,'notes');
  const reconciliationId=uid();
  if(difference){
   m.ledger??=[];
   m.ledger.push({id:uid(),reconciliationId,account:id,date:date.value,direction:difference>0?'in':'out',
    amount:Math.abs(difference),name:'Bank reconciliation',notes,afterBalances:balanceTags([id])});
  }
  m.reconciliations??=[];
  m.reconciliations.push({id:reconciliationId,account:id,date:date.value,bank:target,recorded,difference,applied:!!difference,notes,at:new Date().toISOString()});
 });
 const saveButton=f.querySelector('button[type=submit]');
 function refresh(){
  const recorded=balance();
  saveButton.disabled=!Number.isInteger(recorded)||!bank.validity.valid;
  const difference=cents(bank.value)-recorded;
  saveButton.textContent=!saveButton.disabled&&!difference?'Save match':'Apply adjustment';
  preview.textContent=!Number.isInteger(recorded)?'Set a starting balance and choose a valid statement date.':
   'Dashboard cleared balance on '+dateLabel(date.value)+': '+dollars(recorded)+'. '+
   (saveButton.disabled?'Enter your bank balance to see the difference.':difference?
    (difference>0?'Add ':'Subtract ')+dollars(Math.abs(difference))+' to match '+dollars(cents(bank.value))+'.':'Balances match.');
 }
 date.addEventListener('input',refresh);
 bank.addEventListener('input',refresh);
 refresh();
}

let lastScope;
function paint(){
 const scope=preferenceKey();
 if(lastScope!==undefined&&lastScope!==scope){
  tab=widgetSavings?'Savings':'Overview';horizon=0;billMonth='';billView='All bills';billSearch='';calendarDay='';
  filters.frequency='';historyLimit=24;showAllAttention=false;folded.clear();
  for(const key of Object.keys(historyFilters))historyFilters[key]='';
  backupText='';backupProblem='';backupOwner=null;
 }
 lastScope=scope;
 const content=document.getElementById('content');try{safetyBackup()}catch(err){backupProblem=err.message}m=T.financeSetup(state.cashFlow||C.init());billMonth||=today().slice(0,7);baseline=snapshot();baselineOwner=state;const toolbar=banner();content.replaceChildren(toolbar);

 if(backupProblem)content.append(e('p',backupProblem,'cf-warning'));const report=['Overview','Forecast'].includes(tab)?C.forecast(m,today(),366):null;
 if(tab==='Income')income(content);else if(tab==='Bills')bills(content);else if(tab==='Savings')savings(content);else if(tab==='Activity')history(content);else if(tab==='Forecast')timeline(content,report);else if(tab==='Archive')archive(content);else {overview(content,report);
 }if(tab!=='Archive'){const footer=row(b('Archive',()=>{tab='Archive';render()}));footer.classList.add('cf-archive-footer');content.append(footer)}for(const section of content.querySelectorAll('.cf-card')){const long=[...section.children].filter(n=>n.tagName==='P'&&n.textContent.length>190&&!n.classList.contains('cf-warning'));if(long.length){const help=e('details');help.append(e('summary','How this works'));long.forEach(n=>help.append(n));section.append(help)}}}
window.dashboardFinancePrint = {
 options(){
  return {scope:ownerOptions().find(([id])=>id===selectedOwner())[1],
   section:tab==='Overview'?'Accounts':tab,month:billMonth};
 },
 rows(section,from,to){
  const within=date=>date>=from&&date<=to;
  const cutoff=to<today()?to:today();
  if(section==='Accounts'){
   const model=cutoff<today()?balanceModelOn(m,cutoff):m;
   const report=C.forecast(model,cutoff,0);
   return [...report.accounts,...report.savings].filter(a=>matchesOwner(a.id))
    .map(a=>[cutoff,a.name,'Cleared balance',a.current==null?'No recorded balance':dollars(a.current)]);
  }
  if(section==='Forecast'){
   const start=from<today()?from:today();
   const model=start<today()?balanceModelOn(m,start):m;
   const forecast=C.forecast(model,start,C.day(to)-C.day(start));
   return forecast.accounts.filter(a=>matchesOwner(a.id)).flatMap(a=>{
    const before=a.future.filter(r=>r.date<from);
    const opening=before.length?before.at(-1).balance:a.current;
    const rows=[[from,a.name,'Balance carried in',dollars(opening)]];
    for(const r of a.future.filter(r=>within(r.date)))rows.push([r.date,a.name,r.name||r.kind,dollars(r.delta),dollars(r.balance)]);
    return rows;
   });
  }
  const rows=C.events(m,section==='Activity'&&historyEnd()>to?historyEnd():to,{byDue:section==='Bills'}).filter(matchesTransaction);
  const result=[];
  for(const r of rows){
   if(section==='Bills'&&r.kind!=='bill')continue;
   if(section==='Income'&&!['income','money-in'].includes(r.kind))continue;
   if(section==='Activity'&&r.status==='planned'&&r.kind!=='transfer')continue;
   const day=section==='Bills'?(r.due||r.scheduled||r.date):section==='Activity'?historyDate(r):r.date;
   if(!within(day))continue;
   const account=r.kind==='transfer'?name(r.from)+' → '+name(r.to):name(r.account);
   result.push([day,account,r.name||r.kind,dollars(r.amount),r.status]);
  }
  return result.sort((a,b)=>a[0].localeCompare(b[0]));
 }
};
window.dashboardFinanceView=()=>m?selectedOwner():'';
window.dashboardFinanceActions=()=>{
 const chosen=scopedChecking();
 return [
  ['Record a purchase',()=>moneyForm('out',null,chosen)],
  ['Record a deposit',()=>moneyForm('in',null,chosen)],
  ['Plan a purchase',()=>plannedPurchaseForm()],
  ['Add a bill',()=>addBill()],
  ...(activeAccounts().length>1?[['Transfer money',()=>transferForm(null,chosen?{from:chosen}:null)]]:[]),
 ];
};
const prior=render;render=function(){prior();if(page==='Finances')paint()};render();
})();
