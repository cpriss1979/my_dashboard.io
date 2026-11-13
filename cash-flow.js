(function(){
'use strict';
const C=window.CashFlowCore,T=window.FinanceTools,frequencies={once:'One time',weekly:'Weekly',biweekly:'Every two weeks',monthly:'Monthly',bimonthly:'Every two months',quarterly:'Quarterly',annually:'Annually'},tabs=['Overview','Accounts','Income','Bills','Savings','Activity','Forecast','Archive'];
const widgetSavings=new URLSearchParams(location.search).get('widget')==='money-tracker';
let tab=widgetSavings?'Savings':'Overview',horizon=0,m=null,filters={frequency:''},billMonth='',calendarDay='',baseline=null,baselineOwner=null,backupOwner=null,undoing=false,historyLimit=24;const folded=new Map();let backupText='',backupProblem='',actionNotice='',paymentJustSaved=false;
const today=()=>localDate(new Date()), dollars=n=>n===null||n===undefined?'Not set':money(n/100), name=accountName, uid=()=>crypto.randomUUID();
const minDate='1900-01-01',maxDate='2199-12-31';
function e(tag,text,cls){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n}
function ownerOptions(){
 const accounts=activeAccounts();
 return [['','All accounts'],
  ...m.groups.filter(group=>accounts.some(a=>a.ownerId===group.id)).map(group=>['group:'+group.id,group.name]),
  ...accounts.filter(a=>!a.ownerId).map(a=>['account:'+a.id,a.name])];
}
function accountView(account){return account?.ownerId?'group:'+account.ownerId:account?'account:'+account.id:''}
function scopedChecking(){
 const checking=activeAccounts().filter(a=>a.type==='checking'&&matchesOwner(a.id));
 return checking.length===1?checking[0].id:'';
}
const preferenceKey = () => (typeof dashboardActivePrefix==='string'?dashboardActivePrefix:'')+'finance-planner-owner';
const ownerPreferences = new Map();
function selectedOwner(){
 const key=preferenceKey();
 try{const saved=ownerPreferences.has(key)?ownerPreferences.get(key):localStorage.getItem(key);const id=['crystal','rick'].includes(saved)?'group:'+saved:saved;return ownerOptions().some(([value])=>value===id)?id:''}catch{return ''}
}
function selectOwner(id){
 const key=preferenceKey();
 ownerPreferences.set(key,id);
 try{localStorage.setItem(key,id)}catch{}
}
function matchesOwner(id){
 const owner=selectedOwner();
 return !owner||accountView(m.accounts.find(a=>a.id===id))===owner;
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
function b(label,fn,cls='secondary'){const n=e('button',label,cls);n.type='button';n.onclick=fn;return n}
function card(title){const p=e('section',undefined,'card cf-card');p.append(e('h2',title));return p}
function row(...nodes){const d=e('div',undefined,'cf-actions');d.append(...nodes);return d}
function field(label,node){const l=e('label',label);l.append(node);return l}
function input(key,type,value='',required=true){const n=e('input');n.name=key;n.type=type;n.value=value??'';n.required=required;if(type==='date'){n.min=minDate;n.max=maxDate}if(type==='text')n.maxLength=180;return n}
function number(key,value='',min=0,required=true){const n=input(key,'number',value,required);n.step='0.01';n.min=min;n.max=1e9;return n}
function select(key,choices,value){const n=e('select');n.name=key;for(const [v,label] of choices)n.add(new Option(label,v));n.value=value;return n}
function accountOwner(account){return account?.ownerId||''}
function accountName(id){return m.accounts.find(a=>a.id===id)?.name||'Unassigned account'}
function accountAccent(account){
 return /^#[0-9a-f]{6}$/i.test(account?.accent||'')?account.accent:
  '#a287cf';
}
const activeAccounts = () => m.accounts.filter(a=>!a.deleted);
const acct=(value,blank=false)=>select('account',[...(blank?[['','Choose an account']]:[]),...activeAccounts().filter(a=>a.type!=='savings').map(a=>[a.id,name(a.id)])],value);
function check(key,value){const n=input(key,'checkbox','',false);n.checked=!!value;return n}
function note(key,value=''){const n=e('textarea');n.name=key;n.value=value;n.rows=3;n.maxLength=2000;return n}
function cents(v){return Math.round(Number(v)*100)}
function snapshot(){const x=T.copy(m);delete x.audit;return x}
function safetyBackup(){if(backupOwner===state)return;try{const key=(typeof dashboardActivePrefix==='string'?dashboardActivePrefix:'')+'finance-before-pastel-v1';const saved=localStorage.getItem(key);if(saved)JSON.parse(saved);const text=saved||JSON.stringify(state,null,2);if(!saved)localStorage.setItem(key,text);backupText=text;backupOwner=state;backupProblem=''}catch(err){throw Error('The safety backup could not be stored. Use Export dashboard backup, free device storage, then try again. No change has been saved.')}}
function commit(label='Finance update'){paymentJustSaved=label==='Mark bill Paid'||label==='Mark bill Cleared';actionNotice=label==='Mark bill Paid'?'✓ Payment saved.':label==='Mark bill Cleared'?'✓ Paid and cleared.':label+' saved.';if(baselineOwner!==state)throw Error('Account changed. Reopen Finances.');const delta=T.changes(baseline,snapshot());if(delta.length&&!undoing){m.audit??=[];m.audit.push({id:uid(),at:new Date().toISOString(),label,changes:delta})}state.cashFlow=m;save();render()}
function safeAction(label,fn){safetyBackup();fn();commit(label)}
function group(title,items,open=true){const d=e('details',undefined,'cf-group'),key=tab+'|'+title;d.open=folded.has(key)?folded.get(key):open;d.append(e('summary',title+' · '+items.length));d.addEventListener('toggle',()=>folded.set(key,d.open));const grid=e('div',undefined,'cf-record-grid');items.forEach(n=>grid.append(n));if(!items.length)grid.append(e('p','Nothing here.'));d.append(grid);return d}
function tint(n,key){const account=m.accounts.find(a=>a.id===key);if(account){n.dataset.cfOwner=accountOwner(account);if(account.accent)n.style?.setProperty('--cf-account-accent',accountAccent(account));}let h=0;for(const ch of String(key))h=(h*31+ch.charCodeAt(0))>>>0;n.dataset.pastel=String(h%5);return n}
function tile(title,amount,lines,actions=[],key=title){const n=record(title,'',...actions);n.children[0].append(e('strong',dollars(amount),'cf-amount'));for(const text of lines.filter(Boolean))n.children[0].append(e('p',text));return tint(n,key)}
function statusLabel(x){return x.status==='cleared'?'Paid · Cleared':x.status==='pending'?'Paid · Awaiting clearance':'Unpaid'}
function dateLabel(d){return d?d.slice(5,7)+'/'+d.slice(8,10)+'/'+d.slice(0,4):'Unknown'}
function form(title,fields,submit,host,afterSave){const owner=state,model=m,d=e('section',undefined,'cf-dialog cf-inline-form'),f=e('form'),error=e('p',undefined,'cf-error');error.setAttribute('role','alert');const grid=e('div',undefined,'cf-fields');grid.append(...fields);const s=e('button','Save','primary');s.type='submit';let submitted=false;f.append(grid,error,row(s,b('Cancel',()=>d.close())));d.append(e('h2',title),f);d.addEventListener('close',()=>d.remove(),{once:true});d.close=()=>d.remove();const target=host||document.getElementById('content');target.querySelector('.cf-inline-form')?.remove();target.prepend(d);d.scrollIntoView?.({block:'start',behavior:'smooth'});f.onsubmit=ev=>{ev.preventDefault();if(submitted)return;if(owner!==state||model!==m){error.textContent='The dashboard changed. Close this form and reopen it.';return}try{safetyBackup();submit(f.elements);submitted=true;s.disabled=true;d.close();commit(title);afterSave?.()}catch(err){error.textContent=err.message}};return f}
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
 form(r?'Edit income rule':frequency==='once'?'Add expected deposit':'Add income rule',[
 field('Name',input('name','text',r?.name)),field('Account',acct(r?.account||accountId||scopedChecking(),true)),field('Deposit amount ($)',number('amount',r?r.amount/100:'',.01)),field('First eligible date',input('start','date',r?.start||today())),field('Frequency',select('frequency',Object.entries(frequencies),r?.frequency||frequency)),field('Monthly calendar rule',select('rule',[['fixed','Same day number (clamp to month end)'],['last','Last calendar day'],['rick','Friday before the fourth Wednesday']],r?.rule||'fixed'))
 ],f=>{ensureChecking(f.account.value);if(f.rule.value!=='fixed'&&f.frequency.value!=='monthly')throw Error('The last-day and fourth-Wednesday rules require Monthly.');updateRule(m.income,r,{name:reqName(f),account:f.account.value,amount:cents(f.amount.value),frequency:f.frequency.value,rule:f.rule.value,start:f.start.value})})}
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
function transferForm(r,preset){const t=r||preset||{},id=r?.id||uid(),choices=activeAccounts().map(a=>[a.id,name(a.id)]);const f=form('Transfer money',[
 field('FROM',select('from',choices,t.from||choices[0]?.[0])),field('TO',select('to',choices,t.to||choices.find(x=>x[0]!==(t.from||choices[0]?.[0]))?.[0])),field('Amount ($)',number('amount',t.amount?t.amount/100:'',.01)),field('Date',input('date','date',t.date||today())),field('Status',select('status',[['completed','Completed'],['pending','Pending'],['planned','Planned']],t.status||'completed')),field('Description',input('name','text',t.name||'Money moved')),e('p','Records one movement between accounts. It does not send a bank transfer.','cf-wide')
 ],fields=>{if(!fields.from.value||!fields.to.value||fields.from.value===fields.to.value)throw Error('Choose different FROM and TO accounts.');if(fields.status.value==='completed'&&fields.date.value>today())throw Error('Use today or earlier for a completed move.');const ids=[fields.from.value,fields.to.value];if(fields.status.value==='completed'&&ids.some(id=>m.accounts.find(a=>a.id===id).opening===null))throw Error('Set both starting balances before recording a completed move.');const from=m.accounts.find(a=>a.id===fields.from.value);if(fields.status.value==='completed'&&from.type==='savings'){const available=C.forecast(m,today(),30).savings.find(a=>a.id===from.id).current;const oldDebit=r?.status==='completed'&&r.from===from.id&&(r.date>from.asOf||r.date===from.asOf&&r.afterBalances?.[from.id]===C.balanceKey(from))?r.amount:0;if(available+oldDebit<cents(fields.amount.value))throw Error('Savings does not have enough cleared money for this move.');}const next={id,name:reqName(fields),from:fields.from.value,to:fields.to.value,amount:cents(fields.amount.value),date:fields.date.value,status:fields.status.value,afterBalances:r&&r.status==='completed'&&r.date===fields.date.value&&r.from===fields.from.value&&r.to===fields.to.value?r.afterBalances:balanceTags(ids)};const index=m.transfers.findIndex(x=>x.id===id);if(index<0)m.transfers.push(next);else Object.assign(m.transfers[index],next)});f.querySelector('button[type=submit]').textContent='Save transfer';
 const route=e('p',undefined,'cf-transfer-route');
 route.setAttribute('aria-live','polite');
 const updateRoute=()=>{route.textContent=name(f.elements.from.value)+' → '+name(f.elements.to.value)};
 f.elements.from.addEventListener('change',updateRoute);
 f.elements.to.addEventListener('change',updateRoute);
 f.prepend(route);
 updateRoute()}
function occurrenceForm(o,host){
 const bill=o.kind==='bill';
 const rule=bill?m.bills.find(item=>item.id===o.ruleId&&!item.deleted&&!item.archived&&item.frequency!=='once'):null;
 const fields=[
 field('Name',input('name','text',o.name)),field('Amount ($)',number('amount',o.amount/100,.01)),field('Account',acct(o.account,bill)),...(bill?[field('Due date',input('due','date',o.due,false)),field('Due-date confidence',select('certainty',[['verified','Verified'],['estimated','Estimated'],['unknown','Unknown']],o.certainty||'unknown'))]:[]),
 field(bill?'Preferred payment date':'Deposit date',input('preferred','date',o.preferred||o.date,!bill)),field(bill?'Recorded / cleared date':'Posting date',input('posted','date',o.posted||'',false)),...(bill?[field('Actual payment date',input('paymentDate','date',o.paymentDate||o.posted||'',false))]:[]),...(bill?[field('Amount is an estimate',check('estimatedAmount',o.estimatedAmount)),field('Paid / sent',check('paid',o.paid||o.status==='pending')),field('Cleared at bank',check('cleared',o.cleared||o.status==='cleared'))]:[field('Deposit status',select('status',[['planned','Planned'],['pending','Pending'],['cleared','Cleared']],o.status))]),
 field('Notes',note('notes',o.notes||'')),
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
function moneyActions(account){return row(b('Add Money',()=>moneyForm('in',null,account),'primary'),b('Subtract Money',()=>moneyForm('out',null,account)),b('Move Money',()=>transferForm(null,account?{from:account}:null)))}
function moneyForm(direction,existing,chosen){const id=existing?.id||uid(),account=existing?.account||chosen||scopedChecking()||(activeAccounts().length===1?activeAccounts()[0].id:'');
 const scheduled=existing?[]:C.events(m,C.add(today(),90)).filter(o=>o.kind===(direction==='in'?'income':'bill')&&o.status!=='cleared');
 const pick=select('source',[['','New transaction'],...scheduled.map(o=>[o.id,o.name+' · '+o.date+' · '+dollars(o.amount)])],'');
 const f=form(direction==='in'?'Record a deposit':'Record a purchase',[
 field('Account',select('account',activeAccounts().map(a=>[a.id,name(a.id)]),account)),field('Amount ($)',number('amount',existing?existing.amount/100:'',.01)),
 ...(!existing?[field('Apply to a scheduled '+(direction==='in'?'deposit':'bill')+' (optional)',pick)]:[]),field('Description',input('name','text',existing?.name||(direction==='in'?'Money added':'Money subtracted'))),field('Date',input('date','date',existing?.date||today())),field('Notes',note('notes',existing?.notes||''))
 ],fields=>{
  if(fields.date.value>today())throw Error('Use today or an earlier date for money already recorded. Plan future items under Income or Bills.');
  const a=activeAccounts().find(a=>a.id===fields.account.value);if(!a)throw Error('Choose an active account first.');if(a.opening===null)throw Error('Set this account’s starting balance first.');
  const amount=cents(fields.amount.value),src=fields.source?.value;
  if(src){const item=C.events(m,C.add(today(),90)).find(o=>o.id===src);if(!item||item.status==='cleared')throw Error('That item was already recorded. Reopen the form.');if(item.account!==a.id)throw Error('The account must match the scheduled item.');m.overrides[src]={...item,amount,name:reqName(fields),date:fields.date.value,posted:fields.date.value,...(direction==='out'?{paymentDate:fields.date.value}:{}),preferred:item.preferred||item.date,status:'cleared',paid:direction==='out',cleared:true,notes:value(fields,'notes'),afterBalances:balanceTags([a.id])};return}
  const next={id,direction,account:a.id,amount,name:reqName(fields),date:fields.date.value,notes:value(fields,'notes'),afterBalances:existing&&existing.account===a.id&&existing.date===fields.date.value?existing.afterBalances:balanceTags([a.id])};
  m.ledger??=[];const i=m.ledger.findIndex(x=>x.id===id);if(i<0)m.ledger.push(next);else m.ledger[i]={...m.ledger[i],...next}
 });if(!existing)pick.onchange=()=>{const item=scheduled.find(x=>x.id===pick.value);if(item){f.elements.account.value=item.account;f.elements.amount.value=item.amount/100;f.elements.name.value=item.name;f.elements.notes.value=item.notes||''}};
}
function plannedPurchaseForm(existing){
 const end=C.add(today(),366);
 const deposits=C.events(m,end).filter(item=>item.kind==='income'&&
  activeAccounts().some(account=>account.id===item.account&&account.type==='checking')&&
  (item.id===existing?.afterDepositId||item.status!=='cleared'&&(item.expectedDate||item.date)>=today()));
 const host=document.getElementById('content');
 if(!deposits.length){
  host.querySelector('.cf-inline-form')?.remove();
  const panel=e('section',undefined,'cf-dialog cf-inline-form');
  panel.append(e('h2','Plan a purchase'),e('p','Add an expected deposit to choose when the purchase should happen.'),
   row(b('Add expected deposit',()=>incomeForm(null,'once'),'primary'),b('Cancel',()=>panel.remove())));
  host.prepend(panel);panel.scrollIntoView?.({block:'start'});return;
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
function editEvent(o){if(o.kind==='transfer')transferForm(m.transfers.find(t=>t.id===o.id));else if(['money-in','money-out'].includes(o.kind)){const entry=m.ledger.find(t=>t.id===o.id);if(entry?.afterDepositId)plannedPurchaseForm(entry);else moneyForm(o.direction,entry);}else occurrenceForm(o)}
function historyDate(item){return item.kind==='bill'?(item.paymentDate||item.posted||item.date):item.date}
function history(root,savingsOnly=false){if(!savingsOnly)plannedPurchases(root);const p=card(savingsOnly?'Savings activity':'Activity'),ids=new Set(m.accounts.filter(a=>!savingsOnly||a.type==='savings').map(a=>a.id));
 const historyEnd=[C.add(today(),90),...m.transfers.filter(t=>!t.deleted).map(t=>t.date)].sort().at(-1);if(!savingsOnly){
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
 const visible=item=>savingsOnly||matchesTransaction(item)&&
  (!historyFilters.from||historyDate(item)>=historyFilters.from)&&(!historyFilters.to||historyDate(item)<=historyFilters.to)&&
  (!historyFilters.type||(historyFilters.type==='deposit'?['income','money-in'].includes(item.kind):item.kind===historyFilters.type))&&(!historyFilters.status||item.status===historyFilters.status)&&
  [item.name,item.notes,name(item.account),name(item.from),name(item.to)].join(' ').toLowerCase().includes(historyFilters.search);
 const rows=C.events(m,historyEnd).filter(visible).filter(o=>(o.status!=='planned'||o.kind==='transfer')&&(o.kind==='transfer'?(ids.has(o.from)||ids.has(o.to)):ids.has(o.account))).sort((a,b)=>historyDate(b).localeCompare(historyDate(a))||a.id.localeCompare(b.id));
 p.append(e('p',rows.length+' transactions · newest first'));p.append((savingsOnly?group:compactList)('Transactions & planned moves',rows.slice(0,historyLimit).map(o=>(savingsOnly?tile:compactRow)(o.name,o.amount,[dateLabel(historyDate(o)),o.kind==='transfer'?name(o.from)+' → '+name(o.to):name(o.account),savingsOnly?o.notes:o.kind==='bill'?statusLabel(o):o.status], [badge(o.kind==='bill'?statusLabel(o):o.status),b('Edit',()=>editEvent(o)),...(o.kind==='bill'&&o.status==='pending'?[b('Mark Cleared',()=>payment(o,true))]:[]),b('Delete',()=>deleteEvent(o),'link')],o.account||o.from,[o.notes])),true));if(rows.length>historyLimit)p.append(b('Show more transactions',()=>{historyLimit+=24;render()}));root.append(p);
 if(!savingsOnly){const audit=card('Corrections & undo');audit.append(e('p','Saved changes cover all accounts. Undo restores the dashboard entry. If the same record was edited later, use Edit to make a correction.'));const entries=[...(m.audit||[])].reverse();audit.append(group('Saved changes',entries.map(x=>{const n=record(x.label,new Date(x.at).toLocaleString(),badge(x.undone?'Undone':'Saved'),...(!x.undone?[b('Undo',()=>undoChange(x))]:[]));const details=e('details');details.append(e('summary','Original / new values'));for(const op of x.changes)details.append(e('p',op.key+' · '+(op.after?.name||op.before?.name||op.id)+'\nBefore: '+JSON.stringify(op.before)+'\nAfter: '+JSON.stringify(op.after)));n.append(details);return n}),false));root.append(audit)}
}
function savings(root){const report=C.forecast(m,today(),horizon),p=card('Savings');const selected=report.savings.filter(a=>matchesOwner(a.id));const configured=selected.every(a=>a.configured);p.append(e('strong','Total Savings · '+(configured?dollars(selected.reduce((n,a)=>n+a.current,0)):'Set starting balances'),'cf-savings-balance'),e('p','Separate from everyday spending and bill coverage. Move money into checking when needed.'));const grid=e('div',undefined,'cf-record-grid cf-savings-grid');for(const a of report.savings.filter(a=>matchesOwner(a.id)))grid.append(tile(a.name,a.current,['Projected '+dollars(a.projected),'Pending change '+dollars(a.pending)], [...moneyActions(a.id).children,b('Edit account',()=>accountForm(m.accounts.find(x=>x.id===a.id)))],a.id));
 p.append(grid,b('Create savings account',()=>accountForm(null,'savings')));root.append(p);
 const goals=card('Optional savings goals');goals.append(b('Add goal',()=>goalForm()));const goalCards=(m.goals||[]).filter(g=>!g.archived&&!g.deleted&&matchesOwner(g.account)).map(g=>{const a=report.savings.find(a=>a.id===g.account),n=tile(g.name,a?.current??null,['Target '+dollars(g.target),name(g.account),'Progress uses this account’s balance; goals do not reserve or move money.'],[b('Edit goal',()=>goalForm(g)),b('Delete',()=>safeAction('Delete savings goal',()=>{g.deleted=true}),'link')],g.id),progress=e('progress');progress.max=g.target;progress.value=Math.max(0,Math.min(g.target,a?.current||0));progress.setAttribute('aria-label',g.name+' savings progress');n.append(progress,e('p',Math.round(Math.max(0,Math.min(1,(a?.current||0)/g.target))*100)+'%'));return n});goals.append(group('Goals',goalCards));root.append(goals);history(root,true);
 if(state.savingsEntries?.length){const old=e('details',undefined,'cf-old-savings');old.append(e('summary','Earlier savings records · '+state.savingsEntries.length),e('p','Preserved separately; not replayed into current balances.'));for(const x of [...state.savingsEntries].filter(x=>!m.overrides['legacy-savings|'+x.id]?.skipped).sort((a,b)=>(b.date||'').localeCompare(a.date||'')))old.append(record(dateLabel(x.date)+' · '+x.kind,(state.people?.find(p=>p.id===x.person)?.name||'')+' · '+money(Number(x.amount))+(x.note?' · '+x.note:''),b('Delete',()=>safeAction('Delete earlier savings entry',()=>{m.overrides['legacy-savings|'+x.id]={id:'legacy-savings|'+x.id,skipped:true,legacyId:x.id}}),'link')));root.append(old)}
}
function goalForm(g){const choices=activeAccounts().filter(a=>a.type==='savings').map(a=>[a.id,name(a.id)]);if(!choices.length){alert('Create a savings account first.');return}form(g?'Edit savings goal':'Add savings goal',[field('Goal name',input('name','text',g?.name)),field('Savings account',select('account',choices,g?.account||choices[0][0])),field('Target ($)',number('target',g?g.target/100:'',.01)),field('Archive goal',check('archived',g?.archived))],f=>{const next={id:g?.id||uid(),name:reqName(f),account:f.account.value,target:cents(f.target.value),archived:f.archived.checked};if(next.target<=0)throw Error('Enter a positive target.');m.goals??=[];if(g)Object.assign(g,next);else m.goals.push(next)})}

function budgetNameForm() {
 form('Save budget name',[
  field('Budget name',input('name','text',m.budgetName||'My budget'))
 ],fields=>{m.budgetName=reqName(fields)});
}
function banner(){const p=card(m.budgetName||'My budget');
 if(!activeAccounts().length){
  p.append(e('p','Add a checking account to start your budget. Then add your income, bills, and savings goals.'),
   b('Start my budget',()=>accountForm(null,'checking','My checking'),'primary'));
 }
 p.classList.add('cf-toolbar');
 const choices=ownerOptions();
 function changeView(id){selectOwner(id);historyLimit=24;calendarDay='';render()}
 const owner=row();owner.classList.add('cf-owner-switch');
 owner.setAttribute('role','group');owner.setAttribute('aria-label','Account view');
 if(choices.length>4){
  const control=select('accountView',choices,selectedOwner());
  control.onchange=()=>changeView(control.value);
  owner.append(field('Account view',control));
 }else if(choices.length>2||(choices.length>1&&m.groups.length)){
  for(const [id,label] of choices){
   const control=b(label,()=>changeView(id));
   control.setAttribute('aria-pressed',String(selectedOwner()===id));owner.append(control);
  }
 }
 if(owner.children.length)p.append(owner);
 const householdEvents=C.events(m,C.add(today(),90));
 const actionable=householdEvents.filter(matchesTransaction);const t=row();t.classList.add('cf-tabs');for(const x of tabs){const btn=b(x,()=>{
  if(x==='Bills'&&tab!=='Bills'){billView='All bills';billMonth=today().slice(0,7);billSearch='';filters.frequency='';calendarDay='';}
  if(x==='Forecast'&&tab!=='Forecast')horizon=0;
  tab=x;render();
 }); 
 const count=x==='Bills'?actionable.filter(item=>item.kind==='bill'&&needsBill(item)).length:
  x==='Income'?actionable.filter(item=>item.kind==='income'&&item.status==='pending').length:
  x==='Overview'?householdEvents.filter(item=>item.status==='pending'||item.kind==='bill'&&needsBill(item)).length:0;
 if(count)btn.append(e('span',' · '+count,'cf-tab-count'));btn.setAttribute('aria-pressed',String(tab===x));t.append(btn)}p.append(t);const tools=e('details');tools.append(e('summary','Budget settings & help'),b('Rename budget',budgetNameForm),e('p','Starting balances are snapshots; record only later activity. For scheduled bills or deposits, choose the existing item in Add Money or Subtract Money to avoid a duplicate.'),b('Export dashboard backup',()=>backup()));tools.append(b('View pre-update safety copy',()=>showSafetyCopy()),e('p','A device safety copy is saved before your first change. Every change has a conflict-checked undo in Activity.'));p.append(tools);return p}
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
function overview(root,report){
 if(!activeAccounts().length){
  const setup=card('Set up your finances');
  setup.append(e('p','Add an account to see balances and forecasts. You can start with a bill and assign its paying account later.'),
   row(b('Add your first account',()=>accountForm(null),'primary'),
    b('Add income',()=>incomeForm(null,'once')),b('Add a bill',()=>addBill())));
  root.append(setup);
  if(!m.bills.length&&!Object.keys(m.overrides).length)return;
 }
 const p=card('Before payday'),grid=e('div',undefined,'cf-payday-grid');
 const plans=visiblePlans(report);
 const events=new Map([...C.events(m,report.end,{byDue:true}),...C.events(m,report.end)].map(item=>[item.id,item]));
 for(const {account,plan} of plans){
  const item=e('article',undefined,'cf-payday-focus');
  const billRows=[...plan.before.filter(entry=>entry.kind==='bill'),
   ...plan.bills.filter(entry=>entry.paydayTiming==='before')];
  const billBalance=account.current===null?null:billRows.reduce((balance,entry)=>balance+entry.delta,account.current);
  const otherRows=[...plan.before.filter(entry=>entry.kind!=='bill')];
  const fullBalance=plan.preDeposit;
  const title=e('h3',name(account.id));
  const headline=e('strong',dollars(billBalance),'cf-payday-amount');
  if(billBalance<0)headline.classList.add('cf-shortfall');
  item.append(title,e('p',plan.hasPayday?'Left after bills, before payday':'Left after bills over the next 30 days'),headline);
  const math=e('div',undefined,'cf-payday-math');
  function mathLine(label,amount,entry){
   const line=e('div',undefined,'cf-payday-line');
   const source=entry&&events.get(entry.id);
   line.append(source?b(label,()=>editEvent(source),'cf-payday-edit'):e('span',label),e('strong',dollars(amount)));
   return line;
  }
  math.append(mathLine('Cleared balance in dashboard',account.current));
  for(const entry of billRows)math.append(mathLine(dateLabel(entry.date)+' · '+entry.name,entry.delta,entry));
  if(!billRows.length)math.append(e('p',plan.hasPayday?'No bills scheduled before the deposit.':'No bills scheduled in this period.'));
  item.append(math);
  if(otherRows.length){
   const moves=e('details',undefined,'cf-payday-other');
   moves.append(e('summary','With other planned activity · '+dollars(fullBalance)));
   const movement=e('div',undefined,'cf-payday-math');
   for(const entry of otherRows){
    const label=dateLabel(entry.date)+' · '+(entry.kind==='transfer'?name(entry.from)+' → '+name(entry.to):entry.name);
    movement.append(mathLine(label,entry.delta,entry));
   }
   moves.open=fullBalance<0;
   moves.append(movement);
   item.append(moves);
  }
  if(plan.firstShort||fullBalance<0){
   let balance=account.current;
   const beforeDeposit=[...plan.before,...plan.bills.filter(entry=>entry.paydayTiming==='before')];
   const trigger=balance>=0?beforeDeposit.find(entry=>(balance+=entry.delta)<0):null;
   const source=trigger&&events.get(trigger.id);
   const message=dollars(-balance)+' short on '+dateLabel(trigger?.date||today())+(trigger?' after '+trigger.name:' · cleared balance');
   item.append(source?b(message,()=>editEvent(source),'cf-payday-edit cf-shortfall'):e('p',message,'cf-shortfall'));
  }
  item.append(e('p',account.nextDeposit?'Next deposit · '+dateLabel(account.nextDeposit.date)+' · '+dollars(account.nextDeposit.amount):'No expected deposit entered'));
  const details=e('details',undefined,'cf-forecast-details');
  details.append(e('summary','Payday details'),paydayBreakdown(account,plan));
  item.append(details);
  grid.append(item);
 }
 if(!plans.length&&activeAccounts().length)p.append(e('p','No checking accounts in this view.'));
 p.append(grid);
 const savings=report.savings.filter(a=>matchesOwner(a.id));
 if(savings.length)p.append(e('p','Savings total · '+dollars(savings.every(a=>a.configured)?savings.reduce((sum,a)=>sum+a.current,0):null),'cf-savings-total'));
 p.classList.add('cf-payday-overview');
 root.append(p);
 const recent=card('Recent activity');
 const entries=C.events(m,today()).filter(x=>x.status!=='planned'&&matchesTransaction(x))
  .sort((a,b)=>historyDate(b).localeCompare(historyDate(a))).slice(0,4);
 recent.append(compactList('Latest transactions',entries.map(x=>compactRow(
  x.name,x.amount,[dateLabel(historyDate(x)),x.kind==='transfer'?name(x.from)+' → '+name(x.to):name(x.account),x.kind==='bill'?statusLabel(x):x.status],[b('Edit',()=>editEvent(x))],x.account||x.from
 ))),b('View Activity',()=>{tab='Activity';render()}));
 root.append(recent);
 attention(root,{...report,accounts:plans.map(({account,plan})=>({...account,min:plan.lowest,firstShort:plan.firstShort}))});
 const suggestions=report.recommendations.filter(t=>matchesOwner(t.to));
 if(suggestions.length){
  const moves=card('Suggested money moves');
  moves.append(group('Protect bill coverage',suggestions.map(t=>tile('Move between checking accounts',t.amount,[name(t.from)+' → '+name(t.to),'Needed by '+dateLabel(t.needBy)],[b('Transfer money',()=>transferForm(null,t))],t.to))));
  root.append(moves);
 }
 if(m.bills.some(b=>!b.archived&&!b.deleted&&!b.start&&matchesOwner(b.account)))root.append(e('p','Some bills have unknown planning dates. Add a due or planning date under Bill rules to include them in projections.','cf-warning'));
}

function deleteAccount(id){
 const account = activeAccounts().find(a=>a.id===id);
 if(!account)return;
 safeAction('Delete account',()=>{
  account.deleted = true;
  
 });
}
function accounts(root){
 const report=C.forecast(m,today(),horizon),p=card('Accounts');
 p.append(b('Add account',()=>accountForm(),'primary'));
 const help=e('details');
 help.append(e('summary','Account help'),e('p','Deleting an account pauses its scheduled activity and removes its balance from forecasts. Restore it through Activity → Undo.'));
 p.append(help);
 for(const [title,rows] of [['Checking',report.accounts],['Savings · separate',report.savings]]){
  p.append(compactList(title,rows.filter(a=>matchesOwner(a.id)).map(a=>{const item=compactRow(
   a.name,a.current,['Cleared balance','Pending '+dollars(a.pending),'Projected '+dollars(a.projected),'Cushion '+dollars(a.cushion)],
   [b('Delete',()=>deleteAccount(a.id),'link')],
   a.id,['Starting '+dollars(a.opening)+' · as of '+dateLabel(a.asOf)]
  );
  item.append(row(b('Edit account',()=>accountForm(m.accounts.find(x=>x.id===a.id))),b('Reconcile',()=>reconcileForm(a.id))));
  return item;
  })));
 }
 root.append(p);reconciliationHistory(root);
}
function income(root){
 const p=card('Income');
 p.append(row(b('Add expected deposit',()=>incomeForm(null,'once'),'primary'),b('Set up income rule',()=>incomeForm())));
 const deposits=C.events(m,C.add(today(),90)).filter(x=>x.kind==='income'&&matchesOwner(x.account));
 const depositRow=x=>compactRow(x.name,x.amount,[dateLabel(x.date),name(x.account),x.status],[
  b('Edit deposit',()=>occurrenceForm(x)),b('Delete',()=>deleteEvent(x),'link')
 ],x.account,[x.notes]);
 const upcoming=deposits.filter(x=>x.status!=='cleared'&&(x.date>=today()||x.status==='pending'));
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
 const labels={paid:'Paid',pending:'Payment pending','needs-date':'Needs date',overdue:'Overdue',
  'due-soon':item.due===today()?'Due today':'Due soon',upcoming:'Upcoming'};
 const article=e('article',undefined,'cf-bill-row');
 article.dataset.billStatus=status;
 const owner=accountOwner(m.accounts.find(a=>a.id===item.account));
 const cells=e('div',undefined,'cf-bill-cells');
 const date=e('span',item.due?dateLabel(item.due):'Needs date','cf-bill-date');
 const title=e('h3',item.name);
 const account=e('span',item.account?name(item.account):'Choose account','cf-account-label');
 if(owner)account.dataset.cfOwner=owner;
 const savedAccount=m.accounts.find(a=>a.id===item.account);
 if(savedAccount?.accent)account.style?.setProperty('--cf-account-accent',accountAccent(savedAccount));
 const amount=e('strong',dollars(item.amount),'cf-bill-amount');
 const indicator=e('div',undefined,'cf-bill-indicator');
 indicator.append(badge(labels[status]));
 if(item.status==='pending'||item.status==='cleared')indicator.append(e('small',(item.status==='pending'?'Sent ':'Paid ')+dateLabel(historyDate(item))));
 cells.append(date,title,account,amount,indicator);
 const actions=e('div',undefined,'cf-bill-actions');
 const details=e('details',undefined,'cf-bill-details');
 details.append(e('summary','Details'),e('p','Preferred payment '+dateLabel(item.preferred||item.date)),
  ...(item.posted?[e('p','Posted '+dateLabel(item.posted))]:[]),
  ...(item.estimatedAmount?[e('p','Estimated amount')]:[]),
  ...(item.notes?[e('p',item.notes)]:[]));
 const editHost=e('div');
 const edit=()=>{details.open=true;occurrenceForm(item,editHost)};
 const detailActions=row(b('Edit',edit),b('Delete',()=>deleteEvent(item),'link'));
 if(item.status==='planned')detailActions.append(b('Skip this one',()=>safeAction('Skip bill occurrence',()=>{m.overrides[item.id]={...item,skipped:true}}),'link'));
 details.append(detailActions,editHost);
 if(item.status==='planned'&&!item.due&&item.account)actions.append(b('Set due date',edit));
 if(item.status==='planned')actions.append(item.account?b('Record payment',()=>payment(item,false)):b('Choose account',edit));
 if(item.status==='pending')actions.append(b('Mark cleared',()=>payment(item,true)));
 article.append(cells,actions,details);
 return article;
}
function payment(bill,clearing){
 const date=input('paymentDate','date',clearing?today():bill.paymentDate||today());
 const status=select('paymentStatus',[['cleared','Paid · cleared'],['pending','Pending bank clearance']],clearing?'cleared':'pending');
 const choices=(m.ledger||[]).filter(x=>!x.deleted&&!x.afterDepositId&&x.direction==='out'&&x.account===bill.account&&x.amount===bill.amount&&x.date<=today());
 const existing=select('ledgerId',[['','Record this payment'],...choices.map(x=>[x.id,dateLabel(x.date)+' · '+x.name+' · '+dollars(x.amount)])],'');
 const f=form(clearing?'Mark bill Cleared':'Mark bill Paid',[
  e('p',bill.name+' · '+dollars(bill.amount)+' · '+name(bill.account),'cf-payment-preview'),
  field(clearing?'Bank clearance date':'Payment date',date),
  ...(!clearing?[field('Payment status',status)]:[]),field('Use matching transaction',existing)
 ],fields=>{
  const actual=fields.paymentDate.value;
  const paidOn=clearing?historyDate(bill):actual;
  if(!actual||actual>today()||actual<paidOn)throw Error('Enter a valid date from payment through today.');
  T.billPayment(m,C,bill,{date:actual,paymentDate:paidOn,status:clearing?'cleared':fields.paymentStatus.value,ledgerId:fields.ledgerId?.value});
 });
 existing.onchange=()=>{
  const matching=choices.find(x=>x.id===existing.value);
  if(matching){date.value=matching.date;status.value='cleared'}
 };
 f.querySelector('button[type=submit]').textContent=clearing?'Save clearance':'Save payment';
}
function deleteEvent(o){safeAction('Delete '+(o.kind==='bill'?'bill occurrence':'transaction'),()=>{if(o.kind==='transfer'){m.transfers.find(t=>t.id===o.id).deleted=true}else if(['money-in','money-out'].includes(o.kind)){m.ledger.find(t=>t.id===o.id).deleted=true}else{m.overrides[o.id]={...o,deleted:true}}})}
function addBill(){
 const host=document.getElementById('content');
 host.querySelector('.cf-inline-form')?.remove();
 const panel=e('section',undefined,'cf-dialog cf-inline-form');
 panel.append(e('h2','Add bill'),row(
  b('One-time',()=>{panel.remove();oneTimeBill()},'primary'),
  b('Repeating',()=>{panel.remove();billForm()}),
  b('Cancel',()=>panel.remove())
 ));
 host.prepend(panel);
 panel.scrollIntoView?.({block:'start'});
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
function bills(root){
 const p=card('Bills & expenses'), month=input('billMonth','month',billMonth);
 const monthName=(value,withYear=false)=>new Intl.DateTimeFormat('en-US',{month:'long',...(withYear?{year:'numeric'}:{}),timeZone:'UTC'}).format(new Date(value+'-01T00:00:00Z'));
 function changeMonth(value){
  if(/^\d{4}-(0[1-9]|1[0-2])$/.test(value)&&value>='1900-01'&&value<='2199-12'){
   billMonth=value;calendarDay='';render();
  }
 }
 month.min='1900-01';month.max='2199-12';
 month.onchange=()=>changeMonth(month.value);
 const previous=C.add(billMonth+'-01',-1).slice(0,7), next=C.add(T.monthEnd(billMonth),1).slice(0,7);
 const monthNav=row(b('‹ '+monthName(previous),()=>changeMonth(previous)),e('h3',monthName(billMonth,true),'cf-month-title'),b(monthName(next)+' ›',()=>changeMonth(next)));
 monthNav.classList.add('cf-month-nav');
 p.append(monthNav,row(field('Month picker',month),b('This month',()=>changeMonth(today().slice(0,7))),b('Add bill',addBill,'primary'),b('Recurring schedules',()=>{
  const schedules=document.getElementById('cfRecurringSchedules');
  if(schedules){schedules.open=true;schedules.scrollIntoView?.({block:'start'});schedules.querySelector('summary')?.focus()}
 })));
 const all=C.events(m,T.monthEnd(billMonth),{byDue:true}).filter(x=>x.kind==='bill'&&matchesOwner(x.account));
 const monthly=T.billMonthRows(all,billMonth), totals=T.billTotals(monthly);
 const ownerLabel=ownerOptions().find(([id])=>id===selectedOwner())?.[1]||'All accounts';
 const totalGrid=e('div',undefined,'cf-month-totals');
 for(const [label,amount] of [['Total due this month',totals.total],['Paid',totals.cleared],['Payment pending',totals.pending],['Still to pay',totals.planned]]){
  const total=e('div');total.append(e('span',label),e('strong',dollars(amount)));totalGrid.append(total);
 }
 p.append(e('p',monthName(billMonth,true)+' · '+ownerLabel,'cf-totals-scope'),totalGrid);
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
 const rows=monthly.filter(x=>(!statusFor[billView]||x.status===statusFor[billView])&&
  [x.name,x.notes,name(x.account)].join(' ').toLowerCase().includes(billSearch)&&
  (!filters.frequency||(m.bills.find(r=>r.id===x.ruleId)?.frequency||'once')===filters.frequency));
 if(rows.length)p.append(compactList('Bills · soonest due first',rows.map(billCard)));
 else p.append(e('p','No '+(billView==='All bills'?'bills':billView.toLowerCase()+' bills')+' for '+ownerLabel+' in '+monthName(billMonth)+'.','cf-bill-empty'),
  b('Clear filters',()=>{billView='All bills';billSearch='';filters.frequency='';render()}));
 root.append(p);
 const earlier=billMonth===today().slice(0,7)?all.filter(x=>x.status==='planned'&&x.due&&x.due<billMonth+'-01'&&x.due<=today()).sort(T.compareBillDue):[];
 if(earlier.length){
  const carry=card('Earlier unpaid bills');
  carry.append(compactList('Earlier bills · '+dollars(earlier.reduce((sum,x)=>sum+x.amount,0)),earlier.map(billCard)));
  root.append(carry);
 }
 const undated=all.filter(x=>!x.due&&((x.scheduled||x.preferred||x.date).slice(0,7)||today().slice(0,7))===billMonth);
 const unscheduledRules=billMonth===today().slice(0,7)?m.bills.filter(rule=>!rule.deleted&&!rule.archived&&!rule.start&&matchesOwner(rule.account)):[];
 if(undated.length||unscheduledRules.length){
  const unknown=card('Bills with no due date');
  const rows=undated.sort(T.compareBillDue).map(billCard);
  for(const rule of unscheduledRules){
   rows.push(compactRow(rule.name,rule.amount,['Needs date',rule.account?name(rule.account):'Choose account'],
    [b('Edit schedule',()=>billForm(rule))],rule.account));
  }
  unknown.append(compactList('Needs confirmation',rows));
  root.append(unknown);
 }
 billCalendar(root,monthly);
 const rules=card('Bill rules');rules.append(b('Set up recurring bill',()=>billForm(),'primary'),b('View Archive',()=>{tab='Archive';render()}));const ordered=m.bills.filter(r=>!r.deleted&&!r.archived&&matchesOwner(r.account)).sort((a,b)=>(C.billDate(a,today())||'9999').localeCompare(C.billDate(b,today())||'9999')||a.name.localeCompare(b.name));const schedules=compactList('Manage recurring schedules',ordered.map(r=>compactRow(r.name,r.amount,[(r.account?name(r.account):'Choose account')+' · '+frequencies[r.frequency],'Next due '+(C.billDate(r,today())?dateLabel(C.billDate(r,today())):'Needs date'),r.autopay?'Autopay':'Manual pay',r.archived?'Archived':'',r.stop?'Replaced from '+dateLabel(r.stop):'',r.notes],[...(r.stop?[]:[b('Edit rule',()=>billForm(r))]),b(r.archived?'Restore':'Archive',()=>toggleArchive(r)),b('Delete',()=>removeRule(r),'link')],r.account)),false);schedules.id='cfRecurringSchedules';rules.append(schedules);root.append(rules)}
function billCalendar(root,rows){const p=card('Monthly bill calendar'),details=e('details',undefined,'cf-group');details.open=!!calendarDay;details.append(e('summary','Due dates · '+billMonth));const grid=e('div',undefined,'cf-bill-calendar');for(const label of ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'])grid.append(e('span',label,'cf-day-label'));const first=new Date(billMonth+'-01T00:00:00Z').getUTCDay();for(let i=0;i<first;i++)grid.append(e('span'));for(let day=1;day<=Number(T.monthEnd(billMonth).slice(-2));day++){const date=billMonth+'-'+String(day).padStart(2,'0'),items=rows.filter(x=>x.due===date);const n=b(String(day),()=>{calendarDay=date;render()},'cf-calendar-date');n.setAttribute('aria-label',dateLabel(date)+' · '+items.length+' bills');n.setAttribute('aria-pressed',String(calendarDay===date));if(items.length)n.append(e('small',items.length+' bills'));if(date===today())n.dataset.today='true';grid.append(n)}details.append(grid);if(calendarDay){const dayItems=rows.filter(x=>x.due===calendarDay);details.append(compactList(dateLabel(calendarDay),dayItems.map(billCard)))}p.append(details);root.append(p)}

function timeline(root,report){
 const p=card('Cash-flow forecast');
 const options=row(...[[0,'Until next payday'],[30,'Next 30 days'],[60,'Next 60 days'],[90,'Next 90 days']].map(([days,label])=>{
  const button=b(label,()=>{horizon=days;render()});
  button.setAttribute('aria-pressed',String(horizon===days));return button;
 }));
 options.classList.add('cf-bill-views');p.append(options);
 const windowEnd=horizon?C.add(today(),horizon):null;
 if(windowEnd)p.append(e('p',dateLabel(today())+' through '+dateLabel(windowEnd)));
 if(!visiblePlans(report).length)p.append(e('p','Add a checking account to see a forecast.'),b('Add checking account',()=>accountForm(null),'primary'));
 for(const {account,plan} of visiblePlans(report)){
  const cutoff=windowEnd||plan.cutoff;
  let running=account.current,minimum=account.current,firstShort=account.current<0?today():null;
  const entries=windowEnd?account.future.filter(item=>item.date<=windowEnd):plan.items;
  const rows=entries.map(x=>{
   if(running!==null){running+=x.delta;minimum=Math.min(minimum,running);if(running<0&&!firstShort)firstShort=x.date}
   return compactRow(x.name,x.delta,[dateLabel(x.date),name(account.id),x.kind==='transfer'?name(x.from)+' → '+name(x.to):x.kind,running===null?'Balance not set':'Balance after '+dollars(running)],[b('Edit',()=>editEvent(x))],account.id);
  });
  const lines=[dateLabel(today())+' through '+dateLabel(cutoff),'Cleared today',plan.hasPayday?'':'No upcoming deposit entered'];
  if(horizon)lines.push('Projected at end '+dollars(running),'Lowest projected balance '+dollars(minimum));
  if(horizon&&firstShort)lines.push('First shortfall '+dateLabel(firstShort)+' · deepest shortfall '+dollars(-minimum));
  const summary=tile(name(account.id),account.current,lines,[],account.id);
  summary.children[0].append(beforePaydayEstimate(plan),paydayBreakdown(account,plan));
  p.append(summary,compactList(name(account.id)+' · planned activity',rows,false));
 }
 root.append(p);
}
function archive(root){
 const panel=card('Archive');
 const rules=m.bills.filter(rule=>rule.archived&&!rule.deleted&&matchesOwner(rule.account));
 panel.append(compactList('Archived bill schedules',rules.map(rule=>{
  const item=compactRow(rule.name,rule.amount,[name(rule.account),frequencies[rule.frequency],rule.archivedOn?'Archived '+dateLabel(rule.archivedOn):'Archived'],
   [b('Restore',()=>toggleArchive(rule))],rule.account);
  item.classList.add('cf-archived-row');
  return item;
 })));
 root.append(panel);
}
function showSafetyCopy(){if(backupOwner!==state||!backupText){alert('No safety copy is available yet. Export a dashboard backup first.');return}const d=e('dialog',undefined,'cf-dialog'),area=note('backup',backupText),message=e('p');area.readOnly=true;d.append(e('h2','Pre-update safety copy'),e('p','Save this JSON file to use with the existing dashboard Restore backup control. Restoring replaces the dashboard data; export your current copy first.'),area,row(b('Download',()=>{const url=URL.createObjectURL(new Blob([backupText],{type:'application/json'})),a=e('a');a.href=url;a.download='dashboard-before-pastel-'+today()+'.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}),b('Copy',async()=>{try{await navigator.clipboard.writeText(backupText);message.textContent='Copied.'}catch{area.focus();area.select();message.textContent='Selected. Use your device’s Copy command.'}}),b('Select all',()=>{area.focus();area.select()}),b('Close',()=>d.close())),message);document.body.append(d);d.addEventListener('close',()=>d.remove(),{once:true});d.showModal()}
function undoChange(entry){try{safetyBackup();T.undo(m,entry);undoing=true;commit('Undo');}catch(err){alert(err.message)}finally{undoing=false}}
function attention(root,report){
 const p=card('Needs Attention');
 const events=C.events(m,C.add(today(),90)).filter(matchesTransaction).filter(item=>item.status==='pending'||item.kind==='bill'&&needsBill(item));
 const sorted=[...new Map(events.map(item=>[item.id,item])).values()].sort((a,b)=>(a.due||a.date).localeCompare(b.due||b.date));
 const items=sorted.map(item=>compactRow(item.name,item.amount,[
  item.kind==='transfer'?name(item.from)+' → '+name(item.to):name(item.account),
  dateLabel(item.due||item.date),item.status==='pending'?'Awaiting clearance':!item.due?'Confirm due date':item.due<today()?'Overdue':item.estimatedAmount||item.certainty==='estimated'?'Verify estimate':'Due soon'
 ],[],item.account||item.from));
 items.forEach((row,index)=>row.append(b('Review / Edit',()=>editEvent(sorted[index]))));
 for(const account of report.accounts.filter(a=>a.firstShort)){
  const shortage=compactRow('Projected shortage',-account.min,[account.name,dateLabel(account.firstShort)],[],account.id);
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
function reconcileForm(id){form('Compare bank balance',[field('Account',select('account',activeAccounts().map(a=>[a.id,name(a.id)]),id||scopedChecking()||activeAccounts()[0]?.id)),field('Statement / bank balance date',input('date','date',today())),field('Bank cleared balance ($)',number('bank','',-1e9)),field('Notes',note('notes')),e('p','Use the cleared bank balance, not a balance that already subtracts pending transactions. This saves a comparison only; it never changes starting balances or history.')],f=>{const a=activeAccounts().find(a=>a.id===f.account.value);if(!a)throw Error('Choose an active account first.');if(f.date.value>today()||a.opening===null||a.asOf>f.date.value)throw Error('Choose a date from the account’s starting-balance date through today. Set a starting balance first.');const report=C.forecast(m,f.date.value,30),record=[...report.accounts,...report.savings].find(x=>x.id===a.id);m.reconciliations??=[];m.reconciliations.push({id:uid(),account:a.id,date:f.date.value,bank:cents(f.bank.value),recorded:record.current,difference:cents(f.bank.value)-record.current,notes:value(f,'notes'),at:new Date().toISOString(),activity:C.events(m,f.date.value).filter(x=>(x.account===a.id||x.from===a.id||x.to===a.id)&&x.date>=a.asOf).map(x=>({id:x.id,name:x.name,date:x.date,amount:x.amount,status:x.status,included:x.status==='cleared'&&(x.date>a.asOf||x.date===a.asOf&&x.afterBalances?.[a.id]===C.balanceKey(a))}))})})}
function reconciliationHistory(root){const p=card('Bank reconciliation');p.append(b('Compare bank balance',()=>reconcileForm()),e('small','Saved comparisons are listed below.'));p.append(group('Saved comparisons',[...(m.reconciliations||[])].filter(r=>!r.deleted&&matchesOwner(r.account)).reverse().map(r=>{const n=tile(name(r.account),r.difference,['Difference · '+dateLabel(r.date),'Bank '+dollars(r.bank)+' · recorded '+dollars(r.recorded),r.difference===0?'Matched':'Discrepancy · review transactions',r.notes],[b('Review transactions',()=>{tab='Activity';render()}),b('Delete',()=>safeAction('Delete reconciliation',()=>{r.deleted=true}),'link')],r.account);const d=e('details');d.append(e('summary','Activity used for this account'));for(const x of r.activity||[])d.append(e('p',dateLabel(x.date)+' · '+x.name+' · '+dollars(x.amount)+' · '+x.status+(x.included?' · included in cleared balance':' · excluded from cleared balance')));n.append(d);return n}),false));root.append(p)}

let lastScope;
function paint(){
 const scope=preferenceKey();
 if(lastScope!==undefined&&lastScope!==scope){
  tab=widgetSavings?'Savings':'Overview';horizon=0;billMonth='';billView='All bills';billSearch='';calendarDay='';
  filters.frequency='';historyLimit=24;showAllAttention=false;folded.clear();
  for(const key of Object.keys(historyFilters))historyFilters[key]='';
  backupText='';backupProblem='';actionNotice='';paymentJustSaved=false;backupOwner=null;
 }
 lastScope=scope;
 const content=document.getElementById('content');try{safetyBackup()}catch(err){backupProblem=err.message}m=T.financeSetup(state.cashFlow||C.init());billMonth||=today().slice(0,7);baseline=snapshot();baselineOwner=state;const toolbar=banner();content.replaceChildren(toolbar);if(actionNotice){const notice=e('p',actionNotice,'cf-action-notice');if(paymentJustSaved)notice.classList.add('cf-payment-saved');paymentJustSaved=false;notice.setAttribute('role','status');content.append(notice)}if(backupProblem)content.append(e('p',backupProblem,'cf-warning'));const report=['Overview','Forecast'].includes(tab)?C.forecast(m,today(),366):null;
 if(tab==='Accounts')accounts(content);else if(tab==='Income')income(content);else if(tab==='Bills')bills(content);else if(tab==='Savings')savings(content);else if(tab==='Activity')history(content);else if(tab==='Forecast')timeline(content,report);else if(tab==='Archive')archive(content);else {overview(content,report);const payday=content.querySelector('.cf-payday-overview');if(payday)payday.after(toolbar)}for(const section of content.querySelectorAll('.cf-card')){const long=[...section.children].filter(n=>n.tagName==='P'&&n.textContent.length>190&&!n.classList.contains('cf-warning'));if(long.length){const help=e('details');help.append(e('summary','How this works'));long.forEach(n=>help.append(n));section.append(help)}}}
window.dashboardFinanceView=selectedOwner;
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
